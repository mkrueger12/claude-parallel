# Turso Database Architecture

## Overview

Claude Parallel uses **Turso (libSQL)** for optional conversation logging to record agent interactions, conversations, and tool executions. The implementation follows a **fire-and-forget pattern** to avoid impacting agent performance while providing detailed activity logs for auditing and analysis.

## Architecture

### Design Principles

- **Optional Logging**: Gracefully degrades when credentials aren't configured
- **Fire-and-Forget**: All database writes are async and non-blocking
- **Embedded Replica Mode**: Local SQLite with cloud sync for better performance
- **Manual Sync**: Explicit sync control at session end

### Core Components

```
Turso Client (turso.ts)
      ↓
ConversationLogger (conversation-logger.ts)
      ↓
Agent Integration (agents, opencode.ts)
```

## Database Schema

**Version**: 1

### Tables

#### `schema_version`
Tracks database schema migrations
- `version` (INTEGER, PK)
- `applied_at` (TEXT)

#### `sessions`
Individual agent execution sessions
- `id` (TEXT, PK)
- `agent_type` (TEXT) - 'planning' or 'linear'
- `model` (TEXT) - Model name used
- `provider` (TEXT) - API provider
- `started_at` (TEXT)
- `ended_at` (TEXT)
- `status` (TEXT) - 'running', 'completed', 'error'
- `error_message` (TEXT)
- `metadata` (TEXT) - JSON object

#### `messages`
Conversation messages
- `id` (TEXT, PK)
- `session_id` (TEXT, FK)
- `sequence` (INTEGER) - Message ordering
- `role` (TEXT) - 'user', 'assistant', 'tool'
- `content` (TEXT)
- `tool_name` (TEXT)
- `tool_input` (TEXT) - Serialized JSON
- `tool_output` (TEXT) - Serialized JSON
- `created_at` (TEXT)
- `token_count` (INTEGER)

#### `tool_executions`
Detailed tool execution tracking
- `id` (TEXT, PK)
- `session_id` (TEXT, FK)
- `message_id` (TEXT, FK)
- `tool_name` (TEXT)
- `status` (TEXT) - 'running', 'completed', 'error'
- `input` (TEXT) - Serialized JSON
- `output` (TEXT) - Serialized JSON
- `error` (TEXT)
- `started_at` (TEXT)
- `ended_at` (TEXT)
- `duration_ms` (INTEGER)

### Indexes

- `idx_messages_session` - Message lookup by session
- `idx_messages_created` - Temporal queries
- `idx_tool_executions_session` - Tool lookup by session
- `idx_tool_executions_started` - Tool performance analysis
- `idx_sessions_agent_type` - Filter by agent type
- `idx_sessions_status` - Filter by session status
- `idx_sessions_started` - Temporal queries

## Key Files

| File | Purpose | Key Lines |
|------|---------|-----------|
| `src/lib/turso.ts` | Client management | 41-51 (embedded replica) |
| `src/lib/turso-schema.ts` | Database schema | 14-74 (table definitions) |
| `src/lib/conversation-logger.ts` | High-level API | 40-160 (logging methods) |
| `src/agents/planning-agent.ts` | Planning integration | 129-186 (session lifecycle) |
| `src/agents/linear-agent.ts` | Linear integration | 152-224 (session lifecycle) |
| `src/lib/opencode.ts` | Event monitoring | 205-303 (event subscription) |

## Session Lifecycle

```typescript
// 1. Create logger (returns null if not configured)
const logger = await createConversationLogger();

// 2. Start session
await logger?.startSession({
  id: crypto.randomUUID(),
  agentType: 'planning',
  model: 'claude-opus-4-5',
  provider: 'anthropic',
  metadata: { ... }
});

// 3. Log messages and tools during execution
const msgId = await logger?.logMessage('assistant', content);
const toolId = await logger?.logToolExecution({
  toolName: 'bash',
  status: 'completed',
  input: { ... },
  output: '...',
  startedAt: new Date(),
  endedAt: new Date()
});

// 4. End session and sync
await logger?.endSession('completed');
await logger?.syncToCloud();
```

## Configuration

