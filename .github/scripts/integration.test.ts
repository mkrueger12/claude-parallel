/**
 * integration.test.ts
 *
 * Integration tests for OpenCode Provider APIs
 * Tests real API connectivity with Anthropic, OpenAI, and Google providers
 *
 * Run with: npm test
 */

import { createOpencode } from '@opencode-ai/sdk';
import type { OpencodeClient } from '@opencode-ai/sdk';
import { exec } from 'child_process';

// ============================================================================
// Simple Test Framework
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: Error;
  duration: number;
}

let testResults: TestResult[] = [];
let testCount = 0;
let passCount = 0;
let testQueue: Array<() => Promise<void>> = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  testQueue.push(async () => {
    testCount++;
    const start = Date.now();
    try {
      await fn();
      passCount++;
      testResults.push({ name, passed: true, duration: Date.now() - start });
      console.log(`  ✓ ${name}`);
    } catch (error) {
      testResults.push({
        name,
        passed: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - start,
      });
      console.log(`  ✗ ${name}`);
      if (error instanceof Error) {
        console.log(`    ${error.message}`);
      }
    }
  });
}

function describe(suiteName: string, fn: () => void): void {
  console.log(`\n${suiteName}`);
  fn();
}

async function runQueuedTests(): Promise<void> {
  for (const testFn of testQueue) {
    await testFn();
  }
  testQueue = [];
}

