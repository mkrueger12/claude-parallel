/**
 * Turso/libSQL client configuration and connection management.
 *
 * This module provides utilities for connecting to a Turso database
 * for conversation logging. Logging is optional - when credentials
 * are not configured, functions return null gracefully.
 *
 * In CI/CD environments (GitHub Actions), uses ephemeral embedded replicas
 * that sync to cloud at the end of each session.
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
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
 * Uses embedded replica (local SQLite + sync) for better performance.
 */
export function createTursoClient(config: TursoConfig): Client {
  // Generate unique local database path for this session
  const sessionId = crypto.randomUUID();
  const localDbPath = join(tmpdir(), `turso-session-${sessionId}.db`);

  return createClient({
    url: `file:${localDbPath}`, // Local SQLite file
    syncUrl: config.url, // Sync to Turso cloud
    authToken: config.authToken,
    syncInterval: 0, // Disable automatic sync - we'll sync manually
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
 * Sync the local embedded replica with Turso cloud.
 * This pushes all local data to the cloud database.
 * Returns true if sync was successful, false otherwise.
 */
export async function syncToCloud(): Promise<boolean> {
  if (!_client) {
    return false;
  }

  try {
    await _client.sync();
    console.error("[Turso] Successfully synced local data to cloud");
    return true;
  } catch (error) {
    console.error("[Turso] Failed to sync to cloud:", error);
    return false;
  }
}

/**
 * Close the Turso client connection.
 * Safe to call even if client was never created.
 * Does NOT sync before closing - call syncToCloud() explicitly if needed.
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
