#!/usr/bin/env node

import { install } from "./install.js";

const HELP_TEXT = `
swellai - Install Claude Parallel workflows into your repository

USAGE:
  npx swellai [OPTIONS]

OPTIONS:
  --help          Show this help message
  --yes           Skip confirmation prompts
  --force         Overwrite all files, including user-modified ones
  --dry-run       Show what would be changed without making any changes

DESCRIPTION:
  Installs Claude Parallel workflows, scripts, prompts, and agents into your
  repository. The installer copies files from templates and tracks them with
  a manifest to detect user modifications on subsequent runs.

INSTALLED FILES:
  .github/workflows/
    - claude-plan.yml          # Multi-provider plan generation workflow
    - claude-implement.yml     # Parallel implementation workflow

  .github/claude-parallel/scripts/
    - planning-agent.js        # Plan generation agent
    - linear-agent.js          # Linear integration agent
    - claude-agent-runner.js   # Implementation agent runner
    - detect-runtime.sh        # Runtime detection script

  .github/claude-parallel/prompts/
    - plan-generation.md
    - consolidate-and-create-linear.md
    - implementation.md
    - review.md
    - verify.md

  .claude/agents/
    - coding-agent.md          # Feature implementation agent
    - codebase-locator.md      # Code discovery agent
    - codebase-analyzer.md     # Code analysis agent
    - debug-agent.md           # Debugging agent

  .env.example                 # Example environment variables

EXAMPLES:
  # Install with confirmation prompts
  npx swellai

  # Install without prompts
  npx swellai --yes

  # Preview what would be installed
  npx swellai --dry-run

  # Force overwrite all files
  npx swellai --force

ENVIRONMENT VARIABLES:
  See .env.example after installation for required GitHub Actions secrets.

UPDATES:
  Re-running the installer will update files to the latest version while
  preserving your modifications. Use --force to overwrite everything.

DOCUMENTATION:
  https://github.com/mkrueger12/claude-parallel
`;

interface CLIArgs {
  help: boolean;
  yes: boolean;
  force: boolean;
  dryRun: boolean;
}

function parseArgs(args: string[]): CLIArgs {
  return {
    help: args.includes("--help") || args.includes("-h"),
    yes: args.includes("--yes") || args.includes("-y"),
    force: args.includes("--force") || args.includes("-f"),
    dryRun: args.includes("--dry-run"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  try {
    await install({
      force: args.force,
      dryRun: args.dryRun,
      yes: args.yes,
    });
  } catch (error) {
    console.error("\n❌ Installation failed:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error(`   ${String(error)}`);
    }
    process.exit(1);
  }
}

main();