### Environment Variables

```bash
# Required for logging (both must be set)
export TURSO_DATABASE_URL="libsql://your-db.turso.io"
export TURSO_AUTH_TOKEN="your-jwt-token"
```

### Setup Commands

```bash
# 1. Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# 2. Create database
turso db create claude-parallel-logs

# 3. Get credentials
turso db show --url claude-parallel-logs
turso db tokens create claude-parallel-logs
```

### GitHub Actions

Configured in `.github/workflows/reusable-implement-issue.yml:208-209`:
```yaml
env:
  TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
  TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
```

## Performance Optimizations

### Embedded Replica Mode
- **Local SQLite**: Fast writes to local file
- **Bulk Sync**: Single sync at session end
- **CI/CD Friendly**: Ephemeral replicas don't persist
- **Reduced Cloud Load**: Parallel agents sync independently

### Manual Sync Strategy
- **Deterministic**: Sync at known points (session end)
- **Non-Blocking**: Agent never waits for cloud
- **Atomic**: Complete session logged together
- **Controlled**: Agent decides when to sync

### Fire-and-Forget Pattern
- **Async Operations**: Logging doesn't block execution
- **Error Isolation**: Database failures don't fail agent
- **Graceful Degradation**: `null` checks throughout

## Design Trade-offs

| Decision | Why | Trade-off |
|----------|-----|-----------|
| Optional Logging | Support environments without DB | Requires null-checking |
| Fire-and-Forget | Agent performance critical | Possible log loss on failure |
| Manual Sync | Prevent unexpected blocking | Requires explicit sync calls |
| Embedded Replica | Fast local ops + bulk sync | More complexity than direct |
| JSON Serialization | Support complex data structures | Must deserialize for analysis |

## Integration Points

### Planning Agent (`src/agents/planning-agent.ts`)
- Logs all planning sessions with `agentType: 'planning'`
- Records user prompts and generated plans
- Tracks tool usage during planning

### Linear Agent (`src/agents/linear-agent.ts`)
- Logs Linear issue creation sessions with `agentType: 'linear'`
- Records consolidated plans and issue creation
- Monitors Linear API interactions

### OpenCode Event Monitor (`src/lib/opencode.ts`)
- Subscribes to OpenCode events via `client.event.subscribe()`
- Logs tool state changes: running → completed/error
- Records timing data (`duration_ms`)

## Useful Queries

### Find Failed Sessions
```sql
SELECT * FROM sessions
WHERE status = 'error'
ORDER BY started_at DESC;
```

### Tool Performance Analysis
```sql
SELECT
  tool_name,
  AVG(duration_ms) as avg_duration,
  COUNT(*) as executions
FROM tool_executions
WHERE status = 'completed'
GROUP BY tool_name
ORDER BY avg_duration DESC;
```

### Session Duration
```sql
SELECT
  agent_type,
  AVG((julianday(ended_at) - julianday(started_at)) * 86400) as avg_seconds
FROM sessions
WHERE status = 'completed'
GROUP BY agent_type;
```

## Troubleshooting

### Logger Returns Null
**Cause**: Missing environment variables
**Solution**: Set both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`

### Schema Initialization Fails
**Cause**: Network issue or invalid credentials
**Solution**: Verify credentials with `turso db show`

### Sync Fails at Session End
**Cause**: Network timeout or cloud unavailable
**Solution**: Data preserved in local SQLite; retry sync later

### No Logs Appearing
**Cause**: Fire-and-forget pattern - errors suppressed
**Solution**: Check stderr for `[Turso]` prefixed error messages

## Security Considerations

- **JWT Authentication**: Turso uses JWT tokens
- **TLS Encryption**: Data encrypted in transit and at rest
- **Sensitive Data**: User prompts and tool outputs are logged
- **Access Control**: Store credentials in GitHub Secrets
- **Data Retention**: Implement cleanup policies for old sessions

## Future Enhancements

- Connection pooling for high-volume scenarios
- Automatic archival of sessions older than 30 days
- Dashboard for querying and analyzing conversation logs
- Additional indexes based on query patterns
- Schema version migrations for future updates
