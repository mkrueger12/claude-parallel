#!/usr/bin/env node
/**
 * generate-and-create-linear.ts
 *
 * Combined script that:
 * 1. Generates implementation plans from 3 AI providers in parallel
 * 2. Consolidates the plans into a unified strategy
 * 3. Creates Linear issues (parent + sub-issues) using MCP tools
 *
 * All in one execution - no intermediate file artifacts needed.
 */
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createOpencode } from '@opencode-ai/sdk';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROVIDERS = [
    {
        name: 'anthropic',
        providerID: 'anthropic',
        modelEnvVar: 'ANTHROPIC_MODEL',
        apiKeyEnvVar: 'CLAUDE_CODE_OAUTH_TOKEN',
        defaultModel: 'claude-opus-4-5-20251101',
    },
    {
        name: 'openai',
        providerID: 'openai',
        modelEnvVar: 'OPENAI_MODEL',
        apiKeyEnvVar: 'OPENAI_API_KEY',
        defaultModel: 'gpt-5.2',
    },
    {
        name: 'google',
        providerID: 'google',
        modelEnvVar: 'GOOGLE_MODEL',
        apiKeyEnvVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
        defaultModel: 'gemini-3-pro-preview',
    },
];
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Extract text from message parts
 */
function extractTextFromParts(parts) {
    if (!Array.isArray(parts))
        return '';
    return parts
        .filter(part => part.type === 'text')
        .map(part => part.text || '')
        .join('\n');
}
/**
 * Read the plan generation prompt template
 */
async function preparePlanPrompt(issueTitle, issueBody) {
    const promptPath = join(__dirname, '..', 'prompts', 'plan-generation.md');
    const template = await readFile(promptPath, 'utf-8');
    return template
        .replace(/\{\{ISSUE_TITLE\}\}/g, issueTitle)
        .replace(/\{\{ISSUE_BODY\}\}/g, issueBody);
}
/**
 * Read the consolidation prompt template
 */
