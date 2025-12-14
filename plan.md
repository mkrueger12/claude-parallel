# Multi-Provider Plan Generation with Linear Integration Implementation Plan

## Overview

This plan implements a GitHub Action that generates implementation plans using multiple AI providers (Anthropic Claude, Google Gemini, OpenAI GPT) through the OpenCode SDK, consolidates them into a unified strategy, and creates Linear issues with sub-tasks for tracking.

## Implementation Task List

1. **Create OpenCode plan generation script** - TypeScript script that orchestrates parallel plan generation across 3 AI providers
2. **Create consolidation + Linear script** - Single script that consolidates 3 plans AND creates Linear issues in the same OpenCode session (model has access to Linear MCP tools)
3. **Create planning prompt template** - Prompt for generating implementation plans from issue descriptions
4. **Create consolidation + Linear prompt template** - Prompt that instructs the model to consolidate plans AND create Linear issues using MCP tools
5. **Create setup-opencode composite action** - GitHub Action to install and configure OpenCode SDK with provider authentication
6. **Create setup-linear-mcp composite action** - GitHub Action to configure Linear MCP server with HTTP transport
7. **Create main workflow** - `multi-provider-plan.yml` workflow that orchestrates the entire process
8. **Update README** - Document the new workflow, required secrets, and usage

## Current State Analysis

**What Exists:**
- Reusable workflow pattern at `.github/workflows/reusable-implement-issue.yml` (1029 lines)
- Composite actions for setup-claude (`.github/actions/setup-claude/action.yml`), get-issue-details, fetch-agents, detect-runtime
- Prompt templates at `.github/prompts/implementation.md`, `review.md`, `verify.md`
- Pattern of using matrix strategy for parallel execution (lines 86-92 of reusable workflow)

**What's Missing:**
- OpenCode SDK integration (need to install `@opencode-ai/sdk`)
- Multi-provider orchestration (currently only uses Claude via CLI)
- Linear MCP server configuration
- Plan consolidation logic
- Scripts for OpenCode-based plan generation

**Key Patterns to Follow:**
- Use composite actions for reusable setup steps (`.github/actions/*/action.yml` pattern)
- Store prompts in `.github/prompts/` directory with `{{PLACEHOLDER}}` variables
- Use TypeScript/JavaScript for complex logic (Node.js runtime in CI)
- Parse JSON output from AI responses

## Desired End State

After implementation:
1. A new GitHub Action workflow `multi-provider-plan.yml` triggers on issue creation or `claude-plan` label
2. The workflow generates 3 implementation plans in parallel (one per provider)
3. A consolidation step merges the 3 plans into a unified strategy
4. A Linear parent issue is created with the consolidated plan
5. Linear sub-issues are created for each implementation step
6. The workflow posts a summary comment on the original GitHub issue

**Verification:**
- Trigger the workflow manually with a test issue
- Verify 3 plan artifacts are created (one per provider)
- Verify consolidated plan is generated
- Verify Linear parent issue and sub-issues are created
- Verify GitHub issue comment is posted with Linear links

### Key Discoveries

- OpenCode SDK uses `client.session.prompt()` with `model: { providerID, modelID }` to specify providers (research findings)
- Linear MCP server endpoint: `https://mcp.linear.app/mcp` with OAuth via `mcp-remote` package
- Current workflow uses `${{ inputs.claude_model }}` variable at `.github/workflows/reusable-implement-issue.yml:229`
- Existing pattern for JSON schema validation in review step (lines 387-394)
- Issue body is written to temp file via get-issue-details action (line 59: `/tmp/issue_body.txt`)

## What We're NOT Doing

1. **NOT modifying existing reusable-implement-issue.yml** - This is a new, separate workflow
2. **NOT implementing the actual code changes** - This workflow only generates plans
3. **NOT using GitHub Actions matrix for providers** - Using OpenCode SDK parallel sessions instead
4. **NOT creating a new MCP server** - Using official Linear MCP server at `mcp.linear.app`
5. **NOT storing Linear OAuth tokens locally** - Using API key authentication via `LINEAR_API_KEY` secret
6. **NOT implementing interactive OAuth flow** - Using API key directly in headers

## Implementation Approach

