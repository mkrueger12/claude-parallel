#!/bin/bash

# Change to script directory
cd "$(dirname "$0")"

# Load environment variables from .env
set -a
source ../../.env
set +a

# Set GitHub issue URL for testing
export GITHUB_ISSUE_URL="https://github.com/mkrueger12/claude-parallel/issues/test-e2e"

# Run the script
node --loader ts-node/esm generate-and-create-linear.ts \
  "E2E Test: Multi-Provider Report Generation" \
  "This is an end-to-end test to verify the complete report generation workflow including:
- Plan generation from Anthropic Claude
- Plan generation from OpenAI GPT
- Plan generation from Google Gemini
- Plan consolidation
- Linear issue creation with parent and sub-issues

This test validates the entire system integration."
