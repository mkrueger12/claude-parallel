/**
 * Claude Agent SDK helper module for authentication and query configuration.
 *
 * This module provides utilities for running Claude Code-style queries using the
 * @anthropic-ai/claude-agent-sdk package, mimicking the behavior of the CLI.
 */

import { type McpServerConfig, type Options, query } from "@anthropic-ai/claude-agent-sdk";

/**
 * Authentication configuration
 */
export interface AuthConfig {
  apiKey: string;
  source: "oauth" | "api_key";
}

/**
 * Options for running a Claude query
 */
export interface ClaudeQueryOptions {
  /**
   * Working directory for the agent
   */
  cwd: string;

  /**
   * Model to use (e.g., 'claude-opus-4-5-20251101')
   */
  model?: string;

  /**
   * Execution mode: implementation or review
   */
  mode?: "implementation" | "review";

  /**
   * JSON schema for structured output (used in review mode)
   */
  outputSchema?: Record<string, unknown>;

  /**
   * MCP (Model Context Protocol) servers configuration
   */
  mcpServers?: Record<string, McpServerConfig>;

  /**
   * Additional SDK options to override defaults
   */
  additionalOptions?: Partial<Options>;
}

/**
 * Get authentication credentials from environment variables.
 *
 * Checks for CLAUDE_CODE_OAUTH_TOKEN first, then falls back to ANTHROPIC_API_KEY.
 * Sets ANTHROPIC_API_KEY in the environment if OAuth token is found (SDK expects this).
 *
 * @returns Authentication configuration with API key and source
 * @throws Error if neither authentication method is available
 */
export function getAuthentication(): AuthConfig {
  // Check for OAuth token first (preferred)
  const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  if (oauthToken) {
    console.warn("[Auth] Using CLAUDE_CODE_OAUTH_TOKEN for authentication");

    // SDK handles CLAUDE_CODE_OAUTH_TOKEN automatically - don't modify env
    return {
      apiKey: oauthToken,
      source: "oauth",
    };
  }

  // Fall back to API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    console.warn("[Auth] ⚠️  Using ANTHROPIC_API_KEY for authentication");
    console.warn("[Auth] ⚠️  Consider using CLAUDE_CODE_OAUTH_TOKEN for better integration");

    return {
      apiKey,
      source: "api_key",
    };
  }

  // No authentication found
  throw new Error(
    "No authentication found. Please set either:\n" +
      "  - CLAUDE_CODE_OAUTH_TOKEN (preferred), or\n" +
      "  - ANTHROPIC_API_KEY (fallback)\n"
  );
}

/**
 * Run a Claude query with configuration matching the CLI behavior.
 *
 * This function configures the SDK to mimic how the Claude Code CLI works:
 * - Uses the 'claude_code' system prompt preset
 * - Loads project settings (CLAUDE.md files)
 * - Bypasses permission prompts (for automation)
 * - Supports structured output for review mode
 *
 * @param prompt - The prompt to send to Claude
 * @param options - Configuration options for the query
 * @returns AsyncGenerator that yields SDK messages
 */
export async function* runClaudeQuery(prompt: string, options: ClaudeQueryOptions) {
  // Get authentication (also sets ANTHROPIC_API_KEY in process.env)
  getAuthentication();

  // Build SDK options
  const sdkOptions: Options = {
    // Working directory
    cwd: options.cwd,

    // Model configuration
    model: options.model || "claude-opus-4-5-20251101",

    // Use Claude Code preset system prompt
    systemPrompt: {
      type: "preset",
      preset: "claude_code",
    },

    // Load project settings (CLAUDE.md files)
    settingSources: ["project"],

    // Bypass permissions for automation
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,

    // Configure MCP servers if provided
    ...(options.mcpServers ? { mcpServers: options.mcpServers } : {}),

    // Configure output format based on mode
    ...(options.mode === "review" && options.outputSchema
      ? {
          outputFormat: {
            type: "json_schema" as const,
            schema: options.outputSchema,
          },
        }
      : {}),

    // Merge any additional options
    ...options.additionalOptions,
  };

  // Log configuration
  console.error("[Query] Starting Claude query");
  console.error(`[Query]   Model: ${sdkOptions.model}`);
  console.error(`[Query]   CWD: ${sdkOptions.cwd}`);
  console.error(`[Query]   Mode: ${options.mode || "implementation"}`);
  console.error(`[Query]   Permission Mode: ${sdkOptions.permissionMode}`);
  if (options.mcpServers) {
    console.error(`[Query]   MCP Servers: ${Object.keys(options.mcpServers).join(", ")}`);
  }

  // Create and yield from the query
  const queryGenerator = query({
    prompt,
    options: sdkOptions,
  });

  // Stream all messages
  for await (const message of queryGenerator) {
    yield message;
  }
}
