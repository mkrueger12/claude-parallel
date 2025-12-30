# Session Context: claude-parallel

**Date**: December 30, 2025
**Status**: Claude CLI path resolution fixed - swellai v1.0.5 ready for npm publish 🔧→✅

---

## Current State

**Latest Work**: Fixed Claude Code executable path resolution bug (Session 19)
**Repository**: Working on branch `main` - modified files
**Latest Commits**:
- `a21a1f6` - Session 18: Fix critical npm package bugs (v1.0.2 & v1.0.3)
- `6dd4c74` - Update templates and bump version to 1.0.1
- `00ffd9d` - Archive Session 17: npm publishing and swellai rebranding
- `798cce6` - Session 17: Rebrand package to swellai and prepare for npm publish
- `f7e01ce` - update docs

**Recent Accomplishments**:
- Fixed Claude Code executable path resolution (v1.0.5)
- Added `--claude-cli-path` argument to agent runner
- Updated SDK wrapper to pass `pathToClaudeCodeExecutable` correctly
- All 3 workflow steps now specify Claude CLI location
- Package tested and ready (329.2 KB, 83 files)

---

## Recent Sessions

*Session 19 (Dec 30, 2025) - Claude CLI Path Resolution Fix*
*Session 18 (Dec 30, 2025) - Critical Bug Fixes for npm Package*
*Session 17 (Dec 29, 2025) - npm Package Publishing & Rebranding*
*Session 16 (Dec 23, 2025) - Turso Database Documentation*

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

1. ✅ ~~Resolve SDK exit code 1 issue~~ - **RESOLVED**
2. ✅ ~~Merge PR #36 for the SDK migration (DEL-1295 implementation)~~ - **MERGED**
3. ✅ ~~Migrate implementation workflow from GitHub to Linear~~ - **COMPLETED**
4. ✅ ~~Simplify Linear integration using MCP~~ - **COMPLETED**
5. ✅ ~~Rebuild as installer CLI (DEL-1307)~~ - **COMPLETED**
6. ✅ ~~Run manual tests to verify installer functionality~~ - **COMPLETED**
7. ✅ ~~Publish to npm~~ - **COMPLETED** (published as "install-claude-parallel" and "swellai")
8. ✅ ~~Fix missing GitHub Actions bug~~ - **COMPLETED** (v1.0.2)
9. ✅ ~~Fix "Module not found" workflow bug~~ - **COMPLETED** (v1.0.3)
10. ✅ ~~Fix Claude CLI path resolution bug~~ - **COMPLETED** (v1.0.5)
11. **BLOCKER**: Complete npm publish v1.0.5 with 2FA (requires user's OTP code)
12. Verify published package works in production: `npx swellai@1.0.5`
13. Create GitHub release v1.0.5 and tag
14. Update README.md with npm package badge and installation instructions
15. Test the Linear implementation workflow with a real Linear issue
16. Verify Linear MCP tools work correctly in GitHub Actions environment
17. Test the refactored multi-provider plan v2 workflow with a real issue
18. Consider adding unit tests for the new utility functions in `src/lib/`
19. Consider adding Linear issue commenting to workflows for status updates

---

## Documentation

### Architecture & Implementation
- [Turso Database Architecture](docs/turso-database.md) - How conversation logging works with Turso/libSQL

---

## Notes

### Session 19 Accomplishments (Dec 30, 2025)

**Claude CLI Path Resolution Fix (v1.0.5)**

Fixed critical bug where agent runner couldn't locate Claude Code executable:

**Root Cause**: The SDK's `query()` function needs `pathToClaudeCodeExecutable` parameter to locate the Claude CLI. Without it, the bundled agent runner defaulted to looking for a non-existent `cli.js` file in the scripts directory.

**Error**: `Error: Claude Code executable not found at /home/runner/work/.../scripts/cli.js`

**The Fix**:
1. Added `--claude-cli-path <path>` CLI argument to `scripts/claude-agent-runner.ts`
2. Updated `src/lib/claude-agent-sdk.ts` interface to accept `pathToClaudeCodeExecutable`
3. Modified SDK wrapper to pass the path to SDK's `query()` function
4. Updated all 3 workflow invocations to pass `--claude-cli-path "$HOME/.local/bin/claude"`:
   - Implementation step (line 234)
   - Review step (line 407)
   - Verification step (line 837)
5. Rebuilt bundled templates with new functionality

**Files Modified**:
- `src/lib/claude-agent-sdk.ts` (added interface field + pass to SDK)
- `scripts/claude-agent-runner.ts` (added CLI argument)
- `templates/workflows/claude-implement.yml` (3 locations)
- `.github/workflows/claude-implement.yml` (3 locations)
- `templates/scripts/claude-agent-runner.js` (rebuilt bundle)
- `package.json` (version 1.0.5)

**Package Status**: v1.0.5 ready (329.2 KB, 83 files) - awaiting 2FA code for npm publish

### Session 18 Accomplishments (Dec 30, 2025)

**Critical Bug Fixes for npm Package**

Fixed two critical bugs discovered by user in production testing:

**Bug #1 - Missing GitHub Actions (v1.0.2)**
- **Root Cause**: Workflows referenced local GitHub Actions in `.github/actions/` that weren't included in npm package
- **Error**: "Can't find 'action.yml' under '.github/actions/get-issue-details'"
- **Fix**:
  - Copied `.github/actions/` → `templates/actions/`
  - Added installer mapping: `actions/*` → `.github/actions/*`
  - Fixed `getPackageDir()` function (changed from 2 to 3 directory levels)
  - Fixed package.json bin path: `./dist/src/cli/index.js`
- **Files Modified**: `src/cli/install.ts`, `package.json`, created `templates/actions/`

**Bug #2 - Module Not Found (v1.0.3)**
- **Root Cause**: Workflows referenced TypeScript source files (`src/agents/*.ts`) that aren't distributed to users
- **Error**: "Module not found 'src/agents/planning-agent.ts'"
- **Fix**: Updated 4 workflow references to use bundled scripts:
  - `bun run src/agents/planning-agent.ts` → `.github/claude-parallel/scripts/planning-agent.js`
  - `bun run src/agents/linear-agent.ts` → `.github/claude-parallel/scripts/linear-agent.js`
- **Files Modified**: `templates/workflows/claude-plan.yml` (lines 125, 186, 247, 313)

**Testing**: Verified in clean test repository - all files install correctly and scripts are executable

**Package Status**: v1.0.3 ready (328.7 KB, 83 files) - awaiting 2FA code for npm publish

### Session 17 Accomplishments (Dec 29, 2025) - [Archived](archive/2025-12-29-npm-publishing-swellai.md)

**npm Package Publishing & Rebranding**

Published package to npm and rebranded to "swellai":
- Published "install-claude-parallel@1.0.0" successfully
- Rebranded to "swellai" (verified available)
- Updated all documentation and CLI references
- Built and verified package (172 KB, 130 files)

**Blocker**: Requires 2FA OTP code to complete "swellai" publish

### Session 16 Accomplishments (Dec 23, 2025) - [Archived](archive/2025-12-23-turso-documentation.md)

**Turso Database Documentation**

Created comprehensive documentation for the Turso database implementation:
- Architecture overview with embedded replica mode
- Complete database schema (4 tables, 7 indexes)
- Integration points with planning agent, Linear agent, and OpenCode
- Performance optimizations and design trade-offs
- Configuration guide and troubleshooting
- SQL query examples and security best practices

Documentation available at: [docs/turso-database.md](docs/turso-database.md)
