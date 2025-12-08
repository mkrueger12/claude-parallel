# Cloud Run Runner

Serverless webhook handler that triggers parallel Claude Code implementations when a GitHub issue is opened.

## Architecture

```
GitHub Issue Created
       ↓
POST to Cloud Run (API key in header)
       ↓
Cloud Run validates key, returns 200 immediately
       ↓
Background: clone repo → run init.sh → run parallel-impl.sh → creates draft PR
```

## File Structure

```
runner/
├── Dockerfile          # Container definition
├── server.ts           # Bun webhook handler
├── init.sh             # Dependency installer
├── README.md           # This file
└── claude-config/      # Claude Code configuration
    ├── settings.json   # Permission settings, hooks
    ├── hooks.json      # Session lifecycle hooks
    ├── commands/       # Custom slash commands
    │   ├── implement.md
    │   ├── plan.md
    │   ├── debug.md
    │   └── ...
    └── skills/         # Reusable skills
        ├── agent-memory/
        ├── architecture-patterns/
        └── frontend-design/
```

## Building

Build from the repository root (not the runner directory):

```bash
# From repo root
docker build -f runner/Dockerfile -t claude-parallel-runner .
```

## Local Testing

```bash
# Build
docker build -f runner/Dockerfile -t claude-parallel-runner .

# Run locally
docker run -p 8080:8080 \
  -e API_KEY=test-key \
  -e CLAUDE_CODE_OAUTH_TOKEN=your-oauth-token \
  -e GH_TOKEN=your-github-pat \
  claude-parallel-runner

# Test health endpoint
curl http://localhost:8080/health

# Simulate webhook
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -H "X-GitHub-Event: issues" \
  -d '{
    "action": "opened",
    "issue": {
      "number": 1,
      "title": "Add user authentication",
      "body": "Implement JWT-based authentication with login/signup endpoints",
      "html_url": "https://github.com/owner/repo/issues/1",
      "user": {"login": "testuser"}
    },
    "repository": {
      "full_name": "owner/repo",
      "clone_url": "https://github.com/owner/repo.git",
      "html_url": "https://github.com/owner/repo",
      "default_branch": "main"
    },
    "sender": {"login": "testuser"}
  }'
```

## Deploy to Cloud Run

### 1. Build and Push

```bash
# Configure Google Cloud
gcloud auth configure-docker

# Build and push (from repo root)
gcloud builds submit --tag gcr.io/YOUR_PROJECT/claude-parallel-runner -f runner/Dockerfile .
```

### 2. Deploy

```bash
gcloud run deploy claude-parallel \
  --image gcr.io/YOUR_PROJECT/claude-parallel-runner \
  --region us-central1 \
  --timeout 3600 \
  --memory 2Gi \
  --cpu 2 \
  --set-env-vars "CLAUDE_CODE_OAUTH_TOKEN=xxx,GH_TOKEN=xxx,API_KEY=xxx" \
  --no-cpu-throttling \
  --allow-unauthenticated
```

### 3. Get Service URL

```bash
gcloud run services describe claude-parallel --region us-central1 --format='value(status.url)'
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_KEY` | Yes | Secret key for webhook authentication |
| `CLAUDE_CODE_OAUTH_TOKEN` | Yes | From `claude setup-token` |
| `GH_TOKEN` | Yes | GitHub PAT with `repo` scope |
| `PORT` | No | Server port (default: 8080) |
| `TURSO_DATABASE_URL` | No | TursoDB URL for agent-memory |
| `TURSO_AUTH_TOKEN` | No | TursoDB auth token |

### Getting Claude OAuth Token

```bash
# Run locally with Claude CLI installed
claude setup-token

# Copy the token from the output
```

### Creating GitHub PAT

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create a token with `repo` scope
3. Use the token as `GH_TOKEN`

## GitHub Webhook Setup

1. Go to your repository: Settings → Webhooks → Add webhook
2. Configure:
   - **Payload URL**: Your Cloud Run service URL
   - **Content type**: `application/json`
   - **Secret**: Leave empty (using X-API-Key header instead)
   - **Events**: Select "Issues" only
3. Add a custom header:
   - Header: `X-API-Key`
   - Value: Your API_KEY value

## How It Works

1. **Webhook Received**: GitHub sends a POST when an issue is opened
2. **Validation**: Server validates the API key
3. **Clone**: Repository is cloned to a temp directory
4. **Dependencies**: `init.sh` detects and installs project dependencies
5. **Implementation**: `parallel-impl.sh` runs 3 parallel Claude implementations
6. **Review**: Claude reviews all implementations and picks the best
7. **PR Created**: A draft PR is created with the winning implementation
8. **Cleanup**: Temp directory is removed

## Supported Project Types

The `init.sh` script auto-detects and installs dependencies for:

- **Node.js**: bun, pnpm, yarn, npm
- **Python**: pip, poetry
- **Ruby**: bundler
- **Go**: go mod
- **Rust**: cargo
- **PHP**: composer

## Troubleshooting

### View Logs

```bash
gcloud run logs read claude-parallel --region us-central1 --limit 100
```

### Common Issues

**"Unauthorized" response**
- Check that X-API-Key header matches API_KEY env var

**Clone fails**
- Ensure GH_TOKEN has access to the repository
- For private repos, use a PAT with `repo` scope

**Claude fails**
- Verify CLAUDE_CODE_OAUTH_TOKEN is valid
- Check Claude CLI is properly installed in container

**Implementation times out**
- Increase Cloud Run timeout: `--timeout 3600` (max 1 hour)
- Consider larger instance: `--memory 4Gi --cpu 4`
