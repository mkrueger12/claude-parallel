## Overview

We are implementing a TypeScript HTTP API wrapper for the existing `parallel-impl.sh` shell script. This API will accept GitHub issue URLs, clone repositories, and execute the parallel implementation workflow asynchronously, returning immediately with a job ID.

## Implementation Task List:
1. **Project Setup** - Initialize TypeScript/Node.js project with Hono framework and configuration
2. **GitHub Service** - Create service to fetch issue details using `gh` CLI
3. **Repository Service** - Create service to clone repositories to working directory
4. **Job Service** - Create service to manage job execution and track running jobs
5. **API Routes** - Implement POST /jobs and GET /health endpoints
6. **Integration** - Wire everything together and add error handling

## Current State Analysis

**What exists now:**
- `parallel-impl.sh` (lines 1-247): Complete bash script that creates git worktrees, runs parallel Claude implementations, reviews them, and creates draft PRs
- The script requires: `git`, `claude`, `gh`, `jq` CLI tools
- The script takes a feature request string as argument and must be run from within a git repository
- Prompt templates exist in `prompts/implementation.md` and `prompts/review.md`

**What's missing:**
- No package.json or TypeScript configuration
- No Node.js/TypeScript source code
- No HTTP API layer
- No service modules for GitHub, repo management, or job processing

**Key constraints:**
- Script must be executed from within the cloned repository directory
- Script uses `gh` CLI which requires `GH_TOKEN` for authentication
- Jobs run asynchronously (fire-and-forget with 202 response)
- No job persistence or queuing (in-memory only)

## Desired End State

After implementation, the system will:
1. Accept POST requests at `/jobs` with `{"issue_url": "https://github.com/owner/repo/issues/123"}`
2. Parse the issue URL, fetch issue title/body via `gh issue view`
3. Clone the repository to `WORK_DIR/jobs/{job_id}/`
4. Execute `parallel-impl.sh` with the issue content as the feature request
5. Return `202 Accepted` with `{"job_id": "uuid", "status": "accepted"}`
6. Provide health check at `GET /health` returning `{"status": "ok"}`

**Verification:**
- `npm run dev` starts the server
- `curl -X POST http://localhost:3000/jobs -d '{"issue_url":"..."}' -H "Content-Type: application/json"` returns 202 with job_id
- `curl http://localhost:3000/health` returns 200 with status ok
- Jobs execute in background and create draft PRs on the target repository

### Key Discoveries:
- `parallel-impl.sh:48` - Script requires being in a git repository (`MAIN_REPO="$(pwd)"`)
- `parallel-impl.sh:101-104` - Script executes `claude` CLI with `--print`, `--output-format json`, `--dangerously-skip-permissions` flags
- `parallel-impl.sh:218-229` - Creates draft PR using `gh pr create --draft`
- Script uses `../parallel-impls` relative path for worktrees (line 10)
- Hono v4.10.0 is the current stable version with excellent TypeScript support

## What We're NOT Doing

- **Job queuing** - No Redis, BullMQ, or queue system; simple in-memory job tracking
- **Data persistence** - No database; jobs are fire-and-forget
- **Webhooks** - No callback notifications when jobs complete
- **API authentication** - No auth layer; assumes internal/trusted usage
- **Progress streaming** - No WebSocket or SSE for real-time updates
- **Containerization** - No Dockerfile or container config
- **Rate limiting** - No request throttling
- **Job status endpoint** - Only POST /jobs and GET /health (no GET /jobs/:id)
- **Retry logic** - Failed jobs are not automatically retried

## Implementation Approach

1. **Project initialization**: Set up a standard Node.js TypeScript project with Hono
2. **Service layer pattern**: Create separate modules for GitHub, repository, and job concerns
3. **Async job execution**: Use Node.js `child_process.spawn` to run the shell script in the background
4. **Environment-driven config**: Use environment variables for all configuration
5. **Minimal dependencies**: Only Hono, @hono/node-server, and TypeScript tooling

## Files to Create