// TypeScript utility function for test assertions (may be used in future tests)
// @ts-ignore TS6133
function expect(value: any) {
  return {
    toBeDefined() {
      if (value === undefined) {
        throw new Error('Expected value to be defined');
      }
    },
    toBe(expected: any) {
      if (value !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof value !== 'number' || value <= expected) {
        throw new Error(`Expected ${value} to be greater than ${expected}`);
      }
    },
    toHaveLength(length: number) {
      if (!Array.isArray(value) || value.length !== length) {
        throw new Error(
          `Expected array to have length ${length}, got ${
            Array.isArray(value) ? value.length : 'non-array'
          }`
        );
      }
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract text content from OpenCode response parts array
 */
function extractTextFromParts(parts: any[]): string {
  if (!Array.isArray(parts)) return '';

  return parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text || '')
    .join('\n');
}

/**
 * Validate environment variables required for testing
 */
function validateEnvironment(): void {
  const requiredVars = [
    'CLAUDE_CODE_OAUTH_TOKEN',
    'OPENAI_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'LINEAR_API_KEY',
    'LINEAR_TEAM_ID',
    'GITHUB_ISSUE_URL',
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// ============================================================================
// Main Test Suite
// ============================================================================

async function runTests(): Promise<void> {
  console.log('\n📋 OpenCode Provider Integration Tests\n');

  let client: OpencodeClient;
  let server: any;

  try {
    // Setup
    console.log('Setting up integration test environment...');
    validateEnvironment();
    console.log('✓ Environment variables validated');

    const result = await createOpencode({
      hostname: '127.0.0.1',
      port: 0, // Auto-assign port
      config: {
        provider: {
          anthropic: {
            options: {
              apiKey: process.env.CLAUDE_CODE_OAUTH_TOKEN!,
            },
          },
          openai: {
            options: {
              apiKey: process.env.OPENAI_API_KEY!,
            },
          },
          google: {
            options: {
              apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
            },
          },
        },
        mcp: {
          linear: {
            type: "remote" as const,
            url: "https://mcp.linear.app/mcp",
            headers: {
              "Authorization": `Bearer ${process.env.LINEAR_API_KEY!}`
            }
          }
        }
      },
    });

    client = result.client;
    server = result.server;
    console.log(`✓ OpenCode server started at ${server.url}`);

    // ========================================================================
    // Anthropic Provider Tests
    // ========================================================================

    describe('Anthropic Provider (claude-opus-4-5-20251101)', () => {
      test('should create session successfully', async () => {
        const sessionResponse = await client.session.create({
          body: { title: 'Test Session - Anthropic Integration' },
        });

        if (!sessionResponse || !sessionResponse.data || !sessionResponse.data.id) {
          throw new Error('Failed to create session');
        }
      });

      test('should execute prompt successfully', async () => {
        const sessionResponse = await client.session.create({
          body: { title: 'Test Prompt - Anthropic' },
        });

        if (!sessionResponse.data) {
          throw new Error('Session creation failed');
        }

        const promptResponse = await client.session.prompt({
          path: { id: sessionResponse.data.id },
          body: {
            model: {
              providerID: 'anthropic',
              modelID: 'claude-opus-4-5-20251101',
            },
            parts: [
              {
                type: 'text',
                text: 'Return a JSON object with status "ok". Example: {"status": "ok"}',
              },
            ],
          },
        });

        if (!promptResponse || !promptResponse.data || !promptResponse.data.parts) {
          throw new Error('Failed to get response');
        }
      });

      test('should return parseable response text', async () => {
        const sessionResponse = await client.session.create({
          body: { title: 'Test Response Parsing - Anthropic' },
        });

        if (!sessionResponse.data) {
          throw new Error('Session creation failed');
        }

        const promptResponse = await client.session.prompt({
          path: { id: sessionResponse.data.id },
          body: {
            model: {
              providerID: 'anthropic',
              modelID: 'claude-opus-4-5-20251101',
            },
            parts: [{ type: 'text', text: 'Say hello' }],
          },
        });

        if (!promptResponse.data) {
          throw new Error('Failed to get response');
        }

        const responseText = extractTextFromParts(promptResponse.data.parts);
        if (!responseText || responseText.length === 0) {
          throw new Error('Response text is empty');
        }
      });
    });

    // ========================================================================
    // OpenAI Provider Tests
    // ========================================================================

    describe('OpenAI Provider (gpt-5.2)', () => {
      test('should create session successfully', async () => {
        const sessionResponse = await client.session.create({
          body: { title: 'Test Session - OpenAI Integration' },
        });

        if (!sessionResponse || !sessionResponse.data || !sessionResponse.data.id) {
          throw new Error('Failed to create session');
        }
      });

      test('should execute prompt successfully', async () => {
        const sessionResponse = await client.session.create({
          body: { title: 'Test Prompt - OpenAI' },
        });

        if (!sessionResponse.data) {
          throw new Error('Session creation failed');
        }

        const promptResponse = await client.session.prompt({
          path: { id: sessionResponse.data.id },
          body: {
            model: {
              providerID: 'openai',
              modelID: 'gpt-5.2',
            },
            parts: [
              {
                type: 'text',
                text: 'Return a JSON object with status "ok". Example: {"status": "ok"}',
              },
            ],
          },
        });

        if (!promptResponse || !promptResponse.data || !promptResponse.data.parts) {
          throw new Error('Failed to get response');
        }
      });

      test('should return parseable response text', async () => {
        const sessionResponse = await client.session.create({
          body: { title: 'Test Response Parsing - OpenAI' },
        });

        if (!sessionResponse.data) {
          throw new Error('Session creation failed');
        }

        const promptResponse = await client.session.prompt({
          path: { id: sessionResponse.data.id },
          body: {
            model: {
              providerID: 'openai',
              modelID: 'gpt-5.2',
            },
            parts: [{ type: 'text', text: 'Say hello' }],
          },
        });

        if (!promptResponse.data) {
          throw new Error('Failed to get response');
        }

        const responseText = extractTextFromParts(promptResponse.data.parts);
        if (!responseText || responseText.length === 0) {
          throw new Error('Response text is empty');
        }
      });
    });

    // ========================================================================
    // Google Provider Tests
    // ========================================================================

    describe('Google Provider (gemini-3-pro-preview)', () => {
      test('should create session successfully', async () => {
        const sessionResponse = await client.session.create({
          body: { title: 'Test Session - Google Integration' },
        });

        if (!sessionResponse || !sessionResponse.data || !sessionResponse.data.id) {
          throw new Error('Failed to create session');
        }
      });

      test('should execute prompt successfully', async () => {
        const sessionResponse = await client.session.create({
          body: { title: 'Test Prompt - Google' },
        });

        if (!sessionResponse.data) {
          throw new Error('Session creation failed');
        }

        const promptResponse = await client.session.prompt({
          path: { id: sessionResponse.data.id },
          body: {
            model: {
              providerID: 'google',
              modelID: 'gemini-3-pro-preview',
            },
            parts: [
              {
                type: 'text',
                text: 'Return a JSON object with status "ok". Example: {"status": "ok"}',
              },
            ],
          },
        });

        if (!promptResponse || !promptResponse.data || !promptResponse.data.parts) {
          console.log('    [DEBUG] Response:', JSON.stringify(promptResponse, null, 2));
          throw new Error('Failed to get response');
        }
      });

      test('should return parseable response text', async () => {
        const sessionResponse = await client.session.create({
          body: { title: 'Test Response Parsing - Google' },
        });

        if (!sessionResponse.data) {
          throw new Error('Session creation failed');
        }

        const promptResponse = await client.session.prompt({
          path: { id: sessionResponse.data.id },
          body: {
            model: {
              providerID: 'google',
              modelID: 'gemini-3-pro-preview',
            },
            parts: [{ type: 'text', text: 'Say hello' }],
          },
        });

        if (!promptResponse.data) {
          console.log('    [DEBUG] Response:', JSON.stringify(promptResponse, null, 2));
          throw new Error('Failed to get response');
        }

        const responseText = extractTextFromParts(promptResponse.data.parts);
        if (!responseText || responseText.length === 0) {
          console.log('    [DEBUG] Parts:', JSON.stringify(promptResponse.data.parts, null, 2));
          throw new Error('Response text is empty');
        }
      });
    });

    // ========================================================================
    // Error Handling Tests
    // ========================================================================

    describe('Error Handling', () => {
      test('should report missing API keys', async () => {
        if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
          throw new Error('Missing CLAUDE_CODE_OAUTH_TOKEN');
        }
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('Missing OPENAI_API_KEY');
        }
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
          throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY');
        }
      });
    });

    // ========================================================================
    // Concurrent Calls Test
    // ========================================================================

    describe('Concurrent Provider Calls', () => {
      test('should handle parallel prompt calls from multiple providers', async () => {
        const [anthropicSession, openaiSession, googleSession] = await Promise.all([
          client.session.create({
            body: { title: 'Parallel Test - Anthropic' },
          }),
          client.session.create({
            body: { title: 'Parallel Test - OpenAI' },
          }),
          client.session.create({
            body: { title: 'Parallel Test - Google' },
          }),
        ]);

        if (!anthropicSession.data || !openaiSession.data || !googleSession.data) {
          throw new Error('Session creation failed');
        }

        const results = await Promise.all([
          client.session.prompt({
            path: { id: anthropicSession.data.id },
            body: {
              model: {
                providerID: 'anthropic',
                modelID: 'claude-opus-4-5-20251101',
              },
              parts: [{ type: 'text', text: 'Say "ok"' }],
            },
          }),
          client.session.prompt({
            path: { id: openaiSession.data.id },
            body: {
              model: {
                providerID: 'openai',
                modelID: 'gpt-5.2',
              },
              parts: [{ type: 'text', text: 'Say "ok"' }],
            },
          }),
          client.session.prompt({
            path: { id: googleSession.data.id },
            body: {
              model: {
                providerID: 'google',
                modelID: 'gemini-3-pro-preview',
              },
              parts: [{ type: 'text', text: 'Say "ok"' }],
            },
          }),
        ]);

        if (results.length !== 3) {
          throw new Error(`Expected 3 results, got ${results.length}`);
        }

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const providerName = i === 0 ? 'anthropic' : i === 1 ? 'openai' : 'google';
          if (!result || !result.data || !result.data.parts) {
            console.log(`    [DEBUG] Invalid response from ${providerName}:`, JSON.stringify(result, null, 2));
            throw new Error(`Invalid response from ${providerName}`);
          }
        }
      });
    });

    // ========================================================================
    // E2E Script Tests
    // ========================================================================

    describe('E2E Script Tests', () => {
      test('should create a Linear issue with \'say hi\' description via run-simple-e2e-test.sh', async () => {
        const scriptPath = '/home/max/workspace/code/claude-parallel/.github/scripts/run-simple-e2e-test.sh';
        console.log(`Executing E2E script: ${scriptPath}`);

        const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
          exec(`bash ${scriptPath}`, (error, stdout, stderr) => {
            if (error) {
              console.error(`E2E script failed with error: ${error.message}`);
              console.error(`Stderr: ${stderr}`);
              return reject(error);
            }
            if (stderr) {
              console.warn(`E2E script produced stderr: ${stderr}`);
            }
            resolve({ stdout, stderr });
          });
        });

        console.log(`E2E script stdout: ${stdout}`);

        // Extract parent_issue_id from stdout
        const parentIssueIdMatch = stdout.match(/::set-output name=parent_issue_id::(LA-\d+)/);
        if (!parentIssueIdMatch || !parentIssueIdMatch[1]) {
          throw new Error(`Could not find parent_issue_id in script output: ${stdout}`);
        }
        const parentIssueId = parentIssueIdMatch[1];

        console.log(`Extracted Parent Linear Issue ID: ${parentIssueId}`);

        // Initialize Linear client directly
        const linearClient = new LinearClient({
          apiKey: process.env.LINEAR_API_KEY!,
        });

        // Fetch the Linear issue using the Linear SDK
        const linearIssue = await linearClient.issueGet(parentIssueId);

        if (!linearIssue || !linearIssue.description) {
          throw new Error(`Failed to get description for Linear issue ${parentIssueId}`);
        }

        const issueDescription = linearIssue.description;
        console.log(`Fetched Linear Issue Description: ${issueDescription}`);

        // Assert the description
        if (issueDescription !== 'say hi') {
          throw new Error(`Expected Linear issue description to be 'say hi', but got '${issueDescription}'`);
        }
      });
    });

    // Run all queued tests
    await runQueuedTests();

    // Cleanup
    await server.close();
    console.log('✓ OpenCode server closed');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }

  // Print summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Test Results: ${passCount}/${testCount} passed`);
  console.log(`${'='.repeat(70)}\n`);

  if (passCount !== testCount) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
