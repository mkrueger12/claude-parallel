## Overview

This plan addresses duplicate code in GitHub Actions workflows. The analysis identified significant duplication patterns across workflow files that can be consolidated using composite actions and reusable workflow components.

## Implementation Task List:
1. Create composite action for OpenCode environment setup - consolidates Bun, OpenCode CLI, dependencies, and ast-grep installation
2. Create composite action for Claude CLI setup with authentication - consolidates CLI installation and auth logic
3. Create composite action for runtime setup and dependency installation - consolidates multi-language setup
4. Create composite action for build checks - extracts ~180 lines of verification logic
5. Refactor multi-provider-plan-v2.yml to use new composite actions
6. Refactor reusable-implement-issue.yml to use new composite actions
7. Refactor templates/workflows/claude-implement.yml to use new composite actions
8. Refactor templates/workflows/claude-plan.yml to use new composite actions
9. Refactor ci.yml to use composite actions

## Current State Analysis

### Key Duplication Patterns Identified:

| Pattern | Files Affected | Duplicate Lines | Occurrences |
|---------|----------------|-----------------|-------------|
| Bun + OpenCode CLI setup | multi-provider-plan-v2.yml | ~80 lines | 4x in same file |
| Claude CLI setup + auth | reusable-implement-issue.yml, claude-implement.yml | ~24 lines | 3x per file |
| Agent runner setup (Bun + deps) | reusable-implement-issue.yml, claude-implement.yml | ~20 lines | 3x per file |
| Runtime detection + setup | reusable-implement-issue.yml, claude-implement.yml | ~65 lines | 2x per file |
| Install dependencies script | reusable-implement-issue.yml, claude-implement.yml | ~35 lines | 2x per file |
| Build checks script | reusable-implement-issue.yml, claude-implement.yml | ~180 lines | 1x per file (2 total) |
| CI setup (checkout + bun + deps) | ci.yml | ~10 lines | 2x in same file |

### Architectural Observations:

1. **Custom actions already exist** at `.github/actions/` (setup-claude, fetch-agents, detect-runtime, get-issue-details, setup-opencode) but are inconsistently used
2. **Template workflows** (`templates/workflows/`) duplicate inline scripts instead of using the existing actions
3. **Multi-provider plan workflow** repeats the same 4-step setup block across all 4 jobs

## Desired End State

After this plan is complete:

1. **New composite actions** will exist in `.github/actions/`:
   - `setup-opencode-environment/action.yml` - Bun + OpenCode CLI + deps + ast-grep
   - `setup-runtime-and-deps/action.yml` - Multi-language runtime setup + dependency installation
   - `run-build-checks/action.yml` - Build, test, lint, typecheck execution

2. **Existing workflows** will be refactored to use these actions, reducing line counts by ~40-50%

3. **Template workflows** will be updated to match the refactored approach

### Verification:
- All workflows should pass their CI checks
- `bun run type-check` should pass
- `bun run check` (Biome) should pass
- Dry-run of workflows should succeed (if testable locally)

### Key Discoveries:
- `.github/workflows/multi-provider-plan-v2.yml:92-110` - OpenCode setup repeated 4 times
- `.github/workflows/reusable-implement-issue.yml:106-130` - Agent runner setup repeated 3 times
- `.github/workflows/reusable-implement-issue.yml:162-196` - Install dependencies duplicated in implement and verify jobs
- `.github/workflows/reusable-implement-issue.yml:626-803` - Build checks is ~180 lines of complex shell
- `templates/workflows/claude-implement.yml:96-119` - Claude CLI setup inline instead of using action
- `templates/workflows/claude-implement.yml:175-209` - Install dependencies duplicated 2x in same file

## What We're NOT Doing

- **NOT changing workflow logic or behavior** - only consolidating duplicate code
- **NOT adding new features** to the workflows
- **NOT modifying the agents or prompts**
- **NOT changing the TypeScript source code** in `src/`
- **NOT changing the scripts** in `scripts/`
- **NOT modifying the build process**

## Implementation Approach

