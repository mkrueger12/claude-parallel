#!/usr/bin/env node
/**
 * generate-plan-single.ts
 *
 * Generates an implementation plan from a single AI provider (Anthropic, OpenAI, or Google).
 * Used by the parallel plan generation workflow where each provider runs in a separate job.
 *
 * Usage:
 *   generate-plan-single.ts <provider> <issue-title> <issue-body>
 *
 * Environment variables:
 *   - ANTHROPIC_API_KEY (for provider=anthropic)
 *   - OPENAI_API_KEY (for provider=openai)
 *   - GOOGLE_GENERATIVE_AI_API_KEY (for provider=google)
 *   - MODEL (optional, provider-specific model to use)
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createOpencode } from '@opencode-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Types and Configuration
// ============================================================================

interface ProviderConfig {
  name: string;
  providerID: string;
  apiKeyEnvVar: string;
  defaultModel: string;
}

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  anthropic: {
    name: 'anthropic',
    providerID: 'anthropic',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-haiku-4-5-20251001',
  },
  openai: {
    name: 'openai',
    providerID: 'openai',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    defaultModel: 'gpt-5.1-codex-mini',
  },
  google: {
    name: 'google',
    providerID: 'google',
    apiKeyEnvVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
    defaultModel: 'gemini-2.5-flash',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

interface Part {
  type: string;
  text?: string;
  [key: string]: any;
}

/**
 * Extract text from message parts
 */
function extractTextFromParts(parts: Part[]): string {
  if (!Array.isArray(parts)) return '';

  return parts
    .filter(part => part.type === 'text')
    .map(part => part.text || '')
    .join('\n');
}

/**
 * Read and prepare the plan generation prompt
 */
async function preparePlanPrompt(issueTitle: string, issueBody: string): Promise<string> {
  const promptPath = join(__dirname, '..', 'prompts', 'plan-generation.md');
  const template = await readFile(promptPath, 'utf-8');

  return template
    .replace(/\{\{ISSUE_TITLE\}\}/g, issueTitle)
    .replace(/\{\{ISSUE_BODY\}\}/g, issueBody);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: generate-plan-single.ts <provider> <issue-title> <issue-body>');
    console.error('Providers: anthropic, openai, google');
    process.exit(1);
  }

  const [providerName, issueTitle, issueBody] = args;

  if (!providerName) {
    console.error('Error: Provider name is required');
    process.exit(1);
  }

  const provider = PROVIDER_CONFIGS[providerName.toLowerCase()];

  if (!provider) {
    console.error(`Error: Unknown provider "${providerName}"`);
    console.error('Valid providers: anthropic, openai, google');
    process.exit(1);
  }

  // Get API key from environment
  const apiKey = process.env[provider.apiKeyEnvVar];

  if (!apiKey) {
    console.error(`Error: ${provider.apiKeyEnvVar} environment variable is required`);
    process.exit(1);
  }

  // Get model from environment or use default
  const model = process.env.MODEL || provider.defaultModel;

  console.error(`[${provider.name}] Generating plan with model ${model}...`);
  console.error(`[${provider.name}] Issue: ${issueTitle}`);

  // Prepare prompt
  const prompt = await preparePlanPrompt(issueTitle || '', issueBody || '');

  // Create OpenCode client with provider configuration
  const opcodeConfig: any = {
    provider: {
      [provider.providerID]: {
        options: {
          apiKey,
          timeout: false, // Disable timeout
        },
      },
    },
    tools: {
      write: true,
      read: true,
      bash: true,
      grep: true,
      webfetch: true,
    },
  };

  const { client, server } = await createOpencode({
    hostname: '127.0.0.1',
    port: 0,
    config: opcodeConfig,
  });

  try {
    console.error(`[${provider.name}] OpenCode server started`);

    // Create session
    console.error(`[${provider.name}] Creating session...`);
    const sessionResponse = await client.session.create({
      body: { title: `Plan generation for ${provider.name}` },
    });

    if (!sessionResponse.data) {
      throw new Error('Failed to create session: no data in response');
    }

    const session = sessionResponse.data;
    console.error(`[${provider.name}] Session created: ${session.id}`);

    // Send prompt
    console.error(`[${provider.name}] Sending prompt (${prompt.length} chars)...`);
    const promptResponse = await client.session.prompt({
      path: { id: session.id },
      body: {
        model: {
          providerID: provider.providerID,
          modelID: model,
        },
        parts: [{ type: 'text', text: prompt }],
      },
    });

    if (!promptResponse.data) {
      throw new Error('Failed to get response: no data in response');
    }

    // Check for errors
    const responseInfo = promptResponse.data.info;
    if (responseInfo?.error) {
      const err = responseInfo.error;
      const errorName = err.name;
      const errorData = 'data' in err ? err.data : {};
      const errorMessage = 'message' in errorData ? errorData.message : JSON.stringify(errorData);

      throw new Error(`Provider error: ${errorName}: ${errorMessage}`);
    }

    // Extract plan text
    const planText = extractTextFromParts(promptResponse.data.parts);

    if (planText.length === 0) {
      throw new Error('Empty response from provider');
    }

    console.error(`[${provider.name}] SUCCESS: Generated plan (${planText.length} chars)`);

    // Output plan to stdout (this will be captured by GitHub Actions)
    console.log(planText);

    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${provider.name}] ERROR: ${errorMessage}`);
    process.exit(1);
  } finally {
    console.error(`[${provider.name}] Shutting down OpenCode server...`);
    server.close();
  }
}

// Run the main function
main().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
