#!/usr/bin/env node
/**
 * linear-agent.ts
 *
 * Consolidates three implementation plans from different AI providers and creates Linear issues.
 * This is the v2 workflow approach that receives pre-generated plans via environment variables.
 *
 * Usage:
 *   linear-agent.ts
 *
 * Environment variables (all required):
 *   - ANTHROPIC_PLAN - Plan from Anthropic provider
 *   - OPENAI_PLAN - Plan from OpenAI provider
 *   - GOOGLE_PLAN - Plan from Google provider
 *   - GITHUB_ISSUE_URL - URL of the GitHub issue
 *   - ISSUE_TITLE - Title of the GitHub issue
 *   - LINEAR_TEAM_ID - Linear team ID
 *   - LINEAR_PROJECT_ID - Linear project ID (optional)
 *   - ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN - API key for consolidation agent
 *   - LINEAR_API_KEY - Linear API key for creating issues
 *
 *   Optional:
 *   - MODEL (defaults to claude-haiku-4-5-20251001)
 *
 * Examples:
 *   ANTHROPIC_PLAN="..." OPENAI_PLAN="..." GOOGLE_PLAN="..." \
 *   GITHUB_ISSUE_URL="..." ISSUE_TITLE="..." LINEAR_TEAM_ID="..." \
 *   ANTHROPIC_API_KEY=xxx LINEAR_API_KEY=xxx \
 *   linear-agent.ts
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

const AGENT_NAME = "linear-agent";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const PROMPT_FILE = join(__dirname, "..", "prompts", "consolidate-and-create-linear.md");

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
  // Validate required environment variables
  const requiredEnvVars = [
    'ANTHROPIC_PLAN',
    'OPENAI_PLAN',
    'GOOGLE_PLAN',
    'GITHUB_ISSUE_URL',
    'ISSUE_TITLE',
    'LINEAR_TEAM_ID',
    'LINEAR_API_KEY',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('Error: Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    console.error('');
    console.error('Usage: Set all required environment variables and run:');
    console.error('  bun run linear-agent.ts');
    process.exit(1);
  }

  // Get API key for Anthropic (consolidation provider)
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN environment variable is required');
    process.exit(1);
  }

  // Get configuration from environment
  const anthropicPlan = process.env.ANTHROPIC_PLAN!;
  const openaiPlan = process.env.OPENAI_PLAN!;
  const googlePlan = process.env.GOOGLE_PLAN!;
  const githubIssueUrl = process.env.GITHUB_ISSUE_URL!;
  const issueTitle = process.env.ISSUE_TITLE!;
  const linearTeamId = process.env.LINEAR_TEAM_ID!;
  const linearProjectId = process.env.LINEAR_PROJECT_ID || '';
  const linearApiKey = process.env.LINEAR_API_KEY!;
  const model = process.env.MODEL || DEFAULT_MODEL;

  const provider = 'anthropic';

  console.error(`\n${'='.repeat(60)}`);
  console.error(`Linear Agent - Plan Consolidation`);
  console.error(`${'='.repeat(60)}`);
  console.error(`Provider: ${provider}`);
  console.error(`Model: ${model}`);
  console.error(`Issue: ${issueTitle}`);
  console.error(`GitHub URL: ${githubIssueUrl}`);
  console.error(`Linear Team: ${linearTeamId}`);
  console.error(`Linear Project: ${linearProjectId || '(none)'}`);
  console.error('');

  // Read external prompt template file
  let promptTemplate: string;
  try {
    promptTemplate = await readFile(PROMPT_FILE, 'utf-8');
    console.error(`✓ Loaded prompt template from ${PROMPT_FILE}`);
  } catch (error) {
    console.error(`✗ Failed to read prompt file: ${PROMPT_FILE}`);
    console.error("Please create consolidate-and-create-linear.md file in the prompts directory");
    process.exit(1);
  }

  // Replace placeholders in the prompt template
  const prompt = promptTemplate
    .replace(/\{\{ANTHROPIC_PLAN\}\}/g, anthropicPlan)
    .replace(/\{\{OPENAI_PLAN\}\}/g, openaiPlan)
    .replace(/\{\{GOOGLE_PLAN\}\}/g, googlePlan)
    .replace(/\{\{GITHUB_ISSUE_URL\}\}/g, githubIssueUrl)
    .replace(/\{\{ISSUE_TITLE\}\}/g, issueTitle)
    .replace(/\{\{LINEAR_TEAM_ID\}\}/g, linearTeamId)
    .replace(/\{\{LINEAR_PROJECT_ID\}\}/g, linearProjectId);

  console.error(`✓ Filled prompt template with plans and context`);

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
    ...(linearApiKey && {
      mcp: {
        linear: {
          type: 'remote' as const,
          url: 'https://mcp.linear.app/mcp',
          headers: {
            Authorization: `Bearer ${linearApiKey}`,
          },
        },
      },
    }),
    agent: {
      [AGENT_NAME]: {
        description: "Generate a comprehensive implementation plan for a given feature",
        mode: "subagent",
        model: model,
        prompt: prompt!,
        tools: {
          write: false,    // No file creation
          edit: false,     // No file modification
          bash: false,     // No shell commands
          read: true,      // Allow reading files
          list: true,      // Allow listing directories
          glob: true,      // Allow file pattern matching
          grep: true,      // Allow searching content
          webfetch: true,  // Allow web research
          ...(linearApiKey && { 'mcp__linear__*': true }), // Enable Linear MCP tools if available
        },
        maxSteps: 10,      // Limit iterations for planning
        permission: {
          edit: "deny",
          bash: "deny",
          webfetch: "allow",
          ...(linearApiKey && { 'mcp__linear__*': 'allow' }), // Allow Linear MCP tools if available
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
      body: { title: `Plan consolidation: ${issueTitle}` },
    });

    if (!sessionResponse.data) {
      throw new Error('Failed to create session: no data in response');
    }

    const session = sessionResponse.data;
    console.error(`✓ Session created: ${session.id}`);

    // Send prompt to linear agent
    console.error(`Consolidating plans and creating Linear issues with ${AGENT_NAME}...`);
    console.error(`This may take a few moments while the AI consolidates the plans...`);
    const promptResponse = await client.session.prompt({
      path: { id: session.id },
      body: {
        model: {
          providerID: provider,
          modelID: model,
        },
        agent: AGENT_NAME,  // Use the linear agent
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

    // Extract consolidated plan and Linear issue creation results
    const resultText = extractTextFromParts(promptResponse.data.parts);

    if (resultText.length === 0) {
      throw new Error('Empty response from linear agent');
    }

    console.error('');
    console.error(`${'='.repeat(60)}`);
    console.error(`SUCCESS!`);
    console.error(`${'='.repeat(60)}`);
    console.error(`Consolidated plan and Linear issues: ${resultText.length} characters`);
    console.error(`Session ID: ${session.id}`);
    console.error('');

    // Output result to stdout (this will be captured by workflows)
    console.log(resultText);

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
