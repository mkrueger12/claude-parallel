/**
 * Job Processor Service
 *
 * Handles the execution of parallel implementation jobs:
 * 1. Fetches GitHub issue details
 * 2. Clones the repository
 * 3. Executes parallel-impl.sh
 * 4. Parses results and updates job status
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  getJob,
  updateJobStatus,
  setJobResult,
  setJobError,
} from '../lib/job-store.js';
import {
  parseGitHubIssueUrl,
  fetchIssueDetails,
  getRepoCloneUrl,
} from './github.js';
import {
  getJobDir,
  ensureWorkDir,
  cloneRepository,
  cleanupRepository,
  copyScriptToRepo,
} from './repository.js';
import { JobResult } from '../types/index.js';

// ============================================================================
// Configuration
// ============================================================================

const JOB_TIMEOUT = parseInt(process.env.JOB_TIMEOUT || '1800000', 10); // 30 minutes default
const CLEANUP_REPOS = process.env.CLEANUP_REPOS !== 'false'; // default: true

// ============================================================================
// Process Job
// ============================================================================

/**
 * Process a job from start to finish
 *
 * @param jobId - UUID of the job to process
 */
export async function processJob(jobId: string): Promise<void> {
  console.log(`[Job ${jobId}] Starting job processing`);

  // Get the job from the store
  const job = getJob(jobId);
  if (!job) {
    console.error(`[Job ${jobId}] Job not found in store`);
    return;
  }

  let repoDir: string | null = null;

  try {
    // Update status to processing
    updateJobStatus(jobId, 'processing');
    console.log(`[Job ${jobId}] Status: processing`);

    // Parse GitHub issue URL
    console.log(`[Job ${jobId}] Parsing issue URL: ${job.issueUrl}`);
    const { owner, repo, issueNumber } = parseGitHubIssueUrl(job.issueUrl);

    // Fetch issue details
    console.log(`[Job ${jobId}] Fetching issue details from ${owner}/${repo}#${issueNumber}`);
    const issue = fetchIssueDetails(owner, repo, issueNumber);
    console.log(`[Job ${jobId}] Issue title: ${issue.title}`);

    // Get repository clone URL
    const repoUrl = getRepoCloneUrl(owner, repo);
    console.log(`[Job ${jobId}] Clone URL: ${repoUrl}`);

    // Clone the repository
    ensureWorkDir();
    repoDir = getJobDir(jobId);
    console.log(`[Job ${jobId}] Cloning repository to: ${repoDir}`);
    cloneRepository(repoUrl, repoDir);

    // Copy parallel-impl.sh and prompts to the cloned repo
    console.log(`[Job ${jobId}] Copying script and prompts to repository`);
    copyScriptToRepo(repoDir);

    // Prepare feature request (issue title + body)
    const featureRequest = `${issue.title}\n\n${issue.body}`;

    // Execute parallel-impl.sh
    console.log(`[Job ${jobId}] Executing parallel-impl.sh`);
    const result = await executeParallelImpl(repoDir, featureRequest, jobId);

    // Update job with result
    console.log(`[Job ${jobId}] Execution successful, updating job result`);
    setJobResult(jobId, result);
    console.log(`[Job ${jobId}] Status: completed`);

  } catch (error) {
    // Handle errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Job ${jobId}] Error:`, errorMessage);
    setJobError(jobId, errorMessage);
    console.log(`[Job ${jobId}] Status: failed`);

  } finally {
    // Cleanup repository if configured
    if (CLEANUP_REPOS && repoDir) {
      try {
        console.log(`[Job ${jobId}] Cleaning up repository: ${repoDir}`);
        cleanupRepository(repoDir);
      } catch (cleanupError) {
        console.warn(`[Job ${jobId}] Cleanup failed:`, cleanupError);
      }
    } else if (repoDir) {
      console.log(`[Job ${jobId}] Skipping cleanup (CLEANUP_REPOS=false), repo at: ${repoDir}`);
    }
  }
}

// ============================================================================
// Execute Parallel Implementation Script
// ============================================================================

/**
 * Execute parallel-impl.sh in the cloned repository
 *
 * @param repoDir - Directory containing the cloned repository
 * @param featureRequest - Feature request string (issue title + body)
 * @param jobId - Job ID for logging purposes
 * @returns JobResult parsed from script output
 * @throws Error if execution fails or times out
 */
async function executeParallelImpl(
  repoDir: string,
  featureRequest: string,
  jobId: string
): Promise<JobResult> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(repoDir, 'parallel-impl.sh');

    // Verify script exists
    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`parallel-impl.sh not found at: ${scriptPath}`));
      return;
    }

    console.log(`[Job ${jobId}] Spawning parallel-impl.sh process`);
    console.log(`[Job ${jobId}] Feature request: ${featureRequest.substring(0, 100)}...`);

    // Spawn the script as a child process
    const child = spawn('./parallel-impl.sh', [featureRequest], {
      cwd: repoDir,
      shell: true,
      env: { ...process.env }, // Inherit environment variables
    });

    let stdout = '';
    let stderr = '';

    // Capture stdout
    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // Log output in real-time for monitoring
      console.log(`[Job ${jobId}] [stdout] ${output.trim()}`);
    });

    // Capture stderr
    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(`[Job ${jobId}] [stderr] ${output.trim()}`);
    });

    // Set timeout
    const timeout = setTimeout(() => {
      console.error(`[Job ${jobId}] Script execution timeout (${JOB_TIMEOUT}ms)`);
      child.kill('SIGTERM');
      reject(new Error(`Script execution timed out after ${JOB_TIMEOUT}ms`));
    }, JOB_TIMEOUT);

    // Handle process completion
    child.on('close', (code) => {
      clearTimeout(timeout);

      console.log(`[Job ${jobId}] Script exited with code: ${code}`);

      if (code !== 0) {
        reject(new Error(`Script execution failed with exit code ${code}\nStderr: ${stderr}`));
        return;
      }

      // Parse results from output files
      try {
        const result = parseScriptOutput(repoDir, jobId);
        resolve(result);
      } catch (parseError) {
        reject(parseError);
      }
    });

    // Handle process errors
    child.on('error', (error) => {
      clearTimeout(timeout);
      console.error(`[Job ${jobId}] Process error:`, error);
      reject(new Error(`Failed to spawn script: ${error.message}`));
    });
  });
}

