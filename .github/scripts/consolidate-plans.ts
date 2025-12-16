#!/usr/bin/env node
/**
 * consolidate-plans.ts
 *
 * Consolidates implementation plans from multiple AI providers and creates Linear issues.
 * Takes plans as input from environment variables (passed from GitHub Actions job outputs).
 *
 * Environment variables:
 *   Required:
 *   - ANTHROPIC_API_KEY: Claude API key
 *   - LINEAR_API_KEY: Linear API key
 *   - LINEAR_TEAM_ID: Linear team ID
 *   - GITHUB_ISSUE_URL: GitHub issue URL
 *   - ISSUE_TITLE: Issue title
 *   - ANTHROPIC_PLAN: Plan from Anthropic Claude
 *   - OPENAI_PLAN: Plan from OpenAI GPT
 *   - GOOGLE_PLAN: Plan from Google Gemini
 *
 *   Optional:
 *   - LINEAR_PROJECT_ID: Linear project ID
 *   - ANTHROPIC_MODEL: Model to use for consolidation
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createOpencode } from '@opencode-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Types
// ============================================================================

interface Plan {
  content: string;
}

interface LinearIssue {
  id: string;
  identifier: string;
  url: string;
}

interface ConsolidatedResult {
  consolidatedPlan: {
    title: string;
    overview: string;
    steps: Array<{
      number: number;
      title: string;
      description: string;
      priority: string;
    }>;
    risks: Array<{
      description: string;
      mitigation: string;
    }>;
    dependencies: string[];
  };
  linearIssues: {
    parent: LinearIssue;
    subIssues: Array<LinearIssue & { step: number }>;
  };
  rawResponse: string;
}

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
 * Read and prepare the consolidation prompt template
 */
async function prepareConsolidationPrompt(
  plans: { anthropic: Plan; openai: Plan; google: Plan },
  env: {
    linearTeamId: string;
    linearProjectId: string;
    githubIssueUrl: string;
    issueTitle: string;
  }
): Promise<string> {
  const promptPath = join(__dirname, '..', 'prompts', 'consolidate-and-create-linear.md');
  let template = await readFile(promptPath, 'utf-8');

  // Substitute plan placeholders
  template = template.replace('{{ANTHROPIC_PLAN}}', plans.anthropic.content);
  template = template.replace('{{OPENAI_PLAN}}', plans.openai.content);
  template = template.replace('{{GOOGLE_PLAN}}', plans.google.content);

  // Substitute Linear and GitHub context
  template = template.replaceAll('{{LINEAR_TEAM_ID}}', env.linearTeamId);
  template = template.replaceAll('{{LINEAR_PROJECT_ID}}', env.linearProjectId);
  template = template.replaceAll('{{GITHUB_ISSUE_URL}}', env.githubIssueUrl);
  template = template.replaceAll('{{ISSUE_TITLE}}', env.issueTitle);

  return template;
}

/**
 * Parse the consolidation session response to extract Linear issue information
 */
