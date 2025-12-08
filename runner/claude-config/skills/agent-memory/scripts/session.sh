#!/bin/bash
# .claude/skills/agent-memory/scripts/session.sh
# Handles agent registration, session management, and tool recording

set -e

AGENTFS_DB="${AGENTFS_DB:-$HOME/.agentfs/agent.db}"
ACTION="$1"
shift || true

# Run SQL via tursodb
run_sql() {
  tursodb "$AGENTFS_DB" "$1"
}

# Run SQL and output as pretty table
run_sql_markdown() {
  tursodb "$AGENTFS_DB" "$1"
}

# Ensure tables exist
init_db() {
  mkdir -p "$(dirname "$AGENTFS_DB")"
  tursodb "$AGENTFS_DB" "
-- Repositories: first-class entities tied to filesystem path
CREATE TABLE IF NOT EXISTS repos (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  remote_url TEXT,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  capabilities TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  registered_at INTEGER DEFAULT (unixepoch()),
  last_seen_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  repo_id TEXT,
  task TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  started_at INTEGER DEFAULT (unixepoch()),
  ended_at INTEGER,
  summary TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);

CREATE TABLE IF NOT EXISTS tool_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  repo_id TEXT,
  tool_name TEXT,
  input TEXT,
  output TEXT,
  duration_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  timestamp INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  repo_id TEXT,
  question TEXT,
  options TEXT,
  choice TEXT,
  rationale TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  decided_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  repo_id TEXT,
  topic TEXT,
  finding TEXT,
  files TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);

-- Indexes for repos
CREATE UNIQUE INDEX IF NOT EXISTS idx_repos_path ON repos(path);
CREATE INDEX IF NOT EXISTS idx_repos_remote ON repos(remote_url);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_repo ON sessions(repo_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);

-- Indexes for tool_calls
CREATE INDEX IF NOT EXISTS idx_tool_calls_session ON tool_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_repo ON tool_calls(repo_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_created ON tool_calls(created_at);

-- Indexes for decisions
CREATE INDEX IF NOT EXISTS idx_decisions_session ON decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_decisions_repo ON decisions(repo_id);
CREATE INDEX IF NOT EXISTS idx_decisions_created ON decisions(created_at);

-- Indexes for findings
CREATE INDEX IF NOT EXISTS idx_findings_session ON findings(session_id);
CREATE INDEX IF NOT EXISTS idx_findings_repo ON findings(repo_id);
CREATE INDEX IF NOT EXISTS idx_findings_created ON findings(created_at);
"
}

