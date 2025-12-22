/**
 * Query utilities for retrieving logged conversations from Turso.
 *
 * These functions provide read-only access to the conversation logs
 * for analytics, debugging, and audit purposes.
 */

import type { Client } from "@libsql/client";

/**
 * Summary of a logged session.
 */
export interface SessionSummary {
  id: string;
  agentType: string;
  model: string;
  provider: string | null;
  startedAt: string;
  endedAt: string | null;
  status: string;
  messageCount: number;
  toolCount: number;
}

/**
 * Detailed view of a session with messages and tool executions.
 */
export interface SessionDetail extends Omit<SessionSummary, "messageCount" | "toolCount"> {
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  messages: Array<{
    id: string;
    sequence: number;
    role: string;
    content: string | null;
    toolName: string | null;
    toolInput: unknown | null;
    toolOutput: unknown | null;
    createdAt: string;
    tokenCount: number | null;
  }>;
  toolExecutions: Array<{
    id: string;
    toolName: string;
    status: string;
    input: unknown | null;
    output: unknown | null;
    error: string | null;
    startedAt: string;
    endedAt: string | null;
    durationMs: number | null;
  }>;
}

/**
 * Options for listing sessions.
 */
export interface ListSessionsOptions {
  /** Maximum number of sessions to return (default: 50) */
  limit?: number;
  /** Number of sessions to skip (default: 0) */
  offset?: number;
  /** Filter by agent type */
  agentType?: string;
  /** Filter by status */
  status?: string;
  /** Only include sessions started after this date */
  startedAfter?: string;
  /** Only include sessions started before this date */
  startedBefore?: string;
}

/**
 * List logged sessions with optional filtering.
 */
