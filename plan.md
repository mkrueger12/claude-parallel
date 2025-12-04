## Overview

We are implementing a TypeScript HTTP API wrapper for the existing `parallel-impl.sh` script. This API will:
- Accept GitHub issue URLs via POST requests
- Clone the relevant repository
- Execute the parallel implementation workflow
- Return 202 Accepted responses for async job processing
- Allow polling for job status

The API uses the Hono framework for its lightweight footprint, excellent TypeScript support, and fast startup time.

## Implementation Task List:
1. **Project Setup** - Initialize TypeScript project with Hono, Zod, and dependencies
2. **Type Definitions** - Create type definitions for Job, GitHubIssue, and API responses
3. **GitHub Service** - Parse GitHub URLs and fetch issue details using `gh` CLI
4. **Repository Manager** - Clone repos and manage working directories
5. **Job Processor** - Execute parallel-impl.sh and track job status
6. **API Routes** - Implement POST /jobs and GET /jobs/:id endpoints
7. **Health Check** - Add GET /health endpoint
8. **Server Entry Point** - Wire everything together with server startup

## Current State Analysis

**What exists now:**
- `parallel-impl.sh` (249 lines): Core orchestration script that creates 3 parallel git worktrees, runs Claude Code in each, reviews implementations, and creates draft PRs
- `prompts/implementation.md`: Template for implementation prompts
- `prompts/review.md`: Template for review prompts
- No TypeScript/JavaScript infrastructure exists

**What's missing:**
- package.json, tsconfig.json
- TypeScript source files
- HTTP API layer
- Job management system

**Key constraints:**
- Must work with existing `parallel-impl.sh` without modifying it
- Requires `git`, `claude`, `gh`, `jq` dependencies
- Must handle long-running jobs (30+ minutes)
- Script must run from within a git repository

### Key Discoveries:
- `parallel-impl.sh:22` - Script expects feature request as first argument
- `parallel-impl.sh:35-40` - Requires git, claude, gh, jq commands
- `parallel-impl.sh:43-46` - Must run from within a git repository
- `parallel-impl.sh:10` - Creates worktrees in `../parallel-impls` relative to execution directory
- `parallel-impl.sh:101-105` - Uses `claude --print` with `--dangerously-skip-permissions` flag

## Desired End State

After implementation is complete:
1. A Node.js server running on port 3000 (configurable via PORT env var)
2. POST /jobs endpoint accepts `{issueUrl: "https://github.com/owner/repo/issues/123"}`
3. Returns `{jobId: "uuid", status: "queued"}` with 202 Accepted
4. GET /jobs/:id returns job status and results
5. GET /health returns server health
6. Jobs execute parallel-impl.sh in cloned repositories
7. Completed jobs include PR URL and review scores

**Verification:**
```bash
# Start server
npm run dev

# Create job
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"issueUrl": "https://github.com/owner/repo/issues/1"}'

# Check status
curl http://localhost:3000/jobs/{jobId}

# Health check
curl http://localhost:3000/health
```

## What We're NOT Doing

1. **Job queuing/persistence** - Jobs stored in-memory only, lost on restart
2. **Webhooks** - No callback notifications when jobs complete
3. **API authentication** - No auth layer (add separately if needed)
4. **Progress streaming** - No real-time progress updates
5. **Containerization** - No Docker/container setup
6. **Database** - No persistent storage
7. **Modifying parallel-impl.sh** - Use existing script as-is

## Implementation Approach

1. Use Hono as the HTTP framework for minimal overhead
2. Use Zod for request validation
3. Store jobs in an in-memory Map keyed by UUID
4. Spawn `parallel-impl.sh` as child process in cloned repo directory
5. Capture stdout/stderr for status reporting
6. Use GitHub CLI (`gh`) to fetch issue details
7. Clean up cloned repos after job completion (configurable)

## Files to Create

```
src/
├── index.ts           # Server entry point
├── routes/
│   ├── jobs.ts        # /jobs endpoints
│   └── health.ts      # /health endpoint
├── services/
│   ├── github.ts      # GitHub URL parsing and issue fetching
│   ├── repository.ts  # Repo cloning and cleanup
│   └── processor.ts   # Job execution logic
├── types/
│   └── index.ts       # Type definitions
└── lib/
    └── job-store.ts   # In-memory job storage
```

---

## Task 1: Project Setup
**Files**: `package.json`, `tsconfig.json`, `.gitignore`
**Description of Changes**:
- Create package.json with dependencies: hono, @hono/node-server, zod, uuid
- Create package.json scripts: dev, build, start
- Create tsconfig.json with strict TypeScript settings, ES2022 target
- Create .gitignore to exclude node_modules, dist, .env

### Success Criteria:

#### Automated Verification:
- [ ] `npm install` completes without errors
- [ ] `npm run build` compiles TypeScript successfully
- [ ] TypeScript strict mode enabled in tsconfig.json

#### Manual Verification:
- [ ] All dependencies listed in package.json
- [ ] Node/npm version requirements documented

