/**
 * OpenCode SDK helpers for server setup and event monitoring.
 */

import { createOpencode } from '@opencode-ai/sdk';
import type { Provider } from './types.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    astgrep?: boolean;
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

  // Build MCP servers configuration
  const mcpServers: Record<string, any> = {};

  // Add Linear MCP if API key is available
  if (linearApiKey) {
    mcpServers.linear = {
      type: 'remote' as const,
      url: 'https://mcp.linear.app/mcp',
      headers: {
        Authorization: `Bearer ${linearApiKey}`,
      },
    };
  }

  // Add AST-Grep MCP if enabled
  if (agentTools.astgrep) {
    mcpServers['ast-grep'] = {
      type: 'local' as const,
      command: 'bun',
      args: ['run', join(__dirname, '../mcp/ast-grep-server.ts')],
    };
  }

  // Build updated agentTools with MCP tool permissions
  const finalAgentTools = { ...agentTools };

  // Add MCP tool permissions when astgrep is enabled
  if (agentTools.astgrep) {
    finalAgentTools['mcp__ast-grep__*'] = true;
  }

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
    ...(Object.keys(mcpServers).length > 0 && {
      mcp: mcpServers,
    }),
    agent: {
      [agentName]: {
        description: agentDescription,
        mode: "subagent",
        model,
        prompt: agentPrompt,
        tools: finalAgentTools,
        maxSteps,
        permission: agentPermissions,
      },
    },
  };

  console.error('Starting OpenCode server...');
  const { client, server } = await createOpencode({
    hostname: '127.0.0.1',
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
 */
export function setupEventMonitoring(client: any): void {
  console.error('Setting up event monitoring...');

  (async () => {
    try {
      const events = await client.event.subscribe();
      for await (const event of events.stream) {
        // Monitor tool execution
        if (event.type === 'message.part.updated') {
          const part = event.properties.part;
          if (part.type === 'tool') {
            const status = part.state.status;
            const toolName = part.tool;

            if (status === 'running') {
              const input = JSON.stringify(part.state.input || {}, null, 2);
              console.error(`\n[TOOL] ${toolName} - RUNNING`);
              console.error(`  Input: ${input}`);
            } else if (status === 'completed') {
              const output = part.state.output?.slice(0, 200) || '(no output)';
              const duration = part.state.time?.end && part.state.time?.start
                ? `${((part.state.time.end - part.state.time.start) / 1000).toFixed(2)}s`
                : 'unknown';
              console.error(`\n[TOOL] ${toolName} - COMPLETED (${duration})`);
              console.error(`  Output preview: ${output}${part.state.output && part.state.output.length > 200 ? '...' : ''}`);
            } else if (status === 'error') {
              console.error(`\n[TOOL] ${toolName} - ERROR`);
              console.error(`  Error: ${part.state.error}`);
            }
          }
        }

        // Monitor session status
        if (event.type === 'session.status') {
          const status = event.properties.status;

          if (String(status) === 'idle') {
            console.error(`\n[STATUS] Session idle`);
          } else if (String(status) === 'busy') {
            console.error(`\n[STATUS] Session busy (processing)`);
          } else if (typeof status === 'object' && 'attempt' in status) {
            // Retry status
            console.error(`\n[STATUS] Session retrying (attempt ${status.attempt})`);
            if ('message' in status) console.error(`  Reason: ${status.message}`);
            if ('next' in status) console.error(`  Next retry in: ${status.next}ms`);
          }
        }

        // Monitor session errors
        if (event.type === 'session.error') {
          const error = event.properties.error;
          console.error(`\n[ERROR] Session error:`, error);
        }
      }
    } catch (err) {
      console.error('Event monitoring subscription error:', err);
    }
  })();
}