The implementation follows a layered architecture where the consolidation and Linear issue creation happen in **the same model session**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      GitHub Actions Workflow                             │
│                     (multi-provider-plan.yml)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Job 1: Generate Plans              Job 2: Consolidate + Create Linear  │
│   ┌─────────────────────┐           ┌────────────────────────────────┐  │
│   │ 3 parallel sessions │           │ Single session with MCP tools │  │
│   │ (one per provider)  │  ──────►  │ 1. Reads 3 plans               │  │
│   │                     │           │ 2. Consolidates into one       │  │
│   └─────────────────────┘           │ 3. Calls Linear MCP to create  │  │
│                                     │    parent + sub-issues         │  │
│                                     └────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                           OpenCode SDK                                   │
│                  (sessions with MCP server access)                       │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌───────────┐    ┌──────────────────┐   │
│  │ Anthropic │  │  OpenAI   │  │  Google   │    │   Linear MCP     │   │
│  │  Claude   │  │   GPT-4   │  │  Gemini   │    │ (HTTP transport) │   │
│  └───────────┘  └───────────┘  └───────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Architecture Decision:**
The consolidation model (Claude) runs in a session with Linear MCP tools available. After reviewing and merging the 3 plans, the **same session** immediately calls the Linear MCP `create_issue` tool to create the parent issue and sub-issues. This ensures:
- No context loss between consolidation and issue creation
- The model can adapt issue descriptions based on the consolidated plan
- Single invocation = simpler workflow, fewer failure points

**Strategy:**
1. Create modular TypeScript scripts in `.github/scripts/` directory
2. Use composite actions for setup (OpenCode with Linear MCP configured)
3. Run plan generation in a single job with parallel Promise.all()
4. Run consolidation + Linear creation in a single OpenCode session with MCP tools
5. Use Linear API key for MCP authentication (simpler than OAuth flow in CI)

## Files to Create/Edit

| File | Action | Description |
|------|--------|-------------|
| `.github/scripts/generate-plans.ts` | Create | OpenCode SDK script for parallel plan generation across 3 providers |
| `.github/scripts/consolidate-and-create-linear.ts` | Create | Single script that runs one OpenCode session with Linear MCP to consolidate plans AND create issues |
| `.github/scripts/package.json` | Create | Dependencies for scripts |
| `.github/scripts/tsconfig.json` | Create | TypeScript configuration |
| `.github/prompts/plan-generation.md` | Create | Prompt template for generating plans |
| `.github/prompts/consolidate-and-create-linear.md` | Create | Prompt that instructs model to consolidate AND call Linear MCP tools |
| `.github/actions/setup-opencode/action.yml` | Create | Composite action for OpenCode setup with Linear MCP configured |
| `.github/workflows/multi-provider-plan.yml` | Create | Main workflow file |
| `README.md` | Edit | Add documentation for new workflow |

---

## Task 1: Create TypeScript Scripts Package

**File**: `.github/scripts/package.json`

**Description of Changes**: Create a package.json file in `.github/scripts/` that defines the project dependencies for the plan generation scripts. Include:
- `@opencode-ai/sdk` for multi-provider AI orchestration
- `@linear/sdk` as fallback for Linear API (if MCP fails)
- TypeScript and ts-node for execution
- Type definitions for Node.js

**File**: `.github/scripts/tsconfig.json`

**Description of Changes**: Create TypeScript configuration with:
- Target ES2022 for modern Node.js features
- Module resolution set to NodeNext
- Strict mode enabled
- Output directory set to `dist/`

### Success Criteria

#### Automated Verification:
- [ ] `npm install` completes without errors in `.github/scripts/`
- [ ] `npx tsc --noEmit` passes with no type errors
- [ ] Package includes all required dependencies

#### Manual Verification:
- [ ] Dependencies are appropriate versions (not outdated)
- [ ] TypeScript config matches Node.js 20 LTS capabilities

---

## Task 2: Create Plan Generation Script

**File**: `.github/scripts/generate-plans.ts`

**Description of Changes**: Create the main script that uses OpenCode SDK to generate implementation plans from 3 AI providers in parallel. The script should:

1. **Initialize OpenCode client** with configuration for all 3 providers
2. **Set up provider authentication** using environment variables:
   - `ANTHROPIC_API_KEY` for Anthropic
   - `OPENAI_API_KEY` for OpenAI
   - `GOOGLE_API_KEY` for Google
3. **Read model configuration** from environment variables:
   - `ANTHROPIC_MODEL` (default: `claude-3-5-sonnet-20241022`)
   - `OPENAI_MODEL` (default: `gpt-4-turbo-preview`)
   - `GOOGLE_MODEL` (default: `gemini-pro`)
4. **Create 3 sessions** (one per provider) using `client.session.create()`
5. **Send prompts in parallel** using `Promise.all()` with `client.session.prompt()`:
   - Anthropic: `{ providerID: "anthropic", modelID: process.env.ANTHROPIC_MODEL }`
   - OpenAI: `{ providerID: "openai", modelID: process.env.OPENAI_MODEL }`
   - Google: `{ providerID: "google", modelID: process.env.GOOGLE_MODEL }`
6. **Read prompt template** from `.github/prompts/plan-generation.md`
7. **Substitute placeholders** in template (`{{ISSUE_TITLE}}`, `{{ISSUE_BODY}}`)
8. **Parse responses** and extract structured plan JSON
9. **Write output files** to `plans/anthropic.json`, `plans/openai.json`, `plans/google.json`
10. **Handle errors** gracefully - if one provider fails, continue with others

**Input**: Environment variables for API keys, issue title/body from args or stdin
**Output**: 3 JSON files with structured implementation plans

### Success Criteria

#### Automated Verification:
- [ ] Script compiles without TypeScript errors: `npx tsc`
- [ ] Script can be executed: `npx ts-node generate-plans.ts`
- [ ] Creates output directory if not exists
- [ ] Writes valid JSON files for each provider

#### Manual Verification:
- [ ] Plans are coherent and relevant to the input issue
- [ ] Each provider produces a distinct plan (not identical)
- [ ] Error handling works when a provider API key is missing

---

## Task 3: Create Consolidation + Linear Script (Same Session)

**File**: `.github/scripts/consolidate-and-create-linear.ts`

**Description of Changes**: Create a script that runs a **single OpenCode session** where the model:
1. Reviews and consolidates 3 provider plans
2. Creates Linear parent issue and sub-issues using MCP tools

The key insight is that the OpenCode session has Linear MCP tools available, so the model can call them directly during the same invocation. This is NOT two separate scripts - it's one script that creates one session with MCP access.

The script should:

1. **Read all 3 plan JSON files** from `plans/` directory
2. **Load prompt template** from `.github/prompts/consolidate-and-create-linear.md`
3. **Configure OpenCode client** with Linear MCP server:
   ```typescript
   const client = new Opencode({
     config: {
       mcp: {
         linear: {
           type: "remote",
           url: "https://mcp.linear.app/mcp",
           headers: {
             "Authorization": `Bearer ${process.env.LINEAR_API_KEY}`
           }
         }
       }
     }
   });
   ```
4. **Create a single session** with Anthropic Claude
5. **Send prompt** that includes:
   - All 3 plans (Anthropic, OpenAI, Google)
   - Instructions to consolidate into unified plan
   - Instructions to call Linear MCP `create_issue` tool for parent issue
   - Instructions to call Linear MCP `create_issue` tool for each sub-issue with `parentId`
   - The `LINEAR_TEAM_ID` for issue creation
6. **The model in this session will**:
   - Analyze and merge the 3 plans
   - Call `mcp__linear-server__create_issue` to create parent issue
   - Extract parent issue UUID from response
   - Call `mcp__linear-server__create_issue` for each implementation step with `parentId` set
7. **Capture session output** including:
   - Consolidated plan (from model reasoning)
   - Linear issue URLs (from MCP tool responses)
8. **Write results** to `output/result.json`:
   ```json
   {
     "consolidatedPlan": {
       "title": "...",
       "overview": "...",
       "steps": [...]
     },
     "linearIssues": {
       "parent": { "id": "uuid", "identifier": "ENG-123", "url": "..." },
       "subIssues": [
         { "id": "uuid", "identifier": "ENG-124", "url": "...", "step": 1 }
       ]
     }
   }
   ```

