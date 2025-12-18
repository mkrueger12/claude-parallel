# Implementation Plan: CLI Installer for Claude Parallel

## Overview

Transform claude-parallel from a fork-based workflow system into a self-contained CLI installer (`npx install-claude-parallel`) that copies all necessary files into any user repository. This follows the pattern of tools like `husky-init` and `create-react-app`, making the system fully portable and customizable after installation.

## Implementation Task List:

1. **Create CLI Package Structure** - Set up the cli/ directory with TypeScript entry point and support files
2. **Create Template Files** - Organize all workflow, script, prompt, and agent files as templates
3. **Convert Workflows to Standalone** - Remove external `uses:` references, make workflows self-contained
4. **Implement Core Installer Logic** - Build the file copying and configuration generation system
5. **Add Interactive Prompts** - Implement feature selection and configuration prompts
6. **Bundle Scripts for Distribution** - Configure build system to create standalone JS bundles
7. **Update Package.json for Publishing** - Add bin field, files field, and npm publishing configuration
8. **Create .env.example Generator** - Document required environment variables

## Current State Analysis

### Existing Assets to Convert to Templates:
- **5 Workflow files** in `.github/workflows/`
- **5 Custom actions** in `.github/actions/`
- **4 Agent definitions** in `.claude/agents/`
- **5 Prompt templates** in `prompts/`
- **4 TypeScript source files** in `src/` that need bundling

### External Dependencies to Remove:
- 13 references to `mkrueger12/claude-parallel@main` in `reusable-implement-issue.yml`
- curl URLs fetching from external repository
- External prompts_repo defaults

### Key Constraints:
- Must work with Bun and Node.js (current project uses both)
- TypeScript scripts need to be bundled into standalone JS
- Package must be publishable to npm with `npx` support

## Desired End State

After running `npx install-claude-parallel`, a user's repository will contain:

```
user-repo/
├── .github/
│   ├── workflows/
│   │   ├── claude-plan.yml          # Standalone planning workflow
│   │   └── claude-implement.yml     # Standalone implementation workflow
│   ├── actions/                     # Local composite actions
│   │   ├── get-issue-details/
│   │   ├── setup-claude/
│   │   ├── fetch-agents/
│   │   └── detect-runtime/
│   └── claude-parallel/
│       ├── scripts/
│       │   ├── planning-agent.js    # Bundled TypeScript
│       │   ├── linear-agent.js      # Bundled TypeScript
│       │   └── claude-agent-runner.js
│       └── prompts/
│           ├── implementation.md
│           ├── review.md
│           ├── verify.md
│           ├── plan-generation.md
│           └── consolidate-and-create-linear.md
├── .claude/agents/ (optional)       # Only if --include-agents flag
└── .env.example                     # Documents required secrets
```

### Verification:
- Running `npx install-claude-parallel` in a fresh repo creates the expected structure
- Workflows trigger correctly on label events
- All scripts execute without errors (no missing dependencies)
- `--include-agents` flag installs optional agent files
- `--force` flag overwrites existing files without prompting
- Package publishes to npm and can be installed globally

### Key Discoveries:
- `reusable-implement-issue.yml:103` - External action reference pattern: `mkrueger12/claude-parallel/.github/actions/get-issue-details@main`
- `planning-agent.ts:51` - Prompt path resolution: `join(__dirname, "..", "..", "prompts", "plan-generation.md")`
- `package.json:5` - Project already uses ESM (`"type": "module"`)
- `tsconfig.json:24-26` - Outputs to `dist/` directory with declarations
- Workflows use `curl` to fetch prompts from external repos (lines 211, 379, 799 in reusable workflow)

## What We're NOT Doing

1. **NOT changing core functionality** - The installer copies existing code, not modifying how it works
2. **NOT adding new AI features** - Focus is on packaging and distribution only
3. **NOT supporting multiple package managers for CLI** - npm/npx only for the installer
4. **NOT creating a monorepo** - Single package with templates directory
5. **NOT auto-updating** - Users must re-run installer manually to update

## Implementation Approach

Use a template-based installer pattern:
1. Bundle all source TypeScript into standalone JavaScript files
2. Organize templates in a hierarchical structure matching target layout
3. Use @inquirer/prompts for interactive feature selection
4. Use fs-extra for robust file copying with overwrite protection
5. Generate .env.example dynamically based on selected features

## Files to Create

