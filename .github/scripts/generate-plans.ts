#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createOpencode } from '@opencode-ai/sdk';
import type { OpencodeClient } from '@opencode-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Provider configuration
interface ProviderConfig {
  name: string;
  providerID: string;
  modelEnvVar: string;
  apiKeyEnvVar: string;
  defaultModel: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'anthropic',
    providerID: 'anthropic',
    modelEnvVar: 'ANTHROPIC_MODEL',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-4-20250514',
  },
  {
    name: 'openai',
    providerID: 'openai',
    modelEnvVar: 'OPENAI_MODEL',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4-turbo-preview',
  },
  {
    name: 'google',
    providerID: 'google',
    modelEnvVar: 'GOOGLE_MODEL',
    apiKeyEnvVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
    defaultModel: 'gemini-pro',
  },
];

interface PlanResult {
  provider: string;
  success: boolean;
  plan?: any;
  error?: string;
}

/**
 * Read the prompt template and substitute placeholders
 */
async function preparePrompt(issueTitle: string, issueBody: string): Promise<string> {
  const promptPath = join(__dirname, '..', 'prompts', 'plan-generation.md');
  const template = await readFile(promptPath, 'utf-8');

  return template
    .replace(/\{\{ISSUE_TITLE\}\}/g, issueTitle)
    .replace(/\{\{ISSUE_BODY\}\}/g, issueBody);
}

/**
 * Extract JSON from a code block in the response
 */
function extractJSON(response: string): any {
  if (!response) {
    throw new Error('Empty response');
  }

  // Try to find JSON in a code block
  const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return JSON.parse(codeBlockMatch[1]);
  }

  // Try to find raw JSON object
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch && jsonMatch[0]) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error('No valid JSON found in response');
}

/**
 * Extract text from message parts
 */
function extractTextFromParts(parts: any[]): string {
  if (!Array.isArray(parts)) return '';

  return parts
    .filter(part => part.type === 'text')
    .map(part => part.text || '')
    .join('\n');
}

/**
 * Generate a plan from a single provider
 */
async function generatePlanFromProvider(
  client: OpencodeClient,
  provider: ProviderConfig,
  prompt: string
): Promise<PlanResult> {
  const apiKey = process.env[provider.apiKeyEnvVar];

  if (!apiKey) {
    console.error(`[${provider.name}] Missing API key: ${provider.apiKeyEnvVar}`);
    return {
      provider: provider.name,
      success: false,
      error: `Missing API key: ${provider.apiKeyEnvVar}`,
    };
  }

  const model = process.env[provider.modelEnvVar] || provider.defaultModel;

  try {
    console.log(`[${provider.name}] Starting plan generation with model ${model}...`);

    // Create a session for this provider
    const sessionResponse = await client.session.create({
      body: { title: `Plan generation for ${provider.name}` },
    });

    if (!sessionResponse.data) {
      throw new Error('Failed to create session: no data in response');
    }

    const session = sessionResponse.data;
    console.log(`[${provider.name}] Created session ${session.id}`);

    // Send the prompt
    const promptResponse = await client.session.prompt({
      path: { id: session.id },
      body: {
        model: {
          providerID: provider.providerID,
          modelID: model,
        },
        parts: [
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    });

    if (!promptResponse.data) {
      throw new Error('Failed to get response: no data in response');
    }

    console.log(`[${provider.name}] Received response, extracting text from parts...`);

    // Extract text from the response parts (parts are included directly in the response)
    const responseText = extractTextFromParts(promptResponse.data.parts);

    console.log(`[${provider.name}] Parsing JSON from response...`);

    // Extract and parse the JSON plan
    const plan = extractJSON(responseText);

    console.log(`[${provider.name}] Successfully generated plan with ${plan.steps?.length || 0} steps`);

    return {
      provider: provider.name,
      success: true,
      plan,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${provider.name}] Error generating plan:`, errorMessage);
    return {
      provider: provider.name,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let issueTitle: string;
  let issueBody: string;

  if (args.length >= 2) {
    // Read from command line args
    issueTitle = args[0]!;
    issueBody = args[1]!;
  } else if (!process.stdin.isTTY) {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = Buffer.concat(chunks).toString('utf-8');
    const lines = input.split('\n');
    issueTitle = lines[0] || 'Untitled Issue';
    issueBody = lines.slice(1).join('\n') || 'No description provided';
  } else {
    console.error('Usage: generate-plans.ts <issue-title> <issue-body>');
    console.error('   or: echo "title\\nbody" | generate-plans.ts');
    process.exit(1);
  }

  console.log('Starting multi-provider plan generation...');
  console.log(`Issue: ${issueTitle}`);
  console.log('');

  // Prepare the prompt
  const prompt = await preparePrompt(issueTitle, issueBody);

  // Initialize OpenCode server and client
  console.log('Starting OpenCode server...');
  const { client, server } = await createOpencode({
    hostname: '127.0.0.1',
    port: 0, // Use random available port
    config: {
      provider: {
        anthropic: {
          options: {
            apiKey: process.env.ANTHROPIC_API_KEY,
          },
        },
        openai: {
          options: {
            apiKey: process.env.OPENAI_API_KEY,
          },
        },
        google: {
          options: {
            apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
          },
        },
      },
    },
  });

  console.log(`OpenCode server started at ${server.url}`);

  try {
    // Generate plans in parallel from all providers
    const results = await Promise.all(
      PROVIDERS.map(provider => generatePlanFromProvider(client, provider, prompt))
    );

    // Create output directory
    const outputDir = join(process.cwd(), 'plans');
    await mkdir(outputDir, { recursive: true });
    console.log(`\nCreated output directory: ${outputDir}`);

    // Write results to files
    let successCount = 0;
    let failureCount = 0;

    for (const result of results) {
      const outputPath = join(outputDir, `${result.provider}.json`);

      if (result.success && result.plan) {
        await writeFile(outputPath, JSON.stringify(result.plan, null, 2), 'utf-8');
        console.log(`[${result.provider}] Wrote plan to ${outputPath}`);
        successCount++;
      } else {
        // Write error information
        const errorData = {
          error: result.error || 'Unknown error',
          provider: result.provider,
          timestamp: new Date().toISOString(),
        };
        await writeFile(outputPath, JSON.stringify(errorData, null, 2), 'utf-8');
        console.log(`[${result.provider}] Failed: ${result.error}`);
        failureCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Plan Generation Summary');
    console.log('='.repeat(60));
    console.log(`Successful: ${successCount}/${PROVIDERS.length}`);
    console.log(`Failed: ${failureCount}/${PROVIDERS.length}`);

    if (failureCount === PROVIDERS.length) {
      console.error('\nAll providers failed! Check your API keys and network connection.');
      process.exit(1);
    } else if (failureCount > 0) {
      console.log(`\n${successCount} plan(s) generated successfully. Check the plans/ directory.`);
      process.exit(0);
    } else {
      console.log('\nAll plans generated successfully!');
      process.exit(0);
    }
  } finally {
    // Cleanup: close the server
    console.log('\nShutting down OpenCode server...');
    server.close();
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
