import { checkbox, confirm } from '@inquirer/prompts';
import type { FeatureSelection } from './types.js';

/**
 * Default feature selection (used in non-interactive mode)
 */
export function getDefaultFeatures(includeAgents: boolean = false): FeatureSelection {
  return {
    planningWorkflow: true,
    implementWorkflow: true,
    agents: includeAgents,
  };
}

/**
 * Prompt user for feature selection
 */
export async function promptForFeatures(includeAgents: boolean = false): Promise<FeatureSelection> {
  // Check if running in non-interactive mode
  if (!process.stdin.isTTY) {
    console.log('Non-interactive mode detected, using defaults...');
    return getDefaultFeatures(includeAgents);
  }

  const features = await checkbox({
    message: 'Select features to install:',
    choices: [
      {
        name: 'Multi-provider planning workflow (claude-plan.yml)',
        value: 'planning',
        checked: true
      },
      {
        name: 'Parallel implementation workflow (claude-implement.yml)',
        value: 'implement',
        checked: true
      },
      {
        name: 'Custom Claude agents (.claude/agents/)',
        value: 'agents',
        checked: includeAgents
      },
    ],
  });

  return {
    planningWorkflow: features.includes('planning'),
    implementWorkflow: features.includes('implement'),
    agents: features.includes('agents'),
  };
}

/**
 * Confirm before overwriting existing files
 */
export async function confirmOverwrite(existingFiles: string[]): Promise<boolean> {
  if (!process.stdin.isTTY) {
    console.log('Non-interactive mode: skipping overwrite confirmation');
    return false;
  }

  if (existingFiles.length === 0) {
    return true;
  }

  console.log('\nThe following files already exist:');
  existingFiles.slice(0, 5).forEach(f => console.log(`  - ${f}`));
  if (existingFiles.length > 5) {
    console.log(`  ... and ${existingFiles.length - 5} more`);
  }

  return confirm({
    message: 'Overwrite existing files?',
    default: false,
  });
}
