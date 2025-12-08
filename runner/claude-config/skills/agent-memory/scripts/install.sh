#!/bin/bash
# install.sh - Initialize agent-memory database with Turso
# Optimized for automated/agent use: idempotent, minimal output, clear exit codes

set -e

AGENTFS_DB="${AGENTFS_DB:-$HOME/.agentfs/agent.db}"
QUIET=false

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    -q|--quiet) QUIET=true; shift ;;
    -h|--help)
      echo "Usage: install.sh [-q|--quiet]"
      echo "Initialize the agent-memory database with Turso"
      echo ""
      echo "Options:"
      echo "  -q, --quiet  Suppress output (exit code indicates success/failure)"
      exit 0
      ;;
    *) shift ;;
  esac
done

log() {
  [[ "$QUIET" == "true" ]] || echo "$@"
}

err() {
  echo "ERROR: $*" >&2
}

# Install Turso if not present
if ! command -v tursodb &>/dev/null; then
  log "Installing Turso CLI..."
  curl --proto '=https' --tlsv1.2 -LsSf https://github.com/tursodatabase/turso/releases/latest/download/turso_cli-installer.sh | sh >/dev/null 2>&1

  # Add to PATH for this session
  export PATH="$HOME/.turso:$PATH"

  if ! command -v tursodb &>/dev/null; then
    err "Turso installation failed"
    exit 1
  fi
fi

# Create database directory (idempotent)
mkdir -p "$(dirname "$AGENTFS_DB")"

# Initialize schema (idempotent - all CREATE IF NOT EXISTS)
tursodb --experimental-indexes true "$AGENTFS_DB" <<SQL
-- Repos: tracked repositories
CREATE TABLE IF NOT EXISTS repos (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  remote_url TEXT,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Agents: registered agent identities
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

-- Sessions: work sessions linked to agents and repos
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

-- Tool calls: audit log of all actions
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

-- Decisions: recorded choices with rationale
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

-- Findings: discovered knowledge about the codebase
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

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_repos_path ON repos(path);
CREATE INDEX IF NOT EXISTS idx_repos_remote ON repos(remote_url);
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_repo ON sessions(repo_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_tool_calls_session ON tool_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_repo ON tool_calls(repo_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_created ON tool_calls(created_at);
CREATE INDEX IF NOT EXISTS idx_decisions_session ON decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_decisions_repo ON decisions(repo_id);
CREATE INDEX IF NOT EXISTS idx_decisions_created ON decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_findings_session ON findings(session_id);
CREATE INDEX IF NOT EXISTS idx_findings_repo ON findings(repo_id);
CREATE INDEX IF NOT EXISTS idx_findings_created ON findings(created_at);
.quit
SQL

log "OK: $AGENTFS_DB"
