#!/usr/bin/env bun
/**
 * parallel-impl.ts - Run N parallel Claude Code implementations using the Claude Agent SDK
 *
 * This TypeScript implementation replaces the shell script version with SDK-based execution.
 * It supports both CLAUDE_CODE_OAUTH_TOKEN and ANTHROPIC_API_KEY authentication.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Configuration constants
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WORKTREES_DIR = "../parallel-impls";
const NUM_IMPLEMENTATIONS = 3;
const MODEL = "claude-opus-4-5-20251101";

// Colors for terminal output
const COLORS = {
  RED: '\x1b[0;31m',
  GREEN: '\x1b[0;32m',
  YELLOW: '\x1b[1;33m',
  BLUE: '\x1b[0;34m',
  NC: '\x1b[0m', // No Color
};

interface ReviewResult {
  best: number;
  reasoning: string;
  quality_score: number;
  completeness_score: number;
}

/**
 * Validate that required environment variables are set
 */
function validateEnvironment(): void {
  const hasOAuthToken = !!process.env.CLAUDE_CODE_OAUTH_TOKEN;
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  if (!hasOAuthToken && !hasApiKey) {
    console.error(`${COLORS.RED}Error: No authentication credentials found${COLORS.NC}`);
    console.error("");
    console.error("Please set one of the following environment variables:");
    console.error("  - CLAUDE_CODE_OAUTH_TOKEN (preferred, run: claude setup-token)");
    console.error("  - ANTHROPIC_API_KEY");
    console.error("");
    process.exit(1);
  }

  console.log(`${COLORS.GREEN}✓ Authentication configured${COLORS.NC}`);
}

/**
 * Clean up old worktrees if they exist
 */
