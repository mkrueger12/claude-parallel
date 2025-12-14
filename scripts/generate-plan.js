#!/usr/bin/env node

import { createOpencodeClient } from '@opencode-ai/sdk';
import { LinearClient } from '@linear/sdk';
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuration from environment variables
const config = {
  issueTitle: process.env.ISSUE_TITLE || '',
  issueBody: process.env.ISSUE_BODY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  linearApiKey: process.env.LINEAR_API_KEY || '',
  linearTeamId: process.env.LINEAR_TEAM_ID || '',
  opencodeBaseUrl: process.env.OPENCODE_BASE_URL || 'http://localhost:4096'
};

// Provider configurations
const providers = [
  { name: 'Anthropic', providerID: 'anthropic', modelID: 'claude-sonnet-4-20250514' },
  { name: 'Google', providerID: 'google', modelID: 'gemini-2.0-flash' },
  { name: 'OpenAI', providerID: 'openai', modelID: 'gpt-4o' }
];

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const required = [
    'ISSUE_TITLE',
    'ISSUE_BODY',
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'LINEAR_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('Error: Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    process.exit(1);
  }
}

/**
 * Read and substitute placeholders in a template file
 */
async function readTemplate(filename, substitutions) {
  try {
    const templatePath = join(projectRoot, 'prompts', filename);
    let content = await readFile(templatePath, 'utf-8');

    // Substitute placeholders
    for (const [key, value] of Object.entries(substitutions)) {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), value);
    }

    return content;
  } catch (error) {
    console.error(`Error reading template ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Generate a plan using a specific AI provider
 */
async function generatePlanWithProvider(client, provider, prompt) {
  try {
    console.log(`Generating plan with ${provider.name}...`);

    // Create a new session
    const session = await client.session.create();
    console.log(`  Created session: ${session.id}`);

    // Send the prompt
    const response = await client.session.prompt({
      path: { id: session.id },
      body: {
        model: {
          providerID: provider.providerID,
          modelID: provider.modelID
        },
        parts: [{ type: 'text', text: prompt }]
      }
    });

    console.log(`  Received response from ${provider.name}`);

    // Extract the text content from the response
    let planText = '';
    if (response.parts && response.parts.length > 0) {
      planText = response.parts.map(part => part.text || '').join('');
    }

    // Parse JSON from response
    // Handle potential markdown code blocks
    let jsonText = planText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const plan = JSON.parse(jsonText);
    console.log(`  Successfully parsed plan from ${provider.name}`);

    return {
      provider: provider.name,
      plan: plan
    };
  } catch (error) {
    console.error(`Error generating plan with ${provider.name}:`, error.message);
    throw error;
  }
}

/**
 * Consolidate multiple plans into one unified plan
 */
async function consolidatePlans(client, planPrompt, plans) {
  try {
    console.log('Consolidating plans...');

    // Prepare substitutions with the three plans
    const substitutions = {
      FEATURE_REQUEST: config.issueTitle + '\n\n' + config.issueBody,
      PLAN_1: JSON.stringify(plans[0].plan, null, 2),
      PLAN_2: JSON.stringify(plans[1].plan, null, 2),
      PLAN_3: JSON.stringify(plans[2].plan, null, 2)
    };

    const consolidationPrompt = await readTemplate('plan-consolidation.md', substitutions);

    // Create a new session for consolidation
    const session = await client.session.create();
    console.log(`  Created consolidation session: ${session.id}`);

    // Use Claude for consolidation
    const response = await client.session.prompt({
      path: { id: session.id },
      body: {
        model: {
          providerID: 'anthropic',
          modelID: 'claude-sonnet-4-20250514'
        },
        parts: [{ type: 'text', text: consolidationPrompt }]
      }
    });

    console.log('  Received consolidation response');

    // Extract and parse the consolidated plan
    let planText = '';
    if (response.parts && response.parts.length > 0) {
      planText = response.parts.map(part => part.text || '').join('');
    }

    // Handle potential markdown code blocks
    let jsonText = planText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const consolidated = JSON.parse(jsonText);
    console.log('  Successfully parsed consolidated plan');

    return consolidated;
  } catch (error) {
    console.error('Error consolidating plans:', error.message);
    throw error;
  }
}

/**
 * Create Linear issues for the consolidated plan
 */
async function createLinearIssues(consolidated) {
  try {
    console.log('Creating Linear issues...');

    const linearClient = new LinearClient({
      apiKey: config.linearApiKey
    });

    // Get team ID (use provided one or get the first team)
    let teamId = config.linearTeamId;
    if (!teamId) {
      console.log('  No LINEAR_TEAM_ID provided, fetching teams...');
      const teams = await linearClient.teams();
      if (teams.nodes.length === 0) {
        throw new Error('No Linear teams found');
      }
      teamId = teams.nodes[0].id;
      console.log(`  Using team: ${teams.nodes[0].name} (${teamId})`);
    }

    // Format the consolidated plan as markdown for the parent issue
    const parentDescription = formatPlanAsMarkdown(consolidated.consolidated_plan);

    // Create parent issue
    console.log('  Creating parent issue...');
    const parentIssuePayload = await linearClient.createIssue({
      teamId: teamId,
      title: `Implementation Plan: ${config.issueTitle}`,
      description: parentDescription
    });

    const parentIssue = await parentIssuePayload.issue;
    if (!parentIssue) {
      throw new Error('Failed to create parent issue');
    }

    console.log(`  Created parent issue: ${parentIssue.identifier}`);

    // Create sub-issues
    const subIssues = [];
    for (const subIssue of consolidated.sub_issues || []) {
      console.log(`  Creating sub-issue: ${subIssue.title}...`);

      const subIssuePayload = await linearClient.createIssue({
        teamId: teamId,
        title: subIssue.title,
        description: subIssue.description,
        parentId: parentIssue.id
      });

      const createdSubIssue = await subIssuePayload.issue;
      if (createdSubIssue) {
        subIssues.push({
          id: createdSubIssue.id,
          identifier: createdSubIssue.identifier,
          url: createdSubIssue.url
        });
        console.log(`    Created: ${createdSubIssue.identifier}`);
      }
    }

    console.log(`  Created ${subIssues.length} sub-issues`);

    return {
      parent: {
        id: parentIssue.id,
        identifier: parentIssue.identifier,
        url: parentIssue.url
      },
      subIssues: subIssues
    };
  } catch (error) {
    console.error('Error creating Linear issues:', error.message);
    throw error;
  }
}

/**
 * Format a plan as markdown for Linear
 */
function formatPlanAsMarkdown(plan) {
  let markdown = `## Overview\n\n${plan.overview}\n\n`;

  markdown += `## Implementation Tasks\n\n`;
  plan.tasks.forEach((task, index) => {
    markdown += `### ${task.title}\n\n`;
    markdown += `${task.description}\n\n`;
    if (task.files_to_change && task.files_to_change.length > 0) {
      markdown += `**Files to modify:**\n`;
      task.files_to_change.forEach(file => {
        markdown += `- \`${file}\`\n`;
      });
      markdown += '\n';
    }
  });

  markdown += `## Success Criteria\n\n`;
  plan.success_criteria.forEach((criterion, index) => {
    markdown += `${index + 1}. ${criterion}\n`;
  });

  return markdown;
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('Starting plan generation...\n');

    // Validate environment
    validateEnvironment();

    // Initialize OpenCode client
    const opencodeClient = createOpencodeClient({
      baseUrl: config.opencodeBaseUrl
    });

    // Read the plan generation template
    const featureRequest = config.issueTitle + '\n\n' + config.issueBody;
    const planPrompt = await readTemplate('plan-generation.md', {
      FEATURE_REQUEST: featureRequest
    });

    // Generate plans from all three providers in parallel
    console.log('Generating plans from 3 providers in parallel...\n');
    const planPromises = providers.map(provider =>
      generatePlanWithProvider(opencodeClient, provider, planPrompt)
    );

    const plans = await Promise.all(planPromises);
    console.log(`\nSuccessfully generated ${plans.length} plans\n`);

    // Consolidate the plans
    const consolidated = await consolidatePlans(opencodeClient, planPrompt, plans);
    console.log('\nSuccessfully consolidated plans\n');

    // Create Linear issues
    const linearIssues = await createLinearIssues(consolidated);
    console.log('\nSuccessfully created Linear issues\n');

    // Output results to JSON file
    const output = {
      plans: plans,
      consolidated: consolidated,
      linearParentIssue: linearIssues.parent,
      linearSubIssues: linearIssues.subIssues
    };

    const outputPath = join(projectRoot, 'plan-output.json');
    await writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(`Results written to: ${outputPath}\n`);

    // Print summary
    console.log('=== Summary ===');
    console.log(`Parent Issue: ${linearIssues.parent.identifier}`);
    console.log(`URL: ${linearIssues.parent.url}`);
    console.log(`Sub-issues: ${linearIssues.subIssues.length}`);
    linearIssues.subIssues.forEach(issue => {
      console.log(`  - ${issue.identifier}: ${issue.url}`);
    });

    console.log('\nPlan generation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n=== Error ===');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run main function
main();
