#!/usr/bin/env node

/**
 * opencode-agent-runner.ts
 *
 * CLI wrapper for running OpenCode SDK queries.
 * This script can be invoked by parallel-impl.sh and other automation scripts.
 *
 * Usage:
 *   echo "prompt" | opencode-agent-runner.ts --cwd /path --model claude-opus-4-5 --mode implementation
 *
 * Arguments:
 *   --cwd <path>          Working directory for the agent (required)
 *   --model <modelName>   Model to use (default: claude-opus-4-5)
 *   --mode <mode>         Execution mode: implementation or review (default: implementation)
 *
 * Input:
 *   Reads prompt from stdin (supports multiline)
 *
 * Output:
 *   - stdout: Final result JSON with response text
 *   - stderr: Progress logs and errors
 *
 * Exit codes:
 *   0: Success
 *   1: Error (authentication, SDK error, no result, etc.)
 */

import { existsSync } from "node:fs";
import { stdin } from "node:process";
import { createConversationLogger } from "../src/lib/conversation-logger.js";
import { createOpencodeServer, setupEventMonitoring } from "../src/lib/opencode.js";
import type { Provider } from "../src/lib/types.js";
import { extractTextFromParts } from "../src/lib/utils.js";

// ============================================================================
// Review Decision Schema
// ============================================================================

const REVIEW_DECISION_SCHEMA = {
  type: "object",
  properties: {
    best: {
      type: "integer",
      minimum: 1,
      description: "The number (1-based) of the best implementation",
    },
    reasoning: {
      type: "string",
      description: "Detailed explanation for why this implementation was chosen",
    },
  },
  required: ["best", "reasoning"],
  additionalProperties: false,
};

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface CLIArgs {
  cwd: string;
  model: string;
  mode: "implementation" | "review";
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsedArgs: Partial<CLIArgs> = {
    model: "claude-opus-4-5",
    mode: "implementation",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--cwd":
        parsedArgs.cwd = args[++i];
        break;
      case "--model":
        parsedArgs.model = args[++i];
        break;
      case "--mode": {
        const mode = args[++i];
        if (mode !== "implementation" && mode !== "review") {
          console.error(`Error: Invalid mode "${mode}". Must be "implementation" or "review".`);
          process.exit(1);
        }
        parsedArgs.mode = mode;
        break;
      }
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
      default:
        console.error(`Error: Unknown argument "${arg}"`);
        printUsage();
        process.exit(1);
    }
  }

  // Validate required arguments
  if (!parsedArgs.cwd) {
    console.error("Error: --cwd is required");
    printUsage();
    process.exit(1);
  }

  return parsedArgs as CLIArgs;
}

function printUsage() {
  console.error(`
Usage: opencode-agent-runner.ts --cwd <path> [options]

Arguments:
  --cwd <path>              Working directory for the agent (required)
  --model <modelName>       Model to use (default: claude-opus-4-5)
  --mode <mode>             Execution mode: implementation or review (default: implementation)
  -h, --help                Show this help message

Input:
  Reads prompt from stdin (supports multiline prompts)

Output:
  - stdout: Final result JSON with response text
  - stderr: Progress logs and error messages

Examples:
  # Implementation mode
  echo "What is 2+2?" | opencode-agent-runner.ts --cwd /tmp --mode implementation

  # Review mode with structured output
  echo "Review these implementations" | opencode-agent-runner.ts --cwd /tmp --mode review

  # Custom model
  echo "Analyze this code" | opencode-agent-runner.ts --cwd /tmp --model claude-sonnet-4-5

Environment Variables:
  ANTHROPIC_OAUTH_ACCESS    OAuth access token (preferred)
  ANTHROPIC_OAUTH_REFRESH   OAuth refresh token (with access token)
  ANTHROPIC_OAUTH_EXPIRES   OAuth token expiry (with access token)
  ANTHROPIC_API_KEY         API key (fallback)
  CLAUDE_CODE_OAUTH_TOKEN   API key (fallback)
  LINEAR_API_KEY            Linear API key (optional, enables Linear MCP)
`);
}

// ============================================================================
// Read Stdin
// ============================================================================

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    stdin.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    stdin.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });

    stdin.on("error", (error: Error) => {
      reject(error);
    });
  });
}

// ============================================================================
// Diagnostic Utilities
// ============================================================================

/**
 * Check authentication configuration
 */
