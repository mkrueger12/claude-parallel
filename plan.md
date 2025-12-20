# Implementation Plan: Rebuild as Installer CLI for Better Portability

## Linear Issue Reference
**Parent Issue:** DEL-1307 - Implementation Plan: Rebuild as installer CLI for better portability and developer experience
**URL:** https://linear.app/casper-studios/issue/DEL-1307

---

## Overview

Transform `claude-parallel` from a workflow-based system into a self-contained installer CLI (`npx install-claude-parallel`) that copies standalone workflows, scripts, prompts, and agents into user repositories. Backwards compatibility is not needed.

---

## Current State Analysis

### What Exists Today:
- Multi-provider planning workflow (`multi-provider-plan-v2.yml`) runs TS agents via Bun and OpenCode SDK
- Parallel implementation workflow (`reusable-implement-issue.yml`) is a reusable workflow meant to be invoked via `uses:`
- Implementation workflow references this repo and fetches prompts from raw GitHub URLs
- Agents exist in `.claude/agents/*.md`
- Prompts exist in `prompts/*.md`
- Runtime detection is a composite action: `.github/actions/detect-runtime/action.yml`

### What's Missing:
- No installer CLI exists
- No `templates/` directory exists
- Workflows are not standalone
- Scripts are not bundled for standalone execution

### Constraints:
- Planning/linear scripts depend on `@opencode-ai/sdk` which requires the `opencode-ai` CLI binary
- Implementation workflow uses `scripts/claude-agent-runner.ts` which uses `@anthropic-ai/claude-agent-sdk`
- Both SDKs must be bundled or their dependencies handled in workflows

---

## Desired End State

After `npx install-claude-parallel` in any repo:

```
user-repo/
├── .github/
│   ├── workflows/
│   │   ├── claude-plan.yml
│   │   └── claude-implement.yml
│   └── claude-parallel/
│       ├── scripts/
│       │   ├── planning-agent.js
│       │   ├── linear-agent.js
│       │   ├── claude-agent-runner.js
│       │   └── detect-runtime.sh
│       ├── prompts/
│       │   ├── plan-generation.md
│       │   ├── consolidate-and-create-linear.md
│       │   ├── implementation.md
│       │   ├── review.md
│       │   └── verify.md
│       └── .install-manifest.json
├── .claude/
│   └── agents/
│       ├── coding-agent.md
│       ├── codebase-locator.md
│       ├── codebase-analyzer.md
│       └── debug-agent.md
└── .env.example
```

---

## Task 1: Define templates & installed layout (DEL-1308)
**Linear Issue:** https://linear.app/casper-studios/issue/DEL-1308

### Description
Create the `templates/` directory structure with all required files that will be copied to user repositories.

### Files to Create/Edit:
- `templates/workflows/claude-plan.yml` (NEW)
- `templates/workflows/claude-implement.yml` (NEW)
- Copy all prompts to `templates/prompts/`
- Copy all agents to `templates/agents/`
- Extract runtime detection into `templates/scripts/detect-runtime.sh`
- Create `templates/.env.example`

### Success Criteria:
- [ ] Templates directory contains workflows, scripts, prompts, agents, and `.env.example`
- [ ] Templates do not reference `mkrueger12/claude-parallel` or `raw.githubusercontent.com`
- [ ] `detect-runtime.sh` outputs in GitHub Actions-compatible way

---

## Task 2: Create standalone workflow templates (DEL-1309)
**Linear Issue:** https://linear.app/casper-studios/issue/DEL-1309

### Description
Rewrite the workflows to be completely standalone - no references to external repos or curl downloads.

### Files to Edit/Create:
- `templates/workflows/claude-plan.yml`
- `templates/workflows/claude-implement.yml`

### Key Changes:
- Remove ALL references to `uses: mkrueger12/claude-parallel/...`
- Remove ALL `curl raw.githubusercontent.com` for prompts/agents
- Read prompts from `.github/claude-parallel/prompts/*.md`
- Reference agents from `.claude/agents/*.md`

### Success Criteria:
- [ ] No `uses: mkrueger12/claude-parallel` exists in workflows
- [ ] No `curl raw.githubusercontent.com` for prompts/agents
- [ ] YAML syntax is valid
- [ ] Workflow can be validated with `actionlint`

---

## Task 3: Bundle scripts for workflows (DEL-1310)
**Linear Issue:** https://linear.app/casper-studios/issue/DEL-1310

### Description
Compile TypeScript agents into self-contained JavaScript files that can run without the source repo.

### Files to Edit/Create:
- `src/agents/planning-agent.ts` (line 51) - refactor prompt path resolution
- `src/agents/linear-agent.ts` (line 47) - refactor prompt path resolution
- `scripts/claude-agent-runner.ts` (line 30) - refactor for bundling
- `scripts/build-templates.ts` (NEW) - bundling script
- `package.json` - add build scripts