| File | Purpose |
|------|---------|
| `package.json` | Project dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `.gitignore` | Git ignore rules |
| `src/index.ts` | Main entry point, server setup |
| `src/config.ts` | Environment variable configuration |
| `src/routes/jobs.ts` | POST /jobs endpoint handler |
| `src/routes/health.ts` | GET /health endpoint handler |
| `src/services/github.ts` | GitHub issue fetching service |
| `src/services/repository.ts` | Repository cloning service |
| `src/services/job.ts` | Job execution and tracking service |
| `src/types.ts` | TypeScript type definitions |

---

## Task 1: Project Setup

**Files**: `package.json`, `tsconfig.json`, `.gitignore`

**Description of Changes**:
Create the foundational project configuration files:

1. `package.json`:
   - Name: `claude-parallel-api`
   - Scripts: `dev` (tsx watch), `build` (tsc), `start` (node dist)
   - Dependencies: `hono`, `@hono/node-server`
   - DevDependencies: `typescript`, `tsx`, `@types/node`
   - Node engine: >=18.14.1

2. `tsconfig.json`:
   - Target: ES2022
   - Module: NodeNext
   - moduleResolution: NodeNext
   - outDir: ./dist
   - rootDir: ./src
   - strict: true

3. `.gitignore`:
   - node_modules/
   - dist/
   - .env
   - *.log

### Success Criteria:

#### Automated Verification:
- [ ] `npm install` completes successfully
- [ ] `npx tsc --noEmit` passes (once source files exist)
- [ ] TypeScript strict mode enabled

#### Manual Verification:
- [ ] package.json has correct dependencies and scripts
- [ ] tsconfig.json properly configured for Node.js ESM

---

## Task 2: Configuration and Types

**Files**: `src/config.ts`, `src/types.ts`

**Description of Changes**:

1. `src/config.ts`:
   - Read environment variables: PORT (default 3000), WORK_DIR (default /tmp/claude-parallel), GH_TOKEN, JOB_TIMEOUT (default 600000ms/10min)
   - Export typed config object
   - Validate required variables at startup

2. `src/types.ts`:
   - `JobRequest`: `{ issue_url: string }`
   - `JobResponse`: `{ job_id: string, status: string }`
   - `HealthResponse`: `{ status: string }`
   - `IssueDetails`: `{ owner: string, repo: string, number: number, title: string, body: string }`
   - `Job`: `{ id: string, status: 'pending' | 'running' | 'completed' | 'failed', issue_url: string, created_at: Date }`

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors
- [ ] Config loads default values when env vars not set
- [ ] Config exports all required values

#### Manual Verification:
- [ ] Environment variables correctly parsed
- [ ] Types are properly exported and usable

---

## Task 3: GitHub Service

**File**: `src/services/github.ts`

**Description of Changes**:

Create a service to interact with GitHub issues via the `gh` CLI:

1. `parseIssueUrl(url: string): { owner: string, repo: string, number: number }`:
   - Parse GitHub issue URL format: `https://github.com/{owner}/{repo}/issues/{number}`
   - Throw descriptive error if URL format is invalid

2. `fetchIssueDetails(owner: string, repo: string, issueNumber: number): Promise<IssueDetails>`:
   - Execute `gh issue view {number} --repo {owner}/{repo} --json title,body`
   - Parse JSON output
   - Return `{ owner, repo, number, title, body }`
   - Handle errors (issue not found, auth failure, etc.)

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors
- [ ] URL parsing handles valid GitHub issue URLs
- [ ] URL parsing rejects invalid URLs with clear errors

#### Manual Verification:
- [ ] `gh issue view` command executes correctly with valid GH_TOKEN
- [ ] Issue details are correctly parsed from CLI output

---

## Task 4: Repository Service

**File**: `src/services/repository.ts`

**Description of Changes**:

Create a service to manage repository cloning:

1. `cloneRepository(owner: string, repo: string, targetDir: string): Promise<void>`:
   - Execute `git clone https://github.com/{owner}/{repo}.git {targetDir}`
   - Wait for clone to complete
   - Throw error if clone fails

