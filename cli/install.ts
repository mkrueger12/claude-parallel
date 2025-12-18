#!/usr/bin/env node

/**
 * Claude Parallel CLI Installer
 *
 * This CLI tool installs the claude-parallel workflow system into a user's repository.
 * It copies workflow files, agents, and prompts, and sets up necessary configuration.
 *
 * Usage: npx install-claude-parallel [target-dir] [options]
 */

import { readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { InstallOptions, FeatureSelection, TemplateFile } from './types.js';
import { copyTemplates } from './copy-templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Display help message
 */
function showHelp(): void {
  const helpText = `
Claude Parallel CLI Installer

USAGE:
  npx install-claude-parallel [target-dir] [options]

ARGUMENTS:
  target-dir              Target directory for installation (default: current directory)

OPTIONS:
  --include-agents        Include custom Claude agents in .claude/agents/
  --force                 Overwrite existing files without prompting
  --dry-run              Show what would be done without writing files
  --skip-prompts         Skip interactive prompts and use defaults
  --help, -h             Display this help message
  --version, -v          Display package version

EXAMPLES:
  # Install in current directory with prompts
  npx install-claude-parallel

  # Install in specific directory
  npx install-claude-parallel ./my-project

  # Install with agents, no prompts
  npx install-claude-parallel --include-agents --skip-prompts

  # Dry run to see what would be installed
  npx install-claude-parallel --dry-run

DESCRIPTION:
  This tool installs the claude-parallel workflow system into your repository.
  It includes GitHub Actions workflows for parallel AI implementations and
  multi-provider plan generation.

  Features:
  - Multi-provider plan generation (Claude, GPT-4, Gemini)
  - Parallel implementation workflow
  - Custom Claude agents for coding, analysis, and debugging
  - Linear integration for issue tracking
  - Automated testing and verification

DOCUMENTATION:
  https://github.com/your-org/claude-parallel#readme
`;
  console.log(helpText);
}

/**
 * Get package version from package.json
 */
function getVersion(): string {
  try {
    const packageJsonPath = resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || '1.0.0';
  } catch (error) {
    console.error('Warning: Could not read package.json version');
    return '1.0.0';
  }
}

/**
 * Display version information
 */
function showVersion(): void {
  const version = getVersion();
  console.log(`claude-parallel v${version}`);
}

/**
 * Parse command line arguments
 */
function parseArguments(): InstallOptions {
  const args = process.argv.slice(2);
  const options: InstallOptions = {
    targetDir: process.cwd(),
    includeAgents: false,
    force: false,
    dryRun: false,
    skipPrompts: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;

      case '--version':
      case '-v':
        showVersion();
        process.exit(0);
        break;

      case '--include-agents':
        options.includeAgents = true;
        break;

      case '--force':
        options.force = true;
        break;

      case '--dry-run':
        options.dryRun = true;
        break;

      case '--skip-prompts':
        options.skipPrompts = true;
        break;

      default:
        // First positional argument is target directory
        if (!arg.startsWith('-') && options.targetDir === process.cwd()) {
          options.targetDir = resolve(process.cwd(), arg);
        } else if (arg.startsWith('-')) {
          console.error(`Error: Unknown option '${arg}'`);
          console.error('Run with --help for usage information');
          process.exit(1);
        }
        break;
    }
  }

  return options;
}

/**
 * Placeholder: Prompt user for feature selection
 * This will be implemented in a future task
 */
async function promptForFeatures(options: InstallOptions): Promise<FeatureSelection> {
  // TODO: Implement interactive prompts using inquirer or similar
  // For now, return defaults based on options
  return {
    planningWorkflow: true,
    implementWorkflow: true,
    agents: options.includeAgents,
  };
}


/**
 * Placeholder: Generate .env.example file
 * This will be implemented in a future task
 */
async function generateEnvFile(
  options: InstallOptions,
  features: FeatureSelection
): Promise<void> {
  // TODO: Implement .env.example generation based on selected features
  console.log('TODO: Generate .env.example');
}

/**
 * Main installation function
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 Claude Parallel Installer\n');

    // Parse command line arguments
    const options = parseArguments();

    // Display dry run notice
    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be written\n');
    }

    // Get feature selection (prompt or use defaults)
    let features: FeatureSelection;
    if (options.skipPrompts) {
      features = await promptForFeatures(options);
      console.log('Using default configuration (--skip-prompts)\n');
    } else {
      features = await promptForFeatures(options);
    }

    // Copy template files
    console.log('📋 Copying template files...');
    await copyTemplates(options.targetDir, features, options);

    // Generate environment file
    console.log('⚙️  Generating configuration files...');
    await generateEnvFile(options, features);

    // Success message
    if (!options.dryRun) {
      console.log('\n✅ Installation complete!\n');
      console.log('Next steps:');
      console.log('1. Review and configure .env.example');
      console.log('2. Add required secrets to GitHub repository settings');
      console.log('3. Read CLAUDE.md for usage instructions');
      console.log('4. Label a GitHub issue with "claude-implement" or "claude-plan-v2"\n');
    } else {
      console.log('\n✅ Dry run complete - no files were written\n');
    }

  } catch (error) {
    console.error('\n❌ Installation failed:');
    if (error instanceof Error) {
      console.error(error.message);
      if (process.env.DEBUG) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, parseArguments, getVersion };
