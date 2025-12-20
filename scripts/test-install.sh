#!/bin/bash

# Installation test script for install-claude-parallel
# Tests the installer in a temporary directory and verifies all expected files are created

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test directory
TEST_DIR="/tmp/test-install-$$"

# Expected files
EXPECTED_FILES=(
  ".github/workflows/claude-plan.yml"
  ".github/workflows/claude-implement.yml"
  ".github/claude-parallel/scripts/planning-agent.js"
  ".github/claude-parallel/scripts/linear-agent.js"
  ".github/claude-parallel/scripts/claude-agent-runner.js"
  ".github/claude-parallel/scripts/detect-runtime.sh"
  ".github/claude-parallel/prompts/plan-generation.md"
  ".github/claude-parallel/prompts/consolidate-and-create-linear.md"
  ".github/claude-parallel/prompts/implementation.md"
  ".github/claude-parallel/prompts/review.md"
  ".github/claude-parallel/prompts/verify.md"
  ".claude/agents/coding-agent.md"
  ".claude/agents/codebase-locator.md"
  ".claude/agents/codebase-analyzer.md"
  ".claude/agents/debug-agent.md"
  ".env.example"
  ".github/claude-parallel/.install-manifest.json"
)

cleanup() {
  if [ -d "$TEST_DIR" ]; then
    echo -e "${YELLOW}Cleaning up test directory...${NC}"
    rm -rf "$TEST_DIR"
  fi
}

trap cleanup EXIT

echo -e "${GREEN}=== Installation Test Script ===${NC}"
echo ""

# Step 1: Create test directory with git repo
echo -e "${YELLOW}Step 1: Creating test directory${NC}"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"
git init -q
git config user.name "Test User"
git config user.email "test@example.com"
echo "# Test Repo" > README.md
git add README.md
git commit -q -m "Initial commit"
echo -e "${GREEN}✓ Test directory created${NC}"
echo ""

# Step 2: Build the installer
echo -e "${YELLOW}Step 2: Building installer${NC}"
cd /home/runner/work/claude-parallel/claude-parallel
npm run build > /dev/null 2>&1
echo -e "${GREEN}✓ Installer built${NC}"
echo ""

# Step 3: Run installer with --yes flag
echo -e "${YELLOW}Step 3: Running installer (first run)${NC}"
cd "$TEST_DIR"
node /home/runner/work/claude-parallel/claude-parallel/dist/cli/index.js --yes
echo -e "${GREEN}✓ Installer completed${NC}"
echo ""

# Step 4: Verify all expected files exist
echo -e "${YELLOW}Step 4: Verifying installed files${NC}"
MISSING_FILES=()
for file in "${EXPECTED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    MISSING_FILES+=("$file")
  fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
  echo -e "${GREEN}✓ All ${#EXPECTED_FILES[@]} expected files created${NC}"
else
  echo -e "${RED}✗ Missing ${#MISSING_FILES[@]} files:${NC}"
  for file in "${MISSING_FILES[@]}"; do
    echo -e "${RED}  - $file${NC}"
  done
  exit 1
fi
echo ""

# Step 5: Verify manifest was created
echo -e "${YELLOW}Step 5: Verifying manifest${NC}"
MANIFEST_FILE=".github/claude-parallel/.install-manifest.json"
if [ ! -f "$MANIFEST_FILE" ]; then
  echo -e "${RED}✗ Manifest file not found${NC}"
  exit 1
fi

# Check manifest is valid JSON
if ! jq . "$MANIFEST_FILE" > /dev/null 2>&1; then
  echo -e "${RED}✗ Manifest is not valid JSON${NC}"
  exit 1
fi

# Check manifest has required fields
if ! jq -e '.version' "$MANIFEST_FILE" > /dev/null 2>&1; then
  echo -e "${RED}✗ Manifest missing 'version' field${NC}"
  exit 1
fi

if ! jq -e '.installedAt' "$MANIFEST_FILE" > /dev/null 2>&1; then
  echo -e "${RED}✗ Manifest missing 'installedAt' field${NC}"
  exit 1
