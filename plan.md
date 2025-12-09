# Plan: Make implement-issue.yml Portable as a Reusable Workflow

## Overview

Transform the current `claude-implement-issue.yml` workflow (771 lines) into a reusable workflow that other repositories can adopt with minimal configuration (~15 lines of YAML + 1 secret). This involves:
1. Creating composite actions to eliminate repeated code patterns
2. Creating a reusable workflow with `workflow_call` trigger
3. Supporting dynamic matrix sizes and dual authentication methods
4. Updating the original workflow to dogfood the reusable version

## Implementation Task List:
1. **Create setup-claude composite action** - Extracts Claude CLI installation pattern (repeated 3x)
2. **Create fetch-agents composite action** - Extracts agent fetching pattern (repeated 3x)
3. **Create get-issue-details composite action** - Extracts issue detail extraction (repeated 3x)
4. **Create detect-runtime composite action** - Auto-detects runtime for multi-language support
5. **Create reusable-implement-issue.yml workflow** - Main reusable workflow with workflow_call trigger
6. **Update original workflow** - Convert to call the reusable workflow (dogfooding)

## Current State Analysis

### What Exists Now:
- **`.github/workflows/claude-implement-issue.yml`** (771 lines): Monolithic workflow with 3 jobs
  - `implement` job (lines 27-191): Parallel matrix implementation
  - `review` job (lines 192-506): Review and select best implementation
  - `verify` job (lines 507-771): Verify and post results

### Repeated Patterns Identified:
1. **Claude CLI Installation** (lines 65-69, 243-247, 520-524):
   ```yaml
   curl -fsSL https://claude.ai/install.sh | bash
   echo "$HOME/.local/bin" >> $GITHUB_PATH
   ```

2. **Fetch Custom Agents** (lines 71-80, 249-258, 526-535):
   ```yaml
   mkdir -p "$HOME/.claude/agents"
   for agent in codebase-analyzer codebase-locator coding-agent debug-agent; do
     curl -fsSL "https://raw.githubusercontent.com/${{ env.PROMPTS_REPO }}/${{ env.PROMPTS_REF }}/.claude/agents/${agent}.md" \
       -o "$HOME/.claude/agents/${agent}.md"
   done
   ```

3. **Get Issue Details** (lines 41-58, 209-223, 610-617):
   - Handles both `workflow_dispatch` and `issues` event triggers
   - Outputs: `number`, `title`, body file at `/tmp/issue_body.txt`

### Current Authentication:
- `GH_PAT`: GitHub Personal Access Token (for pushing branches, creating PRs)
- `CLAUDE_CODE_OAUTH_TOKEN`: OAuth token for Claude CLI

### Key Constraints:
- Composite actions **cannot** access `secrets` context directly - must pass as inputs
- Reusable workflows require checkout before using local composite actions
- `workflow_call` trigger doesn't support `environment` keyword at workflow level
- Matrix `uses` clause must be static string (cannot be dynamic)
- Environment variables don't propagate from caller to reusable workflow

### Key Discoveries:
- Claude CLI installation at `.github/workflows/claude-implement-issue.yml:65-69`
- Agent fetching pattern at `.github/workflows/claude-implement-issue.yml:71-80`
- Issue details pattern at `.github/workflows/claude-implement-issue.yml:41-58`
- Matrix strategy at `.github/workflows/claude-implement-issue.yml:29-32` with hardcoded `[1, 2, 3]`
- Authentication via `CLAUDE_CODE_OAUTH_TOKEN` at `.github/workflows/claude-implement-issue.yml:100`
- Prompts centralized in `.github/prompts/` directory (3 files: implementation.md, review.md, verify.md)
- Agents centralized in `.claude/agents/` directory (4 files)

## Desired End State

After implementation:
1. **Consumer experience**: Any repo can add ~15 lines of YAML + 1 secret to use the workflow
2. **Reusable workflow**: `.github/workflows/reusable-implement-issue.yml` accepts `workflow_call`
3. **Composite actions**: 4 actions in `.github/actions/` for code reuse
4. **Dogfooding**: Original workflow calls the reusable version
5. **Dual auth**: Support both `CLAUDE_CODE_OAUTH_TOKEN` and `ANTHROPIC_API_KEY`
6. **Dynamic matrix**: Support configurable number of implementations (1-N)