### New Files:
| File | Purpose |
|------|---------|
| `cli/install.ts` | Main CLI entry point with shebang |
| `cli/types.ts` | TypeScript interfaces for CLI |
| `cli/prompts.ts` | Interactive prompt definitions |
| `cli/copy-templates.ts` | File copying logic |
| `cli/generate-env.ts` | .env.example generation |
| `templates/workflows/claude-plan.yml` | Standalone planning workflow |
| `templates/workflows/claude-implement.yml` | Standalone implementation workflow |
| `templates/actions/*/action.yml` | Local composite actions (4 directories) |
| `templates/scripts/*.js` | Bundled agent scripts (3 files) |
| `templates/prompts/*.md` | All 5 prompt templates |
| `templates/agents/*.md` | All 4 agent definitions |

### Files to Modify:
| File | Changes |
|------|---------|
| `package.json` | Add `bin`, `files`, dependencies for CLI |
| `tsconfig.json` | Add `cli/` to includes |

---

## Task 1: Create CLI Package Structure

**Files**: `cli/install.ts`, `cli/types.ts`

**Description of Changes**:

Create `cli/types.ts` with TypeScript interfaces:
- `InstallOptions` interface: targetDir, includeAgents, force, dryRun, skipPrompts flags
- `FeatureSelection` interface: planningWorkflow, implementWorkflow, agents booleans
- `TemplateFile` interface: source path, destination path, optional flag

Create `cli/install.ts` as the main CLI entry point with:
- Shebang line (`#!/usr/bin/env node`)
- Command-line argument parsing using process.argv:
  - `--include-agents` - Include custom Claude agents
  - `--force` - Overwrite existing files
  - `--dry-run` - Show what would be done without writing
  - `--skip-prompts` - Use defaults, don't prompt
  - `--help` - Display help message
  - `--version` - Display package version
- Target directory argument (defaults to process.cwd())
- Main execution flow:
  1. Parse arguments
  2. Run interactive prompts (if not --skip-prompts)
  3. Copy template files
  4. Generate .env.example
  5. Print success message with next steps

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `bun run type-check`
- [ ] CLI entry point has correct shebang
- [ ] `--help` flag displays usage information
- [ ] `--version` flag displays package version

#### Manual Verification:
- [ ] Running `bun run cli/install.ts --help` shows proper help text

---

## Task 2: Create Template Files Directory Structure

**Directory**: `templates/`

**Description of Changes**:

Create the templates directory structure by copying existing files:

1. Create `templates/workflows/` directory:
   - Copy `prompts/*.md` files to `templates/prompts/`

2. Create `templates/actions/` directory structure:
   - Copy `.github/actions/get-issue-details/` to `templates/actions/get-issue-details/`
   - Copy `.github/actions/setup-claude/` to `templates/actions/setup-claude/`
   - Copy `.github/actions/detect-runtime/` to `templates/actions/detect-runtime/`
   - Create new `templates/actions/fetch-agents/` (simplified local version)

3. Create `templates/prompts/` directory:
   - Copy all 5 files from `prompts/` directory

4. Create `templates/agents/` directory:
   - Copy all 4 files from `.claude/agents/`

5. Create empty `templates/scripts/` directory (populated by build step)

### Success Criteria:

#### Automated Verification:
- [ ] Directory structure exists: `ls -R templates/`
- [ ] All 5 prompt files present in `templates/prompts/`
- [ ] All 4 agent files present in `templates/agents/`
- [ ] All 4 action directories present in `templates/actions/`

#### Manual Verification:
- [ ] File contents match source files

---

## Task 3: Convert Workflows to Standalone

**Files**: `templates/workflows/claude-plan.yml`, `templates/workflows/claude-implement.yml`

**Description of Changes**:

