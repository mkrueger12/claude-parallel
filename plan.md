## Overview

Implement a feature to append the entire conversation transcript from the verify step to the PR that gets opened. This will provide reviewers with full visibility into Claude's verification process, including reasoning, tool invocations, and any fixes applied.

## Implementation Task List:
1. **Create SessionEnd hook script** - Captures transcript path and copies to working directory
2. **Configure hook in settings.json** - Set up SessionEnd hook for the verify step
3. **Add transcript processing script** - Convert JSONL to readable markdown format
4. **Modify workflow to upload transcript** - Add step to post transcript as PR comment
5. **Update verify step to enable hook** - Ensure hook configuration is active during Claude execution

## Current State Analysis

### What Exists Now:
- **Verify step** runs in `.github/workflows/reusable-implement-issue.yml:599-1029`
- **Claude CLI invocation** at lines 928-932 uses `--output-format json` which only captures final result
- **PR commenting** at lines 955-1019 posts verification status but NOT the conversation
- **Artifact upload** at lines 1021-1028 saves `verify-result.json` and `verify-error.log` only
- **No hook configuration** currently exists in the project

### What's Missing:
- SessionEnd hook to capture transcript path
- Script to copy/process the transcript
- Workflow step to read and post transcript to PR
- Settings configuration for hooks

### Key Constraints:
- Claude CLI outputs structured JSON, not conversation history, with `--output-format json`
- Transcripts are stored as JSONL files in `~/.claude/projects/` directories
- SessionEnd hooks receive `transcript_path` in their stdin input
- GitHub Actions runner file system resets between jobs - transcript must be captured in same job

## Desired End State

After implementation:
1. When the verify step runs, a SessionEnd hook captures the transcript
2. The transcript is converted to readable markdown format
3. The full conversation (including tool calls, reasoning, and fixes) is appended to the PR
4. The transcript is also uploaded as an artifact for long-term retention

### How to Verify:
1. Run the workflow on a test issue
2. Check the PR comment includes a "Verification Conversation" section
3. Verify the conversation shows user prompts, Claude responses, and tool invocations
4. Confirm the transcript artifact is uploaded

### Key Discoveries:
- `.github/workflows/reusable-implement-issue.yml:928-932` - Claude CLI invocation point
- `.github/workflows/reusable-implement-issue.yml:955-1019` - PR comment generation
- `.github/prompts/verify.md` - Verify prompt template
- Transcripts are stored at: `~/.claude/projects/<encoded-path>/<session-id>.jsonl`
- Hook input provides: `session_id`, `transcript_path`, `cwd`, `reason`

## What We're NOT Doing

1. **Not modifying the verify prompt** - The prompt itself doesn't need changes
2. **Not changing the review or implement steps** - Only modifying verify step
3. **Not adding conversation capture to other steps** - Scoped to verify only
4. **Not creating a complex UI** - Using simple markdown formatting
5. **Not storing transcripts permanently in repo** - Using artifacts with 7-day retention
6. **Not parsing every JSONL field** - Extracting key conversation elements only

## Implementation Approach

The approach uses Claude Code's built-in SessionEnd hook system to capture the transcript path, then processes the JSONL file into readable markdown and posts it to the PR as a comment.

**Why this approach:**
1. **SessionEnd hooks are reliable** - They fire after every session, guaranteeing transcript capture
2. **JSONL to markdown conversion** - Makes the conversation human-readable
3. **PR comment** - Keeps the conversation visible alongside the verification results
4. **Artifact upload** - Provides backup and allows downloading full transcript

## Files to Edit

1. `.github/workflows/reusable-implement-issue.yml` - Lines 885-934 (verify step) and 955-1028 (PR comment/artifact)
2. `.claude/hooks/capture-transcript.sh` (NEW) - Hook script to capture transcript
3. `.claude/hooks/jsonl-to-markdown.py` (NEW) - JSONL to markdown converter
4. `.claude/settings.json` (NEW or MODIFY) - Hook configuration

---

## Task 1: Create SessionEnd Hook Script

**File**: `.claude/hooks/capture-transcript.sh` (NEW)

**Description of Changes**:
Create a bash script that receives SessionEnd hook input via stdin, extracts the `transcript_path` field, and copies the transcript to a known location (`./verify-transcript.jsonl`) in the current working directory. The script should:
- Read JSON input from stdin using `jq`
- Extract `transcript_path` and `session_id` fields
- Expand tilde in the path if present
- Copy the transcript file to `./verify-transcript.jsonl`
- Handle errors gracefully (exit 0 to not block session)
- Log success/failure to stderr for debugging

### Success Criteria:

#### Automated Verification:
- [ ] Script file exists at `.claude/hooks/capture-transcript.sh`
- [ ] Script is executable (`chmod +x`)
- [ ] Script handles missing transcript gracefully
- [ ] Script works with test input: `echo '{"transcript_path":"test.jsonl","session_id":"123"}' | bash .claude/hooks/capture-transcript.sh`