function checkAuthentication(): { configured: boolean; method?: string; error?: string } {
  if (
    process.env.ANTHROPIC_OAUTH_ACCESS &&
    process.env.ANTHROPIC_OAUTH_REFRESH &&
    process.env.ANTHROPIC_OAUTH_EXPIRES
  ) {
    return { configured: true, method: "ANTHROPIC_OAUTH (access, refresh, expires)" };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { configured: true, method: "ANTHROPIC_API_KEY" };
  }
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return { configured: true, method: "CLAUDE_CODE_OAUTH_TOKEN" };
  }
  return {
    configured: false,
    error: "No authentication configured. Set ANTHROPIC_OAUTH_* or ANTHROPIC_API_KEY",
  };
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  // Parse command line arguments
  const args = parseArgs();

  console.error("");
  console.error("=".repeat(60));
  console.error("OpenCode Agent Runner");
  console.error("=".repeat(60));
  console.error(`CWD: ${args.cwd}`);
  console.error(`Model: ${args.model}`);
  console.error(`Mode: ${args.mode}`);
  console.error("");

  // Pre-flight validation
  console.error("Running pre-flight checks...");

  // Check authentication
  const authValidation = checkAuthentication();
  if (authValidation.configured) {
    console.error(`✓ Authentication: ${authValidation.method}`);
  } else {
    console.error(`❌ Authentication: ${authValidation.error}`);
    console.error("=".repeat(60));
    process.exit(1);
  }

  // Check working directory
  if (existsSync(args.cwd)) {
    console.error(`✓ Working directory exists`);
  } else {
    console.error(`❌ Working directory does not exist: ${args.cwd}`);
    console.error("=".repeat(60));
    process.exit(1);
  }

  console.error("");

  // Read prompt from stdin
  console.error("Reading prompt from stdin...");
  const prompt = await readStdin();

  if (!prompt.trim()) {
    console.error("Error: Empty prompt received from stdin");
    process.exit(1);
  }

  console.error(`✓ Received prompt: ${prompt.length} characters`);
  console.error("");

  // Initialize conversation logger (optional)
  const logger = await createConversationLogger();
  if (logger) {
    console.error(`✓ Conversation logging enabled`);
  }

  // Check for Linear API key
  const linearApiKey = process.env.LINEAR_API_KEY;
  if (linearApiKey) {
    console.error(`✓ LINEAR_API_KEY found - enabling Linear MCP`);
  } else {
    console.error(`⚠️  LINEAR_API_KEY not found - Linear MCP disabled`);
    console.error(`   Set LINEAR_API_KEY to enable Linear issue fetching`);
  }

  // Build agent tools configuration
  const agentTools =
    args.mode === "implementation"
      ? {
          write: true,
          edit: true,
          bash: true,
          read: true,
          list: true,
          glob: true,
          grep: true,
          webfetch: true,
        }
      : {
          read: true,
          list: true,
          glob: true,
          grep: true,
          webfetch: true,
        };

  // Build agent permissions configuration
  const agentPermissions =
    args.mode === "implementation"
      ? {
          edit: "allow",
          bash: "allow",
          webfetch: "allow",
        }
      : {
          webfetch: "allow",
        };

  // Build review mode prompt wrapper if needed
  const finalPrompt =
    args.mode === "review"
      ? `${prompt}\n\nIMPORTANT: You MUST respond with valid JSON matching this schema:\n${JSON.stringify(REVIEW_DECISION_SCHEMA, null, 2)}\n\nDo not include any text outside the JSON object.`
      : prompt;

  const provider: Provider = "anthropic";
  const agentName = args.mode === "review" ? "review-agent" : "implementation-agent";
  const agentDescription =
    args.mode === "review"
      ? "Reviews multiple implementations and selects the best one"
      : "Implements features and fixes bugs";

  try {
    // Start logging session if logger is available
    if (logger) {
      await logger.startSession({
        id: crypto.randomUUID(),
        agentType: args.mode === "review" ? "review" : "implementation",
        model: args.model,
        provider,
      });
    }

    // Create OpenCode server
    console.error("");
    const { client, server } = await createOpencodeServer({
      provider,
      model: args.model,
      agentName,
      agentDescription,
      agentPrompt: finalPrompt,
      agentTools,
      agentPermissions,
      maxSteps: 30,
      linearApiKey,
    });

    // Setup event monitoring
    setupEventMonitoring(client, logger);

    console.error("");
    console.error("Starting agent session...");

    // Create session
    const sessionResponse = await client.session.create({
      body: { title: `${agentName}: ${new Date().toISOString()}` },
    });

    if (!sessionResponse.data) {
      throw new Error("Failed to create session");
    }

    const session = sessionResponse.data;
    console.error(`✓ Session created: ${session.id}`);

    // Change working directory
    process.chdir(args.cwd);
    console.error(`✓ Changed to working directory: ${args.cwd}`);

    // Send prompt to agent
    console.error("Sending prompt to agent...");
    console.error("");

    const promptResponse = await client.session.prompt({
      path: { id: session.id },
      body: {
        model: { providerID: provider, modelID: args.model },
        agent: agentName,
        parts: [{ type: "text", text: finalPrompt }],
      },
    });

    if (!promptResponse.data) {
      throw new Error("Failed to get response");
    }

    const responseInfo = promptResponse.data.info;
    if (responseInfo?.error) {
      const err = responseInfo.error;
      const errMessage = err.data?.message || err.name;
      throw new Error(`Provider error: ${errMessage}`);
    }

    const resultText = extractTextFromParts(promptResponse.data.parts);
    if (resultText.length === 0) {
      throw new Error("Empty response from agent");
    }

    console.error("");
    console.error("=".repeat(60));
    console.error("SUCCESS: Agent completed");
    console.error("=".repeat(60));

    // Output result to stdout as JSON
    const result = {
      type: "result",
      subtype: "success",
      response: resultText,
      mode: args.mode,
    };

    console.log(JSON.stringify(result, null, 2));

    console.error("");
    console.error("Result written to stdout");
    console.error("=".repeat(60));
    console.error("");

    // End logging session successfully and sync to cloud
    if (logger) {
      await logger.endSession("completed");
      await logger.syncToCloud();
    }

    // Close server
    server.close();

    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("");
    console.error("=".repeat(60));
    console.error("ERROR!");
    console.error("=".repeat(60));
    console.error(`Error: ${errorMessage}`);

    if (error instanceof Error && error.stack) {
      console.error("");
      console.error("Stack trace:");
      console.error(error.stack);
    }
    console.error("");

    // End logging session with error and sync to cloud
    if (logger) {
      await logger.endSession("error", errorMessage);
      await logger.syncToCloud();
    }

    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("FATAL ERROR:", error);
  process.exit(1);
});
