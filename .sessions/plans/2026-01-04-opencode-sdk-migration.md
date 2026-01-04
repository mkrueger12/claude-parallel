# Plan: Migrate Implementation Workflow to OpenCode SDK

**Date**: 2026-01-04
**Status**: Draft
**Issue**: Refactor to remove Claude Agent SDK, unify on OpenCode SDK

## Goal

Remove the `@anthropic-ai/claude-agent-sdk` dependency and replace it with `@opencode-ai/sdk` (already used in planning agents). This unifies the codebase on a single SDK, simplifying authentication and reducing maintenance burden.

## Requirements

- [ ] Replace `claude-agent-runner.ts` with OpenCode SDK-based implementation
- [ ] Support both `implementation` and `review` modes
- [ ] Maintain structured JSON output for review mode
- [ ] Support MCP servers (deepwiki, linear)
- [ ] Maintain conversation logging
- [ ] Remove `@anthropic-ai/claude-agent-sdk` dependency
- [ ] remove claude code cli
- [ ] No need for backward compatibility

## Architecture Decisions

### Decision 1: Create New OpenCode Agent Runner

- **Choice**: Create `opencode-agent-runner.ts` following same CLI interface
- **Rationale**: Clean migration path, preserves workflow YAML compatibility
- **Trade-offs**: Some temporary code duplication during transition

### Decision 2: Structured Output for Review Mode

- **Choice**: Enforce structure via agent prompt + JSON validation
- **Rationale**: OpenCode SDK lacks `outputFormat.type="json_schema"` support
- **Trade-offs**: Less strict than schema enforcement, requires prompt engineering

### Decision 3: Authentication Consolidation

- **Choice**: Use `getAuthCredentials()` from utils.ts as single source
- **Rationale**: Already supports OAuth and API key for multiple providers
- **Trade-offs**: None - this is already the better implementation

## Current SDK Comparison

| Feature | Claude Agent SDK | OpenCode SDK |
|---------|------------------|--------------|
| Architecture | Wraps Claude CLI executable | Embedded server with HTTP API |
| Authentication | CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY | OAuth (access/refresh/expires) or API key via auth.set() |
| Multi-provider | Anthropic only | Anthropic, OpenAI, Google |
| MCP Servers | Options-based config | Server config |
| Structured Output | outputFormat.type="json_schema" | Prompt-based + validation |

## Implementation Steps

### Phase 1: Core Migration

1. [ ] Create `src/agents/implementation-agent.ts`
   - Mirror structure of planning-agent.ts
   - Enable write, edit, bash tools
   - Set appropriate permissions (src/agents/planning-agent.ts:1-50 pattern)

2. [ ] Create `src/agents/review-agent.ts`
   - Add JSON schema enforcement in prompt
   - Validate structured output
   - Include review schema from claude-agent-runner.ts:71-189

3. [ ] Create `scripts/opencode-agent-runner.ts`
   - Same CLI interface as claude-agent-runner.ts:1-514
   - Use createOpencodeServer() from opencode.ts:1-365
   - Handle stdin/stdout
   - Integrate MCP server configuration

4. [ ] Extend `src/lib/agent-runner.ts` (lines 1-169)
   - Add optional stdin prompt support
   - Add CLI mode for standalone execution
   - Add result output to stdout

### Phase 2: Workflow Updates

5. [ ] Update `.github/workflows/reusable-implement-issue.yml`
   - Replace claude-agent-runner.js with opencode-agent-runner.ts
   - Remove Claude CLI installation steps
   - Update authentication environment variables

6. [ ] Update `.github/workflows/claude-implement.yml`
   - Same changes as reusable workflow

7. [ ] Update/deprecate `.github/actions/setup-claude/action.yml`
   - Remove Claude CLI installation (no longer needed)

### Phase 3: Cleanup

8. [ ] Remove Claude Agent SDK dependency
   - Delete from package.json:44
   - Delete src/lib/claude-agent-sdk.ts

9. [ ] Update templates
   - Rebuild bundled templates with new runner
   - Update templates/scripts/ with new bundle

10. [ ] Update documentation
    - CLAUDE.md troubleshooting sections
    - README if applicable

## Risks & Open Questions

### Risks

1. **Structured Output**: OpenCode SDK may not reliably produce JSON
   - Mitigation: Robust JSON parsing/extraction, retry mechanism

2. **MCP Server Compatibility**: Configuration may differ between SDKs
   - Mitigation: Test with deepwiki and linear MCP servers
   - Review the planning agent to understand MCP set up.

3. **OAuth Token Expiry**: Tokens may expire during long implementations
   - Mitigation: OpenCode SDK handles refresh via refresh token

### Open Questions

1. **--claude-cli-path argument**: Accept but ignore with warning for backward compatibility? Remove this
2. **Model IDs**: Claude Agent SDK uses `claude-opus-4-5-20251101`, OpenCode uses `claude-opus-4-5`
3. **Server lifecycle**: Ensure proper cleanup in error cases

## Key Files

- `scripts/claude-agent-runner.ts` - Current CLI entry point to replace
- `src/lib/agent-runner.ts` - OpenCode SDK runner pattern to extend
- `src/lib/opencode.ts` - Core OpenCode SDK integration
- `src/lib/claude-agent-sdk.ts` - To be removed
- `.github/workflows/reusable-implement-issue.yml` - Workflow to update

## Related

- Session 20: Server-inherited authentication (completed)
- Issue #54: Authentication refactor
- OpenCode SDK: @opencode-ai/sdk
