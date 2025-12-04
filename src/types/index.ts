import { z } from 'zod';

// ============================================================================
// JobStatus Type
// ============================================================================

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

// ============================================================================
// GitHubIssue Interface
// ============================================================================

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  repoOwner: string;
  repoName: string;
  url: string;
}

// ============================================================================
// JobResult Interface
// ============================================================================

export interface JobResult {
  prUrl?: string;
  winningBranch: string;
  qualityScore: number;
  completenessScore: number;
  reasoning: string;
}

// ============================================================================
// Job Interface
// ============================================================================

export interface Job {
  id: string;
  issueUrl: string;
  repoUrl?: string;
  status: JobStatus;
  result?: JobResult;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================================
// Zod Schemas for Request Validation
// ============================================================================

// Schema for creating a new job
export const CreateJobRequestSchema = z.object({
  issueUrl: z.string().url('Must be a valid URL'),
});

// Schema for the response when creating a job
export const CreateJobResponseSchema = z.object({
  jobId: z.string().uuid('Job ID must be a valid UUID'),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
});

// Schema for job result
export const JobResultSchema = z.object({
  prUrl: z.string().url().optional(),
  winningBranch: z.string(),
  qualityScore: z.number().min(0).max(100),
  completenessScore: z.number().min(0).max(100),
  reasoning: z.string(),
});

// Schema for the full job status response
export const JobStatusResponseSchema = z.object({
  id: z.string().uuid(),
  issueUrl: z.string().url(),
  repoUrl: z.string().url().optional(),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  result: JobResultSchema.optional(),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

// ============================================================================
// Type Exports (derived from Zod schemas)
// ============================================================================

export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;
export type CreateJobResponse = z.infer<typeof CreateJobResponseSchema>;
export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;

// ============================================================================
// Helper Type Guards
// ============================================================================

export function isValidJobStatus(status: string): status is JobStatus {
  return ['queued', 'processing', 'completed', 'failed'].includes(status);
}

export function isJobCompleted(job: Job): job is Job & { completedAt: Date } {
  return job.status === 'completed' || job.status === 'failed';
}