Create `templates/workflows/claude-plan.yml`:
- Based on `.github/workflows/multi-provider-plan-v2.yml`
- Change action reference from `./.github/actions/get-issue-details` to `./.github/actions/get-issue-details`
- Update script paths from `bun run src/agents/planning-agent.ts` to `node .github/claude-parallel/scripts/planning-agent.js`
- Update linear agent path similarly
- Install dependencies step should `cd .github/claude-parallel && npm install` (for bundled scripts' deps)

Create `templates/workflows/claude-implement.yml`:
- Based on `.github/workflows/reusable-implement-issue.yml` but converted to standalone
- Change from `workflow_call` to direct triggers (`issues`, `workflow_dispatch`)
- Replace all 13 external action references:
  - `mkrueger12/claude-parallel/.github/actions/get-issue-details@main` → `./.github/actions/get-issue-details`
  - `mkrueger12/claude-parallel/.github/actions/setup-claude@main` → `./.github/actions/setup-claude`
  - `mkrueger12/claude-parallel/.github/actions/fetch-agents@main` → `./.github/actions/fetch-agents`
  - `mkrueger12/claude-parallel/.github/actions/detect-runtime@main` → `./.github/actions/detect-runtime`
- Replace all curl commands fetching prompts:
  - Change `curl ... https://raw.githubusercontent.com/mkrueger12/claude-parallel/...` to `cat .github/claude-parallel/prompts/...`
- Update script execution from `bun run scripts/claude-agent-runner.ts` to `node .github/claude-parallel/scripts/claude-agent-runner.js`
- Move inputs to be defaults rather than workflow_call parameters

### Success Criteria:

#### Automated Verification:
- [ ] No external repository references: `grep -r "mkrueger12" templates/workflows/` returns empty
- [ ] No curl commands to external URLs in workflows
- [ ] All action references start with `./.github/`

#### Manual Verification:
- [ ] Workflow triggers are correct (issues labeled, workflow_dispatch)
- [ ] All paths point to local `.github/` locations

---

## Task 4: Implement Core Installer Logic

**File**: `cli/copy-templates.ts`

**Description of Changes**:

Create file copying module with these functions:

```typescript
import fs from 'fs-extra';
import path from 'path';

interface CopyOptions {
  force: boolean;
  dryRun: boolean;
}

// Get template directory (works for both dev and installed package)
function getTemplatesDir(): string

// Copy a single file with overwrite protection
async function copyFile(src: string, dest: string, options: CopyOptions): Promise<boolean>

// Copy an entire directory recursively
async function copyDir(src: string, dest: string, options: CopyOptions): Promise<number>

// Main copy function that copies all selected features
export async function copyTemplates(
  targetDir: string,
  features: FeatureSelection,
  options: CopyOptions
): Promise<void>
```

Logic:
- Use `fs-extra` for `copy`, `ensureDir`, `pathExists` operations
- Check if file exists before copying (skip with warning unless --force)
- In dry-run mode, just log what would be done
- Handle path resolution for both development (`../templates`) and installed package (`node_modules/.../templates`)
- Log each file copied with relative path

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `bun run type-check`
- [ ] Handles missing target directory (creates it)
- [ ] Respects --force flag
- [ ] Respects --dry-run flag

#### Manual Verification:
- [ ] Files copied to correct locations
- [ ] Directory structure matches expected output

---

## Task 5: Add Interactive Prompts

**File**: `cli/prompts.ts`

**Description of Changes**:

Create interactive prompts using @inquirer/prompts:

```typescript
import { checkbox, confirm } from '@inquirer/prompts';
import type { FeatureSelection } from './types.js';

export async function promptForFeatures(): Promise<FeatureSelection> {
  const features = await checkbox({
    message: 'Select features to install:',
    choices: [
      { name: 'Multi-provider planning workflow', value: 'planning', checked: true },
      { name: 'Parallel implementation workflow', value: 'implement', checked: true },
      { name: 'Custom Claude agents', value: 'agents', checked: false },
    ],
  });

  return {
    planningWorkflow: features.includes('planning'),
    implementWorkflow: features.includes('implement'),
    agents: features.includes('agents'),
  };
}

export async function confirmOverwrite(files: string[]): Promise<boolean> {
  return confirm({
    message: `${files.length} files already exist. Overwrite?`,
    default: false,
  });
}
```

Handle non-interactive mode:
- Check `process.stdin.isTTY`
- If false or `--skip-prompts`, use default selections

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `bun run type-check`
- [ ] Non-TTY mode returns defaults without prompting

#### Manual Verification:
- [ ] Checkbox UI works correctly
- [ ] Selection values are correct

---

## Task 6: Bundle Scripts for Distribution

**Files**: Build configuration, `templates/scripts/package.json`

**Description of Changes**:

1. Create `templates/scripts/package.json`:
```json
{
  "name": "claude-parallel-scripts",
  "type": "module",
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.70",
    "@linear/sdk": "^30.0.0",
    "@opencode-ai/sdk": "^1.0.153"
  }
}
```

2. Add build scripts to root `package.json`:
```json
{
  "scripts": {
    "build:cli": "tsc -p tsconfig.cli.json",
    "build:scripts": "bun build src/agents/planning-agent.ts --outfile templates/scripts/planning-agent.js --target node --external @opencode-ai/sdk --external @linear/sdk && bun build src/agents/linear-agent.ts --outfile templates/scripts/linear-agent.js --target node --external @opencode-ai/sdk --external @linear/sdk && bun build scripts/claude-agent-runner.ts --outfile templates/scripts/claude-agent-runner.js --target node --external @anthropic-ai/claude-agent-sdk",
    "build:all": "npm run build && npm run build:cli && npm run build:scripts",
    "prepublishOnly": "npm run build:all"
  }
}
```

3. Create `tsconfig.cli.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/cli",
    "rootDir": "./cli"
  },
  "include": ["cli/**/*.ts"]
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `bun run build:all` completes without errors
- [ ] `dist/cli/install.js` exists
- [ ] `templates/scripts/*.js` files exist (3 files)
- [ ] `templates/scripts/package.json` exists

#### Manual Verification:
- [ ] Bundled scripts run with `node` after `npm install` in scripts dir

---

## Task 7: Update Package.json for Publishing

**File**: `package.json`

**Description of Changes**:

Update package.json with npm publishing configuration:

```json
{
  "name": "install-claude-parallel",
  "version": "1.0.0",
  "description": "CLI installer for Claude Parallel workflows",
  "type": "module",
  "bin": {
    "install-claude-parallel": "./dist/cli/install.js"
  },
  "files": [
    "dist/",
    "templates/"
  ],
  "scripts": {
    "build": "tsc",
    "build:cli": "tsc -p tsconfig.cli.json",
    "build:scripts": "...",
    "build:all": "npm run build && npm run build:cli && npm run build:scripts",
    "prepublishOnly": "npm run build:all"
  },
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.70",
    "@linear/sdk": "^30.0.0",
    "@opencode-ai/sdk": "^1.0.153",
    "@inquirer/prompts": "^7.0.0",
    "fs-extra": "^11.2.0",
    "chalk": "^5.3.0"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4",
    "@types/node": "^25.0.2",
    "typescript": "^5.9.3"
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `bun install` adds new dependencies
- [ ] `npm pack` creates tarball with correct files
- [ ] Tarball contains `dist/cli/install.js` and `templates/`

#### Manual Verification:
- [ ] `npx .` runs the CLI correctly

---

## Task 8: Create .env.example Generator

**File**: `cli/generate-env.ts`

**Description of Changes**:

Create module to generate `.env.example` file:

```typescript
export function generateEnvExample(features: FeatureSelection): string {
  let content = `# Claude Parallel Configuration
# Copy this file to .env and fill in your values
# See: https://github.com/mkrueger12/claude-parallel for documentation

# Required for all workflows
GH_PAT=your_github_personal_access_token

# Claude authentication (provide at least one)
CLAUDE_CODE_OAUTH_TOKEN=your_oauth_token
# OR
ANTHROPIC_API_KEY=your_anthropic_api_key
`;

  if (features.planningWorkflow) {
    content += `
# For multi-provider planning (optional - adds more perspectives)
OPENAI_API_KEY=your_openai_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key

# For Linear integration (optional)
LINEAR_API_KEY=your_linear_api_key
LINEAR_TEAM_ID=your_team_id
LINEAR_PROJECT_ID=your_project_id
`;
  }

  return content;
}

export async function writeEnvExample(targetDir: string, features: FeatureSelection, options: CopyOptions): Promise<void> {
  const envPath = path.join(targetDir, '.env.example');
  const content = generateEnvExample(features);

  if (options.dryRun) {
    console.log(`Would create: ${envPath}`);
    return;
  }

  if (await fs.pathExists(envPath) && !options.force) {
    console.log(`Skipping: ${envPath} (already exists)`);
    return;
  }

  await fs.writeFile(envPath, content);
  console.log(`Created: ${envPath}`);
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `bun run type-check`
- [ ] Generated content includes all required variables

#### Manual Verification:
- [ ] Comments are clear and helpful
- [ ] Variables are grouped logically

---

## Migration Notes

### For Existing Fork Users:
1. Run `npx install-claude-parallel --force` in the target repo
2. Delete old workflow files if they have different names
3. Re-apply any custom prompt modifications to new locations
4. GitHub secrets remain the same (no changes needed)

### Breaking Changes:
- Package name: `claude-parallel` → `install-claude-parallel`
- Script locations: `src/agents/` → `.github/claude-parallel/scripts/`
- Prompt locations: `prompts/` → `.github/claude-parallel/prompts/`
- Workflows are now standalone (no external references)

## References

- Existing reusable workflow: `.github/workflows/reusable-implement-issue.yml`
- Existing planning agent: `src/agents/planning-agent.ts:1-229`
- NPM bin configuration: https://docs.npmjs.com/cli/v9/configuring-npm/package-json#bin
- @inquirer/prompts: https://www.npmjs.com/package/@inquirer/prompts
- fs-extra: https://www.npmjs.com/package/fs-extra
