/**
 * Public API exports for the multi-provider plan generation system.
 *
 * This module provides programmatic access to the planning and linear agents,
 * as well as shared utilities and types.
 */

// Export Claude Agent SDK helpers
export type { AuthConfig, ClaudeQueryOptions } from "./lib/claude-agent-sdk.js";
export {
  getAuthentication,
  runClaudeQuery,
} from "./lib/claude-agent-sdk.js";
// Export conversation logging utilities
export * from "./lib/conversation-logger.js";
// Export OpenCode helpers
export type { OpencodeServerOptions } from "./lib/opencode.js";
export {
  createOpencodeServer,
  setupEventMonitoring,
} from "./lib/opencode.js";
// Export Turso client and schema utilities
export * from "./lib/turso.js";
export * from "./lib/turso-schema.js";
// Export all types
export type { Part, Provider, ProviderConfig } from "./lib/types.js";
export { API_KEY_ENV_VARS, DEFAULT_MODELS } from "./lib/types.js";
// Export all utility functions
export {
  extractTextFromParts,
  getApiKey,
  validateEnvVars,
  validateProvider,
} from "./lib/utils.js";
