#!/usr/bin/env node
/**
 * planning-agent.ts
 *
 * Generates an implementation plan using a custom planning agent.
 * The planning agent is configured for read-only operations with web research capabilities.
 *
 * Usage:
 *   planning-agent.ts <feature-description>
 *
 * Environment variables:
 *   - PROVIDER (optional, defaults to 'anthropic')
 *     Supported values: anthropic, openai, google
 *
 *   API Keys (required based on provider):
 *   - ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN (for provider=anthropic)
 *   - OPENAI_API_KEY (for provider=openai)
 *   - GOOGLE_GENERATIVE_AI_API_KEY (for provider=google)
 *
 *   - MODEL (optional, defaults to provider-specific model)
 *     anthropic: claude-haiku-4-5-20251001
 *     openai: gpt-4o
 *     google: gemini-2.0-flash-exp
 *
 * Examples:
 *   # Use default (Anthropic Claude)
 *   ANTHROPIC_API_KEY=xxx planning-agent.ts "Add user authentication"
 *
 *   # Use OpenAI GPT-4
 *   PROVIDER=openai OPENAI_API_KEY=xxx planning-agent.ts "Add user authentication"
 *
 *   # Use Google Gemini with custom model
 *   PROVIDER=google GOOGLE_GENERATIVE_AI_API_KEY=xxx MODEL=gemini-1.5-pro planning-agent.ts "Add user authentication"
 */

import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { DEFAULT_MODELS } from '../lib/types.js';
import { extractTextFromParts, validateProvider, getApiKey } from '../lib/utils.js';
import { createOpencodeServer, setupEventMonitoring } from '../lib/opencode.js';

// Note: __filename and __dirname are not needed here anymore
// Prompts are resolved from process.cwd() in installed locations

// ============================================================================
// Configuration
// ============================================================================

const AGENT_NAME = "planning-agent";

// Helper to find prompt file in multiple possible locations
async function findPromptFile(): Promise<string> {
  const possiblePaths = [
    // Installed location (via installer)
    join(process.cwd(), ".github", "claude-parallel", "prompts", "plan-generation.md"),
    // Source repository location
    join(process.cwd(), "prompts", "plan-generation.md"),
  ];

  for (const path of possiblePaths) {
    try {
      await access(path);
      return path;
    } catch {
      // File doesn't exist at this path, try next
    }
  }

  throw new Error(`Could not find plan-generation.md in any of these locations:\n${possiblePaths.map(p => `  - ${p}`).join('\n')}`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: planning-agent.ts <feature-description>');
    console.error('');
    console.error('Examples:');
    console.error('  # Use default (Anthropic Claude)');
    console.error('  ANTHROPIC_API_KEY=xxx planning-agent.ts "Add user authentication"');
    console.error('');
    console.error('  # Use OpenAI GPT-4');
    console.error('  PROVIDER=openai OPENAI_API_KEY=xxx planning-agent.ts "Add user authentication"');
    console.error('');
    console.error('  # Use Google Gemini');
    console.error('  PROVIDER=google GOOGLE_GENERATIVE_AI_API_KEY=xxx planning-agent.ts "Add user authentication"');
    console.error('');
    console.error('Environment variables:');
    console.error('  PROVIDER - anthropic (default), openai, or google');
    console.error('  MODEL - Override default model for the provider');
    process.exit(1);
  }

  const featureDescription = args.join(' ');

  // Get provider from environment or use default
  const providerEnv = (process.env.PROVIDER || 'anthropic').toLowerCase();

  // Validate provider
  validateProvider(providerEnv);
  const provider = providerEnv;

  // Get API key from environment based on provider
  const apiKey = getApiKey(provider);

  // Get model from environment or use provider-specific default
  const model = process.env.MODEL || DEFAULT_MODELS[provider];

  console.error(`\n${'='.repeat(60)}`);
  console.error(`Planning Agent`);
  console.error(`${'='.repeat(60)}`);
  console.error(`Provider: ${provider}`);
  console.error(`Model: ${model}`);
  console.error(`Feature: ${featureDescription}`);
  console.error('');

  // Read external prompt file
  let prompt: string;
  let promptFile: string;
  try {
    promptFile = await findPromptFile();
    prompt = await readFile(promptFile, 'utf-8');
    console.error(`✓ Loaded prompt from ${promptFile}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`✗ Failed to read prompt file: ${errorMessage}`);
    console.error("Please create a plan-generation.md file in the prompts directory");
    process.exit(1);
  }

  // Create OpenCode server with planning agent configuration
  const { client, server } = await createOpencodeServer({
    provider,
    apiKey,
    model,
    agentName: AGENT_NAME,
    agentDescription: "Generate a comprehensive implementation plan for a given feature",
    agentPrompt: prompt,
    agentTools: {
      write: false,    // No file creation
      edit: false,     // No file modification
      bash: false,     // No shell commands
      read: true,      // Allow reading files
      list: true,      // Allow listing directories
      glob: true,      // Allow file pattern matching
      grep: true,      // Allow searching content
      webfetch: true,  // Allow web research
    },
    agentPermissions: {
      edit: "deny",
      bash: "deny",
      webfetch: "allow",
    },
    maxSteps: 30,
  });

  // Setup event monitoring
  setupEventMonitoring(client);

  try {
    // Create session
    console.error(`Creating session...`);
    const sessionResponse = await client.session.create({
      body: { title: `Plan generation: ${featureDescription}` },
    });

    if (!sessionResponse.data) {
      throw new Error('Failed to create session: no data in response');
    }

    const session = sessionResponse.data;
    console.error(`✓ Session created: ${session.id}`);

    // Send prompt to planning agent
    console.error(`Generating plan with ${AGENT_NAME}...`);
    console.error(`This may take a few moments while the AI generates the plan...`);
    const promptResponse = await client.session.prompt({
      path: { id: session.id },
      body: {
        model: {
          providerID: provider,
          modelID: model,
        },
        agent: AGENT_NAME,  // Use the planning agent
        parts: [{ type: 'text', text: featureDescription }],
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
      throw new Error('Empty response from planning agent');
    }

    console.error('');
    console.error(`${'='.repeat(60)}`);
    console.error(`SUCCESS!`);
    console.error(`${'='.repeat(60)}`);
    console.error(`Generated plan: ${planText.length} characters`);
    console.error(`Session ID: ${session.id}`);
    console.error('');

    // Output plan to stdout (this will be captured by scripts)
    console.log(planText);

    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('');
    console.error(`${'='.repeat(60)}`);
    console.error('ERROR!');
    console.error(`${'='.repeat(60)}`);
    console.error(`Error: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    console.error('');
    process.exit(1);
  } finally {
    console.error('Shutting down OpenCode server...');
    server.close();
  }
}

// Run the main function
main().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
