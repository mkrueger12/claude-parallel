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

import { createOpencode } from '@opencode-ai/sdk';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const AGENT_NAME = "planning-agent";

// Provider-specific default models
const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-5.1-codex-mini",
  google: "gemini-2.5-flash",
};

const PROMPT_FILE = join(__dirname, "..", "prompts", "plan-generation.md");

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
  const provider = (process.env.PROVIDER || 'anthropic').toLowerCase();

  // Validate provider
  if (!['anthropic', 'openai', 'google'].includes(provider)) {
    console.error(`Error: Unsupported provider "${provider}". Supported providers: anthropic, openai, google`);
    process.exit(1);
  }

  // Get API key from environment based on provider
  let apiKey: string | undefined;

  if (provider === 'anthropic') {
    apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN;
    if (!apiKey) {
      console.error('Error: ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN environment variable is required');
      process.exit(1);
    }
  } else if (provider === 'openai') {
    apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('Error: OPENAI_API_KEY environment variable is required');
      process.exit(1);
    }
  } else if (provider === 'google') {
    apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('Error: GOOGLE_GENERATIVE_AI_API_KEY environment variable is required');
      process.exit(1);
    }
  }

  // TypeScript guard: ensure apiKey is defined
  if (!apiKey) {
    console.error('Error: API key is required but not set');
    process.exit(1);
  }

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
  try {
    prompt = await readFile(PROMPT_FILE, 'utf-8');
    console.error(`✓ Loaded prompt from ${PROMPT_FILE}`);
  } catch (error) {
    console.error(`✗ Failed to read prompt file: ${PROMPT_FILE}`);
    console.error("Please create a plan-generation.md file in the prompts directory");
    process.exit(1);
  }

  // Create OpenCode configuration with planning agent
  const opcodeConfig: any = {
    provider: {
      [provider]: {
        options: {
          apiKey: apiKey!, // Non-null assertion - guaranteed by guard above
          timeout: false, // Disable timeout
        },
      },
    },
    agent: {
      [AGENT_NAME]: {
        description: "Generate a comprehensive implementation plan for a given feature",
        mode: "subagent",
        model: model,
        prompt: prompt,
        tools: {
          write: false,    // No file creation
          edit: false,     // No file modification
          bash: false,     // No shell commands
          read: true,      // Allow reading files
          list: true,      // Allow listing directories
          glob: true,      // Allow file pattern matching
          grep: true,      // Allow searching content
          webfetch: true,  // Allow web research
        },
        maxSteps: 30,      // Limit iterations for planning
        permission: {
          edit: "deny",
          bash: "deny",
          webfetch: "allow",
        }
      }
    }
  };

  console.error('Starting OpenCode server...');
  const { client, server } = await createOpencode({
    hostname: '127.0.0.1',
    port: 0, // Auto-assign port
    config: opcodeConfig,
  });

  // Subscribe to events to log tool calls and session status
  console.error('Setting up event monitoring...');
  (async () => {
    try {
      const events = await client.event.subscribe();
      for await (const event of events.stream) {
        if (event.type === 'message.part.updated') {
          const part = event.properties.part;
          if (part.type === 'tool') {
            const status = part.state.status;
            const toolName = part.tool;

            if (status === 'running') {
              const input = JSON.stringify(part.state.input || {}, null, 2);
              console.error(`\n[TOOL] ${toolName} - RUNNING`);
              console.error(`  Input: ${input}`);
            } else if (status === 'completed') {
              const output = part.state.output?.slice(0, 200) || '(no output)';
              const duration = part.state.time?.end && part.state.time?.start
                ? `${((part.state.time.end - part.state.time.start) / 1000).toFixed(2)}s`
                : 'unknown';
              console.error(`\n[TOOL] ${toolName} - COMPLETED (${duration})`);
              console.error(`  Output preview: ${output}${part.state.output && part.state.output.length > 200 ? '...' : ''}`);
            } else if (status === 'error') {
              console.error(`\n[TOOL] ${toolName} - ERROR`);
              console.error(`  Error: ${part.state.error}`);
            }
          }
        }

        // Monitor session status
        if (event.type === 'session.status') {
          const status = event.properties.status;

          if (String(status) === 'idle') {
            console.error(`\n[STATUS] Session idle`);
          } else if (String(status) === 'busy') {
            console.error(`\n[STATUS] Session busy (processing)`);
          } else if (typeof status === 'object' && 'attempt' in status) {
            // Retry status
            console.error(`\n[STATUS] Session retrying (attempt ${status.attempt})`);
            if ('message' in status) console.error(`  Reason: ${status.message}`);
            if ('next' in status) console.error(`  Next retry in: ${status.next}ms`);
          }
        }

        // Monitor session errors
        if (event.type === 'session.error') {
          const error = event.properties.error;
          console.error(`\n[ERROR] Session error:`, error);
        }
      }
    } catch (err) {
      console.error('Event monitoring subscription error:', err);
    }
  })();

  try {
    console.error(`✓ OpenCode server started at ${server.url}`);

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
