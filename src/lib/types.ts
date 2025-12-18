/**
 * Shared TypeScript interfaces and types for the multi-provider plan generation system.
 */

/**
 * Message part from OpenCode SDK responses
 */
export interface Part {
  type: string;
  text?: string;
  [key: string]: any;
}

/**
 * Provider configuration options
 */
export interface ProviderConfig {
  apiKey: string;
  timeout?: boolean;
}

/**
 * Supported AI providers
 */
export type Provider = 'anthropic' | 'openai' | 'google';

/**
 * Provider-specific default models
 */
export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-opus-4-5",
  openai: "gpt-5.2-pro",
  google: "gemini-2.5-flash",
};

/**
 * Environment variable names for API keys by provider
 */
export const API_KEY_ENV_VARS: Record<Provider, string[]> = {
  anthropic: ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN'],
  openai: ['OPENAI_API_KEY'],
  google: ['GOOGLE_GENERATIVE_AI_API_KEY'],
};
