# Implementation Plan: Duplicate Code Reduction in GitHub Actions

**Linear Issue:** DEL-1346
**GitHub Issue:** https://github.com/mkrueger12/claude-parallel/issues/47

## Overview

This plan reduces duplicate code across the GitHub Actions workflows and actions in this repository. The implementation addresses three categories of duplication:

1. **Identical action files** between `.github/actions/` and `templates/actions/` (5 actions, ~380 lines)
2. **Repeated setup blocks** across workflow jobs (Setup Bun + OpenCode CLI + ast-grep repeated ~4x in plan workflows, Setup Claude + Bun + agents repeated ~3x in implement workflows)
3. **Repeated runtime-specific dependency installation** blocks (~35 lines repeated in multiple jobs)

## Current State Analysis

### What Exists Now

- **5 identical action files** in both `.github/actions/` and `templates/actions/`:
  - `detect-runtime/action.yml` (114 lines)
  - `fetch-agents/action.yml` (35 lines)
  - `get-issue-details/action.yml` (60 lines)
  - `setup-claude/action.yml` (46 lines)
  - `setup-opencode/action.yml` (129 lines)
  - **Total: ~384 lines of pure duplication**

- **Planning workflow duplication** in `multi-provider-plan-v2.yml` (lines 89-111, 150-172, 211-233, 273-295):
  - Same ~23 lines repeated 4 times = ~70 lines of duplication

- **Implementation workflow duplication** in `reusable-implement-issue.yml`:
  - Setup blocks repeated 3 times in implement, review, verify jobs
  - ~33 lines repeated 3 times = ~66 lines of duplication

### Key Discoveries

- `.github/actions/*` and `templates/actions/*` are 100% identical (confirmed via diff)
- The installer (`src/cli/install.ts:86-90`) maps `templates/actions/*` → `.github/actions/*` when installing to user repos
- The reusable workflow references actions via `mkrueger12/claude-parallel/.github/actions/*@main` for remote use

### Constraints

- `templates/actions/*` must remain correct for the npm package installer
- `.github/actions/*` must remain for remote workflow references
- Both must stay in sync

---

## Task 1: Create Sync Script for Action Files (DEL-1347)

**Files to create:** `scripts/sync-github-actions.ts`

### Description
Create a TypeScript script that:
- Recursively finds all files in `templates/actions/**`
- Copies them to `.github/actions/**` preserving directory structure
- Supports `--check` mode that exits with error if files differ (for CI)
- Supports `--dry-run` mode to preview changes
- Add npm scripts `sync-actions` and `sync-actions:check` to package.json

### Implementation Details
The script should:
1. Use Node.js fs module for file operations
2. Compare file contents (not just existence) to detect drift
3. Provide clear output showing which files would be copied/updated
4. Exit with code 0 if files are in sync, code 1 if they differ (in check mode)

### Files to Edit
- `scripts/sync-github-actions.ts` (create)
- `package.json` (add scripts)

---

## Task 2: Create setup-planning-env Composite Action (DEL-1348)

**Files to create:** `templates/actions/setup-planning-env/action.yml`

### Description
Create a composite action that consolidates planning job setup:
- Uses `oven-sh/setup-bun@v2` with bun-version: latest
- Installs OpenCode CLI globally (`bun install -g opencode-ai@latest`)
- Installs ast-grep globally (`bun install -g @ast-grep/cli` + `bun pm -g trust @ast-grep/cli`)
- Optionally runs `bun install` if `package.json` exists and `skip_bun_install` input is false

### Inputs
- `skip_bun_install` (boolean, default: false) - Skip `bun install` for repos without package.json

### Steps
1. Setup Bun via `oven-sh/setup-bun@v2`
2. Install OpenCode CLI
3. Install ast-grep
4. Optionally run `bun install` in workspace

---

## Task 3: Create setup-agent-runner Composite Action (DEL-1349)

**Files to create:** `templates/actions/setup-agent-runner/action.yml`

### Description
Create a composite action that consolidates agent runner setup for implementation workflows:
- Calls existing `setup-claude` action for CLI and authentication
- Uses `oven-sh/setup-bun@v2` for Bun runtime
- Runs `bun install` in workspace
- Installs ast-grep globally
- Calls existing `fetch-agents` action for custom agents

### Inputs
- `dry_run` (boolean, default: false) - Skip actual setup when true (for testing)
- `prompts_repo` (string, default: 'mkrueger12/claude-parallel')
- `prompts_ref` (string, default: 'main')
- `claude_code_oauth_token` (string, required: false) - For Claude auth
- `anthropic_api_key` (string, required: false) - For Claude auth

### Steps (each with `if: inputs.dry_run != 'true'` condition)
1. Call `setup-claude` action with auth credentials
2. Setup Bun via `oven-sh/setup-bun@v2`
3. Run `bun install` in workspace
4. Install ast-grep globally
5. Call `fetch-agents` action with repo/ref inputs

---

## Task 4: Refactor Planning Workflows (DEL-1350)

**Files to edit:**
- `.github/workflows/multi-provider-plan-v2.yml` (lines 89-111, 150-172, 211-233, 273-295)
- `templates/workflows/claude-plan.yml` (lines 89-111, 150-172, 211-233, 273-295)

### Description
Replace the repeated setup blocks in all 4 jobs with the new composite action.