### Consumer YAML Example:
```yaml
name: Auto Implement Issues
on:
  issues:
    types: [opened]
  workflow_dispatch:
    inputs:
      issue_number:
        description: 'Issue number'
        required: true
        type: number

permissions:
  contents: write
  pull-requests: write
  issues: read

jobs:
  implement:
    uses: mkrueger12/claude-parallel/.github/workflows/reusable-implement-issue.yml@main
    secrets:
      CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

## What We're NOT Doing

1. **Not changing prompts**: The `.github/prompts/` files remain unchanged
2. **Not changing agents**: The `.claude/agents/` files remain unchanged
3. **Not adding new features**: Focus on portability, not new functionality
4. **Not changing the review/verify logic**: Only extracting and restructuring
5. **Not supporting non-GitHub CI**: This is GitHub Actions specific
6. **Not adding caching**: Keep it simple for initial version

## Implementation Approach

**Strategy**: Bottom-up approach - create composite actions first, then build reusable workflow on top.

**Key Design Decisions**:
1. **Composite actions stored locally**: Use `.github/actions/` directory, referenced via `uses: ./.github/actions/action-name`
2. **Dynamic matrix via setup job**: Generate matrix JSON in a setup job, pass via `fromJSON()`
3. **Dual auth via conditional env**: Check which secret is provided, set appropriate env var
4. **Secrets inheritance**: Use explicit secret passing (not `secrets: inherit`) for clarity

## Files to Edit

### New Files to Create:
1. `.github/actions/setup-claude/action.yml` - Claude CLI installation action
2. `.github/actions/fetch-agents/action.yml` - Agent fetching action
3. `.github/actions/get-issue-details/action.yml` - Issue details extraction action
4. `.github/actions/detect-runtime/action.yml` - Runtime detection action
5. `.github/workflows/reusable-implement-issue.yml` - Main reusable workflow

### Files to Modify:
1. `.github/workflows/claude-implement-issue.yml` - Update to call reusable workflow

---

## Task 1: Create Composite Action - setup-claude
**File**: `.github/actions/setup-claude/action.yml`

**Description of Changes**:
Create a composite action that:
1. Accepts `claude_code_oauth_token` and `anthropic_api_key` as inputs (both optional)
2. Validates that at least one auth method is provided
3. Installs Claude CLI from `https://claude.ai/install.sh`
4. Adds `$HOME/.local/bin` to PATH using `$GITHUB_PATH`
5. Sets the appropriate environment variable based on which auth is provided:
   - If `claude_code_oauth_token` is provided: Set `CLAUDE_CODE_OAUTH_TOKEN`
   - If only `anthropic_api_key` is provided: Set `ANTHROPIC_API_KEY`
   - Prefer OAuth token if both are provided
6. Outputs which auth method is being used

### Success Criteria:

#### Automated Verification:
- [ ] Action YAML is valid: `yq eval '.runs.using' .github/actions/setup-claude/action.yml` returns "composite"
- [ ] Action has required inputs defined
- [ ] Action has shell specified for all run steps

#### Manual Verification:
- [ ] Claude CLI installs successfully in workflow run
- [ ] PATH includes `$HOME/.local/bin`
- [ ] Correct auth env var is set

---

## Task 2: Create Composite Action - fetch-agents
**File**: `.github/actions/fetch-agents/action.yml`

**Description of Changes**:
Create a composite action that:
1. Accepts `repo` input (default: `mkrueger12/claude-parallel`)
2. Accepts `ref` input (default: `main`)
3. Creates `$HOME/.claude/agents` directory
4. Downloads all 4 agents from the specified repo:
   - `codebase-analyzer.md`
   - `codebase-locator.md`
   - `coding-agent.md`
   - `debug-agent.md`
5. Lists installed agents for verification

### Success Criteria:

#### Automated Verification:
- [ ] Action YAML is valid: `yq eval '.runs.using' .github/actions/fetch-agents/action.yml` returns "composite"
- [ ] Default values are set correctly

#### Manual Verification:
- [ ] All 4 agents are downloaded to correct location
- [ ] Agents are accessible by Claude CLI

---

## Task 3: Create Composite Action - get-issue-details
**File**: `.github/actions/get-issue-details/action.yml`

**Description of Changes**:
Create a composite action that:
1. Accepts `issue_number` input (optional - for workflow_dispatch)
2. Accepts `github_token` input (required for GitHub CLI)
3. Handles both `issues` event (auto-detect from `github.event.issue.number`) and `workflow_dispatch` (use provided input)
4. Fetches issue details via `gh issue view`
5. Outputs:
   - `number`: Issue number
   - `title`: Issue title
   - `body_file`: Path to file containing issue body (for multiline handling)

### Success Criteria:

#### Automated Verification:
- [ ] Action YAML is valid
- [ ] Outputs are properly defined

#### Manual Verification:
- [ ] Works with `issues` event trigger
- [ ] Works with `workflow_dispatch` trigger
- [ ] Issue body with multiline content is handled correctly

---

## Task 4: Create Composite Action - detect-runtime
**File**: `.github/actions/detect-runtime/action.yml`