#### Manual Verification:
- [ ] Running the script with valid input copies the file
- [ ] Script doesn't fail when transcript is missing

---

## Task 2: Create JSONL to Markdown Converter

**File**: `.claude/hooks/jsonl-to-markdown.py` (NEW)

**Description of Changes**:
Create a Python script that converts JSONL transcript files to readable markdown. The script should:
- Read JSONL file line by line
- Parse each JSON line and extract message type, role, content
- Handle different message types: `user`, `assistant`, `tool_use`, `tool_result`
- Format user messages with "User:" prefix
- Format assistant messages with "Claude:" prefix
- Include tool invocations with their inputs and outputs
- Handle base64-encoded content (skip or decode)
- Output clean markdown suitable for GitHub PR comments
- Truncate if the output exceeds 60000 characters (GitHub comment limit is 65535)

### Success Criteria:

#### Automated Verification:
- [ ] Script file exists at `.claude/hooks/jsonl-to-markdown.py`
- [ ] Script is executable
- [ ] Script runs without errors: `python3 .claude/hooks/jsonl-to-markdown.py --help`
- [ ] Script handles empty files gracefully

#### Manual Verification:
- [ ] Running on sample JSONL produces readable markdown
- [ ] Tool invocations are formatted clearly
- [ ] Long conversations are truncated properly

---

## Task 3: Configure SessionEnd Hook

**File**: `.claude/settings.json` (NEW or MODIFY)

**Description of Changes**:
Create or modify the Claude settings file to configure the SessionEnd hook. The configuration should:
- Define a SessionEnd hook that runs the capture script
- Set appropriate timeout (30 seconds should be sufficient)
- Use the `$CLAUDE_PROJECT_DIR` environment variable for script path
- Ensure the hook runs for all session end reasons

### Success Criteria:

#### Automated Verification:
- [ ] File exists at `.claude/settings.json`
- [ ] File contains valid JSON
- [ ] JSON has `hooks.SessionEnd` array defined
- [ ] Hook command references capture script

#### Manual Verification:
- [ ] Hook configuration follows Claude Code documentation format

---

## Task 4: Modify Workflow to Capture and Post Transcript

**File**: `.github/workflows/reusable-implement-issue.yml`

**Description of Changes**:
Modify the verify job to:

1. **Before Claude invocation (around line 885)**:
   - Create `.claude/hooks` directory
   - Copy hook script and converter from repo to appropriate location
   - Create or update `.claude/settings.json` with hook configuration
   - Make scripts executable

2. **After Claude invocation (around line 934)**:
   - Check if `verify-transcript.jsonl` was created by the hook
   - Run the converter to create `verify-transcript.md`
   - Read the markdown content for inclusion in PR comment

3. **Modify PR comment generation (around line 998)**:
   - Add a new section "### Verification Conversation"
   - Include the transcript markdown content (or truncated version with link to artifact)
   - Handle case where transcript is missing

4. **Modify artifact upload (around line 1021)**:
   - Add `verify-transcript.jsonl` and `verify-transcript.md` to artifacts

### Success Criteria:

#### Automated Verification:
- [ ] Workflow syntax is valid: `act` or GitHub's workflow validator
- [ ] Hook setup step runs before Claude invocation
- [ ] Transcript processing step runs after Claude invocation
- [ ] Artifact upload includes transcript files

#### Manual Verification:
- [ ] PR comment includes conversation section
- [ ] Artifact download contains transcript files
- [ ] Long conversations are handled gracefully

---

## Task 5: Add Workflow Inputs for Feature Toggle

**File**: `.github/workflows/reusable-implement-issue.yml`

**Description of Changes**:
Add a new workflow input to enable/disable transcript capture:
- `include_transcript`: boolean, default true
- Wrap transcript-related steps with conditional on this input
- Document the input in README.md

This allows users to disable the feature if they have concerns about conversation length or privacy.

### Success Criteria:

#### Automated Verification:
- [ ] Input is defined in workflow inputs section
- [ ] Conditional checks reference the input correctly

#### Manual Verification:
- [ ] Setting `include_transcript: false` skips transcript capture
- [ ] Default behavior includes transcript

---

## Migration Notes

- No database migrations required
- No breaking changes to existing workflows
- Workflows using the reusable workflow will automatically get transcript capture
- Users who don't want transcripts can set `include_transcript: false`

## References

- Claude Code hooks documentation: https://code.claude.com/docs/en/hooks
- JSONL transcript format: Community parsers at https://github.com/daaain/claude-code-log
- GitHub comment size limit: 65535 characters
- Current verify step: `.github/workflows/reusable-implement-issue.yml:599-1029`
- Current PR comment logic: `.github/workflows/reusable-implement-issue.yml:955-1019`