function parseConsolidationResponse(response: string): ConsolidatedResult {
  console.log('\n=== Parsing consolidation response ===');

  const result: ConsolidatedResult = {
    consolidatedPlan: {
      title: '',
      overview: '',
      steps: [],
      risks: [],
      dependencies: []
    },
    linearIssues: {
      parent: { id: '', identifier: '', url: '' },
      subIssues: []
    },
    rawResponse: response
  };

  // Extract consolidated plan from markdown sections
  const planMatch = response.match(/## Consolidated Implementation Plan\s+([\s\S]*?)(?=\n## |\n---\n|$)/);
  if (planMatch && planMatch[1]) {
    const planSection = planMatch[1];

    // Extract overview
    const overviewMatch = planSection.match(/### Overview\s+([\s\S]*?)(?=\n### |\n\n##|$)/);
    if (overviewMatch && overviewMatch[1]) {
      result.consolidatedPlan.overview = overviewMatch[1].trim();
    }

    // Extract steps
    const stepsMatch = planSection.match(/### Implementation Steps\s+([\s\S]*?)(?=\n### |\n\n##|$)/);
    if (stepsMatch && stepsMatch[1]) {
      const stepsList = stepsMatch[1];
      const stepRegex = /(\d+)\.\s+\*\*(.+?)\*\*\s*[-–]\s*(.+?)(?=\n\d+\.|\n\n|$)/gs;
      let stepMatch;

      while ((stepMatch = stepRegex.exec(stepsList)) !== null) {
        if (stepMatch[1] && stepMatch[2] && stepMatch[3]) {
          result.consolidatedPlan.steps.push({
            number: parseInt(stepMatch[1]),
            title: stepMatch[2].trim(),
            description: stepMatch[3].trim(),
            priority: 'medium'
          });
        }
      }
    }

    // Extract risks
    const risksMatch = planSection.match(/### Risks\s+([\s\S]*?)(?=\n### |\n\n##|$)/);
    if (risksMatch && risksMatch[1]) {
      const risksList = risksMatch[1];
      const riskRegex = /[-*]\s+(.+?)\s*[-–]\s*Mitigation:\s*(.+?)(?=\n[-*]|\n\n|$)/gs;
      let riskMatch;

      while ((riskMatch = riskRegex.exec(risksList)) !== null) {
        if (riskMatch[1] && riskMatch[2]) {
          result.consolidatedPlan.risks.push({
            description: riskMatch[1].trim(),
            mitigation: riskMatch[2].trim()
          });
        }
      }
    }

    // Extract dependencies
    const depsMatch = planSection.match(/### Dependencies\s+([\s\S]*?)(?=\n### |\n\n##|$)/);
    if (depsMatch && depsMatch[1]) {
      const depsList = depsMatch[1];
      const deps = depsList.match(/[-*]\s+(.+?)$/gm);
      if (deps) {
        result.consolidatedPlan.dependencies = deps.map(d => d.replace(/^[-*]\s+/, '').trim());
      }
    }
  }

  // Extract Linear issues
  const linearMatch = response.match(/## Linear Issues Created\s+([\s\S]*?)(?=\n---|\*\*All issues have been created|$)/);
  if (linearMatch && linearMatch[1]) {
    const linearSection = linearMatch[1];

    // Extract parent issue
    const parentIdMatch = linearSection.match(/### Parent Issue\s+[-*]\s+\*\*ID\*\*:\s+(.+?)$/m);
    const parentUrlMatch = linearSection.match(/[-*]\s+\*\*URL\*\*:\s+(.+?)$/m);
    const parentTitleMatch = linearSection.match(/[-*]\s+\*\*Title\*\*:\s+(.+?)$/m);

    if (parentIdMatch && parentIdMatch[1] && parentUrlMatch && parentUrlMatch[1]) {
      result.linearIssues.parent = {
        id: '',
        identifier: parentIdMatch[1].trim(),
        url: parentUrlMatch[1].trim()
      };

      if (parentTitleMatch && parentTitleMatch[1]) {
        result.consolidatedPlan.title = parentTitleMatch[1].trim();
      }
    }

    // Extract sub-issues
    const subIssuesMatch = linearSection.match(/### Sub-Issues\s+([\s\S]*?)(?=\n\n---|\n\n\*\*|$)/);
    if (subIssuesMatch && subIssuesMatch[1]) {
      const subIssuesList = subIssuesMatch[1];
      const subIssueRegex = /(\d+)\.\s+\*\*(.+?)\*\*:\s+(.+?)\s+-\s+(.+?)$/gm;
      let subIssueMatch;

      while ((subIssueMatch = subIssueRegex.exec(subIssuesList)) !== null) {
        if (subIssueMatch[1] && subIssueMatch[2] && subIssueMatch[4]) {
          result.linearIssues.subIssues.push({
            id: '',
            identifier: subIssueMatch[2].trim(),
            url: subIssueMatch[4].trim(),
            step: parseInt(subIssueMatch[1])
          });
        }
      }
    }
  }

  console.log(`Parsed ${result.consolidatedPlan.steps.length} steps, ${result.linearIssues.subIssues.length} sub-issues`);
  return result;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('=== Consolidating Plans and Creating Linear Issues ===\n');

  // Load required environment variables
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const linearApiKey = process.env.LINEAR_API_KEY;
  const linearTeamId = process.env.LINEAR_TEAM_ID || '';
  const linearProjectId = process.env.LINEAR_PROJECT_ID || '';
  const githubIssueUrl = process.env.GITHUB_ISSUE_URL || '';
  const issueTitle = process.env.ISSUE_TITLE || '';

  // Load plans from environment variables
  const anthropicPlan = process.env.ANTHROPIC_PLAN || '';
  const openaiPlan = process.env.OPENAI_PLAN || '';
  const googlePlan = process.env.GOOGLE_PLAN || '';

  // Validate required environment variables
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }
  if (!linearApiKey) {
    throw new Error('LINEAR_API_KEY environment variable is required');
  }
  if (!linearTeamId) {
    throw new Error('LINEAR_TEAM_ID environment variable is required');
  }
  if (!githubIssueUrl) {
    throw new Error('GITHUB_ISSUE_URL environment variable is required');
  }
  if (!issueTitle) {
    throw new Error('ISSUE_TITLE environment variable is required');
  }

  console.log('Configuration:');
  console.log(`- Issue: ${issueTitle}`);
  console.log(`- Linear Team: ${linearTeamId}`);
  console.log(`- Linear Project: ${linearProjectId || '(not set)'}`);
  console.log(`- GitHub Issue: ${githubIssueUrl}`);
  console.log('');

  console.log('Plan lengths:');
  console.log(`- Anthropic: ${anthropicPlan.length} chars`);
  console.log(`- OpenAI: ${openaiPlan.length} chars`);
  console.log(`- Google: ${googlePlan.length} chars`);
  console.log('');

  // Prepare plans object
  const plans = {
    anthropic: { content: anthropicPlan || 'Plan generation failed for this provider' },
    openai: { content: openaiPlan || 'Plan generation failed for this provider' },
    google: { content: googlePlan || 'Plan generation failed for this provider' },
  };

  // Prepare consolidation prompt
  const consolidationPrompt = await prepareConsolidationPrompt(plans, {
    linearTeamId,
    linearProjectId,
    githubIssueUrl,
    issueTitle,
  });

  // Create OpenCode client with Anthropic provider and Linear MCP
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';

  const opcodeConfig = {
    provider: {
      anthropic: {
        options: {
          apiKey: anthropicApiKey,
          timeout: false as const,
        },
      },
    },
    tools: {
      write: true,
      read: true,
      bash: true,
      grep: true,
      webfetch: true,
      linear_: true, // Enable Linear MCP tools
    },
    mcp: {
      linear: {
        type: 'remote' as const,
        url: 'https://mcp.linear.app/mcp',
        headers: {
          Authorization: `Bearer ${linearApiKey}`,
        },
      },
    },
  };

  const { client, server } = await createOpencode({
    hostname: '127.0.0.1',
    port: 0,
    config: opcodeConfig,
  });

  try {
    console.log(`OpenCode server started at ${server.url}`);

    // Create consolidation session
    console.log('Creating consolidation session...');
    const sessionResponse = await client.session.create({
      body: { title: `Consolidate Plans: ${issueTitle}` },
    });

    if (!sessionResponse.data) {
      throw new Error('Failed to create consolidation session');
    }

    const session = sessionResponse.data;
    console.log(`Session created: ${session.id}`);

    // Send consolidation prompt
    console.log('Sending consolidation prompt to Claude...');
    console.log('The model will:');
    console.log('  1. Analyze and consolidate the 3 plans');
    console.log('  2. Create Linear parent issue');
    console.log('  3. Create Linear sub-issues for each step');
    console.log('');

    const promptResponse = await client.session.prompt({
      path: { id: session.id },
      body: {
        model: {
          providerID: 'anthropic',
          modelID: model,
        },
        parts: [{ type: 'text', text: consolidationPrompt }],
      },
    });

    if (!promptResponse.data) {
      throw new Error('Failed to get consolidation response');
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

    // Extract and parse response
    const responseText = extractTextFromParts(promptResponse.data.parts);
    const result = parseConsolidationResponse(responseText);

    // ========================================
    // Output Results
    // ========================================

    console.log('\n' + '='.repeat(60));
    console.log('SUCCESS! All tasks completed.');
    console.log('='.repeat(60));
    console.log(`\nSUCCESS: Consolidated Plan: ${result.consolidatedPlan.steps.length} implementation steps`);
    console.log(`SUCCESS: Linear Parent Issue: ${result.linearIssues.parent.identifier}`);
    console.log(`  URL: ${result.linearIssues.parent.url}`);
    console.log(`SUCCESS: Linear Sub-Issues: ${result.linearIssues.subIssues.length} created`);

    if (result.linearIssues.subIssues.length > 0) {
      console.log('\n  Sub-issues:');
      result.linearIssues.subIssues.forEach(issue => {
        console.log(`    - ${issue.identifier}: ${issue.url}`);
      });
    }

    // Output for GitHub Actions
    console.log('\n::set-output name=parent_issue_id::' + result.linearIssues.parent.identifier);
    console.log('::set-output name=parent_issue_url::' + result.linearIssues.parent.url);
    console.log('::set-output name=sub_issues_count::' + result.linearIssues.subIssues.length);

    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('ERROR:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    console.log('\nShutting down OpenCode server...');
    server.close();
  }
}

// Run the main function
main().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
