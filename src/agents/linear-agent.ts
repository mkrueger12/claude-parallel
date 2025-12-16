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
 *   - MODEL (defaults to claude-opus-4-5)
 *
 * Examples:
 *   ANTHROPIC_PLAN="..." OPENAI_PLAN="..." GOOGLE_PLAN="..." \
 *   GITHUB_ISSUE_URL="..." ISSUE_TITLE="..." LINEAR_TEAM_ID="..." \
 *   ANTHROPIC_API_KEY=xxx LINEAR_API_KEY=xxx \
 *   linear-agent.ts
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { extractTextFromParts, validateEnvVars, getApiKey } from '../lib/utils.js';
import { createOpencodeServer, setupEventMonitoring } from '../lib/opencode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const AGENT_NAME = "linear-agent";
const DEFAULT_MODEL = "claude-opus-4-5";
const PROMPT_FILE = join(__dirname, "..", "..", "prompts", "consolidate-and-create-linear.md");

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

  try {
    validateEnvVars(requiredEnvVars);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    console.error('Usage: Set all required environment variables and run:');
    console.error('  bun run linear-agent.ts');
    process.exit(1);
  }

  // Get API key for Anthropic (consolidation provider)
  const provider = 'anthropic';
  const apiKey = getApiKey(provider);

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

  // Create OpenCode server with linear agent configuration
  const { client, server } = await createOpencodeServer({
    provider,
    apiKey,
    model,
    agentName: AGENT_NAME,
    agentDescription: "Consolidate implementation plans and create Linear issues",
    agentPrompt: prompt,
    agentTools: {
      write: false,    // No file creation
      edit: false,     // No file modification
      bash: true,      // Allow shell commands
      read: true,      // Allow reading files
      list: true,      // Allow listing directories
      glob: true,      // Allow file pattern matching
      grep: true,      // Allow searching content
      webfetch: true,  // Allow web research
      ...(linearApiKey && { 'mcp__linear__*': true }), // Enable Linear MCP tools if available
    },
    agentPermissions: {
      edit: "deny",
      bash: "allow",
      webfetch: "allow",
      ...(linearApiKey && { 'mcp__linear__*': 'allow' }), // Allow Linear MCP tools if available
    },
    maxSteps: 30,
    linearApiKey,
  });

  // Setup event monitoring
  setupEventMonitoring(client);

  try {
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
