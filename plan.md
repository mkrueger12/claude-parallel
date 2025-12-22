# Implementation Plan: Agent Conversation Logging to Turso

## Linear Issue Reference
**Parent Issue:** DEL-1332 - Implementation Plan: Agent Conversation Logging to Turso
**URL:** https://linear.app/casper-studios/issue/DEL-1332

---

## Overview

Add conversation logging capabilities to claude-parallel agents, storing agent interactions in a Turso database for analytics, debugging, and audit purposes. This enables:

1. **Debugging** - Trace agent decisions and tool usage across sessions
2. **Analytics** - Analyze agent performance, token usage, and success rates
3. **Audit Trail** - Complete history of agent actions for compliance
4. **Session Replay** - Review past conversations for training and optimization

---

## Current State Analysis

### What Exists Today:
- `planning-agent.ts` - Uses OpenCode SDK for multi-provider plan generation
- `linear-agent.ts` - Uses OpenCode SDK for plan consolidation and Linear issue creation
- `claude-agent-runner.ts` - Uses Claude Agent SDK for implementation/review queries
- `src/lib/opencode.ts` - OpenCode SDK helpers with event monitoring
- `src/lib/claude-agent-sdk.ts` - Claude Agent SDK helpers for authentication and queries

### Event Data Currently Available:
- **OpenCode SDK**: Tool execution events (running, completed, error), session status, errors
- **Claude Agent SDK**: SDKMessage stream with message types (text, tool calls, results)

### What's Missing:
- No persistent storage for conversation data
- No Turso client integration
- No database schema for conversations
- No logging middleware

---

## Desired End State

After implementation, the system will:

1. **Automatically log all agent conversations** to a Turso database
2. **Capture complete conversation context** including:
   - Session metadata (ID, start time, agent type, model)
   - User prompts and AI responses
   - Tool calls with inputs/outputs
   - Token usage and timing
   - Success/failure status
3. **Provide query capabilities** for retrieving logged conversations
4. **Support both SDKs** (OpenCode and Claude Agent SDK)

### Database Schema (Conceptual):

```sql
-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL,  -- 'planning', 'linear', 'implementation', 'review'
  model TEXT NOT NULL,
  provider TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL,  -- 'running', 'completed', 'error'
  error_message TEXT,
  metadata TEXT  -- JSON for additional context
);

-- Messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  role TEXT NOT NULL,  -- 'user', 'assistant', 'tool'
  content TEXT,
  tool_name TEXT,
  tool_input TEXT,  -- JSON
  tool_output TEXT,  -- JSON
  created_at TEXT NOT NULL,
  token_count INTEGER,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Tool executions table
CREATE TABLE tool_executions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_id TEXT,
  tool_name TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'running', 'completed', 'error'
  input TEXT,  -- JSON
  output TEXT,
  error TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_ms INTEGER,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);
```

---

## Task 1: Turso Client Library Setup (DEL-1333)
**Linear Issue:** https://linear.app/casper-studios/issue/DEL-1333

### Description
Add the Turso/libSQL client library and create configuration utilities for database connection.

### Files to Create/Edit:
- `package.json` - Add `@libsql/client` dependency
- `src/lib/turso.ts` (NEW) - Turso client creation and configuration
- `templates/.env.example` - Add Turso environment variables

### Implementation Details:

**src/lib/turso.ts:**
```typescript
import { createClient, type Client } from "@libsql/client";

export interface TursoConfig {
  url: string;
  authToken: string;
}

export function getTursoConfig(): TursoConfig | null {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    return null;  // Logging disabled
  }

  return { url, authToken };
}

export function createTursoClient(config: TursoConfig): Client {
  return createClient({
    url: config.url,
    authToken: config.authToken,
  });
}

let _client: Client | null = null;

export async function getTursoClient(): Promise<Client | null> {
  const config = getTursoConfig();
  if (!config) return null;

  if (!_client) {
    _client = createTursoClient(config);
  }
  return _client;
}
```

### Success Criteria:
- [x] `@libsql/client` is added to package.json dependencies
- [x] `src/lib/turso.ts` exports `getTursoClient()` and `getTursoConfig()`
- [x] Client creation handles missing environment variables gracefully (returns null)
- [x] `templates/.env.example` documents `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- [x] TypeScript type checking passes

---

## Task 2: Database Schema and Migration (DEL-1334)
**Linear Issue:** https://linear.app/casper-studios/issue/DEL-1334

### Description
Create the database schema for storing conversation logs with automatic migration on first use.

### Files to Create/Edit:
- `src/lib/turso-schema.ts` (NEW) - Schema definitions and migration logic
- `src/lib/turso.ts` - Add `initializeSchema()` function

### Implementation Details:

**src/lib/turso-schema.ts:**
```typescript
export const SCHEMA_VERSION = 1;