1. **Create composite actions first** - this establishes the reusable components
2. **Test composite actions in isolation** - ensure they work before refactoring
3. **Refactor one workflow at a time** - to ensure each change is isolated
4. **Update templates last** - after the main workflows are working

## Files to Edit

### New files to create:
- `.github/actions/setup-opencode-environment/action.yml`
- `.github/actions/setup-runtime-and-deps/action.yml`
- `.github/actions/run-build-checks/action.yml`

### Files to modify:
- `.github/workflows/multi-provider-plan-v2.yml` (lines 92-294)
- `.github/workflows/reusable-implement-issue.yml` (lines 106-196, 368-392, 534-624, 626-803)
- `.github/workflows/ci.yml` (lines 14-23, 35-44)
- `templates/workflows/claude-implement.yml` (lines 96-209, 335-380, 509-622, 624-801)
- `templates/workflows/claude-plan.yml` (lines 92-294)

---

## Task 1: Create setup-opencode-environment composite action

**File**: `.github/actions/setup-opencode-environment/action.yml`

**Description of Changes**:
Create a new composite action that consolidates the 4-step OpenCode environment setup:
1. Setup Bun with oven-sh/setup-bun@v1
2. Install OpenCode CLI globally via bun
3. Run `bun install` for project dependencies
4. Install ast-grep globally and trust it

The action should have no required inputs (use sensible defaults) and optionally accept:
- `bun-version` (default: "latest")
- `install-ast-grep` (default: true)

### Success Criteria:

#### Automated Verification:
- [ ] Action file is valid YAML
- [ ] Action can be referenced from a workflow

#### Manual Verification:
- [ ] Action installs Bun correctly
- [ ] Action installs OpenCode CLI
- [ ] Action runs bun install
- [ ] Action installs ast-grep when enabled

---

## Task 2: Create setup-runtime-and-deps composite action

**File**: `.github/actions/setup-runtime-and-deps/action.yml`

**Description of Changes**:
Create a composite action that consolidates runtime setup and dependency installation:
1. Accept inputs for `runtime` (js, python, go, rust) and `package_manager` (bun, npm, yarn, pnpm, pip, poetry, go, cargo)
2. Conditionally set up the appropriate runtime using standard GitHub actions
3. Run the appropriate dependency installation command

This extracts the ~65-line runtime setup block + ~35-line install dependencies block.

### Success Criteria:

#### Automated Verification:
- [ ] Action file is valid YAML
- [ ] Action handles all supported runtimes

#### Manual Verification:
- [ ] JS runtime with bun works
- [ ] JS runtime with npm works
- [ ] Python runtime works
- [ ] Go runtime works
- [ ] Rust runtime works

---

## Task 3: Create run-build-checks composite action

**File**: `.github/actions/run-build-checks/action.yml`

**Description of Changes**:
Create a composite action that extracts the ~180-line build checks script:
1. Accept inputs for `runtime` and `package_manager`
2. Run build, test, lint, and typecheck commands based on runtime
3. Output status for each check (pass, fail, skip)
4. Output combined results file

### Success Criteria:

#### Automated Verification:
- [ ] Action file is valid YAML
- [ ] Action outputs all required status values

#### Manual Verification:
- [ ] Build check runs correctly for JS projects
- [ ] Test check runs correctly
- [ ] Lint check runs correctly
- [ ] Typecheck runs correctly

---

## Task 4: Refactor multi-provider-plan-v2.yml to use composite actions

**File**: `.github/workflows/multi-provider-plan-v2.yml`

**Description of Changes**:
Replace the duplicated 4-step setup block in all 4 jobs (generate-plan-anthropic, generate-plan-openai, generate-plan-google, consolidate-and-create-linear) with a single call to the new `setup-opencode-environment` action.

Lines to replace:
- Lines 92-110 (generate-plan-anthropic)
- Lines 153-171 (generate-plan-openai)
- Lines 214-232 (generate-plan-google)
- Lines 276-294 (consolidate-and-create-linear)

Each 4-step block (~20 lines) becomes a single action call (~5 lines).

### Success Criteria:

#### Automated Verification:
- [ ] Workflow file is valid YAML: `yq eval '.' .github/workflows/multi-provider-plan-v2.yml`
- [ ] No syntax errors when loading workflow

#### Manual Verification:
- [ ] Workflow runs successfully (can test with dry_run if available)

---

## Task 5: Refactor reusable-implement-issue.yml to use composite actions

**File**: `.github/workflows/reusable-implement-issue.yml`

**Description of Changes**:
1. Replace agent runner setup blocks (lines 106-130, 368-392, 534-558) with existing `setup-claude` action + new `setup-opencode-environment` action
2. Replace runtime setup + install deps blocks (lines 132-196, 560-624) with new `setup-runtime-and-deps` action
3. Replace build checks script (lines 626-803) with new `run-build-checks` action

### Success Criteria:

#### Automated Verification:
- [ ] Workflow file is valid YAML
- [ ] No duplicate code blocks remain

#### Manual Verification:
- [ ] Workflow runs successfully with dry_run=true

---

## Task 6: Refactor ci.yml to reduce duplication

**File**: `.github/workflows/ci.yml`

**Description of Changes**:
The CI workflow has mild duplication (checkout + bun setup + install deps) in both jobs. Since this is minimal duplication (~10 lines x 2), we can either:
1. Leave as-is (acceptable level of duplication)
2. Use the new `setup-opencode-environment` action

Given the CI workflow's simplicity, using the composite action may be overkill. Recommend leaving as-is but documenting the decision.

### Success Criteria:

#### Automated Verification:
- [ ] CI workflow passes: `bun run check && bun run type-check && bun run build`

#### Manual Verification:
- [ ] CI workflow functions correctly on push/PR

---

## Task 7: Refactor templates/workflows/claude-implement.yml

**File**: `templates/workflows/claude-implement.yml`

**Description of Changes**:
This is a template workflow installed into user repos. It should reference actions from `.github/claude-parallel/actions/` (the installed location).

1. Replace inline Claude CLI setup (lines 96-119, 335-358, 509-532) with composite action reference
2. Replace runtime setup + deps (lines 143-209, 556-622) with composite action
3. Replace build checks (lines 624-801) with composite action

Note: Template workflows use local paths like `.github/claude-parallel/scripts/` so actions should also be bundled there.

### Success Criteria:

#### Automated Verification:
- [ ] Template is valid YAML
- [ ] Template references correct local paths

#### Manual Verification:
- [ ] Template can be installed and executed in a test repo

---

## Task 8: Refactor templates/workflows/claude-plan.yml

**File**: `templates/workflows/claude-plan.yml`

**Description of Changes**:
Similar to Task 4, replace the duplicated setup blocks in all jobs with composite action references.

### Success Criteria:

#### Automated Verification:
- [ ] Template is valid YAML

#### Manual Verification:
- [ ] Template matches the structure of refactored multi-provider-plan-v2.yml

---

## Task 9: Update installer to include new composite actions

**File**: `src/cli/install.ts` (review only - may not need changes)

**Description of Changes**:
Ensure the CLI installer copies the new composite actions to the user's repository. Review the `templates/` directory structure to confirm new actions are included.

If needed, add new action templates to `templates/actions/`:
- `templates/actions/setup-opencode-environment/action.yml`
- `templates/actions/setup-runtime-and-deps/action.yml`
- `templates/actions/run-build-checks/action.yml`

### Success Criteria:

#### Automated Verification:
- [ ] `bun run build` succeeds
- [ ] New templates are included in the build output

#### Manual Verification:
- [ ] Running `npx install-claude-parallel` installs the new actions

---

## Migration Notes

- Existing users who have installed the workflows will need to re-run `npx install-claude-parallel` to get the updated versions
- The installer's manifest system should handle updating unchanged files
- No breaking changes to workflow inputs/outputs

## References

- Duplication analysis: See initial research in this plan
- Existing actions: `.github/actions/setup-claude/action.yml` as reference for composite action structure
- GitHub composite actions docs: https://docs.github.com/en/actions/creating-actions/creating-a-composite-action