**Why Single Session Matters:**
- The model retains context of the consolidated plan when creating issues
- No JSON parsing/passing between scripts - the model knows what it just decided
- Fewer failure points - one invocation instead of two
- The model can adapt issue descriptions naturally based on its analysis

### Success Criteria

#### Automated Verification:
- [ ] Script compiles without TypeScript errors
- [ ] Script connects to OpenCode with Linear MCP configured
- [ ] Session prompt includes all 3 input plans
- [ ] Output JSON contains both consolidatedPlan and linearIssues

#### Manual Verification:
- [ ] Model successfully calls Linear MCP tools
- [ ] Parent issue is created with consolidated plan content
- [ ] Sub-issues are linked to parent (visible in Linear UI)
- [ ] Issue descriptions reflect the consolidated analysis

---

## Task 4: Create Prompt Templates

**File**: `.github/prompts/plan-generation.md`

**Description of Changes**: Create a prompt template that instructs AI providers to generate implementation plans. The prompt should:

1. **Set context**: "You are a senior software engineer tasked with creating an implementation plan"
2. **Provide issue details**: Use `{{ISSUE_TITLE}}` and `{{ISSUE_BODY}}` placeholders
3. **Define output structure**: Request JSON output with specific schema:
   - `overview`: Brief description
   - `steps`: Array of implementation steps with title, description, priority
   - `risks`: Potential issues and mitigations
   - `dependencies`: Required tools, libraries, or services
4. **Include constraints**: Match existing project patterns, consider testing, avoid over-engineering

**File**: `.github/prompts/consolidate-and-create-linear.md`

**Description of Changes**: Create a prompt template that instructs the model to both consolidate plans AND create Linear issues in the same session. The prompt should:

1. **Present all 3 plans** with source attribution:
   - `{{ANTHROPIC_PLAN}}` - Plan from Claude
   - `{{OPENAI_PLAN}}` - Plan from GPT-4
   - `{{GOOGLE_PLAN}}` - Plan from Gemini
2. **Provide Linear context**:
   - `{{LINEAR_TEAM_ID}}` - Team to create issues in
   - `{{LINEAR_PROJECT_ID}}` - Project to add issues to (optional)
   - `{{GITHUB_ISSUE_URL}}` - Link back to original GitHub issue
3. **Instruct consolidation**:
   - Analyze all 3 plans
   - Identify best approaches from each
   - Create unified implementation strategy
   - Number steps in order of priority
4. **Instruct Linear issue creation** (in same session):
   - "After consolidating, use the `mcp__linear-server__create_issue` tool to create a parent issue with the consolidated plan"
   - "For each implementation step, create a sub-issue using `mcp__linear-server__create_issue` with `parentId` set to the parent issue UUID"
   - "Include the GitHub issue link in the parent issue description"
5. **Define expected tool calls**:
   ```
   First, call: mcp__linear-server__create_issue with:
   - title: "Implementation Plan: {{ISSUE_TITLE}}"
   - team: "{{LINEAR_TEAM_ID}}"
   - project: "{{LINEAR_PROJECT_ID}}" (if provided)
   - description: [consolidated plan markdown]
   - labels: ["generated-plan", "multi-provider"]

   Then, for each step, call: mcp__linear-server__create_issue with:
   - title: "Step N: [step title]"
   - team: "{{LINEAR_TEAM_ID}}"
   - project: "{{LINEAR_PROJECT_ID}}" (if provided)
   - parentId: [UUID from parent issue response]
   - description: [step description]
   ```

### Success Criteria

#### Automated Verification:
- [ ] Files exist at correct paths
- [ ] All placeholders are valid (`{{VARIABLE}}` format)
- [ ] JSON schema examples are valid JSON
- [ ] Prompt includes MCP tool call instructions

#### Manual Verification:
- [ ] Prompts are clear and unambiguous
- [ ] Consolidation instructions produce coherent plans
- [ ] Linear tool call instructions match MCP tool signatures

---

## Task 5: Create Setup OpenCode Composite Action

**File**: `.github/actions/setup-opencode/action.yml`

**Description of Changes**: Create a composite action that sets up the OpenCode SDK environment in GitHub Actions, including Linear MCP configuration. The action should:

