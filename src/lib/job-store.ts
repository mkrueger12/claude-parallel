/**
 * In-Memory Job Store
 *
 * Provides simple CRUD operations for job management.
 * Jobs are stored in a Map keyed by job ID (UUID).
 */

import { v4 as uuidv4 } from 'uuid';
import { Job, JobStatus, JobResult } from '../types/index.js';

// ============================================================================
// In-Memory Store
// ============================================================================

const jobs = new Map<string, Job>();

// ============================================================================
// Create Job
// ============================================================================

/**
 * Create a new job with initial 'queued' status
 *
 * @param issueUrl - GitHub issue URL that triggered this job
 * @returns Newly created Job object
 */
export function createJob(issueUrl: string): Job {
  const job: Job = {
    id: uuidv4(),
    issueUrl,
    status: 'queued',
    createdAt: new Date(),
  };

  jobs.set(job.id, job);
  return job;
}

// ============================================================================
// Get Job
// ============================================================================

/**
 * Retrieve a job by ID
 *
 * @param jobId - UUID of the job to retrieve
 * @returns Job object if found, undefined otherwise
 */
export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

// ============================================================================
// Update Job Status
// ============================================================================

/**
 * Update the status of a job
 *
 * @param jobId - UUID of the job to update
 * @param status - New status to set
 * @throws Error if job not found
 */
export function updateJobStatus(jobId: string, status: JobStatus): void {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  job.status = status;

  // Set completedAt timestamp when job reaches terminal state
  if (status === 'completed' || status === 'failed') {
    job.completedAt = new Date();
  }
}

// ============================================================================
// Set Job Result
// ============================================================================

/**
 * Set the result of a job and mark it as completed
 *
 * @param jobId - UUID of the job to update
 * @param result - Job result containing PR URL, scores, etc.
 * @throws Error if job not found
 */
export function setJobResult(jobId: string, result: JobResult): void {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  job.result = result;
  job.status = 'completed';
  job.completedAt = new Date();
}

// ============================================================================
// Set Job Error
// ============================================================================

/**
 * Set an error message for a job and mark it as failed
 *
 * @param jobId - UUID of the job to update
 * @param error - Error message describing the failure
 * @throws Error if job not found
 */
export function setJobError(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  job.error = error;
  job.status = 'failed';
  job.completedAt = new Date();
}

// ============================================================================
// Get All Jobs (for debugging)
// ============================================================================

/**
 * Get all jobs in the store
 * Primarily for debugging and testing purposes
 *
 * @returns Array of all jobs
 */
export function getAllJobs(): Job[] {
  return Array.from(jobs.values());
}

// ============================================================================
// Clear All Jobs (for testing)
// ============================================================================

/**
 * Remove all jobs from the store
 * Primarily for testing purposes
 */
export function clearAllJobs(): void {
  jobs.clear();
}
