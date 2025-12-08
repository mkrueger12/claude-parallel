#!/bin/bash
# .claude/skills/agent-memory/scripts/record.sh
# Record decisions and findings

set -e

AGENTFS_DB="${AGENTFS_DB:-$HOME/.agentfs/agent.db}"
SESSION_ID="${CLAUDE_SESSION_ID:-$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "unknown-session")}"
TYPE="$1"
shift || true

# Run SQL via tursodb
run_sql() {
  tursodb "$AGENTFS_DB" "$1"
}

if [[ ! -f "$AGENTFS_DB" ]]; then
  echo "Agent memory database not found at $AGENTFS_DB"
  echo "Run: bash .claude/skills/agent-memory/scripts/session.sh init"
  exit 1
fi

# Generate UUID
generate_uuid() {
  uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "$(date +%s)-$$-$RANDOM"
}

# Get repo_id from session, or from current directory
get_repo_id() {
  local repo_id=""

  # First try to get from session
  if [[ -n "$SESSION_ID" && "$SESSION_ID" != "unknown-session" ]]; then
    repo_id=$(run_sql "SELECT repo_id FROM sessions WHERE id = '${SESSION_ID}' LIMIT 1;" | tail -1)
  fi

  # If no session, try to get from current directory
  if [[ -z "$repo_id" ]]; then
    local repo_path="$(pwd)"
    repo_id=$(run_sql "SELECT id FROM repos WHERE path = '${repo_path}' LIMIT 1;" | tail -1)
  fi

  echo "$repo_id"
}

case "$TYPE" in
  decision)
    # Parse named arguments
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --question) QUESTION="$2"; shift 2 ;;
        --options) OPTIONS="$2"; shift 2 ;;
        --choice) CHOICE="$2"; shift 2 ;;
        --rationale) RATIONALE="$2"; shift 2 ;;
        *) shift ;;
      esac
    done

    if [[ -z "$QUESTION" || -z "$CHOICE" ]]; then
      echo "Usage: record.sh decision --question <q> --options <opts> --choice <c> --rationale <r>"
      exit 1
    fi

    # Escape single quotes for SQL
    QUESTION=$(echo "$QUESTION" | sed "s/'/''/g")
    OPTIONS=$(echo "$OPTIONS" | sed "s/'/''/g")
    CHOICE=$(echo "$CHOICE" | sed "s/'/''/g")
    RATIONALE=$(echo "$RATIONALE" | sed "s/'/''/g")

    # Get repo_id
    REPO_ID=$(get_repo_id)

    run_sql "INSERT INTO decisions (id, session_id, repo_id, question, options, choice, rationale)
VALUES (
  '$(generate_uuid)',
  '${SESSION_ID}',
  '${REPO_ID}',
  '${QUESTION}',
  '${OPTIONS}',
  '${CHOICE}',
  '${RATIONALE}'
);"
    echo "Decision recorded: ${QUESTION} -> ${CHOICE}"
    ;;

  finding)
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --topic) TOPIC="$2"; shift 2 ;;
        --finding) FINDING="$2"; shift 2 ;;
        --files) FILES="$2"; shift 2 ;;
        *) shift ;;
      esac
    done

    if [[ -z "$TOPIC" || -z "$FINDING" ]]; then
      echo "Usage: record.sh finding --topic <t> --finding <f> --files <files>"
      exit 1
    fi

    # Escape single quotes for SQL
    TOPIC=$(echo "$TOPIC" | sed "s/'/''/g")
    FINDING=$(echo "$FINDING" | sed "s/'/''/g")
    FILES=$(echo "$FILES" | sed "s/'/''/g")

    # Get repo_id
    REPO_ID=$(get_repo_id)

    run_sql "INSERT INTO findings (id, session_id, repo_id, topic, finding, files)
VALUES (
  '$(generate_uuid)',
  '${SESSION_ID}',
  '${REPO_ID}',
  '${TOPIC}',
  '${FINDING}',
  '${FILES}'
);"
    echo "Finding recorded: ${TOPIC}"
    ;;

  *)
    echo "Usage: record.sh <decision|finding> --field value ..."
    echo ""
    echo "Commands:"
    echo "  decision  Record a decision with rationale"
    echo "    --question <text>   The question/decision point"
    echo "    --options <text>    Options considered (pipe-separated)"
    echo "    --choice <text>     The chosen option"
    echo "    --rationale <text>  Why this choice was made"
    echo ""
    echo "  finding   Record a discovery about the codebase"
    echo "    --topic <text>      The topic/area"
    echo "    --finding <text>    What was discovered"
    echo "    --files <text>      Related files"
    exit 1
    ;;
esac