async function prepareConsolidationPrompt(plans, env) {
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
function parseConsolidationResponse(response) {
    console.log('\n=== Parsing consolidation response ===');
    const result = {
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
/**
 * Validate API key format for a provider
 */
function validateApiKeyFormat(provider, apiKey) {
    if (!apiKey || apiKey.trim() === '') {
        return { valid: false, error: 'Key is empty' };
    }
    // Provider-specific format validation
    switch (provider) {
        case 'anthropic':
            // Anthropic keys start with 'sk-ant-' or can be OAuth tokens
            if (!apiKey.startsWith('sk-ant-') && apiKey.length < 20) {
                return { valid: false, error: 'Invalid format (expected sk-ant-* or OAuth token)' };
            }
            break;
        case 'openai':
            // OpenAI keys start with 'sk-'
            if (!apiKey.startsWith('sk-')) {
                return { valid: false, error: 'Invalid format (expected sk-*)' };
            }
            break;
        case 'google':
            // Google API keys are typically 39 characters
            if (apiKey.length < 30) {
                return { valid: false, error: 'Key appears too short for Google API' };
            }
            break;
    }
    return { valid: true };
}
/**
 * Validate all provider API keys before starting plan generation
 */
function validateApiKeys() {
    console.log('Validating API keys...\n');
    const results = PROVIDERS.map(provider => {
        const apiKey = process.env[provider.apiKeyEnvVar];
        const isSet = apiKey !== undefined && apiKey !== '';
        if (!isSet) {
            return {
                provider: provider.name,
                envVar: provider.apiKeyEnvVar,
                isSet: false,
                isValid: false,
                error: 'Not set',
            };
        }
        const formatCheck = validateApiKeyFormat(provider.name, apiKey);
        return {
            provider: provider.name,
            envVar: provider.apiKeyEnvVar,
            isSet: true,
            isValid: formatCheck.valid,
            error: formatCheck.error,
        };
    });
    // Log results
    const validCount = results.filter(r => r.isValid).length;
    const totalCount = results.length;
    results.forEach(r => {
        const status = r.isValid ? 'OK' : 'INVALID';
        const details = r.error ? ` (${r.error})` : '';
        const keyPreview = r.isSet ? `[${process.env[r.envVar]?.slice(0, 8)}...]` : '[not set]';
        console.log(`  [${r.provider}] ${status} - ${r.envVar} ${keyPreview}${details}`);
    });
    console.log(`\nAPI key validation: ${validCount}/${totalCount} valid\n`);
    return {
        allValid: validCount === totalCount,
        results,
    };
}
// ============================================================================
// Plan Generation
// ============================================================================
/**
 * Generate a plan from a single provider
 */
async function generatePlanFromProvider(client, provider, prompt) {
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
        const sessionResponse = await client.session.create({
            body: { title: `Plan generation for ${provider.name}` },
        });
        if (!sessionResponse.data) {
            throw new Error('Failed to create session: no data in response');
        }
        const session = sessionResponse.data;
        console.log(`[${provider.name}] Session created: ${session.id}`);
        console.log(`[${provider.name}] Sending prompt (${prompt.length} chars)...`);
        const promptResponse = await Promise.race([
            client.session.prompt({
                path: { id: session.id },
                body: {
                    model: {
                        providerID: provider.providerID,
                        modelID: model,
                    },
                    parts: [{ type: 'text', text: prompt }],
                },
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 10m')), 600000)),
        ]);
        if (!promptResponse.data) {
            throw new Error('Failed to get response: no data in response');
        }
        // Log raw response structure for debugging
        const dataKeys = Object.keys(promptResponse.data);
        console.log(`[${provider.name}] Response data keys: [${dataKeys.join(', ')}]`);
        // Check for provider-level errors in the response
        const responseInfo = promptResponse.data.info;
        if (responseInfo?.error) {
            const err = responseInfo.error;
            const errorName = err.name;
            const errorData = 'data' in err ? err.data : {};
            const errorMessage = 'message' in errorData ? errorData.message : JSON.stringify(errorData);
            console.error(`[${provider.name}] ERROR: Provider error: ${errorName}`);
            console.error(`[${provider.name}]   Message: ${errorMessage}`);
            // Log additional details for API errors
            if (errorName === 'APIError' && 'statusCode' in errorData) {
                console.error(`[${provider.name}]   Status code: ${errorData.statusCode}`);
                if ('responseBody' in errorData && errorData.responseBody) {
                    console.error(`[${provider.name}]   Response body: ${String(errorData.responseBody).slice(0, 500)}`);
                }
            }
            return {
                provider: provider.name,
                success: false,
                error: `${errorName}: ${errorMessage}`,
            };
        }
        const responseText = extractTextFromParts(promptResponse.data.parts);
        // Debug logging for troubleshooting empty responses
        const partsCount = promptResponse.data.parts?.length ?? 0;
        const partsTypes = promptResponse.data.parts?.map(p => p.type).join(', ') || 'none';
        const finishReason = responseInfo?.finish || 'unknown';
        console.log(`[${provider.name}] Response received: ${partsCount} parts (types: ${partsTypes}), finish: ${finishReason}`);
        // Treat empty responses as errors - providers should always return content
        if (responseText.length === 0) {
            console.error(`[${provider.name}] ERROR: Empty response (0 chars) - provider returned no text content`);
            console.error(`[${provider.name}]   Debug: parts=${partsCount}, types=[${partsTypes}], finish=${finishReason}`);
            // Log token usage if available - helps diagnose if request was received but returned empty
            if (responseInfo?.tokens) {
                console.error(`[${provider.name}]   Tokens: input=${responseInfo.tokens.input}, output=${responseInfo.tokens.output}`);
            }
            // Log raw response info for debugging - captures all fields
            const responseInfoStr = responseInfo ? JSON.stringify(responseInfo, null, 2) : 'undefined';
            console.error(`[${provider.name}]   Raw responseInfo: ${responseInfoStr.split('\n').map(l => `    ${l}`).join('\n')}`);
            // Also log the full response data when empty - helps debug missing fields
            console.error(`[${provider.name}]   Full response.data: ${JSON.stringify(promptResponse.data, null, 2).split('\n').map(l => `    ${l}`).join('\n')}`);
            if (promptResponse.data.parts && promptResponse.data.parts.length > 0) {
                console.error(`[${provider.name}]   Raw parts preview: ${JSON.stringify(promptResponse.data.parts).slice(0, 500)}`);
            }
            // Check for finish reasons that indicate problems
            if (finishReason === 'unknown' || !responseInfo) {
                console.error(`[${provider.name}]   WARNING: Provider may have failed silently (no finish reason or response info)`);
            }
            return {
                provider: provider.name,
                success: false,
                error: `Empty response from provider (0 chars). Parts: ${partsCount}, types: [${partsTypes}], finish: ${finishReason}`,
            };
        }
        // Treat the raw response text as the plan content
        const plan = { content: responseText };
        console.log(`[${provider.name}] SUCCESS: Generated plan (${plan.content.length} chars)`);
        return {
            provider: provider.name,
            success: true,
            plan,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${provider.name}] ERROR: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
            console.error(`[${provider.name}]   Stack trace: ${error.stack.split('\n').slice(1, 4).join('\n    ')}`);
        }
        return {
            provider: provider.name,
            success: false,
            error: errorMessage,
        };
    }
}
// ============================================================================
// Main Execution
// ============================================================================
async function main() {
    console.log('=== Multi-Provider Plan Generation with Linear Integration ===\n');
    // Parse command line arguments
    const args = process.argv.slice(2);
    let issueTitle;
    let issueBody;
    if (args.length >= 2) {
        issueTitle = args[0];
        issueBody = args[1];
    }
    else if (!process.stdin.isTTY) {
        const chunks = [];
        for await (const chunk of process.stdin) {
            chunks.push(chunk);
        }
        const input = Buffer.concat(chunks).toString('utf-8');
        const lines = input.split('\n');
        issueTitle = lines[0] || 'Untitled Issue';
        issueBody = lines.slice(1).join('\n') || 'No description provided';
    }
    else {
        console.error('Usage: generate-and-create-linear.ts <issue-title> <issue-body>');
        console.error('   or: echo "title\\nbody" | generate-and-create-linear.ts');
        process.exit(1);
    }
    // Load environment variables
    const linearApiKey = process.env.LINEAR_API_KEY;
    const linearTeamId = process.env.LINEAR_TEAM_ID || '';
    const linearProjectId = process.env.LINEAR_PROJECT_ID || '';
    const githubIssueUrl = process.env.GITHUB_ISSUE_URL || '';
    // Validate required environment variables
    if (!linearApiKey) {
        throw new Error('LINEAR_API_KEY environment variable is required');
    }
    if (!linearTeamId) {
        throw new Error('LINEAR_TEAM_ID environment variable is required');
    }
    if (!githubIssueUrl) {
        throw new Error('GITHUB_ISSUE_URL environment variable is required');
    }
    console.log('Configuration:');
    console.log(`- Issue: ${issueTitle}`);
    console.log(`- Linear Team: ${linearTeamId}`);
    console.log(`- Linear Project: ${linearProjectId || '(not set)'}`);
    console.log(`- GitHub Issue: ${githubIssueUrl}`);
    console.log('');
    // ========================================
    // STEP 0: Validate API Keys
    // ========================================
    const keyValidation = validateApiKeys();
    const invalidKeys = keyValidation.results.filter(r => !r.isValid);
    if (invalidKeys.length === PROVIDERS.length) {
        console.error('FATAL: No valid API keys found. Cannot proceed.');
        console.error('Please set at least one of:');
        PROVIDERS.forEach(p => console.error(`  - ${p.apiKeyEnvVar}`));
        process.exit(1);
    }
    if (invalidKeys.length > 0) {
        console.log(`WARNING: ${invalidKeys.length} provider(s) will be skipped due to missing/invalid API keys.\n`);
    }
    // ========================================
    // STEP 1: Generate Plans from All Providers
    // ========================================
    console.log('STEP 1: Generating plans from available providers in parallel...\n');
    const planPrompt = await preparePlanPrompt(issueTitle, issueBody);
    const { client, server } = await createOpencode({
        hostname: '127.0.0.1',
        port: 0,
        config: {
            provider: {
                anthropic: {
                    options: {
                        apiKey: process.env.CLAUDE_CODE_OAUTH_TOKEN,
                        timeout: 600_000, // 10 minutes
                    },
                },
                openai: {
                    options: {
                        apiKey: process.env.OPENAI_API_KEY,
                        timeout: 600_000, // 10 minutes
                    },
                },
                google: {
                    options: {
                        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
                        timeout: 600_000, // 10 minutes
                    },
                },
            },
            mcp: {
                linear: {
                    type: "remote",
                    url: "https://mcp.linear.app/mcp",
                    headers: {
                        "Authorization": `Bearer ${linearApiKey}`
                    }
                }
            }
        },
    });
    console.log(`OpenCode server started at ${server.url}\n`);
    try {
        const results = await Promise.all(PROVIDERS.map(provider => generatePlanFromProvider(client, provider, planPrompt)));
        // Check for failures and log summary
        const successCount = results.filter(r => r.success).length;
        const failedResults = results.filter(r => !r.success);
        const failureCount = failedResults.length;
        console.log(`\nPlan generation: ${successCount}/${PROVIDERS.length} successful`);
        if (failureCount > 0) {
            console.error(`\nWARNING: ${failureCount} provider(s) failed:`);
            failedResults.forEach(r => {
                console.error(`  - [${r.provider}] ${r.error}`);
            });
        }
        if (failureCount === PROVIDERS.length) {
            console.error('\nFATAL: All providers failed! Check your API keys and network connection.');
            process.exit(1);
        }
        // Get successful plans
        const plans = {
            anthropic: results.find(r => r.provider === 'anthropic' && r.success)?.plan,
            openai: results.find(r => r.provider === 'openai' && r.success)?.plan,
            google: results.find(r => r.provider === 'google' && r.success)?.plan,
        };
        // Use placeholder for any failed plans
        const placeholderPlan = {
            content: 'Plan generation failed for this provider'
        };
        // ========================================
        // STEP 2: Consolidate Plans and Create Linear Issues
        // ========================================
        console.log('\n' + '='.repeat(60));
        console.log('STEP 2: Consolidating plans and creating Linear issues...\n');
        const consolidationPrompt = await prepareConsolidationPrompt({
            anthropic: plans.anthropic || placeholderPlan,
            openai: plans.openai || placeholderPlan,
            google: plans.google || placeholderPlan,
        }, {
            linearTeamId,
            linearProjectId,
            githubIssueUrl,
            issueTitle,
        });
        console.log('Creating consolidation session with Linear MCP access...');
        const consolidationSession = await client.session.create({
            body: { title: `Consolidate Plans: ${issueTitle}` },
        });
        if (!consolidationSession.data) {
            throw new Error('Failed to create consolidation session');
        }
        console.log('Sending consolidation prompt to model...');
        console.log('The model will:');
        console.log('  1. Analyze and consolidate the 3 plans');
        console.log('  2. Create Linear parent issue');
        console.log('  3. Create Linear sub-issues for each step');
        console.log('');
        const consolidationResponse = await client.session.prompt({
            path: { id: consolidationSession.data.id },
            body: {
                model: {
                    providerID: 'anthropic',
                    modelID: process.env.ANTHROPIC_MODEL || 'claude-opus-4-5-20251101',
                },
                parts: [{ type: 'text', text: consolidationPrompt }],
            },
        });
        if (!consolidationResponse.data) {
            throw new Error('Failed to get consolidation response');
        }
        const responseText = extractTextFromParts(consolidationResponse.data.parts);
        const result = parseConsolidationResponse(responseText);
        // ========================================
        // STEP 3: Output Results
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
        // Output JSON for GitHub Actions to consume
        console.log('\n::set-output name=parent_issue_id::' + result.linearIssues.parent.identifier);
        console.log('::set-output name=parent_issue_url::' + result.linearIssues.parent.url);
        console.log('::set-output name=sub_issues_count::' + result.linearIssues.subIssues.length);
        process.exit(0);
    }
    finally {
        console.log('\nShutting down OpenCode server...');
        server.close();
    }
}
// Run the main function
main().catch(error => {
    console.error('\n=== FATAL ERROR ===');
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=generate-and-create-linear.js.map