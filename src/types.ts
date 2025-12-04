export interface JobRequest {
  issue_url: string;
}

export interface JobResponse {
  job_id: string;
  status: string;
}

export interface HealthResponse {
  status: string;
}

export interface IssueDetails {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Job {
  id: string;
  status: JobStatus;
  issue_url: string;
  created_at: Date;
}
