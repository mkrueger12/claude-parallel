# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Claude Parallel is a workflow system that runs parallel Claude Code implementations using GitHub Actions. It supports two main workflows:

1. **Parallel Implementation Workflow**: Runs N parallel implementations of a feature request, reviews them, and creates a draft PR with the best implementation
2. **Multi-Provider Plan Generation**: Generates implementation plans using multiple AI providers (Anthropic Claude, OpenAI GPT-4, Google Gemini), consolidates them, and creates Linear issues for tracking

## Development Commands

### Running Tests

```bash
# Run integration tests for the multi-provider plan generation script
cd .github/scripts
bun test integration.test.ts

# Run simple end-to-end test
./.github/scripts/run-simple-e2e-test.sh

# Run full end-to-end test
./.github/scripts/run-e2e-test.sh

# Test CLI version detection
./.github/scripts/test-cli-version.sh
```

### Development Setup

The `.github/scripts` directory contains TypeScript code that requires Bun:

```bash
cd .github/scripts
bun install  # Install dependencies
bun run generate-and-create-linear.ts  # Run the main script
```

### Local CLI Usage

The shell script can be used for local testing:

```bash
./parallel-impl.sh "Your feature request here"
```

This creates git worktrees and runs Claude Code in parallel locally.

## Architecture

### Two-Tier Workflow System

The repository implements two complementary workflows:

#### 1. Multi-Provider Plan Generation

Two implementations are available:

**v1 - Single Job Approach (`.github/workflows/multi-provider-plan.yml`)**
- **Trigger**: Label `claude-plan` on GitHub issues or manual dispatch
- **Process**:
  1. Single OpenCode server instance starts with all 3 provider configurations (Anthropic, OpenAI, Google)
  2. Three sessions run in parallel, each generating a plan from a different AI provider
  3. Consolidation phase: Claude receives all three plans and creates Linear issues (parent + sub-issues) in the same session
- **Key Script**: `.github/scripts/generate-and-create-linear.ts`
- **Advantages**: No intermediate artifacts, everything in memory, single workflow job
- **Disadvantages**: Less visibility in GitHub UI, all providers fail if one has issues

**v2 - Parallel Jobs Approach (`.github/workflows/multi-provider-plan-v2.yml`)**
- **Trigger**: Label `claude-plan-v2` on GitHub issues or manual dispatch
- **Process**:
  1. Three separate concurrent GitHub Action jobs, each generating a plan from one provider
  2. Plans are passed as job outputs between jobs
  3. Consolidation job depends on all three, receives plans, and creates Linear issues
- **Key Scripts**:
  - `.github/scripts/generate-plan-single.ts` - Individual provider plan generation
  - `.github/scripts/consolidate-plans.ts` - Plan consolidation and Linear issue creation
- **Advantages**: Better visibility in GitHub UI, clear failure indication per provider, follows GitHub Actions patterns
- **Disadvantages**: Plans must be passed via job outputs (size limits), slightly more complex workflow YAML, fails if any single provider fails (fail-fast behavior)

#### 2. Parallel Implementation Workflow (`.github/workflows/reusable-implement-issue.yml`)
- **Trigger**: Label `claude-implement` on GitHub issues or manual dispatch
- **Process**:
  1. Matrix job generates N parallel implementations (default: 3)
  2. Each implementation runs in isolation with auto-detected runtime environment
  3. Review job evaluates all implementations
  4. Winner creates a draft PR
- **Uses**: Custom Claude Code agents from `.claude/agents/`

### Custom Agent System

Located in `.claude/agents/`, these agents are used by the implementation workflow:

- **coding-agent.md**: Implements a single feature from `features.json`, uses TDD approach with browser automation testing
- **codebase-locator.md**: Finds files and components related to a feature or task
- **codebase-analyzer.md**: Analyzes implementation details of specific components
- **debug-agent.md**: Four-phase debugging framework (root cause → pattern analysis → hypothesis testing → implementation)

### Prompt Templates

Stored in `.github/prompts/` for customization:

- **implementation.md**: Main implementation prompt with two-phase approach (planning → implementation)
  - Creates `plan.md` with task breakdown
  - Creates `features.json` with end-to-end test cases
  - Delegates to coding-agent subagents for execution
