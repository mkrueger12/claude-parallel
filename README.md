# Claude Parallel Implementation Workflow

A reusable GitHub Actions workflow that runs parallel Claude Code implementations, automatically reviews them, and creates a draft PR with the best implementation.

## How It Works

1. **Triggered by Linear issues** or manual dispatch
2. **Runs N parallel implementations** (default: 3) using GitHub Actions matrix
3. **Auto-detects runtime** (Node.js, Python, Go, Rust, etc.) and sets up the environment
4. **Reviews all implementations** with Claude Code
5. **Automatically selects the best** based on code quality and completeness
6. **Creates a draft PR** for the winning implementation

## Quick Start (GitHub Actions)

Add this workflow to your repository:

```yaml
# .github/workflows/claude-implement.yml
name: Claude Implement Issue

on:
  issues:
    types: [labeled]
  workflow_dispatch:
    inputs:
      issue_number:
        description: 'Issue number to implement'
        required: true
        type: number

jobs:
  implement:
    if: github.event.label.name == 'claude-implement' || github.event_name == 'workflow_dispatch'
    uses: mkrueger12/claude-parallel/.github/workflows/reusable-implement-issue.yml@main
    with:
      issue_number: ${{ github.event.inputs.issue_number }}
      event_name: ${{ github.event_name }}
      event_issue_number: ${{ github.event.issue.number }}
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      GH_PAT: ${{ secrets.GH_PAT }}
```

### Required Secrets

| Secret | Description |
|--------|-------------|
| `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` | Claude authentication. Use either your Anthropic API key or Claude Code OAuth token (both work, choose one) |
| `GH_PAT` | GitHub Personal Access Token with repo permissions |

**Note:** For the implementation workflow, both `ANTHROPIC_API_KEY` and `CLAUDE_CODE_OAUTH_TOKEN` are supported. The workflow will use whichever is available.

### Workflow Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `num_implementations` | `3` | Number of parallel implementations |
| `claude_model` | `claude-opus-4-5-20251101` | Claude model to use |
| `prompts_repo` | `mkrueger12/claude-parallel` | Repository containing prompts |
| `prompts_ref` | `main` | Git ref for prompts repository |
| `bot_name` | `Claude Parallel Bot` | Git author name for commits |
| `bot_email` | `bot@claude-parallel.dev` | Git author email |
| `dry_run` | `false` | Skip Claude, use mock responses |

### Usage

1. **Via Label**: Add the `claude-implement` label to any issue
2. **Via Manual Trigger**: Go to Actions → Claude Implement Issue → Run workflow

---

## Multi-Provider Plan Generation

A GitHub Actions workflow that generates implementation plans using multiple AI providers (Anthropic Claude, Google Gemini, OpenAI GPT-4) and creates Linear issues for tracking.

### How It Works

1. **Triggered by issue label** (`claude-plan`) or manual dispatch
2. **Single workflow job** runs a unified script that:
   - Generates 3 plans in parallel using Anthropic Claude, OpenAI GPT-4, and Google Gemini
   - Consolidates plans into a unified implementation strategy
   - Creates Linear issues (parent + sub-issues) in the same session
3. **Posts summary comment** on the GitHub issue with links to Linear

The entire process runs in one execution - no intermediate file artifacts or job dependencies.

### Quick Start

Add this workflow to your repository:

```yaml
# .github/workflows/multi-provider-plan.yml
name: Multi-Provider Plan Generation

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
        default: 'claude-opus-4-5-20251101'
      openai_model:
        description: 'OpenAI model to use'
        required: false
        type: string
        default: 'gpt-5.2'
      google_model:
        description: 'Google model to use'
        required: false
        type: string
        default: 'gemini-3-pro-preview'

jobs:
  plan:
    if: github.event.label.name == 'claude-plan' || github.event_name == 'workflow_dispatch'
    uses: mkrueger12/claude-parallel/.github/workflows/multi-provider-plan.yml@main
    with:
      issue_number: ${{ github.event.inputs.issue_number }}
      event_name: ${{ github.event_name }}
      event_issue_number: ${{ github.event.issue.number }}
      linear_project_id: ${{ github.event.inputs.linear_project_id }}
      anthropic_model: ${{ github.event.inputs.anthropic_model || 'claude-opus-4-5-20251101' }}
      openai_model: ${{ github.event.inputs.openai_model || 'gpt-5.2' }}
      google_model: ${{ github.event.inputs.google_model || 'gemini-3-pro-preview' }}
    secrets:
      CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      GOOGLE_GENERATIVE_AI_API_KEY: ${{ secrets.GOOGLE_GENERATIVE_AI_API_KEY }}
      LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
      LINEAR_TEAM_ID: ${{ secrets.LINEAR_TEAM_ID }}
      LINEAR_PROJECT_ID: ${{ secrets.LINEAR_PROJECT_ID }}
      GH_PAT: ${{ secrets.GH_PAT }}
```

