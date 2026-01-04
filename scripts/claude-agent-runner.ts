#!/usr/bin/env node

/**
 * claude-agent-runner.ts
 *
 * CLI wrapper for running Claude Agent SDK queries.
 * This script can be invoked by parallel-impl.sh and other automation scripts.
 *
 * Usage:
 *   echo "prompt" | claude-agent-runner.ts --cwd /path --model claude-opus-4-5-20251101 --mode implementation
 *
 * Arguments:
 *   --cwd <path>          Working directory for the agent (required)
 *   --model <modelName>   Model to use (default: claude-opus-4-5-20251101)
 *   --mode <mode>         Execution mode: implementation or review (default: implementation)
 *
 * Input:
 *   Reads prompt from stdin (supports multiline)
 *
 * Output:
 *   - stdout: Final result JSON (type: 'result' message)
 *   - stderr: Progress logs and errors
 *
 * Exit codes:
 *   0: Success
 *   1: Error (authentication, SDK error, no result, etc.)
 */

import { existsSync } from "node:fs";
import { stdin } from "node:process";
import type { McpServerConfig, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { runClaudeQuery } from "../src/lib/claude-agent-sdk.js";
import { createConversationLogger } from "../src/lib/conversation-logger.js";

// ============================================================================
// Diagnostic Utilities
// ============================================================================

/**
 * Common Claude CLI installation paths to check
 */
const COMMON_CLI_PATHS = [
  `${process.env.HOME}/.local/bin/claude`,
  "/usr/local/bin/claude",
  `${process.env.HOME}/.npm-global/bin/claude`,
  `${process.env.HOME}/.bun/bin/claude`,
];

/**
 * Validate that the Claude CLI exists at the specified or default path
 */
function validateClaudeCliPath(specifiedPath?: string): {
  valid: boolean;
  path: string;
  error?: string;
} {
  if (specifiedPath) {
    if (existsSync(specifiedPath)) {
      return { valid: true, path: specifiedPath };
    }
    return {
      valid: false,
      path: specifiedPath,
      error: `Claude CLI not found at specified path: ${specifiedPath}`,
    };
  }

  // Check common paths
  for (const path of COMMON_CLI_PATHS) {
    if (existsSync(path)) {
      return { valid: true, path };
    }
  }

  return {
    valid: false,
    path: "auto-detect",
    error: `Claude CLI not found in common locations. Checked:\n${COMMON_CLI_PATHS.map((p) => `  - ${p}`).join("\n")}`,
  };
}

/**
 * Check authentication configuration
 */
function checkAuthentication(): { configured: boolean; method?: string; error?: string } {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return { configured: true, method: "CLAUDE_CODE_OAUTH_TOKEN" };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { configured: true, method: "ANTHROPIC_API_KEY" };
  }
  return {
    configured: false,
    error: "No authentication configured. Set CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY",
  };
}

/**
 * Analyze an error and provide diagnostic information
 */
