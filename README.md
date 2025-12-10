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
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `GH_PAT` | GitHub Personal Access Token with repo permissions |

Alternatively, use `CLAUDE_CODE_OAUTH_TOKEN` instead of `ANTHROPIC_API_KEY`.

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

## Local CLI Usage (Alternative)

You can also run implementations locally using the shell script.

### Prerequisites

- `git` - Version control
- `claude` - Claude Code CLI (headless mode support)
- `gh` - GitHub CLI (for creating PRs)
- `jq` - JSON parsing

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
