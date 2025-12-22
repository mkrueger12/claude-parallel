/**
 * OpenCode SDK helpers for server setup and event monitoring.
 */

import { createOpencode } from "@opencode-ai/sdk";
import type { ConversationLogger } from "./conversation-logger.js";
import type { Provider } from "./types.js";

/**
 * Options for creating an OpenCode server
 */
export interface OpencodeServerOptions {
  provider: Provider;
  apiKey: string;
  model: string;
  agentName: string;
  agentDescription: string;
  agentPrompt: string;
  agentTools?: {
    write?: boolean;
    edit?: boolean;
    bash?: boolean;
    read?: boolean;
    list?: boolean;
    glob?: boolean;
    grep?: boolean;
    webfetch?: boolean;
    [key: string]: boolean | undefined;
  };
  agentPermissions?: {
    edit?: string;
    bash?: string;
    webfetch?: string;
    [key: string]: string | undefined;
  };
  maxSteps?: number;
  linearApiKey?: string;
}

/**
 * Create and configure an OpenCode server instance
 *
 * @param options - Configuration options for the OpenCode server
 * @returns OpenCode client and server instances
 */
export async function createOpencodeServer(options: OpencodeServerOptions) {
  const {
    provider,
    apiKey,
    model,
    agentName,
    agentDescription,
    agentPrompt,
    agentTools = {},
    agentPermissions = {},
    maxSteps = 30,
    linearApiKey,
  } = options;

  // Build OpenCode configuration
  const opcodeConfig: any = {
    provider: {
      [provider]: {
        options: {
          apiKey,
          timeout: false, // Disable timeout
        },
      },
    },
    ...(linearApiKey && {
      mcp: {
        linear: {
          type: "remote" as const,
          url: "https://mcp.linear.app/mcp",
          headers: {
            Authorization: `Bearer ${linearApiKey}`,
          },
        },
      },
    }),
    agent: {
      [agentName]: {
        description: agentDescription,
        mode: "subagent",
        model,
        prompt: agentPrompt,
        tools: agentTools,
        maxSteps,
        permission: agentPermissions,
      },
    },
  };

  console.error("Starting OpenCode server...");
  const { client, server } = await createOpencode({
    hostname: "127.0.0.1",
    port: 0, // Auto-assign port
    config: opcodeConfig,
  });

  console.error(`✓ OpenCode server started at ${server.url}`);

  return { client, server };
}

/**
 * Setup event monitoring for an OpenCode session
 *
 * @param client - OpenCode client instance
 * @param logger - Optional conversation logger for storing tool executions
 */
export function setupEventMonitoring(client: any, logger?: ConversationLogger | null): void {
  console.error("Setting up event monitoring...");

  (async () => {
    try {
      const events = await client.event.subscribe();
      for await (const event of events.stream) {
        // Monitor tool execution
        if (event.type === "message.part.updated") {
          const part = event.properties.part;
          if (part.type === "tool") {
            const status = part.state.status;
            const toolName = part.tool;

            if (status === "running") {
              const input = JSON.stringify(part.state.input || {}, null, 2);
              console.error(`\n[TOOL] ${toolName} - RUNNING`);
              console.error(`  Input: ${input}`);

              // Log to database if logger is available
              if (logger) {
                logger.logToolExecution({
                  toolName,
                  status: "running",
                  input: part.state.input,
                  startedAt: new Date(),
                });
              }
            } else if (status === "completed") {
              const output = part.state.output?.slice(0, 200) || "(no output)";
              const duration =
                part.state.time?.end && part.state.time?.start
                  ? `${((part.state.time.end - part.state.time.start) / 1000).toFixed(2)}s`
                  : "unknown";
              console.error(`\n[TOOL] ${toolName} - COMPLETED (${duration})`);
              console.error(
                `  Output preview: ${output}${part.state.output && part.state.output.length > 200 ? "..." : ""}`
              );

              // Log to database if logger is available
              if (logger) {
                logger.logToolExecution({
                  toolName,
                  status: "completed",
                  input: part.state.input,
                  output: part.state.output,
                  startedAt: part.state.time?.start ? new Date(part.state.time.start) : undefined,
                  endedAt: part.state.time?.end ? new Date(part.state.time.end) : undefined,
                });
              }
            } else if (status === "error") {
              console.error(`\n[TOOL] ${toolName} - ERROR`);
              console.error(`  Error: ${part.state.error}`);

              // Log to database if logger is available
              if (logger) {
                logger.logToolExecution({
                  toolName,
                  status: "error",
                  input: part.state.input,
                  error: part.state.error,
                });
              }
            }
          }
        }

        // Monitor session status
        if (event.type === "session.status") {
          const status = event.properties.status;

          if (String(status) === "idle") {
            console.error(`\n[STATUS] Session idle`);
          } else if (String(status) === "busy") {
            console.error(`\n[STATUS] Session busy (processing)`);
          } else if (typeof status === "object" && "attempt" in status) {
            // Retry status
            console.error(`\n[STATUS] Session retrying (attempt ${status.attempt})`);
            if ("message" in status) console.error(`  Reason: ${status.message}`);
            if ("next" in status) console.error(`  Next retry in: ${status.next}ms`);
          }
        }

        // Monitor session errors
        if (event.type === "session.error") {
          const error = event.properties.error;
          console.error(`\n[ERROR] Session error:`, error);
        }
      }
    } catch (err) {
      console.error("Event monitoring subscription error:", err);
    }
  })();
}