function diagnoseError(
  error: Error,
  context: { cliPath?: string; cwd: string; model: string }
): string {
  const lines: string[] = [];
  const errorMsg = error.message.toLowerCase();

  lines.push("DIAGNOSTIC INFORMATION:");
  lines.push("-".repeat(40));

  // Check for common error patterns
  if (errorMsg.includes("exited with code 1")) {
    lines.push("");
    lines.push("The Claude Code CLI process exited with an error.");
    lines.push("");
    lines.push("Common causes:");

    // Check CLI path
    const cliCheck = validateClaudeCliPath(context.cliPath);
    if (!cliCheck.valid) {
      lines.push(`  ❌ CLI PATH ISSUE: ${cliCheck.error}`);
      lines.push("");
      lines.push("  Fix: Install Claude CLI or specify path with --claude-cli-path");
      lines.push("  Install: curl -fsSL https://claude.ai/install.sh | bash");
    } else {
      lines.push(`  ✓ CLI found at: ${cliCheck.path}`);
    }

    // Check authentication
    const authCheck = checkAuthentication();
    if (!authCheck.configured) {
      lines.push(`  ❌ AUTH ISSUE: ${authCheck.error}`);
    } else {
      lines.push(`  ✓ Auth configured via: ${authCheck.method}`);
    }

    // Check working directory
    if (!existsSync(context.cwd)) {
      lines.push(`  ❌ CWD ISSUE: Working directory does not exist: ${context.cwd}`);
    } else {
      lines.push(`  ✓ CWD exists: ${context.cwd}`);
    }

    lines.push("");
    lines.push("If all checks pass, the error may be:");
    lines.push("  - Invalid API key or expired OAuth token");
    lines.push("  - Rate limiting or API errors");
    lines.push("  - Network connectivity issues");
    lines.push("  - Permission issues in the working directory");
  } else if (errorMsg.includes("not found") || errorMsg.includes("enoent")) {
    lines.push("  ❌ FILE NOT FOUND: The Claude CLI executable could not be located");
    lines.push("");
    lines.push("  Fix: Specify the CLI path with --claude-cli-path $HOME/.local/bin/claude");
  } else if (errorMsg.includes("authentication") || errorMsg.includes("unauthorized")) {
    lines.push("  ❌ AUTHENTICATION ERROR: Check your API key or OAuth token");
  }

  lines.push("");
  lines.push("Configuration at time of error:");
  lines.push(`  CLI Path: ${context.cliPath || "(auto-detect)"}`);
  lines.push(`  CWD: ${context.cwd}`);
  lines.push(`  Model: ${context.model}`);

  return lines.join("\n");
}

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
  claudeCliPath?: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsedArgs: Partial<CLIArgs> = {
    model: "claude-opus-4-5-20251101",
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
      case "--claude-cli-path":
        parsedArgs.claudeCliPath = args[++i];
        break;
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
Usage: claude-agent-runner.ts --cwd <path> [options]

Arguments:
  --cwd <path>              Working directory for the agent (required)
  --model <modelName>       Model to use (default: claude-opus-4-5-20251101)
  --mode <mode>             Execution mode: implementation or review (default: implementation)
  --claude-cli-path <path>  Path to Claude Code CLI executable (optional)
  -h, --help                Show this help message

Input:
  Reads prompt from stdin (supports multiline prompts)

Output:
  - stdout: Final result JSON (the 'result' message from SDK)
  - stderr: Progress logs and error messages

Examples:
  # Implementation mode
  echo "What is 2+2?" | claude-agent-runner.ts --cwd /tmp --mode implementation

  # Review mode with structured output
  echo "Review these implementations" | claude-agent-runner.ts --cwd /tmp --mode review

  # Custom model
  echo "Analyze this code" | claude-agent-runner.ts --cwd /tmp --model claude-sonnet-4-5

  # Specify Claude CLI path
  echo "Implement feature" | claude-agent-runner.ts --cwd /tmp --claude-cli-path ~/.local/bin/claude

Environment Variables:
  CLAUDE_CODE_OAUTH_TOKEN   OAuth token (preferred)
  ANTHROPIC_API_KEY         API key (fallback)
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
// Main Execution
// ============================================================================

async function main() {
  // Parse command line arguments
  const args = parseArgs();

  console.error("");
  console.error("=".repeat(60));
  console.error("Claude Agent Runner");
  console.error("=".repeat(60));
  console.error(`CWD: ${args.cwd}`);
  console.error(`Model: ${args.model}`);
  console.error(`Mode: ${args.mode}`);
  console.error("");

  // Pre-flight validation
  console.error("Running pre-flight checks...");

  // Check CLI path
  const cliValidation = validateClaudeCliPath(args.claudeCliPath);
  if (cliValidation.valid) {
    console.error(`✓ Claude CLI: ${cliValidation.path}`);
  } else {
    console.error(`⚠️  Claude CLI: ${cliValidation.error}`);
    console.error(`   The SDK will attempt auto-detection, but this may fail.`);
    console.error(`   Recommendation: Use --claude-cli-path $HOME/.local/bin/claude`);
  }

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

  // Build MCP servers configuration
  const mcpServers: Record<string, McpServerConfig> = {
    deepwiki: {
      type: "sse" as const,
      url: "https://mcp.deepwiki.com/sse",
    },
  };

  // Add Linear MCP if API key is available
  const linearApiKey = process.env.LINEAR_API_KEY;
  if (linearApiKey) {
    console.error(`✓ LINEAR_API_KEY found - enabling Linear MCP`);
    mcpServers.linear = {
      type: "stdio" as const,
      command: "npx",
      args: ["-y", "@linear/mcp-server-linear"],
      env: {
        LINEAR_API_KEY: linearApiKey,
      },
    };
  } else {
    console.error(`⚠️  LINEAR_API_KEY not found - Linear MCP disabled`);
    console.error(`   Set LINEAR_API_KEY to enable Linear issue fetching`);
  }

  // Build query options
  const queryOptions = {
    cwd: args.cwd,
    model: args.model,
    mode: args.mode,
    mcpServers,
    logger,
    ...(args.claudeCliPath ? { pathToClaudeCodeExecutable: args.claudeCliPath } : {}),
    ...(args.mode === "review" ? { outputSchema: REVIEW_DECISION_SCHEMA } : {}),
  };

  try {
    // Start logging session if logger is available
    if (logger) {
      await logger.startSession({
        id: crypto.randomUUID(),
        agentType: args.mode === "review" ? "review" : "implementation",
        model: args.model,
        provider: "anthropic",
      });
    }

    // Run the query
    console.error("Starting Claude query...");
    console.error("");

    let messageCount = 0;
    let finalResult: SDKMessage | null = null;

    for await (const message of runClaudeQuery(prompt, queryOptions)) {
      messageCount++;

      // Log message type to stderr for debugging
      console.error(`[Message ${messageCount}] Type: ${message.type}`);

      // Log tool calls from assistant messages
      if (message.type === "assistant" && message.message) {
        const content = message.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_use") {
              const toolName = block.name;
              const inputStr = JSON.stringify(block.input);
              const inputPreview =
                inputStr.length > 200 ? `${inputStr.slice(0, 200)}...` : inputStr;
              console.error(`[Tool] ${toolName}`);
              console.error(`       Input: ${inputPreview}`);
            } else if (block.type === "text" && block.text) {
              // Log text output (truncated)
              const textPreview =
                block.text.length > 300 ? `${block.text.slice(0, 300)}...` : block.text;
              if (textPreview.trim()) {
                console.error(`[Text] ${textPreview.replace(/\n/g, "\n       ")}`);
              }
            }
          }
        }
      }

      // Log tool results
      if (message.type === "user" && message.message) {
        const content = message.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_result") {
              const resultStr =
                typeof block.content === "string" ? block.content : JSON.stringify(block.content);
              const resultPreview =
                resultStr.length > 200 ? `${resultStr.slice(0, 200)}...` : resultStr;
              console.error(`[Tool Result] ${resultPreview.replace(/\n/g, "\n              ")}`);
            }
          }
        }
      }

      // Check if this is the final result
      if (message.type === "result") {
        finalResult = message;
        console.error(`[Message ${messageCount}] Subtype: ${message.subtype}`);

        if (message.subtype === "success") {
          console.error(`[Message ${messageCount}] ✓ Query completed successfully`);
        } else {
          console.error(`[Message ${messageCount}] ✗ Query failed: ${message.subtype}`);
        }
      }
    }

    console.error("");
    console.error("=".repeat(60));

    // Check if we got a result
    if (!finalResult) {
      console.error("ERROR: No result message received from query");
      console.error("=".repeat(60));
      process.exit(1);
    }

    // Output the result to stdout as JSON
    console.log(JSON.stringify(finalResult, null, 2));

    console.error("SUCCESS: Result written to stdout");
    console.error("=".repeat(60));
    console.error("");

    // End logging session successfully and sync to cloud
    if (logger) {
      await logger.endSession("completed");
      await logger.syncToCloud();
    }

    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("");
    console.error("=".repeat(60));
    console.error("ERROR!");
    console.error("=".repeat(60));
    console.error(`Error: ${errorMessage}`);

    // Provide diagnostic information for common errors
    if (error instanceof Error) {
      console.error("");
      const diagnostics = diagnoseError(error, {
        cliPath: args.claudeCliPath,
        cwd: args.cwd,
        model: args.model,
      });
      console.error(diagnostics);

      if (error.stack) {
        console.error("");
        console.error("Stack trace:");
        console.error(error.stack);
      }
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