// ============================================================================
// Parse Script Output
// ============================================================================

/**
 * Parse the output files generated by parallel-impl.sh
 *
 * Expected files:
 * - review-result.json: Contains the review decision and scores
 * - pr-url.txt: Contains the PR URL (optional)
 *
 * @param repoDir - Directory containing the output files
 * @param jobId - Job ID for logging
 * @returns JobResult object
 * @throws Error if required files are missing or invalid
 */
function parseScriptOutput(repoDir: string, jobId: string): JobResult {
  console.log(`[Job ${jobId}] Parsing script output files`);

  // Read review-result.json
  const reviewResultPath = path.join(repoDir, 'review-result.json');
  if (!fs.existsSync(reviewResultPath)) {
    throw new Error('review-result.json not found in repository directory');
  }

  const reviewResultContent = fs.readFileSync(reviewResultPath, 'utf-8');
  console.log(`[Job ${jobId}] review-result.json content: ${reviewResultContent.substring(0, 200)}...`);

  let reviewData: any;
  try {
    reviewData = JSON.parse(reviewResultContent);
  } catch (error) {
    throw new Error(`Failed to parse review-result.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Extract decision from nested structure
  // The file contains either direct JSON or nested in .content[0].text
  let decision: any;
  if (reviewData.content && Array.isArray(reviewData.content) && reviewData.content[0]?.text) {
    // Nested format: { content: [{ text: "..." }] }
    try {
      decision = JSON.parse(reviewData.content[0].text);
    } catch (error) {
      throw new Error('Failed to parse decision from content[0].text');
    }
  } else if (reviewData.text) {
    // Text property: { text: "..." }
    try {
      decision = JSON.parse(reviewData.text);
    } catch (error) {
      throw new Error('Failed to parse decision from text property');
    }
  } else {
    // Direct format: { best: 1, reasoning: "..." }
    decision = reviewData;
  }

  // Validate required fields
  if (!decision.best || typeof decision.best !== 'number') {
    throw new Error('Invalid review result: missing or invalid "best" field');
  }

  const best = decision.best;
  const reasoning = decision.reasoning || 'No reasoning provided';
  const qualityScore = typeof decision.quality_score === 'number' ? decision.quality_score : 0;
  const completenessScore = typeof decision.completeness_score === 'number' ? decision.completeness_score : 0;

  // Determine winning branch name
  // parallel-impl.sh uses format: impl-{timestamp}-{best}
  // We need to extract the timestamp from the script or infer it
  // For now, we'll read it from the git branches in the repo
  const winningBranch = findWinningBranch(repoDir, best, jobId);

  // Read PR URL if it exists
  let prUrl: string | undefined;
  const prUrlPath = path.join(repoDir, 'pr-url.txt');
  if (fs.existsSync(prUrlPath)) {
    const prUrlContent = fs.readFileSync(prUrlPath, 'utf-8').trim();
    // The file might contain the full gh output, extract the URL
    const urlMatch = prUrlContent.match(/https:\/\/github\.com\/[^\s]+/);
    if (urlMatch) {
      prUrl = urlMatch[0];
      console.log(`[Job ${jobId}] PR URL: ${prUrl}`);
    } else {
      console.warn(`[Job ${jobId}] pr-url.txt exists but no URL found in content: ${prUrlContent}`);
    }
  }

  console.log(`[Job ${jobId}] Parsed result: best=${best}, quality=${qualityScore}, completeness=${completenessScore}`);

  return {
    prUrl,
    winningBranch,
    qualityScore,
    completenessScore,
    reasoning,
  };
}

// ============================================================================
// Find Winning Branch
// ============================================================================

/**
 * Find the winning branch name from the git repository
 *
 * The parallel-impl.sh script creates branches with format: impl-{timestamp}-{number}
 * We need to find the branch matching the winning implementation number
 *
 * @param repoDir - Repository directory
 * @param best - Winning implementation number (1, 2, or 3)
 * @param jobId - Job ID for logging
 * @returns Branch name
 */
function findWinningBranch(repoDir: string, best: number, jobId: string): string {
  try {
    // Read git branches
    const { execSync } = require('child_process');
    const branches = execSync('git branch --list "impl-*"', {
      cwd: repoDir,
      encoding: 'utf-8',
    }).trim();

    console.log(`[Job ${jobId}] Git branches: ${branches}`);

    // Find branches matching pattern impl-{timestamp}-{number}
    const branchLines = branches.split('\n').map((b: string) => b.trim().replace(/^\*\s+/, ''));
    const pattern = new RegExp(`^impl-\\d+-${best}$`);

    for (const branch of branchLines) {
      if (pattern.test(branch)) {
        console.log(`[Job ${jobId}] Found winning branch: ${branch}`);
        return branch;
      }
    }

    // Fallback: construct branch name with placeholder timestamp
    const fallbackBranch = `impl-unknown-${best}`;
    console.warn(`[Job ${jobId}] Could not find winning branch, using fallback: ${fallbackBranch}`);
    return fallbackBranch;

  } catch (error) {
    console.warn(`[Job ${jobId}] Error finding winning branch:`, error);
    return `impl-unknown-${best}`;
  }
}
