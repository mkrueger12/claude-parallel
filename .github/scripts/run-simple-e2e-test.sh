#!/bin/bash

# Change to script directory
cd "$(dirname "$0")"

# Load environment variables from .env
set -a
source ../../.env
set +a

# Set GitHub issue URL for testing
export GITHUB_ISSUE_URL="https://github.com/mkrueger12/claude-parallel/issues/simple-test"

# Run the script with a simple, quick test
node --loader ts-node/esm generate-and-create-linear.ts \
  "Simple E2E Test" \
  "say hi"
