# Turso Conversation Logging Setup Guide

## Overview

The claude-agent-runner script automatically logs all agent conversations to a local-first Turso (libSQL) database. This enables powerful analytics, debugging capabilities, and understanding of agent behavior over time.

**Key Features:**
- **Local-first architecture** - Works immediately without any setup
- **Zero configuration required** - Data automatically saved to local SQLite databases
- **Optional cloud sync** - Easily sync to Turso cloud when desired
- **Never blocks execution** - Database errors are logged but never crash the agent
- **Complete conversation history** - Sessions, messages, and tool calls all captured

**Use Cases:**
- Debugging agent behavior and understanding decision-making
- Analyzing tool usage patterns and performance
- Tracking session success/failure rates
- Understanding cost and token usage across sessions
- Building analytics dashboards and reports

## How It Works

### Local-First Architecture

Every agent session is assigned a unique UUID and gets its own SQLite database file:

```
.turso/sessions/
├── abc123-def456-789.db
├── xyz789-abc123-def.db
└── ...
```

**Logging Flow:**
1. Agent starts → Session ID generated → Local database created
2. During execution → Messages and tool calls logged to local database
3. Agent finishes → Session metadata updated (duration, counts)
4. Optional → If cloud credentials configured, sync to Turso cloud

**Benefits:**
- ⚡ Fast local writes (no network latency)
- 🔒 Data always available locally
- 🌐 Optional cloud sync when needed
- 💪 Resilient to network issues
- 🔄 Idempotent sync operations

## Local-Only Usage

**No setup required!** The agent automatically logs conversations locally.

### Automatic Logging

Every time you run the agent, a local database is created:

```bash
# Run any agent command - logging happens automatically
./scripts/claude-agent-runner.ts --model claude-opus-4 --mode auto

# Session ID is printed to stderr
# Session ID: abc123-def456-789012
# Database created at: .turso/sessions/abc123-def456-789012.db
```

### Viewing Local Data

Use the `query-session.ts` script to inspect logged data:

```bash
# Show session summary
bun run scripts/query-session.ts abc123-def456-789012

# Output as JSON
bun run scripts/query-session.ts abc123-def456-789012 --json

# Include all messages in output
bun run scripts/query-session.ts abc123-def456-789012 --messages

# Include tool call details
bun run scripts/query-session.ts abc123-def456-789012 --tools

# Combine flags
bun run scripts/query-session.ts abc123-def456-789012 --messages --tools
```

**Example Output:**

```
=== Session Summary ===
ID: abc123-def456-789012
Model: claude-opus-4
Mode: auto
Started: 2025-12-22T10:30:00.000Z
Ended: 2025-12-22T10:35:42.000Z
Duration: 342000ms
Result: final (success)
Messages: 45
Tool Calls: 23
CWD: /home/user/project

=== GitHub Context ===
Run ID: 1234567890
Repository: owner/repo
Ref: refs/heads/main
```

### Direct SQL Queries

You can also query local databases directly with any SQLite client:

```bash
# Using sqlite3 CLI
sqlite3 .turso/sessions/abc123-def456-789012.db "SELECT * FROM sessions"

# Using bun/node with @libsql/client
bun -e "import {createClient} from '@libsql/client'; \
  const c = createClient({url:'file:.turso/sessions/abc123-def456-789012.db'}); \
  console.log(await c.execute('SELECT * FROM sessions'));"
```

## Cloud Sync Setup

To enable automatic cloud synchronization, configure Turso cloud credentials.

### Step 1: Create Turso Account

1. Visit [turso.tech](https://turso.tech) and sign up
2. Install Turso CLI: `curl -sSfL https://get.tur.so/install.sh | bash`
3. Login: `turso auth login`

### Step 2: Create Database

```bash
# Create a new database for agent logs
turso db create claude-agent-logs

# Get database URL
turso db show claude-agent-logs

# Example output:
# URL: libsql://claude-agent-logs-username.turso.io
```

### Step 3: Create Authentication Token

```bash
# Create auth token
turso db tokens create claude-agent-logs

# Example output:
# eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Set Environment Variables

Add to your shell profile (`.bashrc`, `.zshrc`, etc.) or `.env` file:

```bash
# Turso Cloud Configuration
export TURSO_DATABASE_URL="libsql://claude-agent-logs-username.turso.io"
export TURSO_AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Step 5: Verify Setup

```bash
# Run agent - cloud sync should happen automatically at end
./scripts/claude-agent-runner.ts --model claude-opus-4 --mode auto

# You should see in stderr:
# [ConversationLogger] Attempting cloud sync for session abc123...
# Successfully synced 67 records to cloud for session abc123...
# [ConversationLogger] Cloud sync completed successfully
```

### Manual Sync

You can manually sync sessions using the `sync-session.ts` script:

```bash
# Sync specific session
bun run scripts/sync-session.ts abc123-def456-789012

# Sync all local sessions
bun run scripts/sync-session.ts --all
```

## Environment Variables

### TURSO_DATABASE_URL

**Format:** `libsql://your-database-name.turso.io`

**Required:** No (optional for cloud sync)

**Description:** URL of your Turso cloud database. Get this from `turso db show <database-name>`.

**Example:**
```bash
export TURSO_DATABASE_URL="libsql://claude-agent-logs-mycompany.turso.io"
```

### TURSO_AUTH_TOKEN

**Format:** JWT token string

**Required:** No (optional for cloud sync)

**Description:** Authentication token for Turso cloud. Get this from `turso db tokens create <database-name>`.

**Security Note:** Keep this token secure. Add `.env` to `.gitignore` if storing tokens in environment files.

**Example:**
```bash
export TURSO_AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ0dXJzby50ZWNoIiwiaWF0IjoxNjc..."
```

### Both Variables Are Optional

If either variable is missing:
- ✅ Agent runs normally
- ✅ Local logging works perfectly
- ⚠️ Cloud sync skipped with warning
- ℹ️ Warning message: "Warning: Turso cloud credentials not found. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to enable cloud sync."

## Database Schema

The database consists of three main tables with foreign key relationships.

### sessions table

Stores metadata about each agent execution session.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key, unique session UUID |
| `started_at` | INTEGER | Unix timestamp (ms) when session started |
| `ended_at` | INTEGER | Unix timestamp (ms) when session ended (nullable) |
| `duration_ms` | INTEGER | Session duration in milliseconds (nullable) |
| `model` | TEXT | Claude model used (e.g., "claude-opus-4") |
| `mode` | TEXT | Agent mode ("auto" or "interactive") |
| `prompt_length` | INTEGER | Length of input prompt in characters |
| `cwd` | TEXT | Current working directory where agent ran |
| `github_run_id` | TEXT | GitHub Actions run ID (if running in CI) |
| `github_repository` | TEXT | GitHub repository (e.g., "owner/repo") |
| `github_ref` | TEXT | Git reference (e.g., "refs/heads/main") |
| `result_type` | TEXT | Type of final result message |
| `result_subtype` | TEXT | Subtype of final result message |
| `total_messages` | INTEGER | Total number of messages in session |
| `total_tool_calls` | INTEGER | Total number of tool calls made |

**Index:** `idx_sessions_started` on `started_at` for time-based queries

### messages table

Stores every message exchanged between user and assistant during a session.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key, format: `{sessionId}-msg-{sequence}` |
| `session_id` | TEXT | Foreign key to sessions.id |
| `sequence` | INTEGER | Message sequence number (0, 1, 2, ...) |
| `timestamp` | INTEGER | Unix timestamp (ms) when message was logged |
| `type` | TEXT | Message type ("user", "assistant", "error") |
| `subtype` | TEXT | Message subtype (varies by type) |
| `raw_message` | TEXT | Complete message as JSON string |

**Indexes:**
- `idx_messages_session` on `session_id` for session queries
- `idx_messages_type` on `type` for filtering by message type

### tool_calls table

Stores individual tool invocations and their results.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key, tool use ID from SDK |
| `session_id` | TEXT | Foreign key to sessions.id |
| `message_id` | TEXT | Foreign key to messages.id (nullable) |
| `sequence` | INTEGER | Tool call sequence within session |
| `timestamp` | INTEGER | Unix timestamp (ms) when tool was called |
| `tool_name` | TEXT | Name of tool invoked (e.g., "Bash", "Read", "Write") |
| `tool_input` | TEXT | Tool input parameters as JSON string |
| `tool_output` | TEXT | Tool output/result as string |
| `status` | TEXT | Status: "pending", "success", "error" |
| `duration_ms` | INTEGER | Tool execution duration in milliseconds |
| `error` | TEXT | Error message if status is "error" |

**Indexes:**
- `idx_tool_calls_session` on `session_id` for session queries
- `idx_tool_calls_name` on `tool_name` for tool usage analysis
- `idx_tool_calls_status` on `status` for filtering by success/error

### Entity Relationship

```
sessions (1) ──── (N) messages
    │
    └──────────────── (N) tool_calls
                        │
            messages (1) ──── (N) tool_calls (optional)
```

## Helper Scripts

### scripts/query-session.ts

Query and export local session data.

**Usage:**

```bash
# Show session summary (default)
bun run scripts/query-session.ts <session-id>

# Export as JSON
bun run scripts/query-session.ts <session-id> --json

# Include all messages in output
bun run scripts/query-session.ts <session-id> --messages

# Include tool call details
bun run scripts/query-session.ts <session-id> --tools

# Combine multiple flags
bun run scripts/query-session.ts <session-id> --messages --tools --json
```

**Examples:**

```bash
# Quick summary
bun run scripts/query-session.ts abc123-def456-789

# Full export with messages and tools as JSON
bun run scripts/query-session.ts abc123-def456-789 --json --messages --tools > session-export.json
```

### scripts/sync-session.ts

Manually sync local sessions to Turso cloud.

**Usage:**

```bash
# Sync specific session
bun run scripts/sync-session.ts <session-id>

# Sync all local sessions
bun run scripts/sync-session.ts --all
```

**Examples:**

```bash
# Sync one session
bun run scripts/sync-session.ts abc123-def456-789

# Sync everything
bun run scripts/sync-session.ts --all
```

**Requirements:**
- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` must be set
- Exits with error if credentials are missing

## Analytics Queries

Here are common SQL queries for analyzing agent behavior. Run these against your Turso cloud database or local SQLite files.

### Session Analytics

```sql
-- Sessions by date
SELECT
  date(started_at/1000, 'unixepoch') as day,
  COUNT(*) as session_count,
  AVG(duration_ms)/1000 as avg_duration_seconds
FROM sessions
GROUP BY day
ORDER BY day DESC;

-- Success rate by result type
SELECT
  result_type,
  result_subtype,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM sessions
WHERE result_type IS NOT NULL
GROUP BY result_type, result_subtype
ORDER BY count DESC;

-- Sessions by model
SELECT
  model,
  COUNT(*) as total_sessions,
  AVG(duration_ms)/1000 as avg_duration_seconds,
  AVG(total_messages) as avg_messages,
  AVG(total_tool_calls) as avg_tool_calls
FROM sessions
GROUP BY model
ORDER BY total_sessions DESC;

-- Longest running sessions
SELECT
  id,
  model,
  duration_ms/1000 as duration_seconds,
  total_messages,
  total_tool_calls,
  datetime(started_at/1000, 'unixepoch') as started
FROM sessions
ORDER BY duration_ms DESC
LIMIT 10;

-- Recent session summary
SELECT
  id,
  model,
  mode,
  duration_ms/1000 as duration_sec,
  total_messages as msgs,
  total_tool_calls as tools,
  result_type,
  datetime(started_at/1000, 'unixepoch') as started
FROM sessions
ORDER BY started_at DESC
LIMIT 20;
```

### Tool Usage Analytics

```sql
-- Tool usage frequency
SELECT
  tool_name,
  COUNT(*) as call_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM tool_calls
GROUP BY tool_name
ORDER BY call_count DESC;

-- Tool error rates
SELECT
  tool_name,
  COUNT(*) as total_calls,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successes,
  ROUND(COUNT(CASE WHEN status = 'error' THEN 1 END) * 100.0 / COUNT(*), 2) as error_rate_pct
FROM tool_calls
GROUP BY tool_name
HAVING total_calls >= 10
ORDER BY error_rate_pct DESC;

-- Average tool execution time
SELECT
  tool_name,
  COUNT(*) as call_count,
  AVG(duration_ms) as avg_duration_ms,
  MIN(duration_ms) as min_duration_ms,
  MAX(duration_ms) as max_duration_ms
FROM tool_calls
WHERE duration_ms IS NOT NULL
GROUP BY tool_name
ORDER BY avg_duration_ms DESC;

-- Most recent tool calls
SELECT
  tool_name,
  status,
  datetime(timestamp/1000, 'unixepoch') as called_at,
  session_id
FROM tool_calls
ORDER BY timestamp DESC
LIMIT 20;

-- Tools by session
SELECT
  s.id as session_id,
  s.model,
  COUNT(t.id) as tool_count,
  GROUP_CONCAT(DISTINCT t.tool_name) as tools_used
FROM sessions s
LEFT JOIN tool_calls t ON s.id = t.session_id
GROUP BY s.id, s.model
ORDER BY tool_count DESC
LIMIT 20;
```

### Message Analytics

```sql
-- Message type distribution
SELECT
  type,
  COUNT(*) as message_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM messages
GROUP BY type
ORDER BY message_count DESC;

-- Average messages per session
SELECT
  AVG(total_messages) as avg_messages_per_session,
  MIN(total_messages) as min_messages,
  MAX(total_messages) as max_messages
FROM sessions
WHERE total_messages IS NOT NULL;

-- Sessions with most messages
SELECT
  s.id,
  s.model,
  s.total_messages,
  s.duration_ms/1000 as duration_sec,
  datetime(s.started_at/1000, 'unixepoch') as started
FROM sessions s
WHERE s.total_messages IS NOT NULL
ORDER BY s.total_messages DESC
LIMIT 10;
```

### Combined Analytics

```sql
-- Comprehensive session report
SELECT
  s.id,
  s.model,
  s.mode,
  s.duration_ms/1000 as duration_sec,
  s.total_messages,
  s.total_tool_calls,
  COUNT(DISTINCT t.tool_name) as unique_tools,
  ROUND(AVG(t.duration_ms), 0) as avg_tool_duration_ms,
  s.result_type,
  datetime(s.started_at/1000, 'unixepoch') as started
FROM sessions s
LEFT JOIN tool_calls t ON s.id = t.session_id
GROUP BY s.id
ORDER BY s.started_at DESC
LIMIT 20;

-- Daily aggregates
SELECT
  date(s.started_at/1000, 'unixepoch') as day,
  COUNT(DISTINCT s.id) as sessions,
  SUM(s.total_messages) as total_messages,
  SUM(s.total_tool_calls) as total_tool_calls,
  AVG(s.duration_ms)/1000 as avg_duration_sec
FROM sessions s
GROUP BY day
ORDER BY day DESC;
```

### Running Queries

**Against local database:**

```bash
sqlite3 .turso/sessions/<session-id>.db < query.sql
```

**Against Turso cloud:**

```bash
turso db shell claude-agent-logs < query.sql
```

**With query-session.ts:**

```bash
bun run scripts/query-session.ts <session-id> --json | jq '.messages | length'
```

## Troubleshooting

### "Warning: Turso cloud credentials not found"

**This is expected behavior, not an error!**

If you see this warning, it means:
- ✅ Local logging is working perfectly
- ⚠️ Cloud sync is disabled (no credentials configured)
- ℹ️ Agent continues normally

**To enable cloud sync:**
1. Set `TURSO_DATABASE_URL` environment variable
2. Set `TURSO_AUTH_TOKEN` environment variable
3. Restart agent

**To silence warning:**
```bash
# Run agent with stderr filtered
./scripts/claude-agent-runner.ts 2>&1 | grep -v "Turso cloud credentials"
```

### Database file not created

**Symptoms:** No `.turso/sessions/` directory or no database files

**Possible causes:**
1. Permissions issue - agent can't create directories
2. Disk space issue - no space to write database
3. Initialization error - check stderr for errors

**Solutions:**

```bash
# Check permissions
ls -la .turso 2>/dev/null || mkdir -p .turso/sessions

# Check disk space
df -h .

# Check stderr output
./scripts/claude-agent-runner.ts 2> agent-errors.log
cat agent-errors.log | grep -i error
```

### Sync failing

**Symptoms:** "[ConversationLogger] Cloud sync failed" in stderr

**Possible causes:**
1. Invalid credentials
2. Network connectivity issues
3. Database doesn't exist in Turso cloud
4. Schema mismatch

**Solutions:**

```bash
# Verify credentials are set
echo $TURSO_DATABASE_URL
echo $TURSO_AUTH_TOKEN | cut -c1-20  # Show first 20 chars only

# Test connection manually
turso db shell claude-agent-logs "SELECT 1"

# Check database exists
turso db list | grep claude-agent-logs

# Verify schema in cloud database
turso db shell claude-agent-logs ".schema"

# Try manual sync with verbose output
bun run scripts/sync-session.ts <session-id> 2>&1
```

### Schema mismatch

**Symptoms:** SQL errors about missing columns or tables

**Cause:** Cloud database schema is outdated or corrupt

**Solution - Reset schema:**

```bash
# Delete and recreate cloud database (WARNING: destroys data!)
turso db destroy claude-agent-logs
turso db create claude-agent-logs

# Get new credentials
turso db show claude-agent-logs
turso db tokens create claude-agent-logs

# Update environment variables with new credentials
export TURSO_DATABASE_URL="..."
export TURSO_AUTH_TOKEN="..."

# Sync will now create fresh schema
bun run scripts/sync-session.ts --all
```

**Solution - Update local database:**

```bash
# Delete local database file (WARNING: loses local data!)
rm .turso/sessions/<session-id>.db

# Next agent run will create fresh database with current schema
```

### Debugging ConversationLogger

**Check if logging is working:**

```bash
# Run agent and capture stderr
./scripts/claude-agent-runner.ts 2> debug.log

# Look for ConversationLogger messages
grep "ConversationLogger" debug.log

# Check for errors
grep -i error debug.log | grep -i conversation
```

**Verify database contents:**

```bash
# List all local sessions
ls -lh .turso/sessions/

# Check specific session's tables
sqlite3 .turso/sessions/<session-id>.db ".tables"

# Count records
sqlite3 .turso/sessions/<session-id>.db "SELECT
  (SELECT COUNT(*) FROM sessions) as sessions,
  (SELECT COUNT(*) FROM messages) as messages,
  (SELECT COUNT(*) FROM tool_calls) as tool_calls"
```

### Large database files

**Symptoms:** `.turso/sessions/` directory growing large

**Normal size ranges:**
- Small session (few messages): 20-100 KB
- Medium session (normal): 100 KB - 2 MB
- Large session (many tools): 2-10 MB
- Very large session: 10+ MB

**To check sizes:**

```bash
# Total size of all sessions
du -sh .turso/sessions/

# Largest session files
du -h .turso/sessions/*.db | sort -hr | head -10

# Count total sessions
ls .turso/sessions/*.db | wc -l
```

**Cleanup old sessions:**

```bash
# Sync all sessions to cloud first (if desired)
bun run scripts/sync-session.ts --all

# Remove local databases older than 30 days
find .turso/sessions/ -name "*.db" -mtime +30 -delete

# Or remove everything (after confirming cloud sync)
rm -rf .turso/sessions/*.db
```

## FAQ

### How much disk space does logging use?

**Typical usage:**
- Each session: 100 KB - 2 MB
- 100 sessions: ~50-200 MB
- 1000 sessions: ~500 MB - 2 GB

**Factors affecting size:**
- Number of messages per session
- Number of tool calls
- Size of tool inputs/outputs (especially file contents)
- Length of raw message JSON

**To monitor:**

```bash
# Check total size
du -sh .turso/sessions/

# Average session size
du -sk .turso/sessions/*.db | awk '{sum+=$1; count++} END {print sum/count " KB average"}'
```

### Can I disable logging?

Currently there's no flag to disable logging. The feature is designed to be:
- Zero-overhead (local writes are fast)
- Zero-configuration (works automatically)
- Non-intrusive (errors don't crash agent)

**Workarounds if needed:**

```bash
# Delete databases after each run
rm -rf .turso/sessions/*.db

# Mount .turso as tmpfs (Linux - lost on reboot)
mkdir -p .turso/sessions
sudo mount -t tmpfs -o size=100M tmpfs .turso/sessions
```

**Future enhancement:** Could add `--no-logging` flag if there's demand.

### Where are logs stored?

**Local databases:**
- Location: `.turso/sessions/<session-id>.db`
- Format: SQLite database files
- Access: Any SQLite client or @libsql/client

**Cloud databases (if synced):**
- Location: Turso cloud (turso.tech)
- Format: libSQL (Turso's SQLite fork)
- Access: Turso CLI or @libsql/client with remote URL

**.turso directory structure:**

```
.turso/
└── sessions/
    ├── abc123-def456-789.db
    ├── def456-789abc-123.db
    └── ...
```

### Can I query across all sessions?

**Yes, with Turso cloud sync enabled:**

Once synced to cloud, all sessions are in one database and can be queried together:

```sql
-- Query across all sessions in cloud
SELECT COUNT(*) FROM sessions;
SELECT * FROM sessions WHERE model = 'claude-opus-4';
```

**With local databases only:**

Each session has its own database file. You'd need to:

1. Attach multiple databases in SQLite:
```sql
ATTACH DATABASE '.turso/sessions/session1.db' AS s1;
ATTACH DATABASE '.turso/sessions/session2.db' AS s2;
SELECT * FROM s1.sessions UNION ALL SELECT * FROM s2.sessions;
```

2. Write a script to iterate through files:
```bash
for db in .turso/sessions/*.db; do
  sqlite3 "$db" "SELECT * FROM sessions"
done
```

3. Use cloud sync (recommended for analytics)

### Is my data secure?

**Local databases:**
- Stored as plain SQLite files on disk
- No encryption at rest (standard SQLite behavior)
- Protected by file system permissions
- Recommendation: Use disk encryption if sensitive

**Cloud sync:**
- Data encrypted in transit (TLS)
- Turso handles encryption at rest
- Access controlled by auth token
- Recommendation: Keep `TURSO_AUTH_TOKEN` secret

**Best practices:**
- Add `.turso/` to `.gitignore` (don't commit databases)
- Add `.env` to `.gitignore` (don't commit tokens)
- Rotate tokens periodically
- Use separate databases for different environments

### What if the agent crashes?

**Session handling:**
- Session record created at start with `started_at`
- Messages logged throughout execution
- `ended_at` and `duration_ms` set when session completes normally

**If agent crashes:**
- Session remains in database with `ended_at = NULL`
- All messages up to crash point are preserved
- Tool calls up to crash point are preserved
- Next session gets new UUID and database

**Finding incomplete sessions:**

```sql
SELECT * FROM sessions WHERE ended_at IS NULL;
```

**Cloud sync:**
- Only happens at successful completion
- Crashed sessions remain local-only
- Can manually sync: `bun run scripts/sync-session.ts <session-id>`

### Can I export data to other formats?

**Yes, multiple options:**

**1. JSON export with query-session.ts:**

```bash
bun run scripts/query-session.ts <session-id> --json --messages --tools > export.json
```

**2. CSV export with SQLite:**

```bash
sqlite3 -csv -header .turso/sessions/<session-id>.db \
  "SELECT * FROM sessions" > sessions.csv
```

**3. SQL dump:**

```bash
sqlite3 .turso/sessions/<session-id>.db .dump > backup.sql
```

**4. Custom script:**

```typescript
import { createClient } from "@libsql/client";

const client = createClient({ url: "file:.turso/sessions/abc123.db" });
const sessions = await client.execute("SELECT * FROM sessions");

// Convert to your desired format
const output = { /* ... */ };
console.log(JSON.stringify(output));
```

### How do I backup my data?

**Local backups:**

```bash
# Copy entire sessions directory
cp -r .turso/sessions/ backups/sessions-$(date +%Y%m%d)/

