# Implementation Plan: Multi-Provider Plan Generation with Linear Integration

## Overview

Implement a GitHub Action workflow that generates implementation plans using multiple AI providers (Anthropic/Claude, Google/Gemini, OpenAI/GPT) via the OpenCode SDK when a GitHub issue is created, then consolidates these plans into a unified implementation plan and creates a Linear parent issue with sub-issues for tracking.

## Implementation Task List

1. **Create prompt templates** - Create plan-generation.md and plan-consolidation.md prompts in the prompts/ directory
2. **Create generate-plan workflow** - Create the main GitHub Actions workflow that orchestrates the multi-provider plan generation
3. **Add package.json for Node.js dependencies** - Add @opencode-ai/sdk and @linear/sdk dependencies
4. **Create plan generation script** - Create a JavaScript script to handle OpenCode SDK and Linear API integration
5. **Update documentation** - Update README.md with the new workflow and required secrets

## Current State Analysis

**What exists now:**
- `.github/workflows/reusable-implement-issue.yml` - Main reusable workflow for parallel Claude implementations (lines 1-1029)
- `.github/workflows/claude-implement-issue.yml` - Entry point workflow
- `.github/prompts/implementation.md`, `review.md`, `verify.md` - Existing prompt templates
- `.github/actions/` - Custom actions for setup-claude, get-issue-details, fetch-agents, detect-runtime
- `prompts/implementation.md`, `review.md` - Local prompt templates

**What's missing:**
- OpenCode SDK integration (no existing package.json or Node.js setup)
- Linear API integration (mentioned in README but not implemented)
- Multi-provider AI orchestration
- Plan consolidation workflow
- `prompts/plan-generation.md` and `prompts/plan-consolidation.md`