- **review.md**: Criteria for reviewing and selecting best implementation
- **plan-generation.md**: Template for AI providers to generate implementation plans
- **consolidate-and-create-linear.md**: Consolidates 3 plans and creates Linear issues
- **verify.md**: Verification criteria for completed implementations

### Runtime Detection

The `.github/actions/detect-runtime/action.yml` auto-detects:
- Runtime: js, python, go, rust, or unknown
- Package manager: bun, pnpm, yarn, npm, pip, poetry, go, cargo
- Build scripts and test availability

Supported languages: JavaScript/TypeScript, Python, Go, Rust (extensible for more)

### OpenCode SDK Integration

**v1 Workflow**: The single-job multi-provider workflow uses `@opencode-ai/sdk` to orchestrate multiple AI sessions in one process:

```typescript
import { createOpencode } from '@opencode-ai/sdk';

// Single server instance with multiple provider configs
const opencode = await createOpencode({
  providerConfigs: {
    anthropic: { apiKey, model },
    openai: { apiKey, model },
    google: { apiKey, model },
  },
  mcpServers: {
    linear: { /* Linear MCP config */ }
  }
});

// Parallel plan generation
const plans = await Promise.all([
  opencode.session({ provider: 'anthropic', prompt }),
  opencode.session({ provider: 'openai', prompt }),
  opencode.session({ provider: 'google', prompt }),
]);

// Consolidation with Linear issue creation
await opencode.session({
  provider: 'anthropic',
  prompt: consolidatePrompt,
  tools: ['mcp__linear-server__*']
});
```

Key characteristics (v1):
- All sessions share the same OpenCode server instance
- Parallel execution without intermediate files
- MCP tools (like Linear) available to consolidation session
- Uses Bun for native TypeScript execution

**v2 Workflow**: The parallel jobs approach uses separate OpenCode instances per provider:

```typescript
// Each provider job runs independently:
// generate-plan-single.ts anthropic "title" "body"
// generate-plan-single.ts openai "title" "body"
// generate-plan-single.ts google "title" "body"

// Then consolidation job receives all plans as env vars:
// consolidate-plans.ts
// - Reads ANTHROPIC_PLAN, OPENAI_PLAN, GOOGLE_PLAN from environment
// - Creates single OpenCode instance with Anthropic provider + Linear MCP
// - Consolidates plans and creates Linear issues
```

Key characteristics (v2):
- Each provider runs in a separate GitHub Actions job
- Plans passed via job outputs (environment variables)
- Better visibility: each provider job shows status independently
- Fail-fast: if any provider fails, the entire workflow stops
- Follows idiomatic GitHub Actions patterns (job dependencies)
- Clear error messages indicating which provider failed

### Environment Variables

Required secrets (set in GitHub or `.env` for local development):

**For Implementation Workflow:**
- `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`: Claude authentication
- `GH_PAT`: GitHub Personal Access Token with repo permissions

**For Multi-Provider Plan Workflow:**
- `CLAUDE_CODE_OAUTH_TOKEN`: Claude Code OAuth token
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_GENERATIVE_AI_API_KEY`: Google AI API key
- `LINEAR_API_KEY`: Linear Personal API key
- `LINEAR_TEAM_ID`: Linear team ID or name
- `LINEAR_PROJECT_ID`: (Optional) Linear project ID
- `GH_PAT`: GitHub Personal Access Token with issues: write

## Key Implementation Patterns

### Features.json Structure

The implementation workflow uses `features.json` as the single source of truth:

```json
[
  {
    "category": "functional",
    "description": "Brief description of what this test verifies",
    "plan_ref": "task 1 - Name of task from plan.md",
    "steps": [
      "Step 1: Navigate to relevant page",
      "Step 2: Perform action",
      "Step 3: Verify expected result"
    ],
    "passes": false
  }
]
```

**Critical Rules:**
- Only modify the `"passes"` field after verification
- Never remove, edit descriptions, modify steps, or reorder tests
- Mark as `"passes": true` only after browser automation verification with screenshots

### Two-Phase Implementation Approach

The implementation prompt enforces a strict two-phase process:

**Planning Phase:**
1. Spawn research tasks in parallel (codebase-locator, codebase-analyzer, general-purpose with deepwiki)
2. Analyze and verify understanding
3. Create `plan.md` with task breakdown and success criteria
4. Create `features.json` with N end-to-end test cases
5. Create empty `claude-progress.txt`

**Implementation Phase:**
1. Delegate to coding-agent subagents one at a time
2. Each agent implements ONE feature from features.json
3. Verify with browser automation (Playwright MCP in headless mode)
4. Update progress notes
5. Continue until all features pass

### Verification Requirements

All feature verification MUST use browser automation:
- Navigate using Playwright MCP
- Interact like a human (click, type, scroll)
- Take screenshots at each step
- Check for console errors
- Verify both functionality AND visual appearance

**Never:**
- Only test with curl commands
- Use JavaScript evaluation to bypass UI
- Skip visual verification
- Mark tests passing without thorough verification

## Customization

### Changing Number of Parallel Implementations

Edit the workflow call or `parallel-impl.sh`:

```yaml
# In workflow
with:
  num_implementations: 5  # Change from default of 3
