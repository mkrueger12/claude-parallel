# Session Context: claude-parallel

**Date**: January 5, 2026
**Status**: Agent-core workspace package extraction complete

---

## Current State

**Latest Work**: Extracted agent logic to @swellai/agent-core workspace package (Session 22)
**Repository**: Working on branch `refactor/simplify`
**Latest Commits**:
- `03ad4e2` - Extract agent logic to @swellai/agent-core workspace package

**Recent Accomplishments**:
- Created `packages/agent-core/` workspace package with all core lib files
- Added unified `scripts/run-agent.ts` wrapper for implementation and review modes
- Updated workflows to use `run-agent.ts` instead of separate agent scripts
- Removed redundant files (~13k lines removed)
- Updated planning-agent.ts and linear-agent.ts to import from @swellai/agent-core
- Version bumped to 2.0.0 for structural changes
- All type checks passing, builds successful

---

## Recent Sessions

*Session 22 (Jan 5, 2026) - Agent-Core Package Extraction*
*Session 21 (Jan 4, 2026) - OpenCode SDK Migration*
*Session 20 (Jan 4, 2026) - Server-Inherited Authentication Refactor + Live Tool Call Logging*
*Session 19 (Dec 30, 2025) - Claude CLI Path Resolution Fix*
*Session 18 (Dec 30, 2025) - Critical Bug Fixes for npm Package*
*Session 17 (Dec 29, 2025) - npm Package Publishing & Rebranding*

---

## Archived Sessions

Sessions 1-13 have been archived. Key milestones:
- Sessions 1-3: Initial setup, GitHub integration, multi-provider workflow v2
- Session 4: TypeScript refactoring (moved to `src/` directory)
- Session 5: Prompt directory reorganization
- Session 6: SDK migration (Claude Agent SDK integration)
- Session 7: SDK authentication debugging
- Session 8: Workflow validation fixes
- Session 9: Linear workflow migration ([archived](archive/2025-12-19-linear-workflow-migration.md))
- Session 10: Linear MCP integration ([archived](archive/2025-12-20-linear-mcp-integration.md))
- Session 11: Installer CLI implementation ([archived](archive/2025-12-20-installer-cli-implementation.md))
- Session 12: Manual testing ([archived](archive/2025-12-20-manual-testing.md))
- Session 13: Prompt path resolution fix

---

## Next Session Priorities

1. Merge `refactor/simplify` branch to main
2. Publish npm v2.0.0 with 2FA
3. Test the refactored workflows with real Linear issues
4. Update README.md to document new package structure
5. Consider publishing @swellai/agent-core to npm separately

---

## Active Plans

- **Agent-Core Package Extraction** - **COMPLETED** (see [plans/2026-01-05-agent-core-extraction.md](plans/2026-01-05-agent-core-extraction.md))

---

## Documentation

### Architecture & Implementation
- [Turso Database Architecture](docs/turso-database.md) - How conversation logging works with Turso/libSQL

---

## Notes

### Session 22 Accomplishments (Jan 5, 2026)

**Agent-Core Package Extraction**

Extracted core agent execution logic into a separate workspace package to simplify the repository structure.

**Package Created: `packages/agent-core/`**
- `package.json` - Package config with @opencode-ai/sdk, @libsql/client, @linear/sdk dependencies
- `tsconfig.json` - TypeScript configuration
- `src/index.ts` - Main exports (runAgent, createOpencodeServer, etc.)
- `src/lib/` - All core library files moved here:
  - `agent-runner.ts` - Agent execution orchestration
  - `opencode.ts` - OpenCode SDK server setup
  - `turso.ts`, `turso-schema.ts` - Database logging
  - `conversation-logger.ts` - Session logging
  - `types.ts`, `utils.ts` - Shared types and utilities
- `README.md` - Comprehensive API documentation

**New Files**:
- `scripts/run-agent.ts` - Unified wrapper for implementation and review modes
- `templates/scripts/run-agent.js` - Bundled version

