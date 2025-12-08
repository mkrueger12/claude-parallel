#!/bin/bash
# .claude/skills/agent-memory/scripts/query.sh
# Query past context, decisions, history, and sessions

set -e

AGENTFS_DB="${AGENTFS_DB:-$HOME/.agentfs/agent.db}"
TYPE="$1"
PATTERN="$2"

# Run SQL via tursodb
run_sql() {
  tursodb "$AGENTFS_DB" "$1"
}

# Run SQL and output as pretty table
run_sql_markdown() {
  tursodb "$AGENTFS_DB" "$1"
}

if [[ ! -f "$AGENTFS_DB" ]]; then
  echo "Agent memory database not found at $AGENTFS_DB"
  echo "Run: bash .claude/skills/agent-memory/scripts/session.sh init"
  exit 1
fi

# Get repo_id for current directory
REPO_PATH="$(pwd)"
REPO_ID=$(run_sql "SELECT id FROM repos WHERE path = '${REPO_PATH}' LIMIT 1;" | tail -1)
REPO_NAME="$(basename "$REPO_PATH")"

# If no repo found, show warning but continue (allows global queries)
if [[ -z "$REPO_ID" ]]; then
  echo "Note: No repo registered for ${REPO_PATH}"
  echo "Results will include all repos."
  echo ""
  REPO_FILTER=""
else
  REPO_FILTER="AND repo_id = '${REPO_ID}'"
fi

case "$TYPE" in
  context)
    echo "=== Context for: ${PATTERN} (repo: ${REPO_NAME}) ==="
    run_sql_markdown "SELECT
  'Decision' as type,
  question as title,
  choice || ': ' || rationale as detail,
  datetime(decided_at, 'unixepoch') as [when]
FROM decisions
WHERE (question LIKE '%${PATTERN}%'
   OR rationale LIKE '%${PATTERN}%'
   OR choice LIKE '%${PATTERN}%')
   ${REPO_FILTER}
UNION ALL
SELECT
  'Finding' as type,
  topic as title,
  finding as detail,
  datetime(created_at) as [when]
FROM findings
WHERE (topic LIKE '%${PATTERN}%'
   OR finding LIKE '%${PATTERN}%'
   OR files LIKE '%${PATTERN}%')
   ${REPO_FILTER}
ORDER BY [when] DESC
LIMIT 10;"
    ;;

  decisions)
    echo "=== Decisions matching: ${PATTERN} (repo: ${REPO_NAME}) ==="
    run_sql_markdown "SELECT
  question,
  options,
  choice,
  rationale,
  datetime(decided_at, 'unixepoch') as decided
FROM decisions
WHERE (question LIKE '%${PATTERN}%'
   OR rationale LIKE '%${PATTERN}%')
   ${REPO_FILTER}
ORDER BY decided_at DESC
LIMIT 10;"
    ;;

  history)
    echo "=== History matching: ${PATTERN} (repo: ${REPO_NAME}) ==="
    run_sql_markdown "SELECT
  tool_name,
  substr(input, 1, 200) as input_preview,
  substr(output, 1, 200) as output_preview,
  datetime(timestamp, 'unixepoch') as [when]
FROM tool_calls
WHERE (input LIKE '%${PATTERN}%'
   OR output LIKE '%${PATTERN}%')
   ${REPO_FILTER}
ORDER BY timestamp DESC
LIMIT 20;"
    ;;

  session)
    echo "=== Session: ${PATTERN} ==="
    run_sql_markdown "SELECT
  tool_name,
  substr(input, 1, 100) as input,
  datetime(timestamp, 'unixepoch') as [when]
FROM tool_calls
WHERE session_id = '${PATTERN}'
ORDER BY timestamp ASC;"
    ;;

  findings)
    echo "=== Findings matching: ${PATTERN} (repo: ${REPO_NAME}) ==="
    run_sql_markdown "SELECT
  topic,
  finding,
  files,
  datetime(created_at) as [when]
FROM findings
WHERE (topic LIKE '%${PATTERN}%'
   OR finding LIKE '%${PATTERN}%'
   OR files LIKE '%${PATTERN}%')
   ${REPO_FILTER}
ORDER BY created_at DESC
LIMIT 10;"
    ;;

  recent)
    echo "=== Recent Activity (repo: ${REPO_NAME}) ==="
    run_sql_markdown "SELECT
  r.name as repo,
  s.task,
  s.status,
  datetime(s.started_at, 'unixepoch') as started,
  (SELECT COUNT(*) FROM tool_calls WHERE session_id = s.id) as actions
FROM sessions s
LEFT JOIN repos r ON s.repo_id = r.id
WHERE 1=1 ${REPO_FILTER/repo_id/s.repo_id}
ORDER BY s.started_at DESC
LIMIT 10;"
    ;;

  all)
    # Global query - show all repos
    echo "=== All Repos ==="
    run_sql_markdown "SELECT
  r.name as repo,
  r.path,
  r.remote_url,
  (SELECT COUNT(*) FROM sessions WHERE repo_id = r.id) as sessions,
  (SELECT COUNT(*) FROM decisions WHERE repo_id = r.id) as decisions,
  (SELECT COUNT(*) FROM findings WHERE repo_id = r.id) as findings
FROM repos r
ORDER BY r.updated_at DESC;"
    ;;

  *)
    echo "Usage: query.sh <context|decisions|history|session|findings|recent|all> <pattern>"
    echo ""
    echo "All queries are scoped to the current repository by default."
    echo ""
    echo "Commands:"
    echo "  context <pattern>    Search decisions and findings for pattern"
    echo "  decisions <pattern>  Search decisions only"
    echo "  history <pattern>    Search tool call history"
    echo "  session <id>         Show all activity in a session"
    echo "  findings <pattern>   Search findings only"
    echo "  recent               Show recent sessions for this repo"
    echo "  all                  Show all tracked repos and their stats"
    exit 1
    ;;
esac