2. `cleanupRepository(targetDir: string): Promise<void>`:
   - Remove the directory and all contents
   - Handle errors gracefully (directory might not exist)

3. `ensureWorkDir(workDir: string): Promise<void>`:
   - Create work directory if it doesn't exist
   - Ensure proper permissions

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors
- [ ] Git clone command is properly constructed

#### Manual Verification:
- [ ] Repository clones successfully to target directory
- [ ] Cleanup removes directory completely
- [ ] Work directory is created with proper permissions

---

## Task 5: Job Service

**File**: `src/services/job.ts`

**Description of Changes**:

Create a service to manage job execution:

1. In-memory job store:
   - `Map<string, Job>` to track active jobs
   - Jobs stored with id, status, issue_url, created_at

2. `createJob(issueUrl: string): Job`:
   - Generate UUID for job_id
   - Create job record with status 'pending'
   - Store in job map
   - Return job

3. `executeJob(job: Job, issueDetails: IssueDetails, config: Config): void`:
   - Update job status to 'running'
   - Construct feature request string from issue title and body
   - Get path to `parallel-impl.sh` script (relative to project root)
   - Spawn child process to run the script in the cloned repo directory
   - Set timeout based on JOB_TIMEOUT config
   - On completion: update status to 'completed', trigger cleanup
   - On error: update status to 'failed', log error
   - Fire-and-forget (no await on caller side)

4. `getScriptPath(): string`:
   - Return absolute path to `parallel-impl.sh`

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors
- [ ] Job IDs are valid UUIDs
- [ ] Jobs are stored and retrievable from map

#### Manual Verification:
- [ ] Script executes in background without blocking
- [ ] Job status updates correctly through lifecycle
- [ ] Timeout kills long-running jobs

---

## Task 6: API Routes - Health Endpoint

**File**: `src/routes/health.ts`

**Description of Changes**:

Create the health check endpoint:

1. Export Hono route handler for GET /health
2. Return JSON: `{ "status": "ok" }`
3. Return HTTP 200

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors
- [ ] Route exports correctly

#### Manual Verification:
- [ ] `curl http://localhost:3000/health` returns `{"status":"ok"}`
- [ ] Response has correct Content-Type header

---

## Task 7: API Routes - Jobs Endpoint

**File**: `src/routes/jobs.ts`

**Description of Changes**:

Create the job submission endpoint:

1. Export Hono route handler for POST /jobs
2. Parse JSON body for `issue_url`
3. Validate `issue_url` is present and valid GitHub URL
4. Call GitHub service to parse URL
5. Call GitHub service to fetch issue details
6. Call Repository service to ensure work directory exists
7. Generate job directory path: `{WORK_DIR}/jobs/{job_id}`
8. Call Repository service to clone repo to job directory
9. Call Job service to create and execute job
10. Return HTTP 202 with `{ "job_id": "...", "status": "accepted" }`
11. Handle errors with appropriate HTTP status codes

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors
- [ ] Route exports correctly

#### Manual Verification:
- [ ] POST with valid issue URL returns 202
- [ ] Response includes job_id
- [ ] POST with invalid URL returns 400
- [ ] POST with missing issue_url returns 400

---

## Task 8: Main Entry Point

**File**: `src/index.ts`

**Description of Changes**:

Create the main application entry point:

1. Import Hono and @hono/node-server
2. Import configuration
3. Import route handlers
4. Create Hono app instance
5. Register routes:
   - GET /health -> health handler
   - POST /jobs -> jobs handler
6. Add error handling middleware
7. Start server on configured PORT
8. Log startup message with port number

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts server

#### Manual Verification:
- [ ] Server starts and logs port
- [ ] All routes respond correctly
- [ ] Errors return proper JSON responses

---

## Migration Notes

No migration needed - this is a greenfield implementation. The existing `parallel-impl.sh` script is not modified.

## References

- Hono documentation: https://hono.dev/docs/
- Node.js child_process: https://nodejs.org/api/child_process.html
- GitHub CLI: https://cli.github.com/manual/
- Existing script: `parallel-impl.sh:1-247`
