# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Claude Parallel is a workflow system that runs parallel Claude Code implementations using GitHub Actions. It supports two main workflows:

1. **Parallel Implementation Workflow**: Runs N parallel implementations of a feature request, reviews them, and creates a draft PR with the best implementation
2. **Multi-Provider Plan Generation**: Generates implementation plans using multiple AI providers (Anthropic Claude, OpenAI GPT-4, Google Gemini), consolidates them, and creates Linear issues for tracking

## Development Commands

### Running Tests

```bash
# Run simple end-to-end test
./.github/scripts/run-simple-e2e-test.sh

# Run full end-to-end test
./.github/scripts/run-e2e-test.sh

# Test CLI version detection
./.github/scripts/test-cli-version.sh
```

### Development Setup

The `src/` directory contains TypeScript code that requires Bun:

```bash
bun install  # Install dependencies at root
bun run build  # Compile TypeScript to dist/
bun run type-check  # Run TypeScript type checking

# Run agents directly
bun run src/agents/planning-agent.ts "Your feature request"
bun run src/agents/linear-agent.ts  # Requires environment variables
```

### TypeScript Package Structure

```
src/
├── agents/
│   ├── planning-agent.ts       # Plan generation from single AI provider
│   └── linear-agent.ts         # Plan consolidation + Linear issue creation
├── lib/
│   ├── types.ts                # Shared TypeScript interfaces
│   ├── utils.ts                # Shared utilities (extractTextFromParts, etc.)
│   └── opencode.ts             # OpenCode SDK helpers (server setup, event monitoring)
└── index.ts                    # Public API exports
```

### Local CLI Usage

The shell script can be used for local testing:

```bash
./parallel-impl.sh "Your feature request here"
```

This script creates git worktrees and uses the OpenCode SDK (@opencode-ai/sdk) to run AI implementations in parallel locally. The SDK provides better integration and features compared to direct CLI calls.

**Prerequisites:**
- **Bun runtime** - Required for SDK execution (`curl -fsSL https://bun.sh/install | bash` or `npm install -g bun`)
- **Authentication** - Set either `CLAUDE_CODE_OAUTH_TOKEN` (preferred) or `ANTHROPIC_API_KEY`

## Architecture

### Two-Tier Workflow System

The repository implements two complementary workflows:

#### 1. Multi-Provider Plan Generation (`.github/workflows/multi-provider-plan-v2.yml`)

**Trigger**: Label `claude-plan-v2` on GitHub issues or manual dispatch

**Process**:
1. Three separate concurrent GitHub Action jobs, each generating a plan from one provider
2. Plans are passed as job outputs between jobs
3. Consolidation job depends on all three, receives plans, and creates Linear issues

**Key Scripts**:
- `src/agents/planning-agent.ts` - Individual provider plan generation
- `src/agents/linear-agent.ts` - Plan consolidation and Linear issue creation

**Architecture**:
- Each provider runs in a separate GitHub Actions job
- Plans passed via job outputs (environment variables)
- Better visibility: each provider job shows status independently
- Fail-fast: if any provider fails, the entire workflow stops
- Follows idiomatic GitHub Actions patterns (job dependencies)
- Clear error messages indicating which provider failed

#### 2. Parallel Implementation Workflow (`.github/workflows/reusable-implement-issue.yml`)
- **Trigger**: Label `claude-implement` on GitHub issues or manual dispatch
- **Process**:
  1. Matrix job generates N parallel implementations (default: 3)
  2. Each implementation receives the Linear issue ID/URL and fetches details using Linear MCP
  3. Implementations run in isolation with auto-detected runtime environment
  4. Review job evaluates all implementations
  5. Winner creates a draft PR
- **Uses**: Custom Claude Code agents from `.claude/agents/` and Linear MCP server
- **Requirements**: `LINEAR_API_KEY` must be configured to enable Linear MCP integration

### Custom Agent System

Located in `.claude/agents/`, these agents are used by the implementation workflow:

- **coding-agent.md**: Implements a single feature from `features.json`, uses TDD approach with browser automation testing
- **codebase-locator.md**: Finds files and components related to a feature or task
- **codebase-analyzer.md**: Analyzes implementation details of specific components
- **debug-agent.md**: Four-phase debugging framework (root cause → pattern analysis → hypothesis testing → implementation)

### Prompt Templates

Stored in `prompts/` for customization:

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

The multi-provider workflow uses `@opencode-ai/sdk` with a modular TypeScript architecture:

**Planning Agent** (`src/agents/planning-agent.ts`):
```typescript
import { createOpencodeServer, setupEventMonitoring } from '../lib/opencode.js';
import { getApiKey, validateProvider } from '../lib/utils.js';

// Create OpenCode server for a single provider
const { client, server } = await createOpencodeServer({
  provider,
  apiKey,
  model,
  agentName: "planning-agent",
  agentDescription: "Generate a comprehensive implementation plan",
  agentPrompt: prompt,
  agentTools: {
    read: true,
    grep: true,
    webfetch: true,
  },
});

// Setup event monitoring
setupEventMonitoring(client);
```

**Linear Agent** (`src/agents/linear-agent.ts`):
```typescript
// Receives plans via environment variables:
// - ANTHROPIC_PLAN, OPENAI_PLAN, GOOGLE_PLAN
// Creates single OpenCode instance with Anthropic provider + Linear MCP
const { client, server } = await createOpencodeServer({
  provider: 'anthropic',
  apiKey,
  model,
  agentName: "linear-agent",
  agentDescription: "Consolidate plans and create Linear issues",
  agentPrompt: consolidatedPrompt,
  linearApiKey,  // Enables Linear MCP tools
});
```