1. **Accept inputs**:
   - `anthropic_api_key` (required)
   - `openai_api_key` (required)
   - `google_api_key` (required)
   - `linear_api_key` (required) - For Linear MCP access
   - `linear_team_id` (required) - Team for issue creation
   - `linear_project_id` (optional) - Project to add issues to
   - `anthropic_model` (optional, default: `claude-3-5-sonnet-20241022`)
   - `openai_model` (optional, default: `gpt-4-turbo-preview`)
   - `google_model` (optional, default: `gemini-pro`)
2. **Install Node.js dependencies** in `.github/scripts/`
3. **Set environment variables**:
   - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` (auth)
   - `ANTHROPIC_MODEL`, `OPENAI_MODEL`, `GOOGLE_MODEL` (model selection)
   - `LINEAR_API_KEY`, `LINEAR_TEAM_ID`, `LINEAR_PROJECT_ID` (Linear MCP)
4. **Validate authentication** by checking all required keys are provided
5. **Output status** indicating successful setup

Note: Linear MCP is configured directly in the OpenCode client within the consolidation script, not as a separate setup step. The `LINEAR_API_KEY` is passed via environment variable.

### Success Criteria

#### Automated Verification:
- [ ] Action validates correctly in workflow
- [ ] All environment variables are set (auth + models + Linear)
- [ ] Dependencies install successfully
- [ ] Fails fast if any required key is missing

#### Manual Verification:
- [ ] Action is reusable across workflows
- [ ] Error messages are clear when keys are missing
- [ ] Model environment variables are correctly passed to scripts

---

## Task 6: Create Main Workflow

**File**: `.github/workflows/multi-provider-plan.yml`

**Description of Changes**: Create the main GitHub Actions workflow that orchestrates the entire process. The workflow uses a simplified 2-job architecture since consolidation and Linear issue creation happen in the same session.

**Triggers**:
```yaml
on:
  issues:
    types: [opened, labeled]
  workflow_dispatch:
    inputs:
      issue_number:
        description: 'Issue number to generate plan for'
        required: true
        type: number
      linear_project_id:
        description: 'Linear project ID to add issues to (optional)'
        required: false
        type: string
      anthropic_model:
        description: 'Anthropic model to use'
        required: false
        type: string
        default: 'claude-3-5-sonnet-20241022'
      openai_model:
        description: 'OpenAI model to use'
        required: false
        type: string
        default: 'gpt-4-turbo-preview'
      google_model:
        description: 'Google model to use'
        required: false
        type: string
        default: 'gemini-pro'
```

**Jobs**:

1. **`generate-plans`** job:
   - Runs on `ubuntu-latest`
   - Checkout repository
   - Get issue details using `get-issue-details` action
   - Setup OpenCode using `setup-opencode` action (passes all env vars including models)
   - Run `generate-plans.ts` script (3 parallel provider sessions)
   - Upload `plans/` directory as artifact

2. **`consolidate-and-create-linear`** job:
   - Depends on `generate-plans`
   - Download plans artifact
   - Setup OpenCode with Linear MCP configured
   - Run `consolidate-and-create-linear.ts` script
   - **This single script/session**:
     - Reads all 3 plan JSON files
     - Sends prompt to Claude with Linear MCP tools available
     - Model consolidates plans AND calls Linear MCP to create issues
     - Captures output including Linear issue URLs
   - Upload `output/result.json` as artifact
   - Post summary comment on GitHub issue with:
     - Link to Linear parent issue
     - List of sub-issues
     - Brief summary of consolidated plan

**Secrets Required**:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY` (maps to `GOOGLE_GENERATIVE_AI_API_KEY`)
- `LINEAR_API_KEY`
- `LINEAR_TEAM_ID` (can also be a secret or input)
- `LINEAR_PROJECT_ID` (optional - project to add issues to)
- `GH_PAT` (for issue comments)

**Condition**: Only runs if label is `claude-plan` OR event is `workflow_dispatch`

### Success Criteria

#### Automated Verification:
- [ ] Workflow syntax is valid: `actionlint .github/workflows/multi-provider-plan.yml`
- [ ] All referenced actions exist
- [ ] All secrets are documented
- [ ] Artifacts are passed between jobs correctly
- [ ] Model inputs have sensible defaults

