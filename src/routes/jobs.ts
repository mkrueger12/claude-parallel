/**
 * Jobs Route
 *
 * Handles job creation and status retrieval for parallel implementation jobs.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { CreateJobRequestSchema } from '../types/index.js';
import { createJob, getJob } from '../lib/job-store.js';
import { processJob } from '../services/processor.js';
import { parseGitHubIssueUrl } from '../services/github.js';

const jobs = new Hono();

/**
 * POST /jobs
 *
 * Create a new job to process a GitHub issue.
 *
 * Request body:
 * - issueUrl: string (valid GitHub issue URL)
 *
 * Response:
 * - 202 Accepted: { jobId: string, status: 'queued' }
 * - 400 Bad Request: Validation errors
 */
jobs.post('/', zValidator('json', CreateJobRequestSchema), async (c) => {
  try {
    const { issueUrl } = c.req.valid('json');

    // Validate GitHub issue URL format
    try {
      parseGitHubIssueUrl(issueUrl);
    } catch (error) {
      return c.json(
        {
          error: 'Invalid GitHub issue URL',
          message: error instanceof Error ? error.message : 'URL must be a valid GitHub issue',
        },
        400
      );
    }

    // Create job in store
    const job = createJob(issueUrl);

    // Start processing in background (fire-and-forget)
    processJob(job.id).catch((err) => {
      console.error(`[Job ${job.id}] Background processing error:`, err);
    });

    // Return 202 Accepted with job ID
    return c.json(
      {
        jobId: job.id,
        status: job.status,
      },
      202
    );
  } catch (error) {
    console.error('Error creating job:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to create job',
      },
      500
    );
  }
});

/**
 * GET /jobs/:id
 *
 * Get the status and details of a job.
 *
 * Response:
 * - 200 OK: Job details (id, issueUrl, status, result, error, timestamps)
 * - 404 Not Found: Job not found
 */
jobs.get('/:id', (c) => {
  const jobId = c.req.param('id');

  const job = getJob(jobId);

  if (!job) {
    return c.json(
      {
        error: 'Job not found',
        message: `No job found with ID: ${jobId}`,
      },
      404
    );
  }

  // Convert Date objects to ISO strings for JSON response
  return c.json({
    id: job.id,
    issueUrl: job.issueUrl,
    repoUrl: job.repoUrl,
    status: job.status,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString(),
  });
});

export default jobs;
