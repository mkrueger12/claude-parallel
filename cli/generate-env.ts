import fs from 'fs-extra';
import path from 'path';
import type { FeatureSelection, InstallOptions } from './types.js';

/**
 * Generate .env.example content based on selected features
 */
export function generateEnvExample(features: FeatureSelection): string {
  let content = `# Claude Parallel Configuration
# Copy this file to .env and fill in your values
# See: https://github.com/mkrueger12/claude-parallel for documentation

# =============================================================================
# REQUIRED - GitHub Personal Access Token
# =============================================================================
# Required for all workflows
# Create at: https://github.com/settings/tokens
# Scopes needed: repo, workflow
GH_PAT=your_github_personal_access_token

# =============================================================================
# REQUIRED - Claude Authentication (provide at least one)
# =============================================================================
# Option 1: OAuth Token (recommended)
# Get from: https://claude.ai/settings
CLAUDE_CODE_OAUTH_TOKEN=your_oauth_token

# Option 2: API Key (alternative)
# Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=your_anthropic_api_key
`;

  if (features.planningWorkflow) {
    content += `
# =============================================================================
# OPTIONAL - Multi-Provider Planning (adds more AI perspectives)
# =============================================================================
# OpenAI API Key
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key

# Google AI API Key
# Get from: https://aistudio.google.com/app/apikey
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key

# =============================================================================
# OPTIONAL - Linear Integration (for issue tracking)
# =============================================================================
# Linear Personal API Key
# Get from: https://linear.app/settings/api
LINEAR_API_KEY=your_linear_api_key

# Linear Team ID (found in team URL)
LINEAR_TEAM_ID=your_team_id

# Linear Project ID (optional)
LINEAR_PROJECT_ID=your_project_id
`;
  }

  return content;
}

/**
 * Write .env.example file to target directory
 */
export async function writeEnvExample(
  targetDir: string,
  features: FeatureSelection,
  options: InstallOptions
): Promise<void> {
  const envPath = path.join(targetDir, '.env.example');
  const content = generateEnvExample(features);

  if (options.dryRun) {
    console.log(`  Would create: .env.example`);
    return;
  }

  const exists = await fs.pathExists(envPath);
  if (exists && !options.force) {
    console.log(`  Skipping: .env.example (already exists)`);
    return;
  }

  await fs.writeFile(envPath, content);
  console.log(`  Created: .env.example`);
}
