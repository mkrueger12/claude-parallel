# @swellai/agent-core

Core agent execution logic for Claude Parallel workflows. This package provides reusable utilities for running AI agents using the OpenCode SDK, with built-in support for conversation logging, event monitoring, and Linear integration.

## Installation

```bash
# Using Bun
bun add @swellai/agent-core

# Using npm
npm install @swellai/agent-core
```

## Usage

### Basic Agent Execution

```typescript
import { runAgent } from '@swellai/agent-core';

await runAgent({
  name: 'my-agent',
  description: 'Implements features and fixes bugs',
  requiredEnvVars: ['ANTHROPIC_API_KEY'],
  promptFileName: 'implementation-prompt.md',
  maxSteps: 30,
  getAgentTools: () => ({
    write: true,
    edit: true,
    bash: true,
    read: true,
    glob: true,
    grep: true,
  }),
  getAgentPermissions: () => ({
    edit: 'allow',
    bash: 'allow',
    webfetch: 'allow',
  }),
});
```

### Advanced: Custom OpenCode Server

```typescript
import {
  createOpencodeServer,
  setupEventMonitoring,
  createConversationLogger,
  extractTextFromParts,
} from '@swellai/agent-core';

// Initialize conversation logger (optional)
const logger = await createConversationLogger();

// Create OpenCode server
const { client, server } = await createOpencodeServer({
  provider: 'anthropic',
  model: 'claude-opus-4-5',
  agentName: 'review-agent',
  agentDescription: 'Reviews code and provides feedback',
  agentPrompt: 'Review the following code...',
  agentTools: {
    read: true,
    grep: true,
    webfetch: true,
  },
  agentPermissions: {
    webfetch: 'allow',
  },
  maxSteps: 20,
  linearApiKey: process.env.LINEAR_API_KEY, // Optional
});

// Setup event monitoring
setupEventMonitoring(client, logger);

// Start logging session
if (logger) {
  await logger.startSession({
    id: crypto.randomUUID(),
    agentType: 'review',
    model: 'claude-opus-4-5',
    provider: 'anthropic',
  });
}

// Create session and send prompt
const sessionResponse = await client.session.create({
  body: { title: 'Review Session' },
});

const session = sessionResponse.data;

const promptResponse = await client.session.prompt({
  path: { id: session.id },
  body: {
    model: { providerID: 'anthropic', modelID: 'claude-opus-4-5' },
    agent: 'review-agent',
    parts: [{ type: 'text', text: 'Review the code in src/' }],
  },
});

// Extract response text
const resultText = extractTextFromParts(promptResponse.data.parts);
console.log(resultText);

// End session and sync to cloud
if (logger) {
  await logger.endSession('completed');
  await logger.syncToCloud();
}

// Clean up
server.close();
```

## API Reference

### `runAgent(config: AgentConfig)`

Main function to run an AI agent with the OpenCode SDK.

**Parameters:**

- `config.name` (string): Agent name (e.g., "implementation-agent")
- `config.description` (string): Agent description for the OpenCode SDK
- `config.requiredEnvVars` (string[]): Required environment variables to validate
- `config.promptFileName` (string): Name of the prompt file to load
- `config.maxSteps` (number, optional): Maximum agent steps (default: 30)
- `config.getAgentTools` (function, optional): Returns tool configuration object
- `config.getAgentPermissions` (function, optional): Returns permissions object
- `config.processPrompt` (function, optional): Processes the prompt template

**Returns:** Promise that resolves when the agent completes or rejects on error.

### `createOpencodeServer(options: OpencodeServerOptions)`

Creates and configures an OpenCode SDK server instance.

**Parameters:**

- `options.provider` (Provider): AI provider ("anthropic" | "openai" | "google")
- `options.model` (string): Model identifier (e.g., "claude-opus-4-5")
- `options.agentName` (string): Agent name
- `options.agentDescription` (string): Agent description
- `options.agentPrompt` (string): Prompt text to send to the agent
- `options.agentTools` (object, optional): Tool configuration
- `options.agentPermissions` (object, optional): Permission configuration
- `options.maxSteps` (number, optional): Maximum steps (default: 30)
- `options.linearApiKey` (string, optional): Linear API key for Linear MCP integration

**Returns:** Promise resolving to `{ client: OpencodeClient, server: OpencodeServer }`

### `setupEventMonitoring(client: OpencodeClient, logger?: ConversationLogger | null)`

Sets up event monitoring for an OpenCode session. Logs tool executions, session status changes, and errors to stderr and optionally to a Turso database.

**Parameters:**

- `client` (OpencodeClient): OpenCode client instance
- `logger` (ConversationLogger, optional): Conversation logger for database storage

**Returns:** void

### `createConversationLogger()`

Creates a Turso-based conversation logger if configured.

**Returns:** Promise resolving to `ConversationLogger | null`

**Note:** Requires Turso environment variables:
- `TURSO_DATABASE_URL` - Turso database URL
- `TURSO_AUTH_TOKEN` - Turso authentication token

### `extractTextFromParts(parts: Part[])`

Extracts text content from OpenCode SDK message parts.

**Parameters:**

- `parts` (Part[]): Array of message parts from the SDK response

**Returns:** string - Concatenated text from all text-type parts

### `validateEnvVars(requiredVars: string[])`

Validates that required environment variables are set.

**Parameters:**

- `requiredVars` (string[]): Array of environment variable names to check

**Throws:** Error if any required variables are missing

## Environment Variables

### Authentication (Required)

Choose one authentication method:

**OAuth (Preferred for Anthropic):**
```bash
ANTHROPIC_OAUTH_ACCESS=...     # OAuth access token
ANTHROPIC_OAUTH_REFRESH=...    # OAuth refresh token
ANTHROPIC_OAUTH_EXPIRES=...    # Expiration timestamp (milliseconds)
```

**API Keys (Fallback):**
```bash
# Anthropic
ANTHROPIC_API_KEY=...
# OR
CLAUDE_CODE_OAUTH_TOKEN=...

# OpenAI
OPENAI_API_KEY=...

# Google
GOOGLE_GENERATIVE_AI_API_KEY=...
```

### Optional Features

**Conversation Logging (Turso):**
```bash
TURSO_DATABASE_URL=...         # Turso database URL
TURSO_AUTH_TOKEN=...           # Turso authentication token
```

**Linear Integration:**
```bash
LINEAR_API_KEY=...             # Linear API key for MCP integration
```

**Agent Configuration:**
```bash
PROVIDER=anthropic             # AI provider (default: anthropic)
MODEL=claude-opus-4-5          # Model ID (default: claude-opus-4-5)
```

## Type Exports

```typescript
import type {
  AgentConfig,
  Provider,
  OpencodeClient,
  OpencodeServer,
  OpencodeServerOptions,
  Part,
} from '@swellai/agent-core';
```

## License

MIT