# Extract owner/repo from git remote URL
# Supports: git@github.com:owner/repo.git, https://github.com/owner/repo.git
parse_repo_id_from_remote() {
  local url="$1"
  local repo_id=""

  if [[ -n "$url" ]]; then
    # Strip .git suffix
    url="${url%.git}"

    # Handle SSH format: git@github.com:owner/repo
    if [[ "$url" =~ ^git@[^:]+:(.+)$ ]]; then
      repo_id="${BASH_REMATCH[1]}"
    # Handle HTTPS format: https://github.com/owner/repo
    elif [[ "$url" =~ ^https?://[^/]+/(.+)$ ]]; then
      repo_id="${BASH_REMATCH[1]}"
    fi
  fi

  echo "$repo_id"
}

# Get or create repo, returns repo_id
get_or_create_repo() {
  local repo_path="$1"
  local remote_url="$2"
  local repo_name="$3"

  # Check if repo exists
  local existing_id
  existing_id=$(run_sql "SELECT id FROM repos WHERE path = '${repo_path}' LIMIT 1;" | tail -1)

  if [[ -n "$existing_id" ]]; then
    # Update remote_url if it changed
    if [[ -n "$remote_url" ]]; then
      run_sql "UPDATE repos SET remote_url = '${remote_url}', updated_at = datetime('now') WHERE id = '${existing_id}';"
    fi
    echo "$existing_id"
  else
    # Derive repo_id from git remote (owner/repo) or fall back to basename
    local new_id
    new_id=$(parse_repo_id_from_remote "$remote_url")
    if [[ -z "$new_id" ]]; then
      new_id="$repo_name"
    fi

    run_sql "INSERT INTO repos (id, path, remote_url, name) VALUES ('${new_id}', '${repo_path}', '${remote_url}', '${repo_name}');"
    echo "$new_id"
  fi
}

case "$ACTION" in
  init)
    init_db
    echo "Agent memory initialized at $AGENTFS_DB"
    ;;

  register)
    # Register the agent and start a session
    # Usage: session.sh register --agent-id <id> --agent-name <name> --session-id <sid> --repo-path <path> --task <task>
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --agent-id) AGENT_ID="$2"; shift 2 ;;
        --agent-name) AGENT_NAME="$2"; shift 2 ;;
        --agent-type) AGENT_TYPE="$2"; shift 2 ;;
        --capabilities) CAPABILITIES="$2"; shift 2 ;;
        --session-id) SESSION_ID="$2"; shift 2 ;;
        --repo-path) REPO_PATH="$2"; shift 2 ;;
        --task) TASK="$2"; shift 2 ;;
        *) shift ;;
      esac
    done

    # Defaults
    AGENT_ID="${AGENT_ID:-${CLAUDE_AGENT_ID:-$(hostname)-$$}}"
    AGENT_NAME="${AGENT_NAME:-${CLAUDE_AGENT_NAME:-claude-code}}"
    AGENT_TYPE="${AGENT_TYPE:-coding}"
    SESSION_ID="${SESSION_ID:-$CLAUDE_SESSION_ID}"
    REPO_PATH="${REPO_PATH:-$(pwd)}"
    REPO_NAME="$(basename "$REPO_PATH")"

    # Try to get git remote URL
    REMOTE_URL=""
    if command -v git &>/dev/null && git -C "$REPO_PATH" rev-parse --is-inside-work-tree &>/dev/null; then
      REMOTE_URL=$(git -C "$REPO_PATH" config --get remote.origin.url 2>/dev/null || true)
    fi

    init_db

    # Get or create repo
    REPO_ID=$(get_or_create_repo "$REPO_PATH" "$REMOTE_URL" "$REPO_NAME")

    # Register or update agent
    run_sql "INSERT INTO agents (id, name, type, capabilities, registered_at, last_seen_at)
VALUES ('${AGENT_ID}', '${AGENT_NAME}', '${AGENT_TYPE}', '${CAPABILITIES}', unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  last_seen_at = unixepoch(),
  name = '${AGENT_NAME}',
  type = '${AGENT_TYPE}';"

    # Start session linked to repo
    run_sql "INSERT INTO sessions (id, agent_id, repo_id, task, status, started_at)
VALUES ('${SESSION_ID}', '${AGENT_ID}', '${REPO_ID}', '${TASK}', 'active', unixepoch());"

    # Output context for the agent
    echo "=== Agent Registered ==="
    echo "Agent: ${AGENT_NAME} (${AGENT_ID})"
    echo "Session: ${SESSION_ID}"
    echo "Repo: ${REPO_NAME} (${REPO_PATH})"
    if [[ -n "$REMOTE_URL" ]]; then
      echo "Remote: ${REMOTE_URL}"
    fi
    echo "Task: ${TASK}"
    echo ""

    # Load recent context for this repo
    echo "=== Recent Activity in ${REPO_NAME} ==="
    run_sql_markdown "SELECT
  s.id as session,
  s.task,
  s.summary,
  datetime(s.started_at, 'unixepoch') as started
FROM sessions s
WHERE s.repo_id = '${REPO_ID}'
  AND s.id != '${SESSION_ID}'
  AND s.summary IS NOT NULL
ORDER BY s.started_at DESC
LIMIT 3;"

    echo ""
    echo "=== Recent Decisions ==="
    run_sql_markdown "SELECT
  d.question,
  d.choice,
  d.rationale,
  datetime(d.decided_at, 'unixepoch') as decided
FROM decisions d
WHERE d.repo_id = '${REPO_ID}'
ORDER BY d.decided_at DESC
LIMIT 5;"

    # Export repo_id for use by other scripts in this session
    echo ""
    echo "REPO_ID=${REPO_ID}"

    ;;

  start)
    # Lightweight start (deprecated, use register)
    SESSION_ID="${1:-$CLAUDE_SESSION_ID}"
    TASK="$2"
    REPO_PATH="$(pwd)"
    REPO_NAME="$(basename "$REPO_PATH")"

    # Try to get git remote URL
    REMOTE_URL=""
    if command -v git &>/dev/null && git -C "$REPO_PATH" rev-parse --is-inside-work-tree &>/dev/null; then
      REMOTE_URL=$(git -C "$REPO_PATH" config --get remote.origin.url 2>/dev/null || true)
    fi

    init_db

    # Get or create repo
    REPO_ID=$(get_or_create_repo "$REPO_PATH" "$REMOTE_URL" "$REPO_NAME")

    run_sql "INSERT OR REPLACE INTO sessions (id, repo_id, task, status, started_at)
