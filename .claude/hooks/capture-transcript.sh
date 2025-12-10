#!/usr/bin/env bash
#
# SessionEnd Hook: Capture Transcript
#
# This script is called by Claude Code at the end of each session.
# It receives JSON input via stdin containing the transcript path,
# session ID, and other session metadata.
#
# Purpose: Copy the JSONL transcript file to the working directory
# for later processing and inclusion in PR comments.
#

set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)

# Log the received input for debugging
echo "[capture-transcript] Received input: $INPUT" >&2

# Extract transcript_path and session_id using jq
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

# Check if transcript path was provided
if [ -z "$TRANSCRIPT_PATH" ]; then
    echo "[capture-transcript] ERROR: No transcript_path in input" >&2
    exit 0  # Exit gracefully to not block session
fi

# Log extracted values
echo "[capture-transcript] Session ID: $SESSION_ID" >&2
echo "[capture-transcript] Transcript path: $TRANSCRIPT_PATH" >&2

# Expand tilde in path if present
EXPANDED_PATH="${TRANSCRIPT_PATH/#\~/$HOME}"
echo "[capture-transcript] Expanded path: $EXPANDED_PATH" >&2

# Check if the transcript file exists
if [ ! -f "$EXPANDED_PATH" ]; then
    echo "[capture-transcript] WARNING: Transcript file not found at $EXPANDED_PATH" >&2
    exit 0  # Exit gracefully
fi

# Copy transcript to working directory
OUTPUT_FILE="./verify-transcript.jsonl"
if cp "$EXPANDED_PATH" "$OUTPUT_FILE"; then
    echo "[capture-transcript] SUCCESS: Transcript copied to $OUTPUT_FILE" >&2
    # Also log the file size for verification
    FILE_SIZE=$(wc -c < "$OUTPUT_FILE" 2>/dev/null || echo "unknown")
    echo "[capture-transcript] File size: $FILE_SIZE bytes" >&2
else
    echo "[capture-transcript] ERROR: Failed to copy transcript" >&2
    exit 0  # Exit gracefully
fi

exit 0
