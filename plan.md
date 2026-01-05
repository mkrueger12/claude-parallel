# Plan: Extract Agent Logic to Separate TypeScript Package

## Overview

Restructure the `claude-parallel` repository by extracting the core agent logic into a separate npm package (`@swellai/agent-core`). This will simplify the main repository, improve reusability, and make the GitHub Actions workflows cleaner.

## Goals

1. Create a standalone npm package containing all agent execution logic
2. Simplify the main repository to only contain workflows, templates, and prompts
3. Enable the agent package to be versioned and reused independently
4. Reduce repository complexity and maintenance burden

## Phase 1: Create New Package Structure

### 1.1 Create Package Directory
```
packages/
  agent-core/
    src/
      index.ts
      lib/
        agent-runner.ts
        opencode.ts
        conversation-logger.ts
        turso.ts
        turso-schema.ts
        types.ts
        utils.ts
      cli/
        index.ts
    package.json
    tsconfig.json
    README.md
```

### 1.2 Create Package Configuration

**packages/agent-core/package.json**
```json
{
  "name": "@swellai/agent-core",
  "version": "1.0.0",
  "description": "Core agent execution logic for Claude Parallel workflows",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "agent-runner": "./dist/cli/index.js"
  },
  "files": [
    "dist/",
    "README.md"
  ],
  "scripts": {
    "build": "tsc",
    "type-check": "tsc --noEmit",
    "test": "bun test"
  },
  "keywords": [
    "claude",
    "agent",
    "ai",
    "automation",
    "github-actions"
  ],
  "dependencies": {
    "@libsql/client": "^0.15.0",
    "@linear/sdk": "^30.0.0",
    "@opencode-ai/sdk": "^1.0.153"
  },
  "devDependencies": {
    "@types/node": "^25.0.2",
    "typescript": "^5.9.3"
  },
  "engines": {
    "node": ">=20.0.0",
    "bun": ">=1.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

**packages/agent-core/tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 1.3 Create Main Export File

**packages/agent-core/src/index.ts**
```typescript
export { runAgent, type AgentConfig } from "./lib/agent-runner.js";
export { createOpencodeServer, setupEventMonitoring } from "./lib/opencode.js";
export { createConversationLogger } from "./lib/conversation-logger.js";
export { type Provider } from "./lib/types.js";
export { extractTextFromParts, validateEnvVars } from "./lib/utils.js";
```

## Phase 2: Extract Agent Logic

### 2.1 Copy Core Library Files
Move the following files from `src/lib/` to `packages/agent-core/src/lib/`:
- `agent-runner.ts`
- `opencode.ts`
- `conversation-logger.ts`
- `turso.ts`
- `turso-schema.ts`
- `types.ts`
- `utils.ts`

### 2.2 Create CLI Interface

**packages/agent-core/src/cli/index.ts**
```typescript
#!/usr/bin/env node

import { runAgent } from "../lib/agent-runner.js";

const MODE = process.env.MODE || "implementation";
const MODEL = process.env.MODEL || "claude-opus-4-5";

const config = MODE === "review"
  ? {
      name: "review-agent",
      description: "Reviews multiple implementations and selects the best one",
      requiredEnvVars: ["NUM_IMPLEMENTATIONS", "WORKTREES_DIR", "LINEAR_ISSUE"],
      promptFileName: "review.md",
      getAgentTools: () => ({
        read: true,
        list: true,
        glob: true,
        grep: true,
        webfetch: false,
      }),
      getAgentPermissions: () => ({
        webfetch: "allow",
      }),
      processPrompt: (template: string, env: NodeJS.ProcessEnv) => {
        return template
          .replace(/\{\{NUM_IMPLEMENTATIONS\}\}/g, env.NUM_IMPLEMENTATIONS || "3")
          .replace(/\{\{WORKTREES_DIR\}\}/g, env.WORKTREES_DIR || "")
          .replace(/\{\{LINEAR_ISSUE\}\}/g, env.LINEAR_ISSUE || "");
      },
    }
  : {
      name: "implementation-agent",
      description: "Implements features based on a given description",
      requiredEnvVars: [],
      promptFileName: "implementation.md",
      getAgentTools: () => ({
        write: true,
        edit: true,
        bash: true,
        read: true,
        list: true,
        glob: true,
        grep: true,
        webfetch: true,
      }),
      getAgentPermissions: () => ({
        edit: "allow",
        bash: "allow",
        webfetch: "allow",
      }),
      processPrompt: (template: string) => template,
    };

