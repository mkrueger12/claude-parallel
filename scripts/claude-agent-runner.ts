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

import { stdin } from "node:process";
import type { McpServerConfig, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { runClaudeQuery } from "../src/lib/claude-agent-sdk.js";
import { createConversationLogger } from "../src/lib/conversation-logger.js";

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
  --cwd <path>          Working directory for the agent (required)
  --model <modelName>   Model to use (default: claude-opus-4-5-20251101)
  --mode <mode>         Execution mode: implementation or review (default: implementation)
  -h, --help            Show this help message

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
