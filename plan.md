# Agent Consolidation Plan

## Overview

Consolidate `linear-agent.ts`, `planning-agent.ts`, and `run-agent.ts` into a single extensible agent system using OpenCode's native `opencode.json` configuration pattern.

## Current State

Three separate agent entry points, all using `runAgent` from `@swellai/agent-core`:

| Agent | File | Mode | Key Features |
|-------|------|------|--------------|
| Planning | `src/agents/planning-agent.ts` | Read-only | Web research, CLI args |
| Linear | `src/agents/linear-agent.ts` | Read + MCP | Linear MCP, env templating |
| Implementation/Review | `scripts/run-agent.ts` | Full or Read-only | MODE env var switches |

**Problems:**
- Duplicated boilerplate across files
- Agent config embedded in code, not declarative
- Custom auth handling duplicates some OpenCode functionality

## Target Architecture

### 1. Agent Definitions in `opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "anthropic": {
      "options": { "timeout": false }
    },
    "openai": {
      "options": { "timeout": false }
    },
    "google": {
      "options": { "timeout": false }
    }
  },
  "mcp": {
    "linear": {
      "type": "remote",
      "url": "https://mcp.linear.app/mcp",
      "headers": {
        "Authorization": "Bearer {env:LINEAR_API_KEY}"
      }
    }
  },
  "agent": {
    "planning": {
      "mode": "primary",
      "description": "Generate comprehensive implementation plans for features",
      "prompt": "{file:./prompts/plan-generation.md}",
      "maxSteps": 30,
      "tools": {
        "write": false,
        "edit": false,
        "bash": false,
        "read": true,
        "list": true,
        "glob": true,
        "grep": true,
        "webfetch": true
      },
      "permission": {
        "edit": "deny",
        "bash": "deny",
        "webfetch": "allow"
      }
    },
    "linear": {
      "mode": "primary",
      "description": "Consolidate implementation plans and create Linear issues",
      "prompt": "{file:./prompts/consolidate-and-create-linear.md}",
      "maxSteps": 30,
      "tools": {
        "write": false,
        "edit": false,
        "bash": true,
        "read": true,
        "list": true,
        "glob": true,
        "grep": true,
        "webfetch": true,
        "mcp__linear__*": true
      },
      "permission": {
        "edit": "deny",
        "bash": "allow",
        "webfetch": "allow",
        "mcp__linear__*": "allow"
      }
    },
    "implementation": {
      "mode": "primary",
      "description": "Implement features based on specifications",
      "prompt": "{file:./prompts/implementation.md}",
      "tools": {
        "write": true,
        "edit": true,
        "bash": true,
        "read": true,
        "list": true,
        "glob": true,
        "grep": true,
        "webfetch": true
      },
      "permission": {
        "edit": "allow",
        "bash": "allow",
        "webfetch": "allow"
      }
    },
    "review": {
      "mode": "primary",
      "description": "Review multiple implementations and select the best one",
      "prompt": "{file:./prompts/review.md}",
      "maxSteps": 30,
      "tools": {
        "write": false,
        "edit": false,
        "bash": false,
        "read": true,
        "list": true,
        "glob": true,
        "grep": true,
        "webfetch": false
      },
      "permission": {
        "edit": "deny",
        "bash": "deny"
      }
    }
  }
}
```

### 2. Single CLI Entry Point

**New file: `src/agent.ts`**

```typescript
#!/usr/bin/env node
import { createOpencode } from "@opencode-ai/sdk";
import { setupAuth } from "./lib/auth.js";
import { setupEventMonitoring } from "./lib/events.js";
import { createConversationLogger } from "./lib/conversation-logger.js";
import { assembleAgentInput } from "./lib/input.js";

const agent = process.env.AGENT || process.argv[2];
if (!agent) {
  console.error("Usage: AGENT=<name> bun run agent.ts [prompt]");
  console.error("       bun run agent.ts <agent-name> [prompt]");
  console.error("\nAvailable agents: planning, linear, implementation, review");
  process.exit(1);
}

const provider = process.env.PROVIDER || "anthropic";
const model = process.env.MODEL || "claude-opus-4-5";

// Start OpenCode with config from opencode.json
const { client, server } = await createOpencode();

// Setup OAuth for Anthropic (our value-add)
await setupAuth(client, provider);

// Setup logging and monitoring
const logger = await createConversationLogger();
setupEventMonitoring(client, logger);

try {
  const session = await client.session.create({
    body: { title: `${agent}: ${new Date().toISOString()}` }
  });

  // Assemble agent-specific input from env vars and CLI args
  const input = assembleAgentInput(agent, process.argv.slice(3));

  const result = await client.session.prompt({
    path: { id: session.data.id },
    body: {
      agent,
      model: { providerID: provider, modelID: model },
      parts: [{ type: "text", text: input }]
    }
  });

  // Output result
  const text = result.data.parts
    .filter(p => p.type === "text")
    .map(p => p.text)
    .join("\n");

  console.log(text);
  process.exit(0);
} finally {
  server.close();
}
```

### 3. Input Assembly Module

**New file: `src/lib/input.ts`**

Handles agent-specific input construction from env vars:

```typescript
export function assembleAgentInput(agent: string, args: string[]): string {
  switch (agent) {
    case "planning":
      // CLI args are the feature description
      return args.join(" ") || process.env.FEATURE_DESCRIPTION || "";

    case "linear":
      // Env vars contain the plans to consolidate
      return `## Plans to Consolidate

### Plan 1
${process.env.PLAN_1 || "(not provided)"}

### Plan 2
${process.env.PLAN_2 || "(not provided)"}

### Plan 3
${process.env.PLAN_3 || "(not provided)"}

## Context
- GitHub Issue: ${process.env.GITHUB_ISSUE_URL || "(not provided)"}
- Title: ${process.env.ISSUE_TITLE || "(not provided)"}
- Linear Team: ${process.env.LINEAR_TEAM_ID || "(not provided)"}
- Linear Project: ${process.env.LINEAR_PROJECT_ID || "(optional)"}`;

    case "implementation":
      // Stdin or args contain the task description
      return args.join(" ") || process.env.TASK_DESCRIPTION || "";

    case "review":
      // Env vars specify what to review
      return `## Review Task

Review ${process.env.NUM_IMPLEMENTATIONS || "3"} implementations in:
${process.env.WORKTREES_DIR || "(worktrees dir not specified)"}

Linear Issue: ${process.env.LINEAR_ISSUE || "(not specified)"}`;

    default:
      return args.join(" ");
  }
}
```

### 4. Auth Module (OAuth for Anthropic)

**Keep in: `src/lib/auth.ts`**

```typescript
import type { OpencodeClient, Provider } from "./types.js";

