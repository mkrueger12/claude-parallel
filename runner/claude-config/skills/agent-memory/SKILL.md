---
name: agent-memory
description: Persistent memory and context for coding work. Use to recall past decisions, check if something was tried before, and record important decisions with rationale. Invoke when investigating unfamiliar code, making architectural choices, or when context about why code exists would be helpful.
---

# Agent Memory System

You have access to a persistent memory system that survives across sessions. Use it liberally.

## Installation

If Turso database is not installed, run the install script:

```bash
bash ~/.claude/skills/agent-memory/scripts/install.sh
```

After installation, add Turso to your PATH:

```bash
export PATH="$HOME/.turso:$PATH"
```

## Inspecting the Database

```bash
# List all tables
tursodb --experimental-indexes true ~/.agentfs/agent.db -c ".tables"

# Show schema for all tables
tursodb --experimental-indexes true ~/.agentfs/agent.db -c ".schema"

# Show schema for a specific table
tursodb --experimental-indexes true ~/.agentfs/agent.db -c ".schema decisions"

# Query data
tursodb --experimental-indexes true ~/.agentfs/agent.db -c "SELECT * FROM sessions LIMIT 10;"

# Interactive mode
tursodb --experimental-indexes true ~/.agentfs/agent.db
```

## Available Scripts

All scripts are in `~/.claude/skills/agent-memory/scripts/`

### Query Past Context

```bash

# What do we know about a topic/file/feature?
bash ~/.claude/skills/agent-memory/scripts/query.sh context "authentication flow"
bash ~/.claude/skills/agent-memory/scripts/query.sh context "src/auth/session.ts"

# What decisions have been made?
bash ~/.claude/skills/agent-memory/scripts/query.sh decisions "database"

# Have we tried this before?
bash ~/.claude/skills/agent-memory/scripts/query.sh history "upload timeout fix"

# What happened in a previous session?
bash ~/.claude/skills/agent-memory/scripts/query.sh session "abc-123"

# List all repos
bash ~/.claude/skills/agent-memory/scripts/query.sh repos
```

Repo IDs are derived from git remote URLs (e.g., `anthropics/claude-code`), falling back to directory basename. Queries automatically filter to the current repo based on working directory path.

### Record Decisions

When you make a significant choice between approaches, record it:

```bash
bash ~/.claude/skills/agent-memory/scripts/record.sh decision \
  --question "How should we handle rate limiting?" \
  --options "Token bucket|Sliding window|Fixed window" \
  --choice "Token bucket" \
  --rationale "More flexible for bursty traffic, matches our usage patterns"
```

### Record Investigations

When you learn something important about the codebase:

```bash
bash ~/.claude/skills/agent-memory/scripts/record.sh finding \
  --topic "payment processing" \
  --finding "Stripe webhook handler is not idempotent - can cause duplicate charges" \
  --files "src/payments/webhook.ts"
```

## When to Use

**Query context when:**
- Looking at unfamiliar code
- Before making architectural decisions
- User asks "why is this like this?"
- Something seems weird and you want history

**Record decisions when:**
- Choosing between multiple valid approaches
- Deciding NOT to do something
- Making changes where rationale isn't obvious from code

**Record findings when:**
- Discovering bugs or issues
- Learning how a system actually works
- Finding undocumented behavior

## Output Format

All queries return markdown tables. Decisions and findings are timestamped and linked to the current session.

## Environment Variables

The system uses these environment variables:
- `AGENTFS_DB` - Path to SQLite database (default: `~/.agentfs/agent.db`)
- `CLAUDE_SESSION_ID` - Current session identifier
