/**
 * Simplified authentication module for OpenCode SDK.
 * Handles OAuth (Anthropic) and API key authentication (all providers).
 */

/**
 * Supported AI providers
 */
export type Provider = "anthropic" | "openai" | "google";

/**
 * OpenCode client interface (minimal auth subset)
 */
export interface OpencodeClient {
  auth: {
    set(options: {
      path: { id: string };
      body: {
        type: "oauth" | "api";
        access?: string;
        refresh?: string;
        expires?: number;
        key?: string;
      };
    }): Promise<{ data?: boolean; error?: unknown }>;
  };
}

/**
 * Setup authentication for a specific provider
 *
 * @param client - OpenCode client instance
 * @param provider - The AI provider to authenticate (anthropic, openai, google)
 * @throws Error if required credentials are missing
 */
export async function setupAuth(client: OpencodeClient, provider: Provider): Promise<void> {
  switch (provider) {
    case "anthropic":
      await setupAnthropicAuth(client);
      break;
    case "openai":
      await setupOpenAIAuth(client);
      break;
    case "google":
      await setupGoogleAuth(client);
      break;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Setup Anthropic authentication (OAuth preferred, API key fallback)
 */
async function setupAnthropicAuth(client: OpencodeClient): Promise<void> {
  // Try OAuth first
  const oauthAccess = process.env.ANTHROPIC_OAUTH_ACCESS;
  const oauthRefresh = process.env.ANTHROPIC_OAUTH_REFRESH;
  const oauthExpires = process.env.ANTHROPIC_OAUTH_EXPIRES;

  if (oauthAccess && oauthRefresh && oauthExpires) {
    const expires = Number.parseInt(oauthExpires, 10);
    if (Number.isNaN(expires)) {
      throw new Error(
        "Error: ANTHROPIC_OAUTH_EXPIRES must be a valid number (Unix timestamp in milliseconds)"
      );
    }

    await client.auth.set({
      path: { id: "anthropic" },
      body: {
        type: "oauth",
        access: oauthAccess,
        refresh: oauthRefresh,
        expires,
      },
    });

    console.error("✓ Anthropic authentication configured (OAuth)");
    return;
  }

  // Fall back to API key
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN;

  if (!apiKey) {
    throw new Error(
      [
        "Error: No authentication credentials found for Anthropic",
        "Please set one of the following:",
        "  OAuth (preferred):",
        "    - ANTHROPIC_OAUTH_ACCESS",
        "    - ANTHROPIC_OAUTH_REFRESH",
        "    - ANTHROPIC_OAUTH_EXPIRES",
        "  OR API Key:",
        "    - ANTHROPIC_API_KEY",
        "    - CLAUDE_CODE_OAUTH_TOKEN",
      ].join("\n")
    );
  }

  await client.auth.set({
    path: { id: "anthropic" },
    body: {
      type: "api",
      key: apiKey,
    },
  });

  console.error("✓ Anthropic authentication configured (API key)");
}

/**
 * Setup OpenAI authentication (API key only)
 */
async function setupOpenAIAuth(client: OpencodeClient): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      [
        "Error: No API key found for OpenAI",
        "Please set the following environment variable:",
        "  - OPENAI_API_KEY",
      ].join("\n")
    );
  }

  await client.auth.set({
    path: { id: "openai" },
    body: {
      type: "api",
      key: apiKey,
    },
  });

  console.error("✓ OpenAI authentication configured (API key)");
}

/**
 * Setup Google authentication (API key only)
 */
async function setupGoogleAuth(client: OpencodeClient): Promise<void> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      [
        "Error: No API key found for Google",
        "Please set the following environment variable:",
        "  - GOOGLE_GENERATIVE_AI_API_KEY",
      ].join("\n")
    );
  }

  await client.auth.set({
    path: { id: "google" },
    body: {
      type: "api",
      key: apiKey,
    },
  });

  console.error("✓ Google authentication configured (API key)");
}