await runAgent(config);
```

## Phase 3: Update Main Repository

### 3.1 Update Root package.json

Simplify the main repository's `package.json`:
```json
{
  "name": "swellai",
  "version": "2.0.0",
  "description": "Install claude-parallel workflows and templates into any repository",
  "type": "module",
  "bin": {
    "swellai": "./dist/src/cli/index.js"
  },
  "files": [
    "dist/",
    "templates/",
    ".github/"
  ],
  "scripts": {
    "build": "tsc",
    "build:templates": "bun run scripts/build-templates.ts",
    "type-check": "tsc --noEmit",
    "lint": "biome lint .",
    "lint:fix": "biome lint . --write",
    "format": "biome format .",
    "format:fix": "biome format . --write",
    "check": "biome check .",
    "check:fix": "biome check . --write",
    "prepare": "husky"
  },
  "dependencies": {
    "@swellai/agent-core": "workspace:*"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.3.10",
    "@types/node": "^25.0.2",
    "bun-types": "^1.3.5",
    "husky": "^9.1.7",
    "typescript": "^5.9.3"
  },
  "workspaces": [
    "packages/*"
  ]
}
```

### 3.2 Remove Old Files
Delete from root repository:
- `src/agents/` directory
- `src/lib/` directory
- `src/index.ts`
- `scripts/opencode-agent-runner.ts`

### 3.3 Keep Only CLI Installer
Retain `src/cli/` for the `swellai` CLI that installs workflows and templates.

## Phase 4: Update GitHub Actions Workflows

### 4.1 Update claude-implement.yml

Replace the agent execution steps:

**Before:**
```yaml
- name: Setup Bun for Agent Runner
  uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest

- name: Install dependencies
  run: bun install

- name: Build TypeScript
  run: bun run build

- name: Run implementation agent
  env:
    MODEL: ${{ inputs.claude_model }}
    LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
  run: |
    echo "$IMPLEMENTATION_PROMPT" | bun run scripts/opencode-agent-runner.ts
```

**After:**
```yaml
- name: Setup Bun
  uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest

- name: Install agent package
  run: bun install @swellai/agent-core@latest

- name: Run implementation agent
  env:
    MODEL: ${{ inputs.claude_model }}
    MODE: implementation
    LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
  run: |
    echo "$IMPLEMENTATION_PROMPT" | bunx @swellai/agent-core run
```

### 4.2 Update Review Agent Step

**Before:**
```yaml
- name: Run review agent
  env:
    MODEL: ${{ inputs.claude_model }}
    NUM_IMPLEMENTATIONS: ${{ inputs.num_implementations }}
    WORKTREES_DIR: ./worktrees
    LINEAR_ISSUE: ${{ needs.generate-matrix.outputs.linear_issue }}
  run: |
    bun run src/agents/review-agent.ts
```

**After:**
```yaml
- name: Run review agent
  env:
    MODEL: ${{ inputs.claude_model }}
    MODE: review
    NUM_IMPLEMENTATIONS: ${{ inputs.num_implementations }}
    WORKTREES_DIR: ./worktrees
    LINEAR_ISSUE: ${{ needs.generate-matrix.outputs.linear_issue }}
  run: |
    bunx @swellai/agent-core run
```

### 4.3 Update Other Workflows
Apply similar changes to:
- `claude-plan.yml`
- `multi-provider-plan-v2.yml`

## Phase 5: Build and Publish Package

### 5.1 Build the Package
```bash
cd packages/agent-core
bun install
bun run build
```

### 5.2 Test Locally
```bash
# Test in workspace
bun link

# Test in main repo
cd ../..
bun link @swellai/agent-core
bun run test
```

### 5.3 Publish to npm
```bash
cd packages/agent-core
npm publish
```

## Phase 6: Cleanup and Validation

### 6.1 Remove Unused Dependencies
From root `package.json`, remove:
- `@libsql/client`
- `@linear/sdk`
- `@opencode-ai/sdk`

These are now dependencies of `@swellai/agent-core`.

### 6.2 Update Documentation
Update `README.md` to reflect new structure:
- Remove references to `src/agents/`
- Update installation instructions
- Document the new package approach

### 6.3 Update CLAUDE.md
Update development commands:
```bash
# Local testing with package
MODE=implementation MODEL=claude-opus-4-5 echo "Your prompt" | bunx @swellai/agent-core run
MODE=review MODEL=claude-opus-4-5 echo "Your prompt" | bunx @swellai/agent-core run
```

### 6.4 Run E2E Tests
```bash
./.github/scripts/run-simple-e2e-test.sh
./.github/scripts/run-e2e-test.sh
```

## Phase 7: Migration Guide

Create `MIGRATION.md` documenting:
1. How to update existing installations
2. Breaking changes (if any)
3. New environment variables
4. Updated workflow examples

## Success Criteria

- [ ] `@swellai/agent-core` package builds successfully
- [ ] Package published to npm
- [ ] All GitHub Actions workflows updated
- [ ] E2E tests pass with new structure
- [ ] Root repository size reduced by ~40%
- [ ] Documentation updated
- [ ] No breaking changes for end users

## Rollback Plan

If issues arise:
1. Keep old code in a branch (`backup/pre-refactor`)
2. Can revert workflows to use old scripts
3. Unpublish package version if needed
4. Restore old `package.json` structure

## Estimated Timeline

- Phase 1-2: 2-3 hours (package creation and extraction)
- Phase 3: 1 hour (repository cleanup)
- Phase 4: 1-2 hours (workflow updates)
- Phase 5: 1-2 hours (build, test, publish)
- Phase 6: 1 hour (cleanup and validation)
- Phase 7: 1 hour (documentation)

**Total: 7-10 hours**

## Notes

- The package will use semantic versioning
- Major version bump (2.0.0) for main repo to indicate structural change
- Consider using `changesets` for managing package versions
- Package will be scoped to `@swellai` organization
- Consider adding automated tests for the package itself