### Required Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `CLAUDE_CODE_OAUTH_TOKEN` | Yes | Claude Code OAuth token for Claude authentication |
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Google AI API key for Gemini |
| `LINEAR_API_KEY` | Yes | Linear Personal API key ([get yours here](https://linear.app/settings/api)) |
| `LINEAR_TEAM_ID` | Yes | Linear team ID or name for issue creation |
| `LINEAR_PROJECT_ID` | No | Linear project to add issues to (optional) |
| `GH_PAT` | Yes | GitHub Personal Access Token with `issues: write` permission |

### Workflow Inputs

For manual workflow dispatch (`workflow_dispatch`), you can customize the following:

| Input | Default | Description |
|-------|---------|-------------|
| `issue_number` | (required) | GitHub issue number to generate plan for |
| `linear_project_id` | (none) | Linear project ID to add issues to |
| `anthropic_model` | `claude-opus-4-5-20251101` | Anthropic model to use for plan generation |
| `openai_model` | `gpt-5.2` | OpenAI model to use for plan generation |
| `google_model` | `gemini-3-pro-preview` | Google model to use for plan generation |

### Usage

#### Via Label (Automatic)

1. Create or open a GitHub issue describing the feature or task
2. Add the `claude-plan` label to the issue
3. The workflow automatically triggers and generates plans
4. Wait for the workflow to complete (usually 2-5 minutes)
5. Check the issue comments for a summary with Linear issue links

#### Via Manual Dispatch

1. Go to **Actions** → **Multi-Provider Plan Generation** → **Run workflow**
2. Enter the issue number
3. (Optional) Override model selections
4. (Optional) Specify a Linear project ID
5. Click **Run workflow**
6. Monitor the workflow in the Actions tab

#### Finding Generated Linear Issues

After the workflow completes:
- A comment will be posted on the GitHub issue with links to:
  - **Parent Linear issue**: Contains the consolidated implementation plan
  - **Sub-issues**: One for each implementation step
- Open Linear and navigate to your team to see the issues
- Sub-issues are linked to the parent issue (visible in Linear's issue hierarchy)

### How It Works (Technical Details)

The workflow uses a streamlined single-script approach:

1. **Plan Generation Phase**: A single OpenCode server instance starts with all 3 provider configurations (Anthropic, OpenAI, Google) plus Linear MCP access
2. **Parallel Generation**: Three sessions run in parallel, each generating an implementation plan from a different AI provider
3. **Consolidation Phase**: Once all plans are generated (in memory, no files), a new session starts with Claude that:
   - Receives all three plans as context
   - Analyzes and consolidates them into a unified strategy
   - Uses Linear MCP tools to create parent issue + sub-issues
   - All in the same AI session for maximum context retention

**Key Benefits:**
- No intermediate file artifacts needed
- Single workflow job (faster, simpler)
- AI has full context when creating Linear issues
- Fewer moving parts = easier to maintain

### Customization

#### Customizing Prompts

Prompts are stored in `prompts/` for easy customization:

**Plan Generation Prompt** (`prompts/plan-generation.md`):
```markdown
You are a senior software engineer creating an implementation plan.

Issue: {{ISSUE_TITLE}}
Description: {{ISSUE_BODY}}

Create a detailed plan with:
- Overview of the approach
- Step-by-step implementation tasks
- Potential risks and mitigations
- Required dependencies
```

**Consolidation Prompt** (`prompts/consolidate-and-create-linear.md`):
```markdown
Analyze these 3 implementation plans:

Anthropic Claude: {{ANTHROPIC_PLAN}}
OpenAI GPT-4: {{OPENAI_PLAN}}
Google Gemini: {{GOOGLE_PLAN}}

Consolidate into a unified strategy, then create Linear issues using the
mcp__linear-server__create_issue tool.
```

Available placeholders:
- `{{ISSUE_TITLE}}` - GitHub issue title
- `{{ISSUE_BODY}}` - GitHub issue description
- `{{ANTHROPIC_PLAN}}` - Plan from Claude
- `{{OPENAI_PLAN}}` - Plan from GPT-4
- `{{GOOGLE_PLAN}}` - Plan from Gemini
- `{{LINEAR_TEAM_ID}}` - Your Linear team ID
- `{{LINEAR_PROJECT_ID}}` - Linear project ID (if specified)
- `{{GITHUB_ISSUE_URL}}` - Link to the original GitHub issue

#### Changing Default Models

You can change the default models used for plan generation:

1. **Via workflow inputs** (manual dispatch):
   - Use the workflow dispatch UI to select different models each time

2. **Via workflow file** (for your organization):
   - Fork this repository
   - Edit `.github/workflows/multi-provider-plan.yml`
   - Update the `default` values under `workflow_dispatch.inputs`
   - Reference your fork in your workflows

Example model options:
- **Anthropic**: `claude-opus-4-5-20251101` (default), `claude-sonnet-4-20250514`, `claude-3-5-sonnet-20241022`
- **OpenAI**: `gpt-5.2` (default), `gpt-4-turbo`, `gpt-4`
- **Google**: `gemini-3-pro` (default), `gemini-1.5-pro`, `gemini-1.5-flash`

#### Adding or Removing Providers

To customize which AI providers are used:

1. Fork this repository
2. Edit `.github/scripts/generate-and-create-linear.ts`:
   - Update the `PROVIDERS` array to add/remove provider configurations
   - Adjust the provider configurations in the `createOpencode()` call
   - Update the consolidation prompt to reference the correct number of plans
3. Update `.github/actions/setup-opencode/action.yml`:
   - Add/remove API key inputs and environment variables
4. Update `prompts/consolidate-and-create-linear.md`:
   - Adjust placeholders to match your providers
5. Update your workflow secrets accordingly

### Troubleshooting

#### "Linear API key is invalid"

Ensure your `LINEAR_API_KEY` secret is set correctly:
1. Go to [Linear Settings → API](https://linear.app/settings/api)
2. Create a new Personal API key
3. Add it to GitHub Secrets as `LINEAR_API_KEY`

#### "Team not found"

Your `LINEAR_TEAM_ID` should be either:
- The team's ID (e.g., `abc123...`)
- The team's key/name (e.g., `ENG` or `PRODUCT`)

Find your team ID in Linear:
1. Go to your team in Linear
2. Check the URL: `https://linear.app/{workspace}/{team-key}/...`
3. Use the `{team-key}` as your `LINEAR_TEAM_ID`

#### Workflow doesn't trigger on label

Make sure:
1. The label name is exactly `claude-plan` (case-sensitive)
2. The workflow file is on your default branch (usually `main`)
3. You have the required secrets configured

#### Plans are similar or identical

This can happen if:
- The issue description is very specific, leaving little room for interpretation
- Models have been trained on similar data
- The prompts are too prescriptive

To get more diverse plans:
- Edit `prompts/plan-generation.md` to encourage creative approaches
- Ask providers to focus on different aspects (e.g., performance vs. simplicity)

---

## Local CLI Usage (Alternative)

You can also run implementations locally using the shell script.

### Prerequisites for Local CLI

The local `parallel-impl.sh` script now uses the OpenCode SDK (@opencode-ai/sdk) for AI interactions. You need:

**Required:**
- **Git** - Version control
- **Bun runtime** - The SDK and script execution requires Bun (`curl -fsSL https://bun.sh/install | bash` or `npm install -g bun`)
- **GitHub CLI (gh)** - For creating PRs (`brew install gh` or `sudo apt install gh`)
- **jq** - JSON parsing utility (`brew install jq` or `sudo apt install jq`)

**Authentication** - Set one of the following environment variables:
- **`CLAUDE_CODE_OAUTH_TOKEN`** (recommended) - OAuth token for Claude Code. Get yours from [claude.ai/settings](https://claude.ai/settings)
- **`ANTHROPIC_API_KEY`** (fallback) - Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

**Note:** The script uses the OpenCode SDK under the hood to execute AI queries, which provides better integration and features compared to direct CLI calls.

### Installation

```bash
# Option 1: Add to PATH
export PATH="$PATH:/path/to/claude-parallel"

# Option 2: Create alias
alias parallel-impl="/path/to/claude-parallel/parallel-impl.sh"
```

### Basic Usage

```bash
./parallel-impl.sh "Add user authentication with JWT tokens"
```

### From Any Git Repository

```bash
cd ~/my-project
/path/to/claude-parallel/parallel-impl.sh "Implement dark mode toggle"
```

### What Happens

The script will:
1. Create 3 worktrees in `../parallel-impls/impl-{1,2,3}`
2. Run Claude Code in each (this may take several minutes)
3. Review all implementations and select the best
4. Create a draft PR from the winning branch
5. Clean up losing worktrees

## Customizing Prompts

Prompts are stored in `prompts/` directory for easy editing:

### Implementation Prompt
Edit `prompts/implementation.md` to customize how Claude implements features:

```txt
Implement the following feature request:

{{FEATURE_REQUEST}}

Requirements:
- Write clean, maintainable code following project conventions
- Ensure complete implementation of all requested functionality
...
```

The `{{FEATURE_REQUEST}}` placeholder will be replaced with your actual request.

### Review Prompt
Edit `prompts/review.md` to customize review criteria:

```txt
You are reviewing {{NUM_IMPLEMENTATIONS}} parallel implementations...

Your task:
1. Review each implementation by examining the git diff
2. Evaluate based on these criteria:
   - Code quality: ...
   - Completeness: ...
```

Available placeholders:
- `{{FEATURE_REQUEST}}` - Your feature request
- `{{NUM_IMPLEMENTATIONS}}` - Number of parallel implementations (default: 3)
- `{{WORKTREES_DIR}}` - Path to worktrees directory

## Configuration

### Change Number of Implementations

Edit `parallel-impl.sh` and modify:

```bash
NUM_IMPLEMENTATIONS=3  # Change to 2, 4, 5, etc.
```

### Customize Worktree Location

Edit `parallel-impl.sh` and modify:

```bash
WORKTREES_DIR="../parallel-impls"  # Change to your preferred location
```

### Review Criteria

Edit `prompts/review.md` to adjust what Claude looks for when selecting the best implementation. Current criteria:
- Code quality (clean, maintainable, follows conventions)
- Completeness (fully implements the feature)

You can add more criteria like:
- Performance
- Test coverage
- Security
- Documentation

## Output

### During Execution

```
=== Claude Code Parallel Implementation ===
Feature Request: Add user authentication with JWT tokens
Creating 3 parallel implementations...

Step 1: Creating git worktrees
✓ Worktrees created

Step 2: Running Claude Code in parallel
This may take several minutes...
  → Implementation 1 starting...
  → Implementation 2 starting...
  → Implementation 3 starting...
  ✓ Implementation 1 complete
  ✓ Implementation 2 complete
  ✓ Implementation 3 complete

Step 3: Reviewing implementations
✓ Review complete

=== Review Results ===
Winner: Implementation 2
Quality Score: 92
Completeness Score: 88

Reasoning:
Implementation 2 provides the most robust solution...

Step 4: Creating draft PR
✓ Draft PR created
https://github.com/user/repo/pull/123

Step 5: Cleanup
✓ Cleanup complete

=== Done! ===
Winning implementation: impl-1234567890-2
Worktree location: ../parallel-impls/impl-2
```

### Files Created

- `../parallel-impls/impl-{1,2,3}/` - Worktree directories
- `../parallel-impls/impl-X/result.json` - Claude output for each implementation
- `review-result.json` - Review decision and reasoning
- Draft PR on GitHub

## Troubleshooting

### "Not in a git repository"

Run the script from within a git repository:

```bash
cd ~/my-project
/path/to/parallel-impl.sh "feature request"
```

### "Required command not found"

Install missing dependencies:

```bash
# Install GitHub CLI
sudo apt install gh  # or: brew install gh

# Install jq
sudo apt install jq  # or: brew install jq
```

### Claude Code fails

Check error logs in each worktree:

```bash
cat ../parallel-impls/impl-1/error.log
cat ../parallel-impls/impl-2/error.log
cat ../parallel-impls/impl-3/error.log
```

### Review parsing fails

The review output should be pure JSON. If Claude returns markdown or text, edit `prompts/review.md` to emphasize:

```txt
You MUST respond with ONLY valid JSON (no markdown, no code blocks)
```

### PR creation fails

You may need to push first or set up GitHub CLI:

```bash
gh auth login
```

Or create the PR manually:

```bash
git checkout impl-TIMESTAMP-X
git push -u origin HEAD
gh pr create --draft
```

## Advanced Usage

### Customizing for Your Organization

Fork this repository and customize:

1. **Prompts**: Edit files in `prompts/` to match your coding standards
2. **Review criteria**: Modify `prompts/review.md` for your quality metrics
3. **Runtime detection**: Add support for additional languages in `.github/actions/detect-runtime/`

Then reference your fork:

```yaml
uses: your-org/claude-parallel/.github/workflows/reusable-implement-issue.yml@main
```

### Custom Review Logic

For more sophisticated review (e.g., running tests, performance benchmarks), modify the review section in `parallel-impl.sh` or create a custom review script.

### Keeping All Implementations

Comment out the cleanup section in `parallel-impl.sh` to keep all worktrees for manual inspection:

```bash
# Cleanup non-winning worktrees
# echo -e "${BLUE}Step 5: Cleanup${NC}"
# for i in $(seq 1 $NUM_IMPLEMENTATIONS); do
#   ...
```

## Cost Considerations

Running 3 parallel Claude Code instances will use 3x tokens. For a typical feature:
- Simple feature: ~30k tokens per implementation = ~90k total
- Complex feature: ~100k tokens per implementation = ~300k total
- Review: ~50k tokens

Monitor your usage and adjust `NUM_IMPLEMENTATIONS` accordingly.

## Examples

### Add a new feature

```bash
./parallel-impl.sh "Add rate limiting middleware to API endpoints"
```

### Fix a bug

```bash
./parallel-impl.sh "Fix memory leak in WebSocket connection handler"
```

### Refactor code

```bash
./parallel-impl.sh "Refactor authentication logic to use OAuth 2.0"
```

### Add tests

```bash
./parallel-impl.sh "Add comprehensive unit tests for user service"
```

## Features

- **Multi-language support**: Auto-detects Node.js, Python, Go, Rust, Java, Ruby, PHP, and more
- **Parallel execution**: Runs implementations concurrently using GitHub Actions matrix
- **Automatic review**: Claude evaluates all implementations and picks the best
- **Draft PRs**: Creates ready-to-review pull requests
- **Customizable prompts**: Tailor implementation and review criteria to your needs
- **Reusable workflow**: Use in any repository with minimal setup

## Credits

Inspired by production workflows from:
- [incident.io's git worktree + Claude Code workflow](https://incident.io/blog)
- [Crystal desktop app](https://github.com/stravu/crystal)

## License

MIT