VALUES ('${SESSION_ID}', '${REPO_ID}', '${TASK}', 'active', unixepoch());"
    echo "Session started: ${SESSION_ID} (repo: ${REPO_ID})"
    ;;

  end)
    SESSION_ID="${1:-$CLAUDE_SESSION_ID}"
    SUMMARY="$2"
    run_sql "UPDATE sessions
SET ended_at = unixepoch(),
    status = 'completed',
    summary = '${SUMMARY}'
WHERE id = '${SESSION_ID}';"
    echo "Session ended: ${SESSION_ID}"
    ;;

  record-tool)
    # Read JSON from stdin (provided by Claude Code PostToolUse hook)
    STDIN_JSON=$(cat)

    # Parse fields from JSON using jq
    SESSION_ID=$(echo "$STDIN_JSON" | jq -r '.session_id // empty')
    TOOL=$(echo "$STDIN_JSON" | jq -r '.tool_name // empty')
    INPUT=$(echo "$STDIN_JSON" | jq -c '.tool_input // {}' | head -c 10000)
    OUTPUT=$(echo "$STDIN_JSON" | jq -c '.tool_response // {}' | head -c 10000)

    # Skip if no session or tool
    if [[ -z "$SESSION_ID" || -z "$TOOL" ]]; then
      exit 0
    fi

    # Get repo_id from session
    REPO_ID=$(run_sql "SELECT repo_id FROM sessions WHERE id = '${SESSION_ID}' LIMIT 1;" | tail -1)

    # Escape single quotes for SQL
    INPUT=$(echo "$INPUT" | sed "s/'/''/g")
    OUTPUT=$(echo "$OUTPUT" | sed "s/'/''/g")

    run_sql "INSERT INTO tool_calls (session_id, repo_id, tool_name, input, output, duration_ms, timestamp)
VALUES ('${SESSION_ID}', '${REPO_ID}', '${TOOL}', '${INPUT}', '${OUTPUT}', 0, unixepoch());"
    ;;

  status)
    SESSION_ID="${1:-$CLAUDE_SESSION_ID}"
    echo "=== Session Status ==="
    run_sql_markdown "SELECT
  s.id,
  a.name as agent,
  r.name as repo,
  r.path as repo_path,
  s.task,
  s.status,
  datetime(s.started_at, 'unixepoch') as started,
  (SELECT COUNT(*) FROM tool_calls WHERE session_id = s.id) as tool_calls,
  (SELECT COUNT(*) FROM decisions WHERE session_id = s.id) as decisions
FROM sessions s
LEFT JOIN agents a ON s.agent_id = a.id
LEFT JOIN repos r ON s.repo_id = r.id
WHERE s.id = '${SESSION_ID}';"
    ;;

  *)
    echo "Usage: session.sh <init|register|start|end|record-tool|status> [options]"
    echo ""
    echo "Commands:"
    echo "  init                          Initialize database"
    echo "  register [options]            Register agent and start session"
    echo "    --agent-id <id>             Agent identifier"
    echo "    --agent-name <name>         Agent display name"
    echo "    --agent-type <type>         Agent type (coding, review, etc)"
    echo "    --session-id <id>           Session identifier"
    echo "    --repo-path <path>          Repository path (defaults to cwd)"
    echo "    --task <description>        Task description"
    echo "  start <session-id> [task]     Start session (simple, uses cwd as repo)"
    echo "  end <session-id> [summary]    End session"
    echo "  record-tool <sid> <tool> ...  Record tool call"
    echo "  status [session-id]           Show session status"
    exit 1
    ;;
esac