function cleanupOldWorktrees(): void {
  if (!existsSync(WORKTREES_DIR)) {
    return;
  }

  console.log(`${COLORS.YELLOW}Cleaning up old worktrees...${COLORS.NC}`);

  for (let i = 1; i <= NUM_IMPLEMENTATIONS; i++) {
    const worktreePath = `${WORKTREES_DIR}/impl-${i}`;
    if (existsSync(worktreePath)) {
      try {
        execSync(`git worktree remove "${worktreePath}" --force`, { stdio: 'ignore' });
      } catch (error) {
        // Ignore errors - worktree may not exist
      }
    }
  }

  try {
    execSync(`rm -rf "${WORKTREES_DIR}"`, { stdio: 'ignore' });
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Create git worktrees for parallel implementations
 */
function createWorktrees(timestamp: number): void {
  // Create worktrees directory
  mkdirSync(WORKTREES_DIR, { recursive: true });

  console.log(`${COLORS.BLUE}Step 1: Creating git worktrees${COLORS.NC}`);

  for (let i = 1; i <= NUM_IMPLEMENTATIONS; i++) {
    const branch = `impl-${timestamp}-${i}`;
    const worktreePath = `${WORKTREES_DIR}/impl-${i}`;

    console.log(`  Creating worktree ${i} (branch: ${branch})...`);
    execSync(`git worktree add "${worktreePath}" -b "${branch}"`, { stdio: 'ignore' });
  }

  console.log(`${COLORS.GREEN}✓ Worktrees created${COLORS.NC}`);
  console.log("");
}

/**
 * Load a prompt template from file
 */
function loadPromptTemplate(path: string): string {
  if (!existsSync(path)) {
    console.error(`${COLORS.RED}Error: Prompt template not found at ${path}${COLORS.NC}`);
    process.exit(1);
  }
  return readFileSync(path, 'utf-8');
}

/**
 * Substitute template variables ({{VAR}}) with values
 */
function substituteTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

/**
 * Run a Claude implementation using the SDK
 */
async function runImplementation(
  worktreeDir: string,
  prompt: string,
  implNumber: number
): Promise<boolean> {
  console.log(`  ${COLORS.BLUE}→${COLORS.NC} Implementation ${implNumber} starting...`);

  let result = "";
  const resultPath = join(worktreeDir, "result.json");
  const errorPath = join(worktreeDir, "error.log");

  try {
    // Use the Claude Agent SDK query() function
    for await (const message of query({
      prompt,
      options: {
        model: MODEL,
        cwd: worktreeDir,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
      }
    })) {
      // Collect assistant messages with text content
      if (message.type === "assistant" && message.message?.content) {
        for (const block of message.message.content) {
          if ("text" in block) {
            result += block.text;
          }
        }
      } else if (message.type === "result") {
        if (message.subtype === "success") {
          result = message.result || result;
        } else {
          // Handle error subtypes: error_during_execution, error_max_turns, etc.
          const errors = 'errors' in message ? message.errors : [];
          throw new Error(errors.join('; ') || "Unknown error");
        }
      }
    }

    // Write result to file for debugging
    writeFileSync(resultPath, JSON.stringify({
      content: [{ text: result }]
    }, null, 2));

    console.log(`  ${COLORS.GREEN}✓${COLORS.NC} Implementation ${implNumber} complete`);
    return true;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    writeFileSync(errorPath, errorMessage);
    console.log(`  ${COLORS.RED}✗${COLORS.NC} Implementation ${implNumber} failed (see error.log)`);
    return false;
  }
}

/**
 * Run parallel implementations
 */
async function runParallelImplementations(prompt: string, timestamp: number): Promise<void> {
  console.log(`${COLORS.BLUE}Step 2: Running Claude Code in parallel${COLORS.NC}`);
  console.log(`${COLORS.YELLOW}This may take several minutes...${COLORS.NC}`);
  console.log("");

  // Run all implementations in parallel
  const promises = [];
  for (let i = 1; i <= NUM_IMPLEMENTATIONS; i++) {
    const worktreeDir = join(process.cwd(), `${WORKTREES_DIR}/impl-${i}`);
    promises.push(runImplementation(worktreeDir, prompt, i));
  }

  await Promise.all(promises);

  console.log("");
  console.log(`${COLORS.GREEN}✓ All implementations complete${COLORS.NC}`);
  console.log("");

  // Check for failures
  let failed = false;
  for (let i = 1; i <= NUM_IMPLEMENTATIONS; i++) {
    const resultPath = join(process.cwd(), `${WORKTREES_DIR}/impl-${i}/result.json`);
    if (!existsSync(resultPath)) {
      console.log(`${COLORS.RED}Warning: Implementation ${i} failed${COLORS.NC}`);
      failed = true;
    }
  }

  if (failed) {
    console.log(`${COLORS.YELLOW}Some implementations failed. Review continues with successful ones.${COLORS.NC}`);
    console.log("");
  }
}

/**
 * Run review process to select best implementation
 */
async function runReview(prompt: string): Promise<string> {
  console.log(`${COLORS.BLUE}Step 3: Reviewing implementations${COLORS.NC}`);
  console.log(`${COLORS.YELLOW}Starting review process...${COLORS.NC}`);

  let result = "";

  try {
    // Use the Claude Agent SDK query() function
    for await (const message of query({
      prompt,
      options: {
        model: MODEL,
        cwd: process.cwd(),
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
      }
    })) {
      // Collect assistant messages with text content
      if (message.type === "assistant" && message.message?.content) {
        for (const block of message.message.content) {
          if ("text" in block) {
            result += block.text;
          }
        }
      } else if (message.type === "result") {
        if (message.subtype === "success") {
          result = message.result || result;
        } else {
          // Handle error subtypes: error_during_execution, error_max_turns, etc.
          const errors = 'errors' in message ? message.errors : [];
          throw new Error(errors.join('; ') || "Unknown error");
        }
      }
    }

    // Write result to file for debugging
    writeFileSync("review-result.json", JSON.stringify({
      content: [{ text: result }]
    }, null, 2));

    console.log(`${COLORS.GREEN}✓ Review complete${COLORS.NC}`);
    console.log("");

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    writeFileSync("review-error.log", errorMessage);
    console.error(`${COLORS.RED}Error: Review failed${COLORS.NC}`);
    console.error(errorMessage);
    process.exit(1);
  }
}

/**
 * Parse review result to extract decision
 */
function parseReviewResult(response: string): ReviewResult {
  try {
    // Try to parse the response directly as JSON
    const parsed = JSON.parse(response);
    if (parsed.best !== undefined) {
      return parsed as ReviewResult;
    }
  } catch (e) {
    // Not direct JSON, might be wrapped
  }

  // Try to extract JSON from markdown code blocks or other formatting
  const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.best !== undefined) {
        return parsed as ReviewResult;
      }
    } catch (e) {
      // Continue to other attempts
    }
  }

  // Try to find raw JSON in the text
  const jsonObjectMatch = response.match(/\{[\s\S]*"best"[\s\S]*?\}/);
  if (jsonObjectMatch) {
    try {
      const parsed = JSON.parse(jsonObjectMatch[0]);
      if (parsed.best !== undefined) {
        return parsed as ReviewResult;
      }
    } catch (e) {
      // Continue
    }
  }

  console.error(`${COLORS.RED}Error: Could not parse review decision${COLORS.NC}`);
  console.error("Review output:");
  console.error(response);
  process.exit(1);
}

/**
 * Create a draft PR with the winning implementation
 */
