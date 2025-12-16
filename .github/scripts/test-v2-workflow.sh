#!/bin/bash

# Test script for v2 multi-provider workflow (parallel jobs approach)
# This simulates what the GitHub Actions workflow does

set -e  # Exit on error

# Change to script directory
cd "$(dirname "$0")"

# Load environment variables from .env
if [ -f ../../.env ]; then
  set -a
  source ../../.env
  set +a
  echo "✅ Loaded environment variables from .env"
else
  echo "❌ No .env file found. Please create one with required API keys."
  exit 1
fi

# Test configuration
ISSUE_TITLE="E2E Test for v2 Workflow"
ISSUE_BODY="This is a test to verify the v2 multi-provider plan workflow works correctly. Please generate a simple implementation plan."
export GITHUB_ISSUE_URL="https://github.com/mkrueger12/claude-parallel/issues/test-v2"

echo ""
echo "=========================================="
echo "V2 Workflow E2E Test"
echo "=========================================="
echo "Issue: $ISSUE_TITLE"
echo ""

# Step 1: Generate plan from Anthropic
echo "Step 1: Generating plan from Anthropic..."
export MODEL="${ANTHROPIC_MODEL:-claude-haiku-4-5-20251001}"
ANTHROPIC_PLAN=$(bun run generate-plan-single.ts anthropic "$ISSUE_TITLE" "$ISSUE_BODY" 2>&1)
if [ $? -eq 0 ]; then
  echo "✅ Anthropic plan generated (${#ANTHROPIC_PLAN} chars)"
else
  echo "❌ Anthropic plan generation FAILED"
  exit 1
fi

# Step 2: Generate plan from OpenAI
echo ""
echo "Step 2: Generating plan from OpenAI..."
export MODEL="${OPENAI_MODEL:-gpt-5.1-codex-mini}"
OPENAI_PLAN=$(bun run generate-plan-single.ts openai "$ISSUE_TITLE" "$ISSUE_BODY" 2>&1)
if [ $? -eq 0 ]; then
  echo "✅ OpenAI plan generated (${#OPENAI_PLAN} chars)"
else
  echo "❌ OpenAI plan generation FAILED"
  exit 1
fi

# Step 3: Generate plan from Google
echo ""
echo "Step 3: Generating plan from Google..."
export MODEL="${GOOGLE_MODEL:-gemini-2.5-flash}"
GOOGLE_PLAN=$(bun run generate-plan-single.ts google "$ISSUE_TITLE" "$ISSUE_BODY" 2>&1)
if [ $? -eq 0 ]; then
  echo "✅ Google plan generated (${#GOOGLE_PLAN} chars)"
else
  echo "❌ Google plan generation FAILED"
  exit 1
fi

# Step 4: Consolidate plans and create Linear issues
echo ""
echo "Step 4: Consolidating plans and creating Linear issues..."
export ANTHROPIC_PLAN
export OPENAI_PLAN
export GOOGLE_PLAN
export ISSUE_TITLE

bun run consolidate-plans.ts

if [ $? -eq 0 ]; then
  echo ""
  echo "=========================================="
  echo "✅ E2E TEST PASSED"
  echo "=========================================="
  echo ""
  echo "Summary:"
  echo "- Anthropic plan: ${#ANTHROPIC_PLAN} chars"
  echo "- OpenAI plan: ${#OPENAI_PLAN} chars"
  echo "- Google plan: ${#GOOGLE_PLAN} chars"
  echo "- Consolidation: SUCCESS"
  echo ""
else
  echo ""
  echo "=========================================="
  echo "❌ E2E TEST FAILED"
  echo "=========================================="
  echo "Consolidation step failed"
  exit 1
fi