---

## Task 2: Type Definitions
**File**: `src/types/index.ts`
**Description of Changes**:
- Define Job interface: id, issueUrl, repoUrl, status (queued/processing/completed/failed), result, error, createdAt, completedAt
- Define GitHubIssue interface: number, title, body, repoOwner, repoName, url
- Define JobResult interface: prUrl, winningBranch, qualityScore, completenessScore, reasoning
- Define API response types: CreateJobRequest, CreateJobResponse, JobStatusResponse
- Export Zod schemas for request validation

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` compiles with no type errors
- [ ] All exported types are importable from `./types`

#### Manual Verification:
- [ ] Types cover all fields from GitHub issue #1 requirements
- [ ] Zod schemas match TypeScript interfaces

---

## Task 3: GitHub Service
**File**: `src/services/github.ts`
**Description of Changes**:
- Create `parseGitHubIssueUrl(url: string)` function to extract owner, repo, issue number
- Create `fetchIssueDetails(owner: string, repo: string, issueNumber: number)` function using `gh issue view` command
- Handle errors for invalid URLs and failed fetches
- Return structured GitHubIssue object

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` compiles successfully
- [ ] Unit tests pass for URL parsing edge cases

#### Manual Verification:
- [ ] Correctly parses various GitHub issue URL formats
- [ ] Gracefully handles invalid URLs
- [ ] Fetches real issue when GH_TOKEN is set

---

## Task 4: Repository Manager
**File**: `src/services/repository.ts`
**Description of Changes**:
- Create `cloneRepository(repoUrl: string, targetDir: string)` using `git clone`
- Create `cleanupRepository(targetDir: string)` to remove cloned repos
- Use WORK_DIR environment variable (default: /tmp/claude-parallel-jobs)
- Generate unique directory names using job ID
- Handle git clone failures gracefully

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` compiles successfully
- [ ] Directory creation/cleanup works correctly

#### Manual Verification:
- [ ] Cloned repos are fully functional git repositories
- [ ] Cleanup removes all files

---

## Task 5: Job Processor
**File**: `src/services/processor.ts`, `src/lib/job-store.ts`
**Description of Changes**:
- Create in-memory job store (Map<string, Job>)
- Create `createJob(issueUrl: string)` function
- Create `processJob(jobId: string)` async function that:
  - Updates job status to "processing"
  - Clones the repository
  - Fetches issue details for feature request
  - Executes parallel-impl.sh with issue title/body as argument
  - Captures output and parses results
  - Updates job with result or error
  - Cleans up repository
- Create `getJob(jobId: string)` function
- Handle JOB_TIMEOUT (default: 30 minutes)

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` compiles successfully
- [ ] Job store operations work correctly

#### Manual Verification:
- [ ] Jobs transition through correct states
- [ ] Timeout cancels long-running jobs
- [ ] Errors are captured and reported

---

## Task 6: API Routes - Jobs
**File**: `src/routes/jobs.ts`
**Description of Changes**:
- Create Hono router for /jobs
- POST /jobs: Validate request with Zod, create job, start processing in background, return 202 with job ID
- GET /jobs/:id: Return job status and results
- Handle validation errors with 400 responses
- Handle not found with 404 response

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` compiles successfully
- [ ] POST returns 202 with valid request
- [ ] POST returns 400 with invalid request
- [ ] GET returns 404 for unknown job ID

#### Manual Verification:
- [ ] Response bodies match API spec from GitHub issue
- [ ] Jobs process asynchronously after POST returns

---

## Task 7: Health Check Route
**File**: `src/routes/health.ts`
**Description of Changes**:
- Create Hono router for /health
- GET /health: Return 200 with `{status: "ok", timestamp: "ISO date"}`
- Optionally check for required dependencies (git, claude, gh, jq)

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` compiles successfully
- [ ] GET /health returns 200

#### Manual Verification:
- [ ] Response includes status and timestamp
- [ ] Dependency check reports missing commands

---

## Task 8: Server Entry Point
**File**: `src/index.ts`
**Description of Changes**:
- Import Hono and @hono/node-server
- Create Hono app instance
- Mount /jobs and /health routes
- Add global error handler
- Read PORT from environment (default: 3000)
- Add startup logging
- Export app for testing

### Success Criteria:

#### Automated Verification:
- [ ] `npm run dev` starts server without errors
- [ ] `npm run build && npm start` works in production mode
- [ ] All routes are accessible

#### Manual Verification:
- [ ] Server logs startup message with port
- [ ] All endpoints respond correctly
- [ ] Error handler catches and formats errors

---

## Migration Notes

Not applicable - this is a new feature with no existing data to migrate.

## References

- GitHub Issue: https://github.com/mkrueger12/claude-parallel/issues/1
- Hono Documentation: https://hono.dev
- parallel-impl.sh: `parallel-impl.sh:1-249`
- Claude CLI flags: `parallel-impl.sh:101-105`