function createPR(featureRequest: string, winningBranch: string, reviewResult: ReviewResult): void {
  console.log(`${COLORS.BLUE}Step 4: Creating draft PR${COLORS.NC}`);

  // Check out the winning branch
  execSync(`git checkout "${winningBranch}"`, { stdio: 'ignore' });

  const prBody = `## AI-Generated Implementation (Best of ${NUM_IMPLEMENTATIONS})

**Selected:** Implementation ${reviewResult.best}

**Scores:**
- Quality: ${reviewResult.quality_score}/100
- Completeness: ${reviewResult.completeness_score}/100

**Reasoning:**
${reviewResult.reasoning}

---
*Generated by parallel Claude Code workflow*`;

  try {
    const prUrl = execSync(
      `gh pr create --draft --title "Feature: ${featureRequest}" --body "${prBody.replace(/"/g, '\\"')}"`,
      { encoding: 'utf-8' }
    );

    writeFileSync("pr-url.txt", prUrl);
    console.log(`${COLORS.GREEN}✓ Draft PR created${COLORS.NC}`);
    console.log(prUrl.trim());
    console.log("");

  } catch (error) {
    console.log(`${COLORS.YELLOW}Note: PR creation failed (you may need to push first)${COLORS.NC}`);
    console.log(`You can create it manually from branch: ${winningBranch}`);
    console.log("");
  }
}

/**
 * Clean up non-winning worktrees
 */
function cleanup(timestamp: number, winner: number): void {
  console.log(`${COLORS.BLUE}Step 5: Cleanup${COLORS.NC}`);

  for (let i = 1; i <= NUM_IMPLEMENTATIONS; i++) {
    if (i !== winner) {
      console.log(`  Removing worktree ${i}...`);
      const worktreePath = `${WORKTREES_DIR}/impl-${i}`;
      const branch = `impl-${timestamp}-${i}`;

      try {
        execSync(`git worktree remove "${worktreePath}" --force`, { stdio: 'ignore' });
      } catch (error) {
        // Ignore errors
      }

      try {
        execSync(`git branch -D "${branch}"`, { stdio: 'ignore' });
      } catch (error) {
        // Ignore errors
      }
    }
  }

  console.log(`${COLORS.GREEN}✓ Cleanup complete${COLORS.NC}`);
  console.log("");
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  // Parse command-line arguments
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log("Usage: parallel-impl.ts 'your feature request here'");
    console.log("");
    console.log("Example:");
    console.log("  parallel-impl.ts 'Add user authentication with JWT tokens'");
    console.log("");
    process.exit(args.length === 0 ? 1 : 0);
  }

  const featureRequest = args[0];
  const timestamp = Date.now();

  console.log(`${COLORS.BLUE}=== Claude Code Parallel Implementation ===${COLORS.NC}`);
  console.log(`Feature Request: ${COLORS.YELLOW}${featureRequest}${COLORS.NC}`);
  console.log(`Creating ${NUM_IMPLEMENTATIONS} parallel implementations...`);
  console.log("");

  // Validate environment
  validateEnvironment();

  // Check we're in a git repo
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch (error) {
    console.error(`${COLORS.RED}Error: Not in a git repository${COLORS.NC}`);
    process.exit(1);
  }

  // Clean up old worktrees
  cleanupOldWorktrees();

  // Create worktrees
  createWorktrees(timestamp);

  // Load and prepare implementation prompt
  const implPromptTemplate = loadPromptTemplate(join(SCRIPT_DIR, "prompts/implementation.md"));
  const implPrompt = substituteTemplate(implPromptTemplate, { FEATURE_REQUEST: featureRequest });

  // Run parallel implementations
  await runParallelImplementations(implPrompt, timestamp);

  // Load and prepare review prompt
  const reviewPromptTemplate = loadPromptTemplate(join(SCRIPT_DIR, "prompts/review.md"));
  const reviewPrompt = substituteTemplate(reviewPromptTemplate, {
    FEATURE_REQUEST: featureRequest,
    WORKTREES_DIR: WORKTREES_DIR,
    NUM_IMPLEMENTATIONS: String(NUM_IMPLEMENTATIONS),
  });

  // Run review
  const reviewResponse = await runReview(reviewPrompt);
  const reviewResult = parseReviewResult(reviewResponse);

  const winningBranch = `impl-${timestamp}-${reviewResult.best}`;

  console.log(`${COLORS.BLUE}=== Review Results ===${COLORS.NC}`);
  console.log(`Winner: ${COLORS.GREEN}Implementation ${reviewResult.best}${COLORS.NC}`);
  console.log(`Quality Score: ${reviewResult.quality_score}`);
  console.log(`Completeness Score: ${reviewResult.completeness_score}`);
  console.log("");
  console.log("Reasoning:");
  console.log(reviewResult.reasoning);
  console.log("");

  // Create PR
  createPR(featureRequest, winningBranch, reviewResult);

  // Cleanup
  cleanup(timestamp, reviewResult.best);

  console.log(`${COLORS.GREEN}=== Done! ===${COLORS.NC}`);
  console.log(`Winning implementation: ${COLORS.YELLOW}${winningBranch}${COLORS.NC}`);
  console.log(`Worktree location: ${COLORS.YELLOW}${WORKTREES_DIR}/impl-${reviewResult.best}${COLORS.NC}`);
}

// Run main function
main().catch(error => {
  console.error(`${COLORS.RED}Fatal error:${COLORS.NC}`, error);
  process.exit(1);
});
