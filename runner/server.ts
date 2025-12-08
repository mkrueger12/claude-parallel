/**
 * Cloud Run webhook handler for GitHub issue automation
 *
 * Triggers parallel-impl.sh when a GitHub issue is opened.
 */

const API_KEY = process.env.API_KEY;
const PORT = parseInt(process.env.PORT || "8080", 10);

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  user: {
    login: string;
  };
}

interface GitHubRepository {
  full_name: string;
  clone_url: string;
  html_url: string;
  default_branch: string;
}

interface GitHubWebhookPayload {
  action: string;
  issue?: GitHubIssue;
  repository: GitHubRepository;
  sender: {
    login: string;
  };
}

function log(level: "info" | "warn" | "error", message: string, data?: Record<string, unknown>) {
  const entry = {
    severity: level.toUpperCase(),
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };
  console.log(JSON.stringify(entry));
}

async function runImplementation(payload: GitHubWebhookPayload): Promise<void> {
  const { issue, repository } = payload;
  if (!issue) {
    log("error", "No issue in payload");
    return;
  }

  const workDir = `/tmp/repo-${issue.number}-${Date.now()}`;
  const featureRequest = `${issue.title}\n\n${issue.body || ""}`;

  log("info", "Starting implementation", {
    repo: repository.full_name,
    issue: issue.number,
    workDir,
  });

  try {
    // Clone the repository
    const cloneProc = Bun.spawn(
      ["git", "clone", "--depth", "1", repository.clone_url, workDir],
      {
        env: process.env as Record<string, string>,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const cloneExitCode = await cloneProc.exited;
    if (cloneExitCode !== 0) {
      const stderr = await new Response(cloneProc.stderr).text();
      log("error", "Git clone failed", { exitCode: cloneExitCode, stderr });
      return;
    }

    log("info", "Repository cloned successfully", { workDir });

    // Run init.sh to install dependencies
    const initProc = Bun.spawn(
      ["bash", "/app/init.sh"],
      {
        cwd: workDir,
        env: process.env as Record<string, string>,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const initExitCode = await initProc.exited;
    if (initExitCode !== 0) {
      const stderr = await new Response(initProc.stderr).text();
      log("warn", "init.sh had issues (continuing anyway)", { exitCode: initExitCode, stderr });
    } else {
      log("info", "Dependencies installed");
    }

    // Run parallel-impl.sh
    log("info", "Starting parallel implementation", { featureRequest: featureRequest.slice(0, 100) });

    const implProc = Bun.spawn(
      ["bash", "/opt/claude-parallel/parallel-impl.sh", featureRequest],
      {
        cwd: workDir,
        env: {
          ...process.env as Record<string, string>,
          // Ensure git can push
          GIT_AUTHOR_NAME: "Claude Parallel Bot",
          GIT_AUTHOR_EMAIL: "bot@claude-parallel.dev",
          GIT_COMMITTER_NAME: "Claude Parallel Bot",
          GIT_COMMITTER_EMAIL: "bot@claude-parallel.dev",
        },
        stdout: "inherit",
        stderr: "inherit",
      }
    );

    const implExitCode = await implProc.exited;

    if (implExitCode === 0) {
      log("info", "Implementation completed successfully", { issue: issue.number });
    } else {
      log("error", "Implementation failed", { exitCode: implExitCode, issue: issue.number });
    }

  } catch (error) {
    log("error", "Implementation error", {
      error: error instanceof Error ? error.message : String(error),
      issue: issue.number,
    });
  } finally {
    // Cleanup work directory
    try {
      Bun.spawn(["rm", "-rf", workDir]);
    } catch {
      // Ignore cleanup errors
    }
  }
}

Bun.serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);

    // Health check endpoint (GET only)
    if ((url.pathname === "/health" || url.pathname === "/") && req.method === "GET") {
      return new Response(JSON.stringify({ status: "ok", service: "claude-parallel-runner" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Only accept POST for webhook
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    if (!API_KEY) {
      log("error", "API_KEY environment variable not set");
      return new Response("Server misconfigured", { status: 500 });
    }

    if (apiKey !== API_KEY) {
      log("warn", "Invalid API key attempt");
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse webhook payload
    let payload: GitHubWebhookPayload;
    try {
      payload = await req.json() as GitHubWebhookPayload;
    } catch {
      log("error", "Invalid JSON in request body");
      return new Response("Invalid JSON", { status: 400 });
    }

    // Check for GitHub event type
    const eventType = req.headers.get("x-github-event");

    // Only process issues.opened events
    if (eventType !== "issues" || payload.action !== "opened") {
      log("info", "Ignoring event", { eventType, action: payload.action });
      return new Response(JSON.stringify({ status: "ignored", reason: "not issues.opened" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!payload.issue) {
      log("error", "Missing issue in payload");
      return new Response("Missing issue", { status: 400 });
    }

    log("info", "Received issue.opened webhook", {
      repo: payload.repository.full_name,
      issue: payload.issue.number,
      title: payload.issue.title,
    });

    // Fire and forget - run implementation in background
    runImplementation(payload).catch((err) => {
      log("error", "Unhandled implementation error", {
        error: err instanceof Error ? err.message : String(err)
      });
    });

    // Return immediately
    return new Response(JSON.stringify({
      status: "started",
      issue: payload.issue.number,
      repo: payload.repository.full_name,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

log("info", `Server listening on port ${PORT}`);