```

```bash
# In shell script
NUM_IMPLEMENTATIONS=5  # Change from default of 3
```

### Customizing Prompts for Your Organization

1. Fork this repository
2. Edit files in `.github/prompts/` to match your coding standards
3. Reference your fork in your workflows:

```yaml
uses: your-org/claude-parallel/.github/workflows/reusable-implement-issue.yml@main
```

### Adding or Removing AI Providers

To customize the multi-provider plan workflow:

1. Edit `.github/scripts/generate-and-create-linear.ts`
2. Update the `PROVIDERS` array with your provider configurations
3. Update `.github/actions/setup-opencode/action.yml` for API key inputs
4. Update `.github/prompts/consolidate-and-create-linear.md` placeholders

### Adding Runtime Support

To add support for additional languages:

1. Edit `.github/actions/detect-runtime/action.yml`
2. Add detection logic for your language's manifest files
3. Set appropriate `runtime`, `package_manager`, `has_build`, `has_tests` outputs

## Common Workflows

### Adding a New Custom Agent

1. Create a new markdown file in `.claude/agents/`
2. Include frontmatter with `name` and `description`
3. Write the agent's system prompt
4. Reference in prompts using `@agent-{name}`

### Updating Review Criteria

Edit `.github/prompts/review.md` to adjust evaluation criteria:
- Code quality metrics
- Completeness checks
- Performance considerations
- Security requirements
- Test coverage expectations

### Local Testing of Scripts

```bash
cd .github/scripts

# Set environment variables (or use .env file)
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
export GOOGLE_GENERATIVE_AI_API_KEY="..."
export LINEAR_API_KEY="..."
export LINEAR_TEAM_ID="..."

# Run the script
bun run generate-and-create-linear.ts "Issue Title" "Issue Body"
```

## Troubleshooting

### "Required command not found" (Local Shell Script)

Install missing dependencies:
```bash
# Ubuntu/Debian
sudo apt install gh jq

# macOS
brew install gh jq
```

### "Linear API key is invalid"

1. Go to https://linear.app/settings/api
2. Create a new Personal API key
3. Add to GitHub Secrets as `LINEAR_API_KEY`

### "Team not found"

`LINEAR_TEAM_ID` should be either:
- Team's ID (e.g., `abc123...`)
- Team's key/name (e.g., `ENG` or `PRODUCT`)

Find in URL: `https://linear.app/{workspace}/{team-key}/...`

### Workflow doesn't trigger on label

Ensure:
- Label name is exactly `claude-implement` or `claude-plan` (case-sensitive)
- Workflow file is on your default branch
- Required secrets are configured


## Sessions Pattern (Optional)

If you've set up the Sessions Directory Pattern (`npx create-sessions-dir`):

- `/start-session` - Read context, fetch GitHub/Linear issues
- `/end-session` - Update context, detect merged PRs, auto-archive
- `/plan` - Create structured implementation plans
- `/document` - Topic-specific documentation with sub-agents
- `/change-git-strategy` - Change git strategy for .sessions/

Learn more: https://vieko.dev/sessions

## External Tools (Optional)

**For GitHub integration:**
```bash
gh auth login    # Required for PR/issue fetching
```

**For Linear integration:**
Configure the Linear MCP server in your Claude settings.
See: https://github.com/anthropics/claude-code/blob/main/docs/mcp.md

Commands will gracefully handle missing tools and prompt for manual input.