**Shared Libraries** (`src/lib/`):
- `types.ts` - TypeScript interfaces (Part, Provider, ProviderConfig)
- `utils.ts` - Utilities (extractTextFromParts, validateEnvVars, getApiKey)
- `opencode.ts` - SDK helpers (createOpencodeServer, setupEventMonitoring)

Key characteristics:
- Each provider runs in a separate GitHub Actions job
- Plans passed via job outputs (environment variables)
- Better visibility: each provider job shows status independently
- Shared code reduces duplication
- Follows idiomatic GitHub Actions patterns (job dependencies)

### Environment Variables

Required secrets (set in GitHub or `.env` for local development):

**For Implementation Workflow:**
- `CLAUDE_CODE_OAUTH_TOKEN` (preferred) or `ANTHROPIC_API_KEY`: Claude authentication
  - `CLAUDE_CODE_OAUTH_TOKEN`: OAuth token from [claude.ai/settings](https://claude.ai/settings) (recommended for local runs)
  - `ANTHROPIC_API_KEY`: API key from [console.anthropic.com](https://console.anthropic.com) (fallback)
  - Both options are supported; the workflow uses whichever is available
- `LINEAR_API_KEY`: Linear Personal API key (enables Linear MCP for fetching issue details)
- `GH_PAT`: GitHub Personal Access Token with repo permissions

**For Multi-Provider Plan Workflow:**
- `CLAUDE_CODE_OAUTH_TOKEN`: Claude Code OAuth token (required for OpenCode SDK)
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
2. Edit files in `prompts/` to match your coding standards
3. Reference your fork in your workflows:

```yaml
uses: your-org/claude-parallel/.github/workflows/reusable-implement-issue.yml@main
```

### Adding or Removing AI Providers

To customize the multi-provider plan workflow:

1. Edit `src/lib/types.ts` to add new provider types
2. Update `DEFAULT_MODELS` and `API_KEY_ENV_VARS` constants
3. Update `.github/workflows/multi-provider-plan-v2.yml` to add new jobs
4. Update `prompts/consolidate-and-create-linear.md` placeholders

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

Edit `prompts/review.md` to adjust evaluation criteria:
- Code quality metrics
- Completeness checks
- Performance considerations
- Security requirements
- Test coverage expectations

### Local Testing of Scripts

All local scripts use the OpenCode SDK (@opencode-ai/sdk) for AI interactions. Make sure you have Bun installed.

```bash
# Set environment variables (or use .env file)
# For Claude authentication, use the preferred method:
export CLAUDE_CODE_OAUTH_TOKEN="..."  # Preferred for local runs
# OR
export ANTHROPIC_API_KEY="..."        # Fallback option

# For multi-provider planning, you'll also need:
export OPENAI_API_KEY="..."
export GOOGLE_GENERATIVE_AI_API_KEY="..."
export LINEAR_API_KEY="..."
export LINEAR_TEAM_ID="..."

# Test planning agent (uses OpenCode SDK)
PROVIDER=anthropic bun run src/agents/planning-agent.ts "Add user authentication"
PROVIDER=openai bun run src/agents/planning-agent.ts "Add user authentication"
PROVIDER=google bun run src/agents/planning-agent.ts "Add user authentication"

# Test linear agent (uses OpenCode SDK with Linear MCP)
export ANTHROPIC_PLAN="..."
export OPENAI_PLAN="..."
export GOOGLE_PLAN="..."
export GITHUB_ISSUE_URL="https://github.com/org/repo/issues/123"
export ISSUE_TITLE="Add user authentication"
bun run src/agents/linear-agent.ts

# Test local parallel implementation script
./parallel-impl.sh "Add user authentication"
```

## Troubleshooting

### "Required command not found" (Local Shell Script)

Install missing dependencies:
```bash
# Install Bun runtime (required for SDK)
curl -fsSL https://bun.sh/install | bash
# OR
npm install -g bun

# Ubuntu/Debian
sudo apt install gh jq

# macOS
brew install gh jq
```

### "Linear API key is invalid"

Both workflows require `LINEAR_API_KEY`:
1. Go to https://linear.app/settings/api
2. Create a new Personal API key
3. Add to GitHub Secrets as `LINEAR_API_KEY`

### "Team not found" (Multi-Provider Plan Workflow)

`LINEAR_TEAM_ID` should be either:
- Team's ID (e.g., `abc123...`)
- Team's key/name (e.g., `ENG` or `PRODUCT`)

Find in URL: `https://linear.app/{workspace}/{team-key}/...`

### "Could not fetch Linear issue" (Implementation Workflow)

If implementations fail to fetch Linear issue details:
1. Verify `LINEAR_API_KEY` is set in GitHub Secrets
2. Check that the Linear issue ID/URL is valid (e.g., `ENG-123` or full Linear URL)
3. Look for "LINEAR_API_KEY not found" warnings in workflow logs
4. The agent runner automatically configures Linear MCP using the API key

### Workflow doesn't trigger on label

Ensure:
- Label name is exactly `claude-implement` or `claude-plan-v2` (case-sensitive)
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

## External Tools

**For GitHub integration:**
```bash
gh auth login    # Required for PR/issue fetching
```

**For Linear integration:**
Both workflows require a `LINEAR_API_KEY` environment variable:

1. Go to https://linear.app/settings/api
2. Create a new Personal API key
3. Add to GitHub Secrets as `LINEAR_API_KEY` or set in `.env` for local development

The implementation workflow automatically configures Linear MCP using this API key, enabling Claude to fetch Linear issue details during execution.

The multi-provider plan workflow uses the API key with the OpenCode SDK's Linear MCP integration.