### Output Files:
- `templates/scripts/planning-agent.js`
- `templates/scripts/linear-agent.js`
- `templates/scripts/claude-agent-runner.js`

### Success Criteria:
- [ ] Bundled scripts locate prompts relative to installed location
- [ ] Scripts are self-contained with shebang (`#!/usr/bin/env node`)
- [ ] Build script produces templates successfully
- [ ] Bundled scripts can run standalone

---

## Task 4: Implement installer CLI (DEL-1311)
**Linear Issue:** https://linear.app/casper-studios/issue/DEL-1311

### Description
Create the CLI that users will run with `npx install-claude-parallel` to install the workflows into their repos.

### Files to Create:
- `src/cli/index.ts` (NEW) - CLI entry point
- `src/cli/install.ts` (NEW) - main install logic
- `src/cli/manifest.ts` (NEW) - manifest read/write, hashing
- `package.json` - add `bin`, `files`, rename package

### CLI Behavior:
- Interactive prompts (unless `--yes` flag)
- Conflict handling with manifest checksums
- Flags: `--yes`, `--force`, `--dry-run`, `--help`

### Manifest Structure:
```json
{
  "version": "1.0.0",
  "installedAt": "2024-01-01T00:00:00Z",
  "files": {
    ".github/workflows/claude-plan.yml": "sha256:abc123...",
    ".github/claude-parallel/scripts/planning-agent.js": "sha256:def456...",
    ...
  }
}
```

### Success Criteria:
- [ ] CLI can be invoked with `npx install-claude-parallel`
- [ ] Installer creates all required files in target repo
- [ ] Re-running installer respects user modifications (unless `--force`)
- [ ] Dry-run mode shows what would be changed without making changes
- [ ] `--help` shows usage information

---

## Task 5: Documentation & release preparation (DEL-1312)
**Linear Issue:** https://linear.app/casper-studios/issue/DEL-1312

### Description
Update documentation and prepare the package for npm publishing.

### Files to Edit/Create:
- `README.md` - add "Installer usage" section
- `docs/installer.md` (NEW) - detailed installer documentation
- `package.json` - finalize publishing fields
- `scripts/test-install.sh` (NEW) - installation test script

### Package.json Updates:
```json
{
  "name": "install-claude-parallel",
  "version": "1.0.0",
  "bin": {
    "install-claude-parallel": "./dist/cli/index.js"
  },
  "files": [
    "dist/",
    "templates/"
  ],
  "publishConfig": {
    "access": "public"
  }
}
```

### Success Criteria:
- [ ] README has clear installer documentation
- [ ] `npm pack` includes `dist/` and `templates/`
- [ ] Test script passes
- [ ] Real-world dry run successful in a test repository

---

## Implementation Order

Tasks should be implemented in order as they build upon each other:

1. **Task 1** - Creates the template directory structure (foundation)
2. **Task 2** - Converts workflows to standalone (builds on Task 1 templates)
3. **Task 3** - Bundles scripts for the templates (builds on Tasks 1-2)
4. **Task 4** - Creates the CLI installer (uses completed templates from Tasks 1-3)
5. **Task 5** - Documentation and release (final polish after all features complete)

---

## Key Design Decisions

### 1. Template-Based Installation
The installer copies templates rather than dynamically generating files. This ensures:
- Predictable output
- Easy customization of templates
- Version-controlled source of truth

### 2. Manifest-Based Updates
The manifest tracks installed files with checksums to:
- Detect user modifications
- Allow safe re-runs without overwriting customizations
- Support `--force` for complete overwrite when needed

### 3. Self-Contained Bundles
Scripts are bundled as single files because:
- No need for users to install dependencies
- Reduces complexity in target repos
- Works across different Node.js setups

### 4. Prompt Path Resolution
Bundled scripts will resolve prompts relative to the installed location:
- `process.cwd()/.github/claude-parallel/prompts/`
- No hardcoded absolute paths
- No reliance on `__dirname` from source repo

---

## Verification Strategy

### For Each Task:
1. Run automated tests where applicable
2. Verify success criteria manually
3. Update features.json with pass/fail status

### End-to-End Test:
1. Create a fresh test repository
2. Run `npx install-claude-parallel`
3. Verify all files are installed correctly
4. Trigger workflows and verify they run successfully
5. Re-run installer and verify manifest conflict detection

---

## References

- **Linear Parent Issue:** DEL-1307
- **Sub-Issues:** DEL-1308, DEL-1309, DEL-1310, DEL-1311, DEL-1312
- **Current Workflows:** `.github/workflows/multi-provider-plan-v2.yml`, `.github/workflows/reusable-implement-issue.yml`
- **Current Prompts:** `prompts/*.md`
- **Current Agents:** `.claude/agents/*.md`
