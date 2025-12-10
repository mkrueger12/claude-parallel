#!/bin/bash
# Stop hook script to append Claude conversation transcript to a PR
# This script is triggered by Claude Code's Stop hook mechanism
#
# Environment variables required:
#   APPEND_TRANSCRIPT_TO_PR - PR number to append transcript to
#   GH_TOKEN - GitHub token for authentication (optional, uses gh auth if not set)
#
# Input: JSON via stdin with transcript_path, session_id, etc.

set -euo pipefail

# Read JSON input from stdin
input=$(cat)

# Extract fields using jq
transcript_path=$(echo "$input" | jq -r '.transcript_path // empty')
session_id=$(echo "$input" | jq -r '.session_id // empty')

# Check if we should run (PR number must be set)
if [ -z "${APPEND_TRANSCRIPT_TO_PR:-}" ]; then
  # No PR number set, silently exit (this hook is optional)
  echo '{}'
  exit 0
fi

# Expand ~ to home directory
transcript_path="${transcript_path/#\~/$HOME}"

# Check if transcript file exists
if [ -z "$transcript_path" ] || [ ! -f "$transcript_path" ]; then
  echo "Warning: Transcript file not found at $transcript_path" >&2
  echo '{}'
  exit 0
fi

# Create temporary file for the formatted transcript
TRANSCRIPT_MD=$(mktemp)
trap "rm -f $TRANSCRIPT_MD" EXIT

# Write header
cat >> "$TRANSCRIPT_MD" << EOF
## Claude Code Verification Transcript

<details>
<summary>Session details</summary>

- **Session ID:** \`$session_id\`
- **Transcript:** \`$transcript_path\`

</details>

---

EOF

# Process JSONL file and extract conversation
# Format: Each line is a JSON object with type, message content, etc.
msg_count=0
while IFS= read -r line; do
  [ -z "$line" ] && continue

  # Extract message type
  msg_type=$(echo "$line" | jq -r '.type // empty' 2>/dev/null)

  case "$msg_type" in
    "user")
      # User messages can be plain text or tool results (array)
      content_type=$(echo "$line" | jq -r '.message.content | type' 2>/dev/null)
      if [ "$content_type" = "string" ]; then
        content=$(echo "$line" | jq -r '.message.content // ""' 2>/dev/null)
        if [ -n "$content" ]; then
          msg_count=$((msg_count + 1))
          {
            echo "### Prompt"
            echo ""
            echo "$content"
            echo ""
          } >> "$TRANSCRIPT_MD"
        fi
      fi
      # Skip tool_result arrays - they're internal protocol messages
      ;;
    "assistant")
      # Assistant messages have content as array with text/tool_use/thinking elements
      content=$(echo "$line" | jq -r '
        if .message.content then
          if (.message.content | type) == "array" then
            [.message.content[] | select(.type=="text") | .text] | join("\n")
          else
            .message.content
          end
        else
          ""
        end
      ' 2>/dev/null)

      # Extract tool names used in this message
      tools=$(echo "$line" | jq -r '
        if .message.content then
          if (.message.content | type) == "array" then
            [.message.content[] | select(.type=="tool_use") | .name] | unique | join(", ")
          else
            ""
          end
        else
          ""
        end
      ' 2>/dev/null)

      if [ -n "$content" ] || [ -n "$tools" ]; then
        msg_count=$((msg_count + 1))
        {
          echo "### Claude"
          echo ""
          if [ -n "$content" ]; then
            echo "$content"
            echo ""
          fi
          if [ -n "$tools" ]; then
            echo "> **Tools used:** $tools"
            echo ""
          fi
          echo "---"
          echo ""
        } >> "$TRANSCRIPT_MD"
      fi
      ;;
  esac
done < "$transcript_path"

# Add footer with message count
echo "_${msg_count} messages in transcript_" >> "$TRANSCRIPT_MD"

# Post to PR using GitHub CLI
if command -v gh &> /dev/null; then
  gh pr comment "$APPEND_TRANSCRIPT_TO_PR" --body-file "$TRANSCRIPT_MD" 2>/dev/null || {
    echo "Warning: Failed to post transcript to PR $APPEND_TRANSCRIPT_TO_PR" >&2
  }
else
  echo "Warning: GitHub CLI (gh) not available" >&2
fi

# Return empty JSON to allow Claude to stop normally
echo '{}'
