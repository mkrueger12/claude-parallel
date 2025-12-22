/**
 * Conversation logger module for capturing agent sessions to Turso database.
 *
 * This module provides the ConversationLogger class for high-level session and
 * message logging operations. It wraps the turso-client module and provides
 * error handling to ensure database failures never crash agent execution.
 */

import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Client } from "@libsql/client";
import { createLocalClient, createRemoteClient, syncToCloud } from "./turso-client.js";

/**
 * Metadata for a session
 */
export interface SessionMetadata {
  model: string;
  mode: string;
  promptLength: number;
  cwd: string;
  githubRunId?: string;
  githubRepository?: string;
  githubRef?: string;
}

/**
 * Data for a tool call
 */
export interface ToolCallData {
  id: string;
  sessionId: string;
  messageId?: string;
  sequence: number;
  timestamp: number;
  toolName: string;
  toolInput?: string;
  toolOutput?: string;
  status?: string;
  durationMs?: number;
  error?: string;
}

/**
 * ConversationLogger class for logging agent sessions to Turso database.
 *
 * This class provides methods for logging session metadata, messages, and tool calls.
 * All methods are wrapped in try-catch blocks to ensure database errors never crash
 * the agent execution. If initialization fails, the logger becomes a no-op.
 */
export class ConversationLogger {
  private client: Client | null = null;
  private remoteClient: Client | null = null;
  private sessionId: string;
  private startTime: number;
  private messageCount = 0;
  private toolCallCount = 0;
  private initPromise: Promise<void>;

  /**
   * Create a new ConversationLogger instance.
   *
   * Initializes local database client and optionally creates remote client.
   * All initialization errors are logged to stderr but not thrown.
   *
   * @param sessionId - Unique identifier for the session
   */
  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.startTime = Date.now();

