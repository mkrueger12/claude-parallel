/**
 * Shared utility functions for the multi-provider plan generation system.
 */

import { Part, Provider, API_KEY_ENV_VARS } from './types.js';

/**
 * Extract text from message parts
 *
 * @param parts - Array of message parts from OpenCode SDK
 * @returns Concatenated text from all text-type parts
 */
export function extractTextFromParts(parts: Part[]): string {
  if (!Array.isArray(parts)) return '';

  return parts
    .filter(part => part.type === 'text')
    .map(part => part.text || '')
    .join('\n');
}

/**
 * Validate that all required environment variables are set
 *
 * @param requiredVars - Array of environment variable names to check
 * @throws Error if any required variables are missing
 */
export function validateEnvVars(requiredVars: string[]): void {
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    const errorMsg = [
      'Error: Missing required environment variables:',
      ...missingVars.map(varName => `  - ${varName}`),
      '',
      'Please set all required environment variables and try again.',
    ].join('\n');

    throw new Error(errorMsg);
  }
}

/**
 * Get API key from environment variables for a specific provider
 *
 * @param provider - The AI provider (anthropic, openai, google)
 * @returns The API key for the provider
 * @throws Error if no API key is found for the provider
 */
export function getApiKey(provider: Provider): string {
  const envVars = API_KEY_ENV_VARS[provider];

  for (const envVar of envVars) {
    const apiKey = process.env[envVar];
    if (apiKey) {
      return apiKey;
    }
  }

  const errorMsg = [
    `Error: No API key found for provider "${provider}"`,
    `Required environment variables (at least one):`,
    ...envVars.map(envVar => `  - ${envVar}`),
  ].join('\n');

  throw new Error(errorMsg);
}

/**
 * Validate that a provider is supported
 *
 * @param provider - The provider name to validate
 * @throws Error if the provider is not supported
 */
export function validateProvider(provider: string): asserts provider is Provider {
  const validProviders: Provider[] = ['anthropic', 'openai', 'google'];

  if (!validProviders.includes(provider as Provider)) {
    throw new Error(
      `Error: Unsupported provider "${provider}". ` +
      `Supported providers: ${validProviders.join(', ')}`
    );
  }
}
