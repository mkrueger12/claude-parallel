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

/**
 * Supported programming languages for AST-Grep
 */
export type AstGrepLanguage =
  | 'js' | 'jsx' | 'ts' | 'tsx'
  | 'py' | 'python'
  | 'go'
  | 'rs' | 'rust'
  | 'c' | 'cpp' | 'cxx'
  | 'java'
  | 'cs' | 'csharp'
  | 'rb' | 'ruby'
  | 'php'
  | 'swift'
  | 'kt' | 'kotlin'
  | 'html'
  | 'css'
  | 'json';

/**
 * Position range information for AST-Grep matches
 */
export interface AstGrepRange {
  byteOffset: {
    start: number;
    end: number;
  };
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number;
    column: number;
  };
}

/**
 * Metavariable capture from AST-Grep pattern matching
 */
export interface AstGrepMetaVariable {
  text: string;
  range: AstGrepRange;
}

/**
 * AST-Grep match result
 */
export interface AstGrepMatch {
  text: string;
  range: AstGrepRange;
  file: string;
  lines: string;
  language?: string;
  metaVariables?: Record<string, AstGrepMetaVariable>;
}