### Current Pattern (repeated 4 times per workflow)
```yaml
- name: Setup Bun
  uses: oven-sh/setup-bun@v1
  with:
    bun-version: latest

- name: Install OpenCode CLI
  run: |
    echo "Installing OpenCode CLI..."
    bun install -g opencode-ai@latest
    echo "OpenCode CLI installed: $(opencode --version || echo 'version check not supported')"

- name: Install dependencies
  run: bun install

- name: Install ast-grep
  run: |
    bun install -g @ast-grep/cli
    bun pm -g trust @ast-grep/cli
    ast-grep --version
```

### New Pattern (single step)
```yaml
- name: Setup planning environment
  uses: ./.github/actions/setup-planning-env
```

### Jobs to Update in Each Workflow
1. `generate-plan-anthropic`
2. `generate-plan-openai`
3. `generate-plan-google`
4. `consolidate-and-create-linear`

**Line reduction:** ~92 lines per workflow (23 lines × 4 jobs → 4 lines)

---

## Task 5: Refactor Implementation Workflows (DEL-1351)

**Files to edit:**
- `.github/workflows/reusable-implement-issue.yml` (lines 99-131, 361-393, 527-559)
- `templates/workflows/claude-implement.yml` (lines 96-142)

### Description

#### Part A: Update `reusable-implement-issue.yml`
Replace the repeated setup blocks in the `implement`, `review`, and `verify` jobs.

**Current pattern** (repeated 3 times, ~33 lines each):
```yaml
- name: Setup Claude CLI
  if: ${{ inputs.dry_run != true }}
  uses: mkrueger12/claude-parallel/.github/actions/setup-claude@main
  with:
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

- name: Setup Bun for Agent Runner
  if: ${{ inputs.dry_run != true }}
  uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest

- name: Install agent runner dependencies
  if: ${{ inputs.dry_run != true }}
  run: |
    cd ${{ github.workspace }}
    bun install

- name: Install ast-grep
  if: ${{ inputs.dry_run != true }}
  run: |
    bun install -g @ast-grep/cli
    bun pm -g trust @ast-grep/cli
    ast-grep --version

- name: Fetch custom agents
  if: ${{ inputs.dry_run != true }}
  uses: mkrueger12/claude-parallel/.github/actions/fetch-agents@main
  with:
    repo: ${{ inputs.prompts_repo }}
    ref: ${{ inputs.prompts_ref }}
```

**New pattern** (single step):
```yaml
- name: Setup agent runner environment
  if: ${{ inputs.dry_run != true }}
  uses: mkrueger12/claude-parallel/.github/actions/setup-agent-runner@main
  with:
    dry_run: ${{ inputs.dry_run }}
    prompts_repo: ${{ inputs.prompts_repo }}
    prompts_ref: ${{ inputs.prompts_ref }}
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

#### Part B: Update `templates/workflows/claude-implement.yml`
Replace inline Claude setup (lines 96-120) and agent copying (lines 133-142) with the composite action.

**Line reduction:** ~100 lines total across both workflows

---

## Task 6: Add CI Sync Verification (DEL-1352)

**Files to edit:** `.github/workflows/ci.yml`

### Description
Add a new job `sync-check` to the CI workflow that:
- Runs `bun run scripts/sync-github-actions.ts --check`
- Fails if `.github/actions/` differs from `templates/actions/`
- Provides clear error message indicating which files are out of sync

### New Job to Add
```yaml
sync-check:
  name: Actions Sync Check
  runs-on: ubuntu-latest
  steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Bun
      uses: oven-sh/setup-bun@v2
      with:
        bun-version: latest

    - name: Install dependencies
      run: bun install

    - name: Check actions are in sync
      run: bun run scripts/sync-github-actions.ts --check
```

### Package.json Updates
```json
{
  "scripts": {
    "sync-actions": "bun run scripts/sync-github-actions.ts",
    "sync-actions:check": "bun run scripts/sync-github-actions.ts --check"
  }
}
```

---

## Desired End State

After this implementation:

1. `templates/actions/*` is the single source of truth for all composite actions
2. A sync script copies `templates/actions/*` → `.github/actions/*` automatically
3. CI fails if actions drift out of sync
4. Planning workflows use a single `setup-planning-env` action instead of 4 repeated blocks
5. Implementation workflows use a single `setup-agent-runner` action instead of 3 repeated blocks
6. Overall line reduction: ~400-500 lines (15-20% reduction in workflow code)

## What We're NOT Doing

- Not changing prompt templates or content in `prompts/` directories
- Not redesigning workflow logic (matrix strategy, review selection, verification semantics)
- Not implementing caching optimizations (this is code-reduction only)
- Not changing the provider behavior or model configurations
- Not merging `opencode-ai` and `claude-agent-sdk` setups (they serve different purposes)

---

## Implementation Order

Tasks should be implemented in this order due to dependencies:

1. **Task 1** - Sync script (foundational)
2. **Task 2** - setup-planning-env action (no dependencies)
3. **Task 3** - setup-agent-runner action (no dependencies)
4. **Task 4** - Refactor planning workflows (depends on Task 2)
5. **Task 5** - Refactor implementation workflows (depends on Task 3)
6. **Task 6** - CI sync verification (depends on Task 1)

Note: Tasks 2 and 3 can be done in parallel. Tasks 4, 5, and 6 can be done in parallel once their dependencies are complete.