#### Manual Verification:
- [ ] Workflow triggers on issue label
- [ ] Workflow triggers on manual dispatch
- [ ] Both jobs complete successfully
- [ ] GitHub issue comment is posted with Linear links
- [ ] Linear issues are created correctly

---

## Task 7: Update README Documentation

**File**: `README.md`

**Description of Changes**: Add documentation section for the new multi-provider plan workflow. Updates should include:

1. **New section**: "Multi-Provider Plan Generation"
2. **Overview**: Describe the workflow purpose and capabilities
3. **Required Secrets table**:
   | Secret | Required | Description |
   |--------|----------|-------------|
   | `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
   | `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4 |
   | `GOOGLE_API_KEY` | Yes | Google AI API key for Gemini |
   | `LINEAR_API_KEY` | Yes | Linear Personal API key |
   | `LINEAR_TEAM_ID` | Yes | Linear team ID or name for issue creation |
   | `LINEAR_PROJECT_ID` | No | Linear project to add issues to |
   | `GH_PAT` | Yes | GitHub PAT with issue write access |

4. **Workflow Inputs table**:
   | Input | Default | Description |
   |-------|---------|-------------|
   | `linear_project_id` | (none) | Linear project to add issues to |
   | `anthropic_model` | `claude-3-5-sonnet-20241022` | Model for Anthropic |
   | `openai_model` | `gpt-4-turbo-preview` | Model for OpenAI |
   | `google_model` | `gemini-pro` | Model for Google |

5. **Usage instructions**:
   - How to trigger via label (`claude-plan`)
   - How to trigger via workflow_dispatch with model overrides
   - Where to find generated Linear issues
   - How consolidation + Linear creation works in same session

6. **Customization options**:
   - How to modify prompts in `.github/prompts/`
   - How to change default models via workflow inputs
   - How to add/remove providers

### Success Criteria

#### Automated Verification:
- [ ] README renders correctly in GitHub
- [ ] All links are valid
- [ ] Code blocks have syntax highlighting

#### Manual Verification:
- [ ] Instructions are clear and complete
- [ ] Screenshots or examples are helpful
- [ ] Troubleshooting section covers common issues

---

## Testing Strategy

### Unit Tests
- Validate JSON schema of plan outputs
- Test placeholder substitution in prompts
- Test error handling when provider fails
- Validate OpenCode client configuration with Linear MCP

### Integration Tests
- Run `generate-plans.ts` with mock API responses
- Run `consolidate-and-create-linear.ts` with sample plan files and Linear sandbox
- Verify Linear MCP tool calls are made correctly in same session

### Manual Testing Steps
1. Create a test issue with `claude-plan` label
2. Verify workflow triggers automatically
3. Check Actions logs for both jobs (`generate-plans` and `consolidate-and-create-linear`)
4. Verify `plans/` artifacts contain valid JSON from all 3 providers
5. Verify `output/result.json` contains both `consolidatedPlan` and `linearIssues`
6. Open Linear and verify parent issue exists with consolidated plan
7. Verify sub-issues are linked to parent (visible in Linear hierarchy)
8. Check GitHub issue for summary comment with Linear links
9. Test workflow_dispatch with existing issue number
10. Test with different model inputs to verify env var configuration

---

## Migration Notes

This is a new workflow, no migration required. However:

1. **Secrets Setup**: Users must add 5 new secrets before using the workflow
2. **Linear Team**: Users should have their Linear team ID ready or know their team name
3. **Label Creation**: Users should create the `claude-plan` label in their repository
4. **Permissions**: Workflow requires `issues: write` and `pull-requests: write` permissions

---

## References

- GitHub Issue: [#27 - Add multi-provider plan generation with Linear integration](https://github.com/mkrueger12/claude-parallel/issues/27)
- OpenCode SDK Documentation: https://opencode.ai/docs/sdk/
- Linear MCP Server: https://linear.app/docs/mcp
- Existing workflow pattern: `.github/workflows/reusable-implement-issue.yml:86-92` (matrix strategy)
- Existing prompt pattern: `.github/prompts/implementation.md` (template with placeholders)
- Existing action pattern: `.github/actions/setup-claude/action.yml` (composite action structure)
