/**
 * Conversation logger for storing agent interactions in Turso.
 *
 * This class provides methods for logging sessions, messages, and tool
 * executions to a Turso database. All operations are fire-and-forget
 * to avoid impacting agent performance.
 */

import type { Client } from "@libsql/client";

export interface SessionInfo {
  id: string;
  agentType: string;
  model: string;
  provider?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolExecutionInfo {
  toolName: string;
  status: "running" | "completed" | "error";
  input?: unknown;
  output?: unknown;
  error?: string;
  startedAt?: Date;
  endedAt?: Date;
}

export class ConversationLogger {
  private client: Client;
  private sessionId: string | null = null;
  private messageSequence = 0;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Start a new logging session.
   */
  async startSession(info: SessionInfo): Promise<void> {
    this.sessionId = info.id;
    this.messageSequence = 0;

    try {
      await this.client.execute({
        sql: `INSERT INTO sessions (id, agent_type, model, provider, metadata)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          info.id,
          info.agentType,
          info.model,
          info.provider || null,
          info.metadata ? JSON.stringify(info.metadata) : null,
        ],
      });
    } catch (error) {
      console.error("[ConversationLogger] Failed to start session:", error);
    }
  }

  /**
   * Log a conversation message (user prompt or assistant response).
   */
  async logMessage(
    role: "user" | "assistant" | "tool",
    content: string,
    options?: { toolName?: string; toolInput?: unknown; toolOutput?: unknown; tokenCount?: number }
  ): Promise<string | null> {
    if (!this.sessionId) {
      console.error("[ConversationLogger] No active session");
      return null;
    }

    const id = crypto.randomUUID();
    try {
      await this.client.execute({
        sql: `INSERT INTO messages (id, session_id, sequence, role, content, tool_name, tool_input, tool_output, token_count)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          this.sessionId,
          ++this.messageSequence,
          role,
          content,
          options?.toolName || null,
          options?.toolInput ? JSON.stringify(options.toolInput) : null,
          options?.toolOutput ? JSON.stringify(options.toolOutput) : null,
          options?.tokenCount || null,
        ],
      });
      return id;
    } catch (error) {
      console.error("[ConversationLogger] Failed to log message:", error);
      return null;
    }
  }

  /**
   * Log a tool execution event.
   */
  async logToolExecution(info: ToolExecutionInfo): Promise<string | null> {
    if (!this.sessionId) {
      console.error("[ConversationLogger] No active session");
      return null;
    }

    const id = crypto.randomUUID();
    const durationMs =
      info.startedAt && info.endedAt ? info.endedAt.getTime() - info.startedAt.getTime() : null;

    try {
      await this.client.execute({
        sql: `INSERT INTO tool_executions (id, session_id, tool_name, status, input, output, error, started_at, ended_at, duration_ms)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          this.sessionId,
          info.toolName,
          info.status,
          info.input ? JSON.stringify(info.input) : null,
          info.output ? JSON.stringify(info.output) : null,
          info.error || null,
          info.startedAt?.toISOString() || new Date().toISOString(),
          info.endedAt?.toISOString() || null,
          durationMs,
        ],
      });
      return id;
    } catch (error) {
      console.error("[ConversationLogger] Failed to log tool execution:", error);
      return null;
    }
  }

  /**
   * End the current session.
   */
  async endSession(status: "completed" | "error", errorMessage?: string): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    try {
      await this.client.execute({
        sql: `UPDATE sessions SET status = ?, error_message = ?, ended_at = datetime('now')
              WHERE id = ?`,
        args: [status, errorMessage || null, this.sessionId],
      });
    } catch (error) {
      console.error("[ConversationLogger] Failed to end session:", error);
    }
  }

  /**
   * Sync local embedded replica to cloud.
   * Should be called at the end of each session to persist data.
   */
  async syncToCloud(): Promise<boolean> {
    try {
      await this.client.sync();
      console.error("[ConversationLogger] Synced session data to cloud");
      return true;
    } catch (error) {
      console.error("[ConversationLogger] Failed to sync to cloud:", error);
      return false;
    }
  }

  /**
   * Get the current session ID.
   */
  getSessionId(): string | null {
    return this.sessionId;
  }
}

/**
 * Create a conversation logger if Turso is configured.
 * Returns null if logging is disabled.
 */
export async function createConversationLogger(): Promise<ConversationLogger | null> {
  // Import dynamically to avoid circular dependencies
  const { getTursoClient, initializeSchema } = await import("./turso.js");

  const client = await getTursoClient();
  if (!client) {
    return null;
  }

  // Ensure schema is initialized
  await initializeSchema();

  return new ConversationLogger(client);
}