**Updated Files**:
- `.github/workflows/claude-implement.yml` - Uses `run-agent.ts`
- `templates/workflows/claude-implement.yml` - Uses `run-agent.js`
- `src/agents/planning-agent.ts` - Imports from `@swellai/agent-core`
- `src/agents/linear-agent.ts` - Imports from `@swellai/agent-core`
- `package.json` - v2.0.0, workspaces enabled, workspace dependency
- `tsconfig.json` - Excludes packages/ directory

**Deleted Files**:
- `src/lib/` - Moved to packages/agent-core
- `src/index.ts` - No longer needed
- `src/agents/implementation-agent.ts` - Replaced by run-agent.ts
- `src/agents/review-agent.ts` - Replaced by run-agent.ts
- `scripts/opencode-agent-runner.ts` - Replaced by run-agent.ts
- `templates/scripts/opencode-agent-runner.js` - Replaced by run-agent.js

**Benefits**:
- Cleaner separation of concerns
- Reusable agent-core package (can publish to npm later)
- Simpler workflow configuration
- Reduced repository complexity (~13k lines removed)
- Single unified script for both agent modes

**Build Status**: All type checks passing, templates built successfully

---

### Session 21 Accomplishments (Jan 4, 2026)

**OpenCode SDK Migration**

Removed the Claude Agent SDK and unified on OpenCode SDK for all agent operations:

**Files Created**:
- `src/agents/implementation-agent.ts` - Write/edit/bash enabled agent
- `src/agents/review-agent.ts` - Read-only agent with JSON schema enforcement
- `scripts/opencode-agent-runner.ts` - CLI wrapper using OpenCode SDK

**Files Deleted**:
- `src/lib/claude-agent-sdk.ts` - No longer needed
- `scripts/claude-agent-runner.ts` - Replaced by opencode-agent-runner.ts
- `.github/actions/setup-claude/` - Claude CLI no longer needed

**Files Modified**:
- `package.json` - Removed `@anthropic-ai/claude-agent-sdk` dependency
- `.github/workflows/claude-implement.yml` - Updated to use new runner
- `.github/workflows/reusable-implement-issue.yml` - Updated to use new runner
- `templates/scripts/` - Rebuilt bundles

**Key Changes**:
- No Claude CLI required - OpenCode SDK runs embedded server
- Environment variables instead of CLI args: `MODEL`, `MODE`
- Simpler workflow YAML files (removed Claude CLI installation steps)
- Unified authentication via `getAuthCredentials()` from utils.ts

**E2E Test Results**: Both implementation and review modes verified working

---

### Session 20 Accomplishments (Jan 4, 2026)

**Server-Inherited Authentication Refactor (Issue #54)**

Implemented OpenCode SDK's `client.auth.set()` API for cleaner authentication:

**What Changed**:
1. **`src/lib/types.ts`**: Added `OAUTH_ENV_VARS` constant for Anthropic OAuth env vars
2. **`src/lib/utils.ts`**: Added `getAuthCredentials()` that returns OAuth or API key credentials
3. **`src/lib/opencode.ts`**:
   - Removed `apiKey` from `OpencodeServerOptions`
   - Added `auth` property to `OpencodeClient` interface
   - Created `setProviderAuth()` function that calls `client.auth.set()`
4. **`src/lib/agent-runner.ts`**: Removed API key handling - delegated to server creation
5. **`.github/actions/setup-opencode/action.yml`**: Added OAuth credential inputs with validation
6. **`src/lib/__tests__/auth.test.ts`**: Added 14 unit tests

**OAuth Environment Variables**:
- `ANTHROPIC_OAUTH_ACCESS` - Access token
- `ANTHROPIC_OAUTH_REFRESH` - Refresh token
- `ANTHROPIC_OAUTH_EXPIRES` - Expiration timestamp (milliseconds)

**E2E Test**: Verified with real OAuth credentials from `~/.local/share/opencode/auth.json`

**Tests**: 14/14 passing, TypeScript type-check passing, build successful

**Live Tool Call Logging for GitHub Actions**

Added visibility into agent tool calls during GitHub Actions workflow execution.

**Problem**: Console logs weren't showing in GitHub Actions because stderr was redirected to `error.log` file only.

**Solution**:
1. Updated workflow to use `tee` for stderr: `2> >(tee error.log >&2)`
   - Shows logs live in GitHub Actions console
   - Still captures to error.log for artifacts