export async function setupAuth(client: OpencodeClient, provider: Provider): Promise<void> {
  switch (provider) {
    case "anthropic": {
      const access = process.env.ANTHROPIC_OAUTH_ACCESS;
      const refresh = process.env.ANTHROPIC_OAUTH_REFRESH;
      const expires = process.env.ANTHROPIC_OAUTH_EXPIRES;

      if (!access || !refresh || !expires) {
        throw new Error(
          "Anthropic OAuth required. Set ANTHROPIC_OAUTH_ACCESS, ANTHROPIC_OAUTH_REFRESH, ANTHROPIC_OAUTH_EXPIRES"
        );
      }

      await client.auth.set({
        path: { id: "anthropic" },
        body: {
          type: "oauth",
          access,
          refresh,
          expires: parseInt(expires, 10)
        }
      });
      console.error("✓ Anthropic OAuth configured");
      break;
    }

    case "openai": {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key required. Set OPENAI_API_KEY");
      }
      console.error("✓ OpenAI API key found");
      break;
    }

    case "google": {
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error("Google API key required. Set GOOGLE_GENERATIVE_AI_API_KEY");
      }
      console.error("✓ Google API key found");
      break;
    }

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
```

## Files to Delete

After consolidation:

- `src/agents/linear-agent.ts`
- `src/agents/planning-agent.ts`
- `scripts/run-agent.ts`
- `src/agents/` directory (empty)

## Files to Create/Modify

| File | Action |
|------|--------|
| `opencode.json` | Create - agent definitions |
| `src/agent.ts` | Create - single entry point |
| `src/lib/input.ts` | Create - agent input assembly |
| `src/lib/auth.ts` | Modify - simplify, OAuth focus |
| `packages/agent-core/src/index.ts` | Modify - export new structure |

## Package Structure After

```
@swellai/agent-core/
├── src/
│   ├── agent.ts              # Single CLI entry point
│   └── lib/
│       ├── auth.ts           # OAuth for Anthropic
│       ├── input.ts          # Agent-specific input assembly
│       ├── events.ts         # Event monitoring
│       ├── conversation-logger.ts
│       └── types.ts
├── opencode.json             # Agent definitions
└── prompts/
    ├── plan-generation.md
    ├── consolidate-and-create-linear.md
    ├── implementation.md
    └── review.md
```

## Usage After Consolidation

```bash
# Planning agent
AGENT=planning bun run src/agent.ts "Add user authentication"

# Linear agent (env vars for plans)
PLAN_1="..." PLAN_2="..." PLAN_3="..." \
AGENT=linear bun run src/agent.ts

# Implementation agent
AGENT=implementation bun run src/agent.ts "Implement the auth feature"

# Review agent
NUM_IMPLEMENTATIONS=3 WORKTREES_DIR=/tmp/worktrees LINEAR_ISSUE=ENG-123 \
AGENT=review bun run src/agent.ts
```

## GitHub Actions Integration

```yaml
env:
  # Anthropic OAuth (preferred)
  ANTHROPIC_OAUTH_ACCESS: ${{ secrets.ANTHROPIC_OAUTH_ACCESS }}
  ANTHROPIC_OAUTH_REFRESH: ${{ secrets.ANTHROPIC_OAUTH_REFRESH }}
  ANTHROPIC_OAUTH_EXPIRES: ${{ secrets.ANTHROPIC_OAUTH_EXPIRES }}
  # Other providers
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  GOOGLE_GENERATIVE_AI_API_KEY: ${{ secrets.GOOGLE_GENERATIVE_AI_API_KEY }}
  # Linear
  LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}

steps:
  - uses: actions/checkout@v4

  - name: Run planning agent
    run: AGENT=planning PROVIDER=anthropic bun run src/agent.ts "${{ github.event.issue.body }}"
```

## Benefits

1. **Single source of truth** - Agent configs in `opencode.json`, not scattered in code
2. **Extensibility** - Add new agents by editing JSON, not writing new files
3. **OpenCode native** - Leverages OpenCode's config system directly
4. **OAuth support** - Anthropic OAuth as a value-add feature
5. **Simpler maintenance** - One entry point instead of three
6. **Declarative** - Tools, permissions, prompts all visible in config

## Migration Steps

1. Create `opencode.json` with all agent definitions
2. Create `src/lib/input.ts` for agent-specific input assembly
3. Create `src/agent.ts` as single entry point
4. Simplify `src/lib/auth.ts` to focus on OAuth
5. Update `packages/agent-core/src/index.ts` exports
6. Update GitHub Actions workflows to use new CLI
7. Delete old agent files
8. Update documentation