export async function listSessions(
  client: Client,
  options: ListSessionsOptions = {}
): Promise<SessionSummary[]> {
  const { limit = 50, offset = 0, agentType, status, startedAfter, startedBefore } = options;

  // Build WHERE clause
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (agentType) {
    conditions.push("s.agent_type = ?");
    args.push(agentType);
  }
  if (status) {
    conditions.push("s.status = ?");
    args.push(status);
  }
  if (startedAfter) {
    conditions.push("s.started_at >= ?");
    args.push(startedAfter);
  }
  if (startedBefore) {
    conditions.push("s.started_at <= ?");
    args.push(startedBefore);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      s.id,
      s.agent_type as agentType,
      s.model,
      s.provider,
      s.started_at as startedAt,
      s.ended_at as endedAt,
      s.status,
      COUNT(DISTINCT m.id) as messageCount,
      COUNT(DISTINCT t.id) as toolCount
    FROM sessions s
    LEFT JOIN messages m ON m.session_id = s.id
    LEFT JOIN tool_executions t ON t.session_id = s.id
    ${whereClause}
    GROUP BY s.id
    ORDER BY s.started_at DESC
    LIMIT ? OFFSET ?
  `;

  args.push(limit, offset);

  const result = await client.execute({ sql, args });

  return result.rows.map((row) => ({
    id: String(row.id),
    agentType: String(row.agentType),
    model: String(row.model),
    provider: row.provider ? String(row.provider) : null,
    startedAt: String(row.startedAt),
    endedAt: row.endedAt ? String(row.endedAt) : null,
    status: String(row.status),
    messageCount: Number(row.messageCount),
    toolCount: Number(row.toolCount),
  }));
}

/**
 * Get detailed information about a specific session.
 */
export async function getSession(client: Client, sessionId: string): Promise<SessionDetail | null> {
  // Get session info
  const sessionResult = await client.execute({
    sql: `
      SELECT
        id, agent_type as agentType, model, provider,
        started_at as startedAt, ended_at as endedAt,
        status, error_message as errorMessage, metadata
      FROM sessions WHERE id = ?
    `,
    args: [sessionId],
  });

  if (sessionResult.rows.length === 0) {
    return null;
  }

  // Parse JSON fields safely
  const parseJson = (value: unknown): unknown | null => {
    if (!value || typeof value !== "string") return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const session = sessionResult.rows[0];
  if (!session) {
    return null;
  }

  // Get messages
  const messagesResult = await client.execute({
    sql: `
      SELECT
        id, sequence, role, content, tool_name as toolName,
        tool_input as toolInput, tool_output as toolOutput,
        created_at as createdAt, token_count as tokenCount
      FROM messages
      WHERE session_id = ?
      ORDER BY sequence ASC
    `,
    args: [sessionId],
  });

  // Get tool executions
  const toolsResult = await client.execute({
    sql: `
      SELECT
        id, tool_name as toolName, status, input, output, error,
        started_at as startedAt, ended_at as endedAt, duration_ms as durationMs
      FROM tool_executions
      WHERE session_id = ?
      ORDER BY started_at ASC
    `,
    args: [sessionId],
  });

  return {
    id: String(session.id),
    agentType: String(session.agentType),
    model: String(session.model),
    provider: session.provider ? String(session.provider) : null,
    startedAt: String(session.startedAt),
    endedAt: session.endedAt ? String(session.endedAt) : null,
    status: String(session.status),
    errorMessage: session.errorMessage ? String(session.errorMessage) : null,
    metadata: parseJson(session.metadata) as Record<string, unknown> | null,
    messages: messagesResult.rows.map((row) => ({
      id: String(row.id),
      sequence: Number(row.sequence),
      role: String(row.role),
      content: row.content ? String(row.content) : null,
      toolName: row.toolName ? String(row.toolName) : null,
      toolInput: parseJson(row.toolInput),
      toolOutput: parseJson(row.toolOutput),
      createdAt: String(row.createdAt),
      tokenCount: row.tokenCount ? Number(row.tokenCount) : null,
    })),
    toolExecutions: toolsResult.rows.map((row) => ({
      id: String(row.id),
      toolName: String(row.toolName),
      status: String(row.status),
      input: parseJson(row.input),
      output: parseJson(row.output),
      error: row.error ? String(row.error) : null,
      startedAt: String(row.startedAt),
      endedAt: row.endedAt ? String(row.endedAt) : null,
      durationMs: row.durationMs ? Number(row.durationMs) : null,
    })),
  };
}

/**
 * Search sessions by content in messages.
 */
export async function searchSessions(
  client: Client,
  query: string,
  options: { limit?: number } = {}
): Promise<SessionSummary[]> {
  const { limit = 20 } = options;
  const searchPattern = `%${query}%`;

  const result = await client.execute({
    sql: `
      SELECT DISTINCT
        s.id,
        s.agent_type as agentType,
        s.model,
        s.provider,
        s.started_at as startedAt,
        s.ended_at as endedAt,
        s.status,
        (SELECT COUNT(*) FROM messages WHERE session_id = s.id) as messageCount,
        (SELECT COUNT(*) FROM tool_executions WHERE session_id = s.id) as toolCount
      FROM sessions s
      JOIN messages m ON m.session_id = s.id
      WHERE m.content LIKE ?
      ORDER BY s.started_at DESC
      LIMIT ?
    `,
    args: [searchPattern, limit],
  });

  return result.rows.map((row) => ({
    id: String(row.id),
    agentType: String(row.agentType),
    model: String(row.model),
    provider: row.provider ? String(row.provider) : null,
    startedAt: String(row.startedAt),
    endedAt: row.endedAt ? String(row.endedAt) : null,
    status: String(row.status),
    messageCount: Number(row.messageCount),
    toolCount: Number(row.toolCount),
  }));
}

/**
 * Get session statistics.
 */
export async function getSessionStats(
  client: Client,
  options: { agentType?: string; since?: string } = {}
): Promise<{
  totalSessions: number;
  completedSessions: number;
  errorSessions: number;
  totalMessages: number;
  totalToolExecutions: number;
  avgMessagesPerSession: number;
}> {
  const conditions: string[] = [];
  const args: string[] = [];

  if (options.agentType) {
    conditions.push("s.agent_type = ?");
    args.push(options.agentType);
  }
  if (options.since) {
    conditions.push("s.started_at >= ?");
    args.push(options.since);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await client.execute({
    sql: `
      SELECT
        COUNT(DISTINCT s.id) as totalSessions,
        SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as completedSessions,
        SUM(CASE WHEN s.status = 'error' THEN 1 ELSE 0 END) as errorSessions,
        (SELECT COUNT(*) FROM messages m JOIN sessions s2 ON m.session_id = s2.id ${whereClause}) as totalMessages,
        (SELECT COUNT(*) FROM tool_executions t JOIN sessions s3 ON t.session_id = s3.id ${whereClause}) as totalToolExecutions
      FROM sessions s
      ${whereClause}
    `,
    args: [...args, ...args, ...args],
  });

  const row = result.rows[0];
  if (!row) {
    return {
      totalSessions: 0,
      completedSessions: 0,
      errorSessions: 0,
      totalMessages: 0,
      totalToolExecutions: 0,
      avgMessagesPerSession: 0,
    };
  }

  const totalSessions = Number(row.totalSessions) || 0;
  const totalMessages = Number(row.totalMessages) || 0;

  return {
    totalSessions,
    completedSessions: Number(row.completedSessions) || 0,
    errorSessions: Number(row.errorSessions) || 0,
    totalMessages,
    totalToolExecutions: Number(row.totalToolExecutions) || 0,
    avgMessagesPerSession: totalSessions > 0 ? totalMessages / totalSessions : 0,
  };
}
