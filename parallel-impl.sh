#!/bin/bash
# parallel-impl.sh - Run 3 parallel Claude Code implementations and auto-select the best

set -e

# Script directory (where prompts are stored)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
WORKTREES_DIR="../parallel-impls"
TIMESTAMP=$(date +%s)
NUM_IMPLEMENTATIONS=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
FEATURE_REQUEST="$1"

if [ -z "$FEATURE_REQUEST" ]; then
  echo -e "${RED}Error: Feature request is required${NC}"
  echo ""
  echo "Usage: $0 'your feature request here'"
  echo ""
  echo "Example:"
  echo "  $0 'Add user authentication with JWT tokens'"
  exit 1
fi

# Check dependencies
for cmd in git claude gh jq; do
  if ! command -v $cmd &> /dev/null; then
    echo -e "${RED}Error: Required command '$cmd' not found${NC}"
    exit 1
  fi
done

# Check we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${RED}Error: Not in a git repository${NC}"
  exit 1
fi

MAIN_REPO="$(pwd)"

echo -e "${BLUE}=== Claude Code Parallel Implementation ===${NC}"
echo -e "Feature Request: ${YELLOW}$FEATURE_REQUEST${NC}"
echo -e "Creating $NUM_IMPLEMENTATIONS parallel implementations..."
echo ""

# Clean up old worktrees if they exist
if [ -d "$WORKTREES_DIR" ]; then
  echo -e "${YELLOW}Cleaning up old worktrees...${NC}"
  for i in $(seq 1 $NUM_IMPLEMENTATIONS); do
    if [ -d "$WORKTREES_DIR/impl-$i" ]; then
      git worktree remove "$WORKTREES_DIR/impl-$i" --force 2>/dev/null || true
    fi
  done
  rm -rf "$WORKTREES_DIR"
fi

# Create worktrees directory
mkdir -p "$WORKTREES_DIR"

# Create worktrees
echo -e "${BLUE}Step 1: Creating git worktrees${NC}"
for i in $(seq 1 $NUM_IMPLEMENTATIONS); do
  BRANCH="impl-${TIMESTAMP}-$i"
  echo -e "  Creating worktree $i (branch: $BRANCH)..."
  git worktree add "$WORKTREES_DIR/impl-$i" -b "$BRANCH" > /dev/null 2>&1
done
echo -e "${GREEN}✓ Worktrees created${NC}"
echo ""

# Load implementation prompt template
IMPL_PROMPT_TEMPLATE="$SCRIPT_DIR/prompts/implementation.md"
if [ ! -f "$IMPL_PROMPT_TEMPLATE" ]; then
  echo -e "${RED}Error: Implementation prompt template not found at $IMPL_PROMPT_TEMPLATE${NC}"
  exit 1
fi

# Replace {{FEATURE_REQUEST}} in template
IMPL_PROMPT=$(sed "s|{{FEATURE_REQUEST}}|$FEATURE_REQUEST|g" "$IMPL_PROMPT_TEMPLATE")

# Run Claude in each worktree (parallel)
echo -e "${BLUE}Step 2: Running Claude Code in parallel${NC}"
echo -e "${YELLOW}This may take several minutes...${NC}"
echo ""

PIDS=()
for i in $(seq 1 $NUM_IMPLEMENTATIONS); do
  (
    cd "$WORKTREES_DIR/impl-$i"
    echo -e "  ${BLUE}→${NC} Implementation $i starting..."

    # Run Claude with the prompt
    if claude --print "$IMPL_PROMPT" \
      --output-format json \
      --dangerously-skip-permissions \
      > result.json 2> error.log; then
      echo -e "  ${GREEN}✓${NC} Implementation $i complete"
    else
      echo -e "  ${RED}✗${NC} Implementation $i failed (see error.log)"
    fi
  ) &
  PIDS+=($!)
done

# Wait for all implementations to complete
wait
echo ""
echo -e "${GREEN}✓ All implementations complete${NC}"
echo ""

# Check for failures
FAILED=0
for i in $(seq 1 $NUM_IMPLEMENTATIONS); do
  if [ ! -f "$WORKTREES_DIR/impl-$i/result.json" ]; then
    echo -e "${RED}Warning: Implementation $i failed${NC}"
    FAILED=1
  fi
done

if [ $FAILED -eq 1 ]; then
  echo -e "${YELLOW}Some implementations failed. Review continues with successful ones.${NC}"
  echo ""
fi

# Build review prompt
cd "$MAIN_REPO"

echo -e "${BLUE}Step 3: Reviewing implementations${NC}"

