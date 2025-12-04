import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Job, IssueDetails } from '../types.js';
import type { Config } from '../config.js';
import { cleanupRepository } from './repository.js';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In-memory job store
const jobs = new Map<string, Job>();

/**
 * Create a new job with pending status
 * @param issueUrl - GitHub issue URL
 * @returns Created job object
 */
export function createJob(issueUrl: string): Job {
  const job: Job = {
    id: randomUUID(),
    status: 'pending',
    issue_url: issueUrl,
    created_at: new Date(),
  };

  jobs.set(job.id, job);
  return job;
}

/**
 * Get job by ID
 * @param jobId - Job ID
 * @returns Job object or undefined if not found
 */
export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

/**
 * Get absolute path to parallel-impl.sh script
 * @returns Absolute path to the script
 */
export function getScriptPath(): string {
  // Script is in the project root, two levels up from src/services/
  return join(__dirname, '..', '..', 'parallel-impl.sh');
}

/**
 * Execute the parallel-impl.sh script for a job
 * This is a fire-and-forget operation that runs in the background
 * @param job - Job to execute
 * @param issueDetails - Issue details from GitHub
 * @param repoDir - Directory where the repository was cloned
 * @param config - Application configuration
 */
export function executeJob(
  job: Job,
  issueDetails: IssueDetails,
  repoDir: string,
  config: Config
): void {
  // Update job status to running
  job.status = 'running';
  jobs.set(job.id, job);

  // Construct feature request from issue title and body
  const featureRequest = `${issueDetails.title}\n\n${issueDetails.body}`;

  // Get path to the script
  const scriptPath = getScriptPath();

  console.log(`[Job ${job.id}] Starting execution in ${repoDir}`);
  console.log(`[Job ${job.id}] Script: ${scriptPath}`);
  console.log(`[Job ${job.id}] Feature request: ${featureRequest.substring(0, 100)}...`);

  // Spawn child process to run the script
  const child = spawn(scriptPath, [featureRequest], {
    cwd: repoDir,
    stdio: 'ignore', // Don't capture output (fire-and-forget)
    detached: false,
    env: {
      ...process.env,
      GH_TOKEN: config.GH_TOKEN,
    },
  });

  // Set timeout
  const timeout = setTimeout(() => {
    console.log(`[Job ${job.id}] Timeout reached, killing process`);
    child.kill('SIGTERM');
    job.status = 'failed';
    jobs.set(job.id, job);

    // Cleanup repository on timeout
    cleanupRepository(repoDir).catch((err) => {
      console.error(`[Job ${job.id}] Cleanup failed:`, err);
    });
  }, config.JOB_TIMEOUT);

  // Handle process exit
  child.on('exit', (code, signal) => {
    clearTimeout(timeout);

    if (code === 0) {
      console.log(`[Job ${job.id}] Completed successfully`);
      job.status = 'completed';
    } else {
      console.log(`[Job ${job.id}] Failed with code ${code}, signal ${signal}`);
      job.status = 'failed';
    }

    jobs.set(job.id, job);

    // Cleanup repository after execution
    cleanupRepository(repoDir).catch((err) => {
      console.error(`[Job ${job.id}] Cleanup failed:`, err);
    });
  });

  // Handle process errors
  child.on('error', (error) => {
    clearTimeout(timeout);
    console.error(`[Job ${job.id}] Process error:`, error);
    job.status = 'failed';
    jobs.set(job.id, job);

    // Cleanup repository on error
    cleanupRepository(repoDir).catch((err) => {
      console.error(`[Job ${job.id}] Cleanup failed:`, err);
    });
  });
}
