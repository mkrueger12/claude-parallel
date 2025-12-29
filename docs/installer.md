# Installer Documentation

The `swellai` installer is a CLI tool that copies Claude Parallel workflows, scripts, prompts, and agents into your repository. This guide covers installation, usage, and troubleshooting.

## Table of Contents

- [Quick Start](#quick-start)
- [What Gets Installed](#what-gets-installed)
- [CLI Flags](#cli-flags)
- [Directory Structure](#directory-structure)
- [Manifest File](#manifest-file)
- [Conflict Resolution](#conflict-resolution)
- [Common Scenarios](#common-scenarios)
- [Troubleshooting](#troubleshooting)

## Quick Start

Install claude-parallel into your repository:

```bash
cd your-repo
npx swellai
```

The installer will:
1. Show you what files will be installed
2. Ask for confirmation (unless `--yes` flag is used)
3. Create all required directories and files
4. Generate a manifest to track installed files

## What Gets Installed

The installer adds the following to your repository:

### GitHub Actions Workflows (2 files)
- `.github/workflows/claude-plan.yml` - Multi-provider plan generation workflow
- `.github/workflows/claude-implement.yml` - Parallel implementation workflow

### Scripts (4 files)
- `.github/claude-parallel/scripts/planning-agent.js` - Plan generation agent
- `.github/claude-parallel/scripts/linear-agent.js` - Linear issue creation agent
- `.github/claude-parallel/scripts/claude-agent-runner.js` - Claude agent execution runner
- `.github/claude-parallel/scripts/detect-runtime.sh` - Runtime detection script

### Prompts (5 files)
- `.github/claude-parallel/prompts/plan-generation.md` - Plan generation prompt
- `.github/claude-parallel/prompts/consolidate-and-create-linear.md` - Plan consolidation prompt
- `.github/claude-parallel/prompts/implementation.md` - Implementation prompt
- `.github/claude-parallel/prompts/review.md` - Review prompt
- `.github/claude-parallel/prompts/verify.md` - Verification prompt

### Claude Code Agents (4 files)
- `.claude/agents/coding-agent.md` - Feature implementation agent
- `.claude/agents/codebase-locator.md` - Codebase search agent
- `.claude/agents/codebase-analyzer.md` - Codebase analysis agent
- `.claude/agents/debug-agent.md` - Debugging agent

### Configuration (1 file)
- `.env.example` - Example environment variables

### Manifest (1 file)
- `.github/claude-parallel/.install-manifest.json` - Installation tracking

**Total:** 17 files

## CLI Flags

### `--help`

Shows usage information and available flags.

```bash
npx swellai --help
```

### `--yes`

Skips confirmation prompts and installs immediately.

```bash
npx swellai --yes
```

**Use case:** Automated scripts, CI/CD pipelines, when you're confident about the installation.

### `--dry-run`

Previews what would be installed without making any changes.

```bash
npx swellai --dry-run
```

**Output:**
- Lists all files that would be created
- Shows which files already exist
- Shows which files have been modified by the user
- Does NOT create or modify any files

**Use case:** Check what will change before running the actual installation.

### `--force`

Overwrites all files, including user-modified ones.

```bash
npx swellai --force
```

**Warning:** This will overwrite your customizations. Use with caution.

**Use case:**
- Reset to default templates
- Force update to latest version
- Fix corrupted files

## Directory Structure

After installation, your repository will have this structure:

```
your-repo/
├── .github/
│   ├── workflows/
│   │   ├── claude-plan.yml
│   │   └── claude-implement.yml
│   └── claude-parallel/
│       ├── scripts/
│       │   ├── planning-agent.js
│       │   ├── linear-agent.js
│       │   ├── claude-agent-runner.js
│       │   └── detect-runtime.sh
│       ├── prompts/
│       │   ├── plan-generation.md
│       │   ├── consolidate-and-create-linear.md
│       │   ├── implementation.md
│       │   ├── review.md
│       │   └── verify.md
│       └── .install-manifest.json
├── .claude/
│   └── agents/
│       ├── coding-agent.md
│       ├── codebase-locator.md
│       ├── codebase-analyzer.md
│       └── debug-agent.md
└── .env.example
```

## Manifest File

The manifest file (`.github/claude-parallel/.install-manifest.json`) tracks installed files using SHA256 hashes. This allows the installer to:

1. Detect user modifications
2. Preserve customizations on re-runs
3. Support safe updates

### Manifest Structure

```json
{
  "version": "1.0.0",
  "installedAt": "2025-12-20T00:00:00.000Z",
  "files": {
    ".github/workflows/claude-plan.yml": "sha256:abc123...",
    ".github/workflows/claude-implement.yml": "sha256:def456...",
    ".github/claude-parallel/scripts/planning-agent.js": "sha256:ghi789...",
    ...
  }
}
```

### How Hashing Works

1. When a file is installed, its SHA256 hash is calculated and stored in the manifest
2. On re-run, the installer calculates the hash of the existing file
3. If hashes match: file is unchanged, can be safely updated
4. If hashes differ: file was modified by user, skip update (unless `--force`)

## Conflict Resolution

The installer uses smart conflict resolution to protect your customizations.

### Scenario 1: First Installation

**Action:** All files are installed, manifest is created.

```bash
npx swellai --yes
```

**Result:**
- 17 files created
- Manifest tracks all files

### Scenario 2: Re-run Without Changes

**Action:** All files are updated to latest version.

```bash
npx swellai --yes
```

**Result:**
- Files with matching hashes: updated
- Manifest updated with new hashes

### Scenario 3: User Modified Files

You customized `.github/claude-parallel/prompts/implementation.md` to match your coding standards.

**Action:** Installer detects modification and skips that file.

```bash
npx swellai --yes
```

**Output:**
```
Installing claude-parallel...

✓ .github/workflows/claude-plan.yml
✓ .github/workflows/claude-implement.yml
⊘ .github/claude-parallel/prompts/implementation.md (modified by user, skipping)
✓ .github/claude-parallel/prompts/review.md
...

15/17 files installed (2 skipped due to user modifications)
```

**Result:**
- Modified file is preserved
- Other files are updated
- Manifest updated

### Scenario 4: Force Overwrite

**Action:** Overwrite everything, including customizations.

```bash
npx swellai --force
```

**Warning:** This will erase your customizations.

**Result:**
- All 17 files overwritten
- Manifest updated with new hashes

## Common Scenarios

### Installing for the First Time

```bash
cd your-repo
npx swellai
```

Follow the prompts to confirm installation.

### Previewing Changes Before Installing

```bash
npx swellai --dry-run
```

Review the output, then run without `--dry-run` to install.

### Updating to Latest Version

```bash
npx swellai --yes
```

Your customizations will be preserved automatically.

### Resetting to Defaults

```bash
npx swellai --force --yes
```

This will overwrite all files, including your customizations.

### Automated Installation (CI/CD)

```bash
npx swellai --yes
```

Use `--yes` to skip prompts in automated environments.

## Troubleshooting

### "Not in a git repository"

**Cause:** The installer must be run from within a git repository.

**Solution:**
```bash
cd your-repo
git status  # Verify you're in a git repo
npx swellai
```

### "Permission denied"

**Cause:** Insufficient file system permissions.

**Solution:**
- Check directory permissions
- Run with appropriate user permissions
- Check if files are read-only

### "ENOENT: no such file or directory"

**Cause:** Parent directory doesn't exist or insufficient permissions.

**Solution:**
- Ensure you're in the correct directory
- Check that you have write permissions
- Try running with `--dry-run` first to diagnose

### Files Not Being Updated

**Cause:** Files were modified by user and installer is preserving them.

**Solutions:**

1. **Check what's being skipped:**
   ```bash
   npx swellai --dry-run
   ```

2. **Force update specific files:**
   - Delete the files you want to reset
   - Re-run installer

3. **Force update everything:**
   ```bash
   npx swellai --force
   ```

### Manifest Corruption

**Cause:** Manifest file is invalid JSON or corrupted.

**Solution:**
1. Delete `.github/claude-parallel/.install-manifest.json`
2. Re-run installer
3. Installer will create a fresh manifest

### Want to Customize After Installation

**Recommended workflow:**

1. Install first:
   ```bash
   npx swellai --yes
   ```

2. Customize files (e.g., edit prompts, modify workflows)

3. Future updates will preserve your customizations:
   ```bash
   npx swellai --yes
   ```

4. To reset a specific file to default:
   ```bash
   rm .github/claude-parallel/prompts/implementation.md
   npx swellai --yes
   ```

### Uninstalling

There's no automatic uninstall command. To remove claude-parallel:

```bash
# Remove workflows
rm .github/workflows/claude-plan.yml
rm .github/workflows/claude-implement.yml

# Remove scripts, prompts, and manifest
rm -rf .github/claude-parallel/

# Remove agents
rm -rf .claude/agents/

# Remove environment example
rm .env.example
```

**Note:** Be careful if you have other files in `.claude/agents/` that you want to keep.

## Next Steps

After installation:

1. **Configure secrets** in your GitHub repository:
   - `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`
   - `OPENAI_API_KEY` (for multi-provider planning)
   - `GOOGLE_GENERATIVE_AI_API_KEY` (for multi-provider planning)
   - `LINEAR_API_KEY`
   - `LINEAR_TEAM_ID`
   - `GH_PAT`

2. **Customize prompts** in `.github/claude-parallel/prompts/` to match your coding standards

3. **Test workflows**:
   - Create a test GitHub issue
   - Add the `claude-plan` or `claude-implement` label
   - Verify the workflow triggers successfully

4. **Review the main README** for detailed workflow documentation

## Support

For issues, questions, or contributions:

- GitHub Issues: https://github.com/mkrueger12/claude-parallel/issues
- Main README: https://github.com/mkrueger12/claude-parallel#readme
- CLAUDE.md: Development guide for contributors