    // Start initialization asynchronously
    this.initPromise = this.initialize();
  }

  /**
   * Initialize database clients asynchronously.
   *
   * @private
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize local client
      try {
        this.client = await createLocalClient(this.sessionId);
      } catch (error) {
        console.error(`[ConversationLogger] Failed to initialize local client:`, error);
        this.client = null;
      }

      // Try to initialize remote client (optional)
      try {
        this.remoteClient = await createRemoteClient();
      } catch (error) {
        console.error(`[ConversationLogger] Failed to initialize remote client:`, error);
        this.remoteClient = null;
      }
    } catch (error) {
      console.error(`[ConversationLogger] Error in initialize:`, error);
      this.client = null;
      this.remoteClient = null;
    }
  }

  /**
   * Start a new session and insert session record into database.
   *
   * @param metadata - Session metadata to store
   * @returns Promise resolving to true on success, false on error
   */
  async startSession(metadata: SessionMetadata): Promise<boolean> {
    // Wait for initialization to complete
    await this.initPromise;

    if (!this.client) {
      return false;
    }

    try {
      await this.client.execute({
        sql: `INSERT INTO sessions (
          id, started_at, model, mode, prompt_length, cwd,
          github_run_id, github_repository, github_ref
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          this.sessionId,
          this.startTime,
          metadata.model,
          metadata.mode,
          metadata.promptLength,
          metadata.cwd,
          metadata.githubRunId ?? null,
          metadata.githubRepository ?? null,
          metadata.githubRef ?? null,
        ],
      });

      return true;
    } catch (error) {
      console.error(`[ConversationLogger] Error in startSession:`, error);
      return false;
    }
  }

  /**
   * Log a message to the database.
   *
   * Generates message ID, inserts message record, and extracts/logs tool calls.
   *
   * @param message - SDK message to log
   * @param sequence - Message sequence number
   * @returns Promise resolving to true on success, false on error
   */
  async logMessage(message: SDKMessage, sequence: number): Promise<boolean> {
    // Wait for initialization to complete
    await this.initPromise;

    if (!this.client) {
      return false;
    }

    try {
      const messageId = `${this.sessionId}-msg-${sequence}`;
      const timestamp = Date.now();

      // Determine message type and subtype
      const messageType = message.type;
      const messageSubtype = "subtype" in message ? (message.subtype as string) : null;

      // Insert message record
      await this.client.execute({
        sql: `INSERT INTO messages (
          id, session_id, sequence, timestamp, type, subtype, raw_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          messageId,
          this.sessionId,
          sequence,
          timestamp,
          messageType,
          messageSubtype,
          JSON.stringify(message),
        ],
      });

      this.messageCount++;

      // Extract and log tool calls if present
      const toolCalls = extractToolCalls(message);
      for (const toolCall of toolCalls) {
        toolCall.sessionId = this.sessionId;
        toolCall.messageId = messageId;
        await this.logToolCall(toolCall);
      }

      return true;
    } catch (error) {
      console.error(`[ConversationLogger] Error in logMessage:`, error);
      return false;
    }
  }

  /**
   * Log a tool call to the database.
   *
   * @param toolData - Tool call data to log
   * @returns Promise resolving to true on success, false on error
   */
  async logToolCall(toolData: ToolCallData): Promise<boolean> {
    // Wait for initialization to complete
    await this.initPromise;

    if (!this.client) {
      return false;
    }

    try {
      await this.client.execute({
        sql: `INSERT INTO tool_calls (
          id, session_id, message_id, sequence, timestamp, tool_name,
          tool_input, tool_output, status, duration_ms, error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          toolData.id,
          toolData.sessionId,
          toolData.messageId ?? null,
          toolData.sequence,
          toolData.timestamp,
          toolData.toolName,
          toolData.toolInput ?? null,
          toolData.toolOutput ?? null,
          toolData.status ?? null,
          toolData.durationMs ?? null,
          toolData.error ?? null,
        ],
      });

      this.toolCallCount++;
      return true;
    } catch (error) {
      console.error(`[ConversationLogger] Error in logToolCall:`, error);
      return false;
    }
  }

  /**
   * End the session and update session record with final metadata.
   *
   * Calculates duration, updates session record, and attempts cloud sync if available.
   *
   * @param result - Final result message (if any)
   * @returns Promise resolving to true on success, false on error
   */
  async endSession(result: SDKMessage | null): Promise<boolean> {
    // Wait for initialization to complete
    await this.initPromise;

    if (!this.client) {
      return false;
    }

    try {
      const endedAt = Date.now();
      const durationMs = endedAt - this.startTime;

      // Determine result type and subtype
      let resultType: string | null = null;
      let resultSubtype: string | null = null;

      if (result) {
        resultType = result.type;
        if ("subtype" in result) {
          resultSubtype = result.subtype as string;
        }
      }

      // Update session record
      await this.client.execute({
        sql: `UPDATE sessions SET
          ended_at = ?,
          duration_ms = ?,
          result_type = ?,
          result_subtype = ?,
          total_messages = ?,
          total_tool_calls = ?
        WHERE id = ?`,
        args: [
          endedAt,
          durationMs,
          resultType,
          resultSubtype,
          this.messageCount,
          this.toolCallCount,
          this.sessionId,
        ],
      });

      // Attempt cloud sync if remote client is available
      if (this.remoteClient) {
        console.error(
          `[ConversationLogger] Attempting cloud sync for session ${this.sessionId}...`
        );
        const syncSuccess = await syncToCloud(this.client, this.remoteClient, this.sessionId);
        if (syncSuccess) {
          console.error(`[ConversationLogger] Cloud sync completed successfully`);
        } else {
          console.error(`[ConversationLogger] Cloud sync failed`);
        }
      }

      return true;
    } catch (error) {
      console.error(`[ConversationLogger] Error in endSession:`, error);
      return false;
    }
  }

  /**
   * Get the local database client (for testing/debugging).
   *
   * @returns The local database client or null if not initialized
   */
  getClient(): Client | null {
    return this.client;
  }
}

/**
 * Extract tool calls from an SDK message.
 *
 * Parses SDK messages to find tool use blocks and tool result blocks,
 * returning an array of ToolCallData objects.
 *
 * @param message - SDK message to extract tool calls from
 * @returns Array of ToolCallData objects
 */
export function extractToolCalls(message: SDKMessage): ToolCallData[] {
  const toolCalls: ToolCallData[] = [];
  const timestamp = Date.now();

  try {
    // Handle assistant messages with tool use
    if (message.type === "assistant" && "message" in message) {
      const apiMessage = message.message;

      if (apiMessage.content && Array.isArray(apiMessage.content)) {
        for (let i = 0; i < apiMessage.content.length; i++) {
          const block = apiMessage.content[i];

          // Check for tool_use block
          if (block.type === "tool_use") {
            toolCalls.push({
              id: block.id,
              sessionId: "", // Will be set by caller
              messageId: undefined, // Will be set by caller
              sequence: toolCalls.length,
              timestamp,
              toolName: block.name,
              toolInput: JSON.stringify(block.input),
              status: "pending",
            });
          }
        }
      }
    }

    // Handle user messages with tool results
    if (message.type === "user" && "message" in message) {
      const apiMessage = message.message;

      if (apiMessage.content && Array.isArray(apiMessage.content)) {
        for (let i = 0; i < apiMessage.content.length; i++) {
          const block = apiMessage.content[i];

          // Check for tool_result block
          if (block.type === "tool_result") {
            const toolOutput =
              typeof block.content === "string" ? block.content : JSON.stringify(block.content);

            toolCalls.push({
              id: block.tool_use_id,
              sessionId: "", // Will be set by caller
              messageId: undefined, // Will be set by caller
              sequence: toolCalls.length,
              timestamp,
              toolName: "unknown", // Tool name not available in result
              toolOutput,
              status: block.is_error ? "error" : "success",
              error: block.is_error ? toolOutput : undefined,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`[ConversationLogger] Error extracting tool calls:`, error);
  }

  return toolCalls;
}
