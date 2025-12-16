/**
 * Public API exports for the multi-provider plan generation system.
 *
 * This module provides programmatic access to the planning and linear agents,
 * as well as shared utilities and types.
 */

// Export all types
export type { Part, Provider, ProviderConfig } from './lib/types.js';
export { DEFAULT_MODELS, API_KEY_ENV_VARS } from './lib/types.js';

// Export all utility functions
export {
  extractTextFromParts,
  validateEnvVars,
  getApiKey,
  validateProvider,
} from './lib/utils.js';

// Export OpenCode helpers
export type { OpencodeServerOptions } from './lib/opencode.js';
export {
  createOpencodeServer,
  setupEventMonitoring,
} from './lib/opencode.js';
