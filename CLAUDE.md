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


## Sessions Pattern

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

- You the available LSP server to check for type errors and warnings. 
- Prefer ast-grep over grep for code search and understanding
- No emojies