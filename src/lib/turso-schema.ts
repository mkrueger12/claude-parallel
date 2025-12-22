/**
 * Turso database schema definitions and migration logic.
 *
 * This module defines the database schema for conversation logging
 * and provides idempotent migration functions.
 */

export const SCHEMA_VERSION = 1;

/**
 * SQL statements for creating the conversation logging schema.
 * All statements use IF NOT EXISTS for idempotent execution.
 */
export const SCHEMA_STATEMENTS = [
  // Schema version tracking
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // Sessions table - tracks agent execution sessions
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    agent_type TEXT NOT NULL,
    model TEXT NOT NULL,
    provider TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    error_message TEXT,
    metadata TEXT
  )`,

  // Messages table - stores conversation messages
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT,
    tool_name TEXT,
    tool_input TEXT,
    tool_output TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    token_count INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  )`,

  // Tool executions table - tracks individual tool calls
  `CREATE TABLE IF NOT EXISTS tool_executions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    message_id TEXT,
    tool_name TEXT NOT NULL,
    status TEXT NOT NULL,
    input TEXT,
    output TEXT,
    error TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    duration_ms INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (message_id) REFERENCES messages(id)
  )`,

  // Indexes for query performance
  "CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)",
  "CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)",
  "CREATE INDEX IF NOT EXISTS idx_tool_executions_session ON tool_executions(session_id)",
  "CREATE INDEX IF NOT EXISTS idx_tool_executions_started ON tool_executions(started_at)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_agent_type ON sessions(agent_type)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at)",
];