# Load review prompt template
REVIEW_PROMPT_TEMPLATE="$SCRIPT_DIR/prompts/review.md"
if [ ! -f "$REVIEW_PROMPT_TEMPLATE" ]; then
  echo -e "${RED}Error: Review prompt template not found at $REVIEW_PROMPT_TEMPLATE${NC}"
  exit 1
fi

# Replace placeholders in review template
REVIEW_PROMPT=$(sed "s|{{FEATURE_REQUEST}}|$FEATURE_REQUEST|g" "$REVIEW_PROMPT_TEMPLATE")
REVIEW_PROMPT=$(sed "s|{{WORKTREES_DIR}}|$WORKTREES_DIR|g" <<< "$REVIEW_PROMPT")
REVIEW_PROMPT=$(sed "s|{{NUM_IMPLEMENTATIONS}}|$NUM_IMPLEMENTATIONS|g" <<< "$REVIEW_PROMPT")

echo -e "${YELLOW}Starting review process...${NC}"

# Run review
if ! claude --print "$REVIEW_PROMPT" \
  --output-format json \
  --dangerously-skip-permissions \
  > review-result.json 2> review-error.log; then
  echo -e "${RED}Error: Review failed${NC}"
  cat review-error.log
  exit 1
fi

echo -e "${GREEN}✓ Review complete${NC}"
echo ""

# Parse review results
if ! jq empty review-result.json 2>/dev/null; then
  echo -e "${RED}Error: Invalid JSON in review results${NC}"
  cat review-result.json
  exit 1
fi

# Extract decision (handle both direct JSON and nested content)
CONTENT=$(jq -r '.content[0].text // .text // .' review-result.json)

# Try to parse as JSON
if DECISION=$(echo "$CONTENT" | jq -r '.best' 2>/dev/null) && [ "$DECISION" != "null" ]; then
  REASONING=$(echo "$CONTENT" | jq -r '.reasoning // "No reasoning provided"')
  QUALITY_SCORE=$(echo "$CONTENT" | jq -r '.quality_score // "N/A"')
  COMPLETENESS_SCORE=$(echo "$CONTENT" | jq -r '.completeness_score // "N/A"')
else
  echo -e "${RED}Error: Could not parse review decision${NC}"
  echo -e "Review output:"
  echo "$CONTENT"
  exit 1
fi

BEST=$DECISION
WINNING_BRANCH="impl-${TIMESTAMP}-$BEST"

echo -e "${BLUE}=== Review Results ===${NC}"
echo -e "Winner: ${GREEN}Implementation $BEST${NC}"
echo -e "Quality Score: $QUALITY_SCORE"
echo -e "Completeness Score: $COMPLETENESS_SCORE"
echo ""
echo -e "Reasoning:"
echo "$REASONING"
echo ""

# Create PR
echo -e "${BLUE}Step 4: Creating draft PR${NC}"

git checkout "$WINNING_BRANCH"

PR_BODY="## AI-Generated Implementation (Best of $NUM_IMPLEMENTATIONS)

**Selected:** Implementation $BEST

**Scores:**
- Quality: $QUALITY_SCORE/100
- Completeness: $COMPLETENESS_SCORE/100

**Reasoning:**
$REASONING

---
*Generated by parallel Claude Code workflow*"

if gh pr create --draft \
  --title "Feature: $FEATURE_REQUEST" \
  --body "$PR_BODY" > pr-url.txt 2>&1; then

  echo -e "${GREEN}✓ Draft PR created${NC}"
  cat pr-url.txt
  echo ""
else
  echo -e "${YELLOW}Note: PR creation failed (you may need to push first)${NC}"
  echo "You can create it manually from branch: $WINNING_BRANCH"
  echo ""
fi

# Cleanup non-winning worktrees
echo -e "${BLUE}Step 5: Cleanup${NC}"
for i in $(seq 1 $NUM_IMPLEMENTATIONS); do
  if [ "$i" != "$BEST" ]; then
    echo -e "  Removing worktree $i..."
    git worktree remove "$WORKTREES_DIR/impl-$i" --force 2>/dev/null || true
    # Delete the branch
    git branch -D "impl-${TIMESTAMP}-$i" 2>/dev/null || true
  fi
done

echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""
echo -e "${GREEN}=== Done! ===${NC}"
echo -e "Winning implementation: ${YELLOW}$WINNING_BRANCH${NC}"
echo -e "Worktree location: ${YELLOW}$WORKTREES_DIR/impl-$BEST${NC}"