# Tar and compress
tar -czf sessions-backup.tar.gz .turso/sessions/

# Sync to S3, Dropbox, etc.
rclone sync .turso/sessions/ remote:backups/turso-sessions/
```

**Cloud backups:**

Once synced to Turso cloud, data is automatically backed up by Turso's infrastructure.

**Recommended strategy:**
1. Enable cloud sync for automatic off-site backup
2. Periodically export important sessions as JSON
3. Optionally backup local databases before cleanup

### Can I use this with multiple projects?

**Yes!** Each project gets its own `.turso/sessions/` directory.

**Options:**

**1. Separate local databases per project (default):**
```
project-a/.turso/sessions/
project-b/.turso/sessions/
project-c/.turso/sessions/
```

**2. Shared cloud database across projects:**
```bash
# Same credentials in all projects
export TURSO_DATABASE_URL="libsql://shared-agent-logs.turso.io"
export TURSO_AUTH_TOKEN="..."
```

Sessions from all projects sync to one database, queryable together:

```sql
SELECT cwd, COUNT(*) FROM sessions GROUP BY cwd;
```

**3. Separate cloud databases per project:**
```bash
# project-a/.env
TURSO_DATABASE_URL="libsql://project-a-logs.turso.io"

# project-b/.env
TURSO_DATABASE_URL="libsql://project-b-logs.turso.io"
```

## Additional Resources

- [Turso Documentation](https://docs.turso.tech)
- [libSQL Documentation](https://github.com/tursodatabase/libsql)
- [@libsql/client NPM Package](https://www.npmjs.com/package/@libsql/client)
- [SQLite SQL Reference](https://www.sqlite.org/lang.html)

## Support

For issues with:
- **Turso cloud:** [Turso Discord](https://discord.gg/turso)
- **Agent logging:** Open issue in this repository
- **SQL queries:** [SQLite documentation](https://www.sqlite.org/docs.html)
