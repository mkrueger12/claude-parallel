/**
 * Turso/libSQL client configuration and connection management.
 *
 * This module provides utilities for connecting to a Turso database
 * for conversation logging. Logging is optional - when credentials
 * are not configured, functions return null gracefully.
 */

import { type Client, createClient } from "@libsql/client";

export interface TursoConfig {
  url: string;
  authToken: string;
}

/**
 * Get Turso configuration from environment variables.
 * Returns null if credentials are not configured (logging disabled).
 */
export function getTursoConfig(): TursoConfig | null {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    return null;
  }

  return { url, authToken };
}

/**
 * Create a new Turso client with the provided configuration.
 */
export function createTursoClient(config: TursoConfig): Client {
  return createClient({
    url: config.url,
    authToken: config.authToken,
  });
}

// Singleton client instance
let _client: Client | null = null;

/**
 * Get the shared Turso client instance.
 * Returns null if Turso is not configured.
 * Creates the client on first call (lazy initialization).
 */
export async function getTursoClient(): Promise<Client | null> {
  const config = getTursoConfig();
  if (!config) {
    return null;
  }

  if (!_client) {
    _client = createTursoClient(config);
  }
  return _client;
}

/**
 * Close the Turso client connection.
 * Safe to call even if client was never created.
 */
export function closeTursoClient(): void {
  if (_client) {
    _client.close();
    _client = null;
  }
}
