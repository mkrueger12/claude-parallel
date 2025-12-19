# Session 9 - Linear Workflow Migration
**Date**: December 19, 2025
**Topic**: Complete migration of implementation workflow from GitHub issues to Linear issues

## Objective
Migrate the implementation workflow from using GitHub issues as the source of truth to using Linear issues exclusively. No backwards compatibility required.

## Accomplished

### 1. Created Linear Issue Fetcher Script
- **File**: `scripts/get-linear-issue.ts` (153 lines)
- **Functionality**:
  - Fetches Linear issue details via GraphQL API
  - Accepts Linear issue ID (e.g., "ENG-123") or full Linear URL
  - Extracts issue ID from various URL formats
  - Outputs issue data in GitHub Actions format (id, number, title, body_file)
  - Writes issue description to `/tmp/linear-issue-body.txt`
  - Uses `LINEAR_API_KEY` environment variable for authentication

### 2. Updated Reusable Implementation Workflow
- **File**: `.github/workflows/reusable-implement-issue.yml`
- **Changes**:
  - Renamed workflow: "Reusable Claude Implement Linear Issue"
  - Input parameter: `linear_issue` (required) replaces `issue_number`
  - Removed parameters: `event_name`, `event_issue_number`
  - Added secret: `LINEAR_API_KEY` (required)
  - Replaced all 3 "Get issue details" steps with Linear fetch script
    - Implementation job (line 98-103)
    - Review job (line 323-328)
    - Verify job (line 791-796)
  - Fixed placeholder mismatch: `{{FEATURE_REQUEST}}` → `{{LINEAR_ISSUE}}` in 3 locations:
    - Implementation prompt substitution (line 226)
    - Review prompt substitution (line 398)
    - Verify prompt substitution (line 825)
  - Updated PR body to reference "Linear Issue:" instead of "Issue: #"

### 3. Updated Caller Workflow
- **File**: `.github/workflows/claude-implement-issue.yml`
- **Changes**:
  - Renamed workflow: "Claude Implement Linear Issue"
  - Input: `linear_issue` replaces `issue_number`
  - Removed permission: `issues: read` (no longer needed for GitHub issues)
  - Added `LINEAR_API_KEY` secret to workflow call
  - Removed `event_name` parameter from workflow call

## Breaking Changes

1. **No backwards compatibility** - workflows only accept Linear issues now
2. **Required secret** - `LINEAR_API_KEY` must be configured in repository secrets
3. **Input format change** - `linear_issue` instead of `issue_number`
4. **Removed GitHub issue support** - all GitHub issue logic removed

## Technical Details

### Linear Issue Fetcher
```typescript
// Accepts multiple formats:
- Issue ID: "ENG-123"
- Linear URL: "https://linear.app/workspace/team/ENG-123"
- Linear direct URL: "https://linear.app/issue/ENG-123"

// GraphQL query fetches:
- id (UUID)
- identifier (e.g., "ENG-123")
- title
- description
- state.name
- assignee.name
```

### Workflow Integration
Each workflow job now:
1. Checks out repository
2. Sets up Bun runtime
3. Runs `bun run scripts/get-linear-issue.ts "${{ inputs.linear_issue }}"`
4. Uses outputs: `steps.issue.outputs.{id,number,title,body_file}`

### Placeholder System
All prompts now use `{{LINEAR_ISSUE}}` which gets replaced with:
- Issue title (first line)
- Issue description (remaining content)

## Commits

1. **e205e24** - "Migrate implementation workflow from GitHub issues to Linear issues"
   - Created `scripts/get-linear-issue.ts`
   - Updated both workflow files
   - 3 files changed, 195 insertions(+), 41 deletions(-)

2. **134ce92** - "Fix placeholder: use {{LINEAR_ISSUE}} instead of {{FEATURE_REQUEST}}"
   - Fixed prompt template variable mismatch
   - 1 file changed, 3 insertions(+), 3 deletions(-)

3. **20270b4** - "Session 9: Complete workflow migration from GitHub issues to Linear"
   - Updated session documentation
   - 1 file changed, 53 insertions(+), 5 deletions(-)

## Files Modified

**Created**:
- `scripts/get-linear-issue.ts`

**Updated**:
- `.github/workflows/reusable-implement-issue.yml`
- `.github/workflows/claude-implement-issue.yml`
- `.sessions/index.md`

**Total**: 3 files changed, 198 insertions(+), 44 deletions(-)

## Testing Requirements

Before using in production:
1. Configure `LINEAR_API_KEY` in repository secrets
2. Test with a real Linear issue ID (e.g., "ENG-123")
3. Test with a full Linear URL
4. Verify issue details are fetched correctly
5. Verify all 3 workflow jobs (implement, review, verify) can access issue data
6. Verify PR creation references Linear issue correctly

## Next Steps

1. **Update documentation**:
   - CLAUDE.md - Update workflow usage instructions
   - README.md - Update setup and configuration guide
   - Add Linear API key setup instructions

2. **End-to-end testing**:
   - Test with real Linear issue
   - Verify all workflow jobs complete successfully
   - Verify PR creation and formatting

3. **Future enhancements**:
   - Add Linear issue commenting for workflow status updates
   - Consider using Linear MCP instead of GraphQL API
   - Add better error handling for invalid issue IDs

## Notes

- The workflow now expects Linear to be the single source of truth
- All prompt templates already used `{{LINEAR_ISSUE}}` - only workflow needed updates
- GraphQL API approach provides more control than MCP for this use case
- Issue description is written to temp file for prompt substitution consistency
