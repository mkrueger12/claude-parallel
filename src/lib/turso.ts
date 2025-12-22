/**
 * Turso/libSQL client configuration and connection management.
 *
 * This module provides utilities for connecting to a Turso database
 * for conversation logging. Logging is optional - when credentials
 * are not configured, functions return null gracefully.
 */

import { type Client, createClient } from "@libsql/client";
import { SCHEMA_STATEMENTS, SCHEMA_VERSION } from "./turso-schema.js";

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

// Schema initialization state
let _schemaInitialized = false;

/**
 * Initialize the database schema.
 * This function is idempotent and can be called multiple times safely.
 * Returns true if initialization was successful or already done.
 * Returns false if Turso is not configured.
 */
export async function initializeSchema(): Promise<boolean> {
  if (_schemaInitialized) {
    return true;
  }

  const client = await getTursoClient();
  if (!client) {
    return false;
  }

  try {
    // Check current schema version
    const versionResult = await client
      .execute("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
      .catch(() => ({ rows: [] }));

    const currentVersion =
      versionResult.rows.length > 0 && versionResult.rows[0]?.version
        ? Number(versionResult.rows[0].version)
        : 0;

    if (currentVersion >= SCHEMA_VERSION) {
      _schemaInitialized = true;
      return true;
    }

    // Run all schema statements (idempotent due to IF NOT EXISTS)
    for (const statement of SCHEMA_STATEMENTS) {
      await client.execute(statement);
    }

    // Record schema version if not already present
    if (currentVersion < SCHEMA_VERSION) {
      await client.execute({
        sql: "INSERT OR REPLACE INTO schema_version (version) VALUES (?)",
        args: [SCHEMA_VERSION],
      });
    }

    _schemaInitialized = true;
    console.error(`[Turso] Schema initialized to version ${SCHEMA_VERSION}`);
    return true;
  } catch (error) {
    console.error("[Turso] Failed to initialize schema:", error);
    return false;
  }
}

/**
 * Reset schema initialization state.
 * Useful for testing or when reconnecting.
 */
export function resetSchemaState(): void {
  _schemaInitialized = false;
}