**Key constraints discovered:**
- OpenCode SDK uses session-based API at `http://localhost:4096` (`.github/workflows/reusable-implement-issue.yml:225-231`)
- Provider specification: `{ providerID: "anthropic", modelID: "claude-sonnet-4-20250514" }`
- Placeholder pattern: `{{VARIABLE}}` with AWK substitution (lines 213-220)
- Authentication via environment variables: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`

## Desired End State

After implementation:
1. A new GitHub Action `generate-plan.yml` triggers on issue creation with `plan-generation` label
2. The workflow generates implementation plans from 3 AI providers in parallel using OpenCode SDK
3. Plans are consolidated into a unified implementation plan
4. A Linear parent issue is created with the consolidated plan
5. Linear sub-issues are created for each implementation step

**Verification:**
- [ ] Workflow triggers on issue creation with correct label
- [ ] Plans are generated from all 3 providers
- [ ] Plans are consolidated into a single document
- [ ] Linear parent issue is created with plan content
- [ ] Linear sub-issues are created for each step
- [ ] All secrets are properly configured

### Key Discoveries

- OpenCode SDK session API pattern from research: `client.session.prompt({ path: { id: session.id }, body: { model: { providerID, modelID }, parts: [{ type: "text", text }] } })`
- Linear SDK pattern: `linearClient.createIssue({ teamId, title, description, parentId })` for sub-issues
- Existing AWK template substitution pattern in workflow (`.github/workflows/reusable-implement-issue.yml:213-220`)
- Existing action reuse pattern: `uses: mkrueger12/claude-parallel/.github/actions/get-issue-details@main`

## What We're NOT Doing

- Modifying existing workflows (`reusable-implement-issue.yml`, `claude-implement-issue.yml`)
- Adding Linear integration to the existing implementation workflow
- Creating a separate OpenCode server/daemon
- Handling OAuth2 for Linear (using Personal API Key instead)
- Adding provider fallback or retry logic
- Implementing caching of AI responses

## Implementation Approach

1. **Prompts First**: Create the plan generation and consolidation prompts following the existing template pattern
2. **Script-based Integration**: Use a Node.js script for OpenCode SDK and Linear API calls rather than shell commands
3. **Parallel Execution**: Use Promise.all() for parallel plan generation from 3 providers
4. **Workflow Orchestration**: Create a new workflow that runs the script and handles artifact uploads
5. **Minimal Dependencies**: Only add essential packages (@opencode-ai/sdk, @linear/sdk)

## Files to Create/Edit

### New Files:
- `prompts/plan-generation.md` - Prompt for generating implementation plans
- `prompts/plan-consolidation.md` - Prompt for consolidating multiple plans
- `.github/workflows/generate-plan.yml` - New workflow for plan generation
- `scripts/generate-plan.js` - Node.js script for OpenCode and Linear integration
- `package.json` - Dependencies for the Node.js script

### Files to Edit:
- `README.md` - Add documentation for the new workflow and secrets

---

## Task 1: Create Plan Generation Prompt Template

**File**: `prompts/plan-generation.md`

**Description of Changes**:
Create a prompt template that instructs AI models to analyze a GitHub issue and generate a structured implementation plan. The prompt should:
- Accept `{{FEATURE_REQUEST}}` placeholder for the issue content
- Request a structured response with: overview, task breakdown, file changes, success criteria
- Be model-agnostic (works with Claude, Gemini, and GPT)
- Output format should be JSON for easy parsing

### Success Criteria

#### Automated Verification:
- [ ] File exists at `prompts/plan-generation.md`
- [ ] Contains `{{FEATURE_REQUEST}}` placeholder
- [ ] Valid markdown format

#### Manual Verification:
- [ ] Prompt produces structured JSON output when tested
- [ ] Works with all 3 AI providers

---

## Task 2: Create Plan Consolidation Prompt Template

**File**: `prompts/plan-consolidation.md`

**Description of Changes**:
Create a prompt template for consolidating multiple implementation plans into a unified plan. The prompt should:
- Accept `{{PLAN_1}}`, `{{PLAN_2}}`, `{{PLAN_3}}` placeholders for the 3 generated plans
- Accept `{{FEATURE_REQUEST}}` for context
- Merge overlapping steps and identify unique suggestions
- Output a consolidated plan with sub-issue breakdown in JSON format

### Success Criteria

#### Automated Verification:
- [ ] File exists at `prompts/plan-consolidation.md`
- [ ] Contains all required placeholders
- [ ] Valid markdown format

#### Manual Verification:
- [ ] Consolidation produces a coherent unified plan
- [ ] Sub-issues are well-defined and actionable

---

## Task 3: Create package.json for Dependencies

**File**: `package.json`

**Description of Changes**:
Create a minimal package.json with the required dependencies:
- `@opencode-ai/sdk` - OpenCode SDK for multi-provider AI orchestration
- `@linear/sdk` - Linear API client for issue management
- Set type to "module" for ES modules support
- Add a script entry for running the plan generation

### Success Criteria

#### Automated Verification:
- [ ] `npm install` runs successfully
- [ ] All dependencies install without errors

#### Manual Verification:
- [ ] Dependencies are the correct versions

---

## Task 4: Create Plan Generation Script

**File**: `scripts/generate-plan.js`

**Description of Changes**:
Create a Node.js script that:
1. Reads environment variables for API keys and configuration
2. Reads the issue content from a file or environment variable
3. Initializes OpenCode SDK client
4. Generates plans from 3 providers in parallel using Promise.all():
   - Anthropic (claude-sonnet-4-20250514)
   - Google (gemini-2.0-flash)
   - OpenAI (gpt-4o)
5. Consolidates the plans using a 4th AI call (Claude)
6. Initializes Linear SDK client
7. Creates a Linear parent issue with the consolidated plan
8. Creates Linear sub-issues for each implementation step
9. Outputs results to JSON file for workflow consumption

The script should:
- Handle errors gracefully with proper exit codes
- Log progress for debugging
- Output structured JSON with issue IDs and URLs

### Success Criteria

#### Automated Verification:
- [ ] Script runs without syntax errors: `node --check scripts/generate-plan.js`
- [ ] Script exits with proper codes (0 for success, 1 for error)

#### Manual Verification:
- [ ] Plans are generated from all 3 providers
- [ ] Linear issues are created correctly
- [ ] Sub-issues are linked to parent

---

## Task 5: Create GitHub Actions Workflow

**File**: `.github/workflows/generate-plan.yml`

**Description of Changes**:
Create a new GitHub Actions workflow that:
1. Triggers on:
   - Issue creation with `plan-generation` label
   - Manual workflow_dispatch with issue_number input
2. Uses existing `get-issue-details` action to fetch issue content
3. Sets up Node.js environment
4. Installs dependencies
5. Runs the generate-plan.js script with environment secrets
6. Uploads plan artifacts
7. Comments on the issue with Linear links

Workflow inputs:
- `issue_number` (for workflow_dispatch)

Required secrets:
- `OPENCODE_API_KEY` or individual provider keys
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`
- `LINEAR_API_KEY`
- `LINEAR_TEAM_ID` (or discover dynamically)

### Success Criteria

#### Automated Verification:
- [ ] Workflow YAML is valid: `actionlint .github/workflows/generate-plan.yml`
- [ ] All secrets are referenced correctly
- [ ] Node.js setup step works

#### Manual Verification:
- [ ] Workflow triggers on issue creation with label
- [ ] All steps complete successfully
- [ ] Issue comment is posted with Linear links

---

## Task 6: Update README Documentation

**File**: `README.md`

**Description of Changes**:
Add a new section documenting the plan generation feature:
- Description of the multi-provider plan generation workflow
- Required secrets list with descriptions
- Setup instructions for Linear integration
- Example usage and expected outputs
- Link to the new workflow file

### Success Criteria

#### Automated Verification:
- [ ] README.md is valid markdown

#### Manual Verification:
- [ ] Documentation is clear and complete
- [ ] All required secrets are documented
- [ ] Setup steps are accurate

---

## Migration Notes

- This is a new feature with no migration required
- Existing workflows remain unchanged
- Users must add new secrets for the feature to work:
  - `ANTHROPIC_API_KEY` (may already exist)
  - `OPENAI_API_KEY`
  - `GOOGLE_API_KEY`
  - `LINEAR_API_KEY`
  - `LINEAR_TEAM_ID`

## References

- Existing workflow pattern: `.github/workflows/reusable-implement-issue.yml`
- Existing action usage: `.github/actions/get-issue-details/action.yml`
- Template substitution pattern: `.github/workflows/reusable-implement-issue.yml:213-220`
- OpenCode SDK docs: https://opencode.ai/docs/sdk/
- Linear SDK docs: https://linear.app/developers