export const MIGRATIONS = [
  // Version 1: Initial schema
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  )`,
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
  `CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tool_executions_session ON tool_executions(session_id)`,
];
```

### Success Criteria:
- [x] Schema creates three tables: sessions, messages, tool_executions
- [x] Schema includes appropriate indexes for query performance
- [x] Migration runs idempotently (can be run multiple times safely)
- [x] Schema version tracking prevents duplicate migrations
- [x] TypeScript type checking passes

---

## Task 3: Logging Middleware Integration (DEL-1335)
**Linear Issue:** https://linear.app/casper-studios/issue/DEL-1335

### Description
Create logging middleware that intercepts agent events and stores them in Turso.

### Files to Create/Edit:
- `src/lib/conversation-logger.ts` (NEW) - Main logging class
- `src/lib/opencode.ts` - Integrate logger with event monitoring
- `src/lib/claude-agent-sdk.ts` - Integrate logger with query streaming

### Implementation Details:

**src/lib/conversation-logger.ts:**
```typescript
import type { Client } from "@libsql/client";

export interface SessionInfo {
  id: string;
  agentType: string;
  model: string;
  provider?: string;
  metadata?: Record<string, unknown>;
}

export class ConversationLogger {
  private client: Client;
  private sessionId: string | null = null;
  private messageSequence = 0;

  constructor(client: Client) {
    this.client = client;
  }

  async startSession(info: SessionInfo): Promise<void> {
    this.sessionId = info.id;
    this.messageSequence = 0;

    await this.client.execute({
      sql: `INSERT INTO sessions (id, agent_type, model, provider, metadata)
            VALUES (?, ?, ?, ?, ?)`,
      args: [info.id, info.agentType, info.model, info.provider || null,
             info.metadata ? JSON.stringify(info.metadata) : null],
    });
  }

  async logMessage(role: string, content: string, tokenCount?: number): Promise<string> {
    const id = crypto.randomUUID();
    await this.client.execute({
      sql: `INSERT INTO messages (id, session_id, sequence, role, content, token_count)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, this.sessionId, ++this.messageSequence, role, content, tokenCount || null],
    });
    return id;
  }

  async logToolExecution(toolName: string, status: string, input?: unknown, output?: unknown, error?: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.client.execute({
      sql: `INSERT INTO tool_executions (id, session_id, tool_name, status, input, output, error)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, this.sessionId, toolName, status,
             input ? JSON.stringify(input) : null,
             output ? JSON.stringify(output) : null,
             error || null],
    });
    return id;
  }

  async endSession(status: 'completed' | 'error', errorMessage?: string): Promise<void> {
    await this.client.execute({
      sql: `UPDATE sessions SET status = ?, error_message = ?, ended_at = datetime('now')
            WHERE id = ?`,
      args: [status, errorMessage || null, this.sessionId],
    });
  }
}
```

### Integration Points:

**OpenCode SDK (src/lib/opencode.ts):**
- Wrap `createOpencodeServer()` to create logger instance
- Modify `setupEventMonitoring()` to log tool executions
- Log session start/end

**Claude Agent SDK (src/lib/claude-agent-sdk.ts):**
- Modify `runClaudeQuery()` to accept optional logger
- Log messages as they stream
- Log final result

### Success Criteria:
- [x] ConversationLogger class with methods: startSession, logMessage, logToolExecution, endSession
- [x] OpenCode event monitoring logs tool executions to database
- [x] Claude Agent SDK streams log messages to database
- [x] Logging is optional (gracefully disabled when Turso config missing)
- [x] No impact on agent functionality when logging is disabled
- [x] TypeScript type checking passes

---

## Task 4: Query and Retrieval API (DEL-1336)
**Linear Issue:** https://linear.app/casper-studios/issue/DEL-1336

### Description
Create utilities for querying and retrieving logged conversations.

### Files to Create/Edit:
- `src/lib/conversation-queries.ts` (NEW) - Query utilities
- `src/index.ts` - Export query utilities

### Implementation Details:

**src/lib/conversation-queries.ts:**
```typescript
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

export interface SessionDetail extends SessionSummary {
  messages: Array<{
    id: string;
    sequence: number;
    role: string;
    content: string | null;
    toolName: string | null;
    createdAt: string;
  }>;
  toolExecutions: Array<{
    id: string;
    toolName: string;
    status: string;
    startedAt: string;
    durationMs: number | null;
  }>;
}

export async function listSessions(
  client: Client,
  options?: { limit?: number; agentType?: string; status?: string }
): Promise<SessionSummary[]> {
  // Implementation
}

export async function getSession(
  client: Client,
  sessionId: string
): Promise<SessionDetail | null> {
  // Implementation
}

export async function searchSessions(
  client: Client,
  query: string
): Promise<SessionSummary[]> {
  // Full-text search on message content
}
```

### Success Criteria:
- [x] `listSessions()` returns paginated session list with filters
- [x] `getSession()` returns full session details with messages and tool executions
- [x] `searchSessions()` enables full-text search across conversation content
- [x] Query functions handle empty results gracefully
- [x] TypeScript type checking passes

---

## Task 5: Template Updates and Documentation (DEL-1337)
**Linear Issue:** https://linear.app/casper-studios/issue/DEL-1337

### Description
Update templates and documentation to include Turso logging configuration.

### Files to Edit:
- `templates/.env.example` - Add Turso environment variables
- `README.md` - Document conversation logging feature
- `spec.txt` - Update specification with logging details
- `scripts/build-templates.ts` - Include new lib files in bundle

### Documentation Updates:

**README.md additions:**
```markdown
## Conversation Logging (Optional)

Claude Parallel can optionally log all agent conversations to a Turso database
for debugging, analytics, and audit purposes.

### Setup

1. Create a Turso database:
   ```bash
   turso db create claude-parallel-logs
   ```

2. Get your credentials:
   ```bash
   turso db show --url claude-parallel-logs
   turso db tokens create claude-parallel-logs
   ```

3. Add to your environment:
   ```bash
   export TURSO_DATABASE_URL="libsql://..."
   export TURSO_AUTH_TOKEN="..."
   ```

The database schema is automatically initialized on first use.

### What Gets Logged

- Session metadata (agent type, model, timestamps)
- User prompts and AI responses
- Tool executions with inputs/outputs
- Success/failure status

### Querying Logs

Use the provided query utilities to access logged conversations:

```typescript
import { getTursoClient, listSessions, getSession } from 'install-claude-parallel';

const client = await getTursoClient();
const sessions = await listSessions(client, { limit: 10 });
const details = await getSession(client, sessions[0].id);
```
```

### Success Criteria:
- [x] `.env.example` includes `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- [x] README documents how to set up Turso logging
- [x] README explains what data is logged
- [x] README provides query examples
- [x] spec.txt updated with logging architecture
- [x] Build script includes new files

---

## Implementation Order

Tasks should be implemented in order as they build upon each other:

1. **Task 1** - Turso client setup (foundation)
2. **Task 2** - Database schema (builds on Task 1)
3. **Task 3** - Logging middleware (builds on Tasks 1-2)
4. **Task 4** - Query API (builds on Tasks 1-3)
5. **Task 5** - Documentation (final polish)

---

## Key Design Decisions

### 1. Optional Logging
Logging is opt-in via environment variables. When Turso credentials are not configured, all logging functions gracefully return without error, ensuring zero impact on existing functionality.

### 2. Singleton Client Pattern
A single Turso client instance is reused across all logging operations to minimize connection overhead.

### 3. Async Non-Blocking Logging
All logging operations are fire-and-forget to avoid impacting agent response times. Errors in logging do not propagate to the main agent flow.

### 4. Schema Migration
The database schema is automatically initialized on first use, with version tracking to support future migrations.

### 5. Structured Data Storage
Tool inputs/outputs and metadata are stored as JSON strings for flexibility while maintaining queryability via SQLite JSON functions.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TURSO_DATABASE_URL` | No | Turso database URL (libsql://...) |
| `TURSO_AUTH_TOKEN` | No | Turso authentication token |

Both variables must be set to enable logging. If either is missing, logging is silently disabled.

---

## References

- **Turso Documentation:** https://docs.turso.tech/sdk/ts/quickstart
- **libSQL Client:** https://github.com/tursodatabase/libsql-client-ts
- **Existing Agents:** `src/agents/planning-agent.ts`, `src/agents/linear-agent.ts`
- **SDK Helpers:** `src/lib/opencode.ts`, `src/lib/claude-agent-sdk.ts`
