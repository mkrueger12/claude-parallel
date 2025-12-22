/**
 * Turso database client module for local-first conversation logging.
 *
 * This module provides functions for creating local and remote Turso database clients,
 * initializing the schema, and syncing data to the cloud.
 */

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { type Client, createClient, type InValue } from "@libsql/client";

/**
 * SQL schema for sessions table
 */
export const SESSIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  duration_ms INTEGER,
  model TEXT,
  mode TEXT,
  prompt_length INTEGER,
  cwd TEXT,
  github_run_id TEXT,
  github_repository TEXT,
  github_ref TEXT,
  result_type TEXT,
  result_subtype TEXT,
  total_messages INTEGER,
  total_tool_calls INTEGER
)`;

/**
 * SQL schema for messages table
 */
export const MESSAGES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  type TEXT NOT NULL,
  subtype TEXT,
  raw_message TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
)`;

/**
 * SQL schema for tool_calls table
 */
export const TOOL_CALLS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_id TEXT,
  sequence INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  tool_input TEXT,
  tool_output TEXT,
  status TEXT,
  duration_ms INTEGER,
  error TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (message_id) REFERENCES messages(id)
)`;

/**
 * SQL for indexes on common queries
 */
export const INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
CREATE INDEX IF NOT EXISTS idx_tool_calls_session ON tool_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_name ON tool_calls(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_calls_status ON tool_calls(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at)`;

/**
 * Initialize database schema by creating all tables and indexes
 *
 * @param client - The database client to initialize
 */
async function initializeSchema(client: Client): Promise<void> {
  try {
    // Create tables
    await client.execute(SESSIONS_TABLE_SQL);
    await client.execute(MESSAGES_TABLE_SQL);
    await client.execute(TOOL_CALLS_TABLE_SQL);

    // Create indexes (split into individual statements)
    const indexes = INDEXES_SQL.split(";").filter((sql) => sql.trim());
    for (const indexSql of indexes) {
      await client.execute(indexSql);
    }
  } catch (error) {
    console.error("Error initializing database schema:", error);
    throw error;
  }
}

/**
 * Create a local database client for a specific session
 *
 * Creates the .turso/sessions/ directory if it doesn't exist and returns
 * a client connected to a local SQLite database file.
 *
 * @param sessionId - Unique identifier for the session
 * @returns Promise resolving to an initialized database client
 */
export async function createLocalClient(sessionId: string): Promise<Client> {
  try {
    // Create .turso/sessions directory if it doesn't exist
    const sessionsDir = join(process.cwd(), ".turso", "sessions");
    if (!existsSync(sessionsDir)) {
      mkdirSync(sessionsDir, { recursive: true });
    }

    // Create database file path
    const dbPath = join(sessionsDir, `${sessionId}.db`);

    // Create client with file: URL
    const client = createClient({
      url: `file:${dbPath}`,
    });

    // Initialize schema
    await initializeSchema(client);

    return client;
  } catch (error) {
    console.error(`Error creating local client for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Create a remote Turso database client
 *
 * Checks for TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables.
 * Returns null if credentials are missing.
 *
 * @returns Promise resolving to a database client or null if credentials missing
 */
export async function createRemoteClient(): Promise<Client | null> {
  const databaseUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!databaseUrl || !authToken) {
    console.warn(
      "Warning: Turso cloud credentials not found. " +
        "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to enable cloud sync."
    );
    return null;
  }

  try {
    const client = createClient({
      url: databaseUrl,
      authToken: authToken,
    });

    // Initialize schema on remote database
    await initializeSchema(client);

    return client;
  } catch (error) {
    console.error("Error creating remote client:", error);
    return null;
  }
}

/**
 * Sync data from local database to remote cloud database
 *
 * Reads all rows from the local database and inserts them into the remote
 * database using batch operations. Handles errors gracefully.
 *
 * @param localClient - The local database client to read from
 * @param remoteClient - The remote database client to write to
 * @param sessionId - The session ID to sync
 * @returns Promise resolving to true if sync succeeded, false otherwise
 */
export async function syncToCloud(
  localClient: Client,
  remoteClient: Client,
  sessionId: string
): Promise<boolean> {
  try {
    // Read all sessions for this session ID
    const sessionsResult = await localClient.execute({
      sql: "SELECT * FROM sessions WHERE id = ?",
      args: [sessionId],
    });

    // Read all messages for this session
    const messagesResult = await localClient.execute({
      sql: "SELECT * FROM messages WHERE session_id = ?",
      args: [sessionId],
    });

    // Read all tool calls for this session
    const toolCallsResult = await localClient.execute({
      sql: "SELECT * FROM tool_calls WHERE session_id = ?",
      args: [sessionId],
    });

    // Prepare batch insert statements
    const statements: Array<{ sql: string; args: InValue[] }> = [];

    // Insert sessions
    for (const row of sessionsResult.rows) {
      statements.push({
        sql: `INSERT OR REPLACE INTO sessions (
          id, started_at, ended_at, duration_ms, model, mode,
          prompt_length, cwd, github_run_id, github_repository,
          github_ref, result_type, result_subtype, total_messages,
          total_tool_calls
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          row.id ?? null,
          row.started_at ?? null,
          row.ended_at ?? null,
          row.duration_ms ?? null,
          row.model ?? null,
          row.mode ?? null,
          row.prompt_length ?? null,
          row.cwd ?? null,
          row.github_run_id ?? null,
          row.github_repository ?? null,
          row.github_ref ?? null,
          row.result_type ?? null,
          row.result_subtype ?? null,
          row.total_messages ?? null,
          row.total_tool_calls ?? null,
        ] as InValue[],
      });
    }

    // Insert messages
    for (const row of messagesResult.rows) {
      statements.push({
        sql: `INSERT OR REPLACE INTO messages (
          id, session_id, sequence, timestamp, type, subtype, raw_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          row.id ?? null,
          row.session_id ?? null,
          row.sequence ?? null,
          row.timestamp ?? null,
          row.type ?? null,
          row.subtype ?? null,
          row.raw_message ?? null,
        ] as InValue[],
      });
    }

    // Insert tool calls
    for (const row of toolCallsResult.rows) {
      statements.push({
        sql: `INSERT OR REPLACE INTO tool_calls (
          id, session_id, message_id, sequence, timestamp, tool_name,
          tool_input, tool_output, status, duration_ms, error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          row.id ?? null,
          row.session_id ?? null,
          row.message_id ?? null,
          row.sequence ?? null,
          row.timestamp ?? null,
          row.tool_name ?? null,
          row.tool_input ?? null,
          row.tool_output ?? null,
          row.status ?? null,
          row.duration_ms ?? null,
          row.error ?? null,
        ] as InValue[],
      });
    }

    // Execute batch insert
    if (statements.length > 0) {
      await remoteClient.batch(statements, "write");
      console.error(
        `Successfully synced ${statements.length} records to cloud for session ${sessionId}`
      );
    }

    return true;
  } catch (error) {
    console.error(`Error syncing session ${sessionId} to cloud:`, error);
    return false;
  }
}
