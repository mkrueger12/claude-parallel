/**
 * Tests for authentication credential retrieval
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getAuthCredentials } from "../utils.js";

describe("getAuthCredentials", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all authentication-related env vars
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    delete process.env.ANTHROPIC_OAUTH_ACCESS;
    delete process.env.ANTHROPIC_OAUTH_REFRESH;
    delete process.env.ANTHROPIC_OAUTH_EXPIRES;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe("OAuth credentials (Anthropic only)", () => {
    test("returns oauth credentials for anthropic when all OAuth vars are set", () => {
      process.env.ANTHROPIC_OAUTH_ACCESS = "test-access-token";
      process.env.ANTHROPIC_OAUTH_REFRESH = "test-refresh-token";
      process.env.ANTHROPIC_OAUTH_EXPIRES = "1234567890";

      const result = getAuthCredentials("anthropic");

      expect(result).toEqual({
        type: "oauth",
        oauth: {
          access: "test-access-token",
          refresh: "test-refresh-token",
          expires: 1234567890,
        },
      });
    });

    test("returns null when only some OAuth vars are set", () => {
      process.env.ANTHROPIC_OAUTH_ACCESS = "test-access-token";
      process.env.ANTHROPIC_OAUTH_REFRESH = "test-refresh-token";
      // Missing ANTHROPIC_OAUTH_EXPIRES

      const result = getAuthCredentials("anthropic");

      expect(result).toBeNull();
    });

    test("returns null when OAuth expires is not a valid number", () => {
      process.env.ANTHROPIC_OAUTH_ACCESS = "test-access-token";
      process.env.ANTHROPIC_OAUTH_REFRESH = "test-refresh-token";
      process.env.ANTHROPIC_OAUTH_EXPIRES = "not-a-number";

      const result = getAuthCredentials("anthropic");

      expect(result).toBeNull();
    });

    test("OAuth takes precedence over API key when both are set", () => {
      process.env.ANTHROPIC_API_KEY = "test-api-key";
      process.env.ANTHROPIC_OAUTH_ACCESS = "test-access-token";
      process.env.ANTHROPIC_OAUTH_REFRESH = "test-refresh-token";
      process.env.ANTHROPIC_OAUTH_EXPIRES = "1234567890";

      const result = getAuthCredentials("anthropic");

      expect(result).toEqual({
        type: "oauth",
        oauth: {
          access: "test-access-token",
          refresh: "test-refresh-token",
          expires: 1234567890,
        },
      });
    });
  });

  describe("API key credentials", () => {
    test("returns API key for anthropic when ANTHROPIC_API_KEY is set", () => {
      process.env.ANTHROPIC_API_KEY = "test-api-key";

      const result = getAuthCredentials("anthropic");

      expect(result).toEqual({
        type: "api",
        apiKey: "test-api-key",
      });
    });

    test("returns API key for anthropic when CLAUDE_CODE_OAUTH_TOKEN is set", () => {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = "test-oauth-token";

      const result = getAuthCredentials("anthropic");

      expect(result).toEqual({
        type: "api",
        apiKey: "test-oauth-token",
      });
    });

    test("prioritizes ANTHROPIC_API_KEY over CLAUDE_CODE_OAUTH_TOKEN", () => {
      process.env.ANTHROPIC_API_KEY = "test-api-key";
      process.env.CLAUDE_CODE_OAUTH_TOKEN = "test-oauth-token";

      const result = getAuthCredentials("anthropic");

      expect(result).toEqual({
        type: "api",
        apiKey: "test-api-key",
      });
    });

    test("returns API key for openai when OPENAI_API_KEY is set", () => {
      process.env.OPENAI_API_KEY = "test-openai-key";

      const result = getAuthCredentials("openai");

      expect(result).toEqual({
        type: "api",
        apiKey: "test-openai-key",
      });
    });

    test("returns API key for google when GOOGLE_GENERATIVE_AI_API_KEY is set", () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-google-key";

      const result = getAuthCredentials("google");

      expect(result).toEqual({
        type: "api",
        apiKey: "test-google-key",
      });
    });
  });

  describe("Non-anthropic providers ignore OAuth", () => {
    test("returns API key for openai even when Anthropic OAuth vars are set", () => {
      process.env.ANTHROPIC_OAUTH_ACCESS = "test-access-token";
      process.env.ANTHROPIC_OAUTH_REFRESH = "test-refresh-token";
      process.env.ANTHROPIC_OAUTH_EXPIRES = "1234567890";
      process.env.OPENAI_API_KEY = "test-openai-key";

      const result = getAuthCredentials("openai");

      expect(result).toEqual({
        type: "api",
        apiKey: "test-openai-key",
      });
    });

    test("returns API key for google even when Anthropic OAuth vars are set", () => {
      process.env.ANTHROPIC_OAUTH_ACCESS = "test-access-token";
      process.env.ANTHROPIC_OAUTH_REFRESH = "test-refresh-token";
      process.env.ANTHROPIC_OAUTH_EXPIRES = "1234567890";
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-google-key";

      const result = getAuthCredentials("google");

      expect(result).toEqual({
        type: "api",
        apiKey: "test-google-key",
      });
    });
  });

  describe("No credentials", () => {
    test("returns null when no credentials are available for anthropic", () => {
      const result = getAuthCredentials("anthropic");

      expect(result).toBeNull();
    });

    test("returns null when no credentials are available for openai", () => {
      const result = getAuthCredentials("openai");

      expect(result).toBeNull();
    });

    test("returns null when no credentials are available for google", () => {
      const result = getAuthCredentials("google");

      expect(result).toBeNull();
    });
  });
});