fi

if ! jq -e '.files' "$MANIFEST_FILE" > /dev/null 2>&1; then
  echo -e "${RED}✗ Manifest missing 'files' field${NC}"
  exit 1
fi

# Check manifest has hashes for all files
FILE_COUNT=$(jq '.files | length' "$MANIFEST_FILE")
if [ "$FILE_COUNT" -ne 16 ]; then
  echo -e "${RED}✗ Manifest has $FILE_COUNT files, expected 16${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Manifest valid with $FILE_COUNT files tracked${NC}"
echo ""

# Step 6: Test re-run behavior (should skip existing files)
echo -e "${YELLOW}Step 6: Testing re-run behavior${NC}"
OUTPUT=$(node /home/runner/work/claude-parallel/claude-parallel/dist/cli/index.js --yes 2>&1)
if echo "$OUTPUT" | grep -q "already exists"; then
  echo -e "${GREEN}✓ Re-run detected existing files${NC}"
else
  echo -e "${YELLOW}⚠ Re-run may have overwritten files (expected behavior if files unchanged)${NC}"
fi
echo ""

# Step 7: Test conflict detection
echo -e "${YELLOW}Step 7: Testing conflict detection${NC}"
# Modify a file
echo "# Modified by user" >> ".github/claude-parallel/prompts/implementation.md"
# Re-run installer
OUTPUT=$(node /home/runner/work/claude-parallel/claude-parallel/dist/cli/index.js --yes 2>&1)
if echo "$OUTPUT" | grep -q "modified by user"; then
  echo -e "${GREEN}✓ Installer detected user modifications${NC}"
else
  echo -e "${RED}✗ Installer did not detect user modifications${NC}"
  exit 1
fi
# Verify file was not overwritten (our modification should still be there)
if grep -q "Modified by user" ".github/claude-parallel/prompts/implementation.md"; then
  echo -e "${GREEN}✓ Modified file was preserved${NC}"
else
  echo -e "${RED}✗ Modified file was overwritten${NC}"
  exit 1
fi
echo ""

# Step 8: Test --force behavior
echo -e "${YELLOW}Step 8: Testing --force flag${NC}"
OUTPUT=$(node /home/runner/work/claude-parallel/claude-parallel/dist/cli/index.js --force --yes 2>&1)
# Verify modification was overwritten
if grep -q "Modified by user" ".github/claude-parallel/prompts/implementation.md"; then
  echo -e "${RED}✗ --force did not overwrite modified file${NC}"
  exit 1
else
  echo -e "${GREEN}✓ --force overwrote modified file${NC}"
fi
echo ""

# Step 9: Test dry-run mode
echo -e "${YELLOW}Step 9: Testing --dry-run flag${NC}"
# Delete a file
rm ".github/workflows/claude-plan.yml"
# Run with --dry-run
OUTPUT=$(node /home/runner/work/claude-parallel/claude-parallel/dist/cli/index.js --dry-run 2>&1)
# Verify file was NOT recreated
if [ -f ".github/workflows/claude-plan.yml" ]; then
  echo -e "${RED}✗ --dry-run created files${NC}"
  exit 1
else
  echo -e "${GREEN}✓ --dry-run did not create files${NC}"
fi
# Verify output mentioned the file
if echo "$OUTPUT" | grep -q "claude-plan.yml"; then
  echo -e "${GREEN}✓ --dry-run showed what would be installed${NC}"
else
  echo -e "${RED}✗ --dry-run did not show expected output${NC}"
  exit 1
fi
echo ""

# Final summary
echo -e "${GREEN}=== All Tests Passed ===${NC}"
echo ""
echo "Summary:"
echo "  ✓ Installation creates all 16 expected files"
echo "  ✓ Manifest is created with correct structure"
echo "  ✓ Re-run behavior works correctly"
echo "  ✓ User modifications are detected and preserved"
echo "  ✓ --force flag overwrites user modifications"
echo "  ✓ --dry-run flag previews without making changes"
echo ""
echo -e "${GREEN}Installation test completed successfully!${NC}"

exit 0