**Description of Changes**:
Create a composite action that auto-detects the project runtime:
1. Checks for presence of various config files
2. Outputs:
   - `runtime`: One of `js`, `python`, `go`, `rust`, `unknown`
   - `package_manager`: Detected package manager (bun, pnpm, yarn, npm, pip, poetry, go, cargo)
   - `has_build`: Boolean - whether project has a build script
   - `has_tests`: Boolean - whether project has tests

Detection logic:
- **JavaScript/TypeScript**: Check for `package.json`, detect bun (bun.lockb), pnpm (pnpm-lock.yaml), yarn (yarn.lock), npm (package-lock.json)
- **Python**: Check for `pyproject.toml`, `requirements.txt`, `setup.py`
- **Go**: Check for `go.mod`
- **Rust**: Check for `Cargo.toml`

### Success Criteria:

#### Automated Verification:
- [ ] Action YAML is valid
- [ ] All outputs are defined

#### Manual Verification:
- [ ] Correctly detects JS project with bun
- [ ] Correctly detects Python project
- [ ] Correctly detects Go project
- [ ] Correctly detects Rust project

---

## Task 5: Create Reusable Workflow
**File**: `.github/workflows/reusable-implement-issue.yml`

**Description of Changes**:
Create the main reusable workflow with:

1. **Trigger**: `workflow_call` with inputs and secrets

2. **Inputs** (all optional with defaults):
   | Input | Type | Default | Description |
   |-------|------|---------|-------------|
   | `issue_number` | number | (from event) | Issue number for workflow_dispatch |
   | `num_implementations` | number | 3 | Number of parallel implementations |
   | `claude_model` | string | claude-opus-4-5-20251101 | Model to use |
   | `prompts_repo` | string | mkrueger12/claude-parallel | Central repo for prompts |
   | `prompts_ref` | string | main | Git ref for prompts |
   | `bot_name` | string | Claude Parallel Bot | Git author name |
   | `bot_email` | string | bot@claude-parallel.dev | Git author email |
   | `dry_run` | boolean | false | Skip Claude, use mock responses |

3. **Secrets** (optional, at least one required):
   - `CLAUDE_CODE_OAUTH_TOKEN`
   - `ANTHROPIC_API_KEY`
   - `GH_PAT` (required for PR creation)

4. **Jobs**:
   - `generate-matrix`: Generate dynamic matrix based on `num_implementations`
   - `implement`: Parallel implementation job (uses matrix from generate-matrix)
   - `review`: Review and select best implementation
   - `verify`: Verify and post results

5. **Key Implementation Details**:
   - Use local composite actions via `uses: ./.github/actions/action-name`
   - Generate matrix via setup job with `fromJSON()`
   - Validate auth in first job (fail fast if missing)
   - Use `${{ inputs.xxx }}` for all configurable values
   - Pass secrets explicitly to composite actions that need them

### Success Criteria:

#### Automated Verification:
- [ ] Workflow YAML is valid
- [ ] All inputs have correct types and defaults
- [ ] Secrets are properly declared

#### Manual Verification:
- [ ] Workflow runs successfully when called from another workflow
- [ ] Dynamic matrix works (1-N implementations)
- [ ] Both auth methods work
- [ ] All prompts/agents fetched from central repo

---

## Task 6: Update Original Workflow
**File**: `.github/workflows/claude-implement-issue.yml`

**Description of Changes**:
Convert the existing 771-line workflow to call the reusable version:

1. Keep the same `name`, `on` triggers, and `permissions`
2. Replace all jobs with a single job that calls the reusable workflow:
   ```yaml
   jobs:
     implement:
       uses: ./.github/workflows/reusable-implement-issue.yml
       with:
         issue_number: ${{ inputs.issue_number }}
         dry_run: ${{ inputs.dry_run }}
       secrets:
         CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
         GH_PAT: ${{ secrets.GH_PAT }}
   ```
3. This will reduce the file from ~771 lines to ~30 lines

### Success Criteria:

#### Automated Verification:
- [ ] Workflow YAML is valid
- [ ] Uses reusable workflow correctly

#### Manual Verification:
- [ ] Existing functionality preserved
- [ ] Dry run mode still works
- [ ] All 3 phases (implement, review, verify) execute correctly

---

## Migration Notes

1. **No breaking changes for existing users**: The original workflow will continue to work with same inputs/outputs
2. **Secrets migration**: Users of the reusable workflow need to set up either `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`
3. **Permissions**: Consumer workflows need to declare proper permissions (contents: write, pull-requests: write, issues: read)

## References

- Current workflow: `.github/workflows/claude-implement-issue.yml`
- Prompts: `.github/prompts/implementation.md`, `review.md`, `verify.md`
- Agents: `.claude/agents/codebase-analyzer.md`, `codebase-locator.md`, `coding-agent.md`, `debug-agent.md`
- GitHub Actions Reusable Workflows docs: https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- GitHub Actions Composite Actions docs: https://docs.github.com/actions/creating-actions/creating-a-composite-action
