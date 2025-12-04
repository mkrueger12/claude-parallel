import { Hono } from 'hono';
import { join } from 'path';
import type { JobRequest, JobResponse } from '../types.js';
import { config } from '../config.js';
import { parseIssueUrl, fetchIssueDetails } from '../services/github.js';
import { ensureWorkDir, cloneRepository } from '../services/repository.js';
import { createJob, executeJob } from '../services/job.js';

const jobs = new Hono();

/**
 * POST /jobs - Create a new job from a GitHub issue
 * Request body: { "issue_url": "https://github.com/owner/repo/issues/123" }
 * Returns: 202 Accepted with { "job_id": "uuid", "status": "accepted" }
 */
jobs.post('/', async (c) => {
  try {
    // Parse request body
    const body = await c.req.json<JobRequest>();

    // Validate issue_url is present
    if (!body.issue_url) {
      return c.json(
        { error: 'Missing required field: issue_url' },
        400
      );
    }

    // Parse and validate GitHub issue URL
    let parsed;
    try {
      parsed = parseIssueUrl(body.issue_url);
    } catch (error) {
      return c.json(
        {
          error: error instanceof Error ? error.message : 'Invalid issue URL',
        },
        400
      );
    }

    // Fetch issue details from GitHub
    let issueDetails;
    try {
      issueDetails = await fetchIssueDetails(
        parsed.owner,
        parsed.repo,
        parsed.number
      );
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to fetch issue details',
        },
        400
      );
    }

    // Create job
    const job = createJob(body.issue_url);

    // Ensure work directory exists
    await ensureWorkDir(config.WORK_DIR);

    // Create job-specific directory
    const jobDir = join(config.WORK_DIR, 'jobs', job.id);
    await ensureWorkDir(jobDir);

    // Clone repository to job directory
    const repoDir = join(jobDir, issueDetails.repo);
    try {
      await cloneRepository(issueDetails.owner, issueDetails.repo, repoDir);
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to clone repository',
        },
        500
      );
    }

    // Execute job in background (fire-and-forget)
    executeJob(job, issueDetails, repoDir, config);

    // Return accepted response
    const response: JobResponse = {
      job_id: job.id,
      status: 'accepted',
    };

    return c.json(response, 202);
  } catch (error) {
    console.error('Error handling job request:', error);
    return c.json(
      {
        error: 'Internal server error',
      },
      500
    );
  }
});

export default jobs;
