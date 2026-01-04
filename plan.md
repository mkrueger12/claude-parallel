## Overview

Refactor the claude-parallel authentication system to use the OpenCode SDK's `client.auth.set()` API for server-inherited credentials instead of passing API keys explicitly through configuration objects. This enables agents to inherit credentials from `~/.local/share/opencode/auth.json`, providing a cleaner authentication flow for local development.

## Implementation Task List:

1. **Add auth.set() call after client creation** - Invoke `client.auth.set()` after the OpenCode server is created to set credentials
2. **Remove apiKey from OpencodeServerOptions** - Clean up the interface and remove explicit API key passing in config
3. **Refactor agent-runner.ts** - Stop calling `getApiKey()` and remove apiKey from server options
4. **Add fallback support for CI/CD** - Maintain environment variable support when auth.json is unavailable
5. **Update type definitions** - Mark `apiKey` as optional or remove from ProviderConfig interface
6. **Rebuild bundled templates** - Regenerate the bundled .js files with the new implementation

## Current State Analysis

### Current Authentication Flow:
1. `agent-runner.ts:48` calls `getApiKey(provider)` to retrieve API key from environment
2. API key is passed to `createOpencodeServer()` as part of `OpencodeServerOptions` (line 79)
3. `opencode.ts:154-162` embeds the key directly in the provider configuration:
   ```typescript
   provider: {
     [provider]: {
       options: {
         apiKey,  // <-- Explicit API key
         timeout: false,
       },
     },
   }
   ```
4. `createOpencode()` receives this config and initializes the provider

### Target Authentication Flow:
1. Create OpenCode server WITHOUT API key in configuration
2. After client creation, call `client.auth.set()` to configure authentication
3. Server reads credentials from `~/.local/share/opencode/auth.json`
4. Fall back to environment variables for CI/CD environments

### OpenCode SDK Auth API (from bundled code):
- `client.auth.set()` is available at `templates/scripts/planning-agent.js:10090-10099`
- Makes PUT request to `/auth/{id}`
- Body contains auth data (type discriminated: "oauth", "api_key", "wellknown")
- Client has `auth` property at line 10289

### Key Discoveries:
- `src/lib/opencode.ts:97` - `apiKey: string` in OpencodeServerOptions interface
- `src/lib/opencode.ts:154-162` - API key embedded in provider config
- `src/lib/agent-runner.ts:48` - `getApiKey(provider)` call
- `src/lib/agent-runner.ts:79` - `apiKey` passed to createOpencodeServer
- `src/lib/utils.ts:50-67` - `getApiKey()` function
- `src/lib/types.ts:39-43` - `API_KEY_ENV_VARS` constant
- OpenCode SDK Auth class at `templates/scripts/planning-agent.js:10061-10100`

## Desired End State

After implementation:
1. `createOpencodeServer()` no longer requires an `apiKey` parameter
2. Authentication is configured via `client.auth.set()` after client creation
3. The system checks for auth.json credentials first, falling back to environment variables
4. CI/CD workflows continue to work with explicit secrets
5. Local development benefits from inherited authentication

### Verification:
- Run `bun run type-check` - TypeScript compilation succeeds
- Run `bun run build` - Build completes without errors
- Run agents locally with auth.json present - Should authenticate without env vars
- Run agents with only env vars set (no auth.json) - Should fallback gracefully

## What We're NOT Doing

1. **Modifying Claude Agent SDK authentication** - The `src/lib/claude-agent-sdk.ts` file uses a different SDK (`@anthropic-ai/claude-agent-sdk`) and is out of scope
2. **Changing GitHub Actions workflow files** - The workflow YAML files will continue to pass secrets via environment; the code will handle fallback
3. **Modifying Linear MCP authentication** - Linear still uses Bearer token in headers, not auth.set()
4. **Removing API_KEY_ENV_VARS entirely** - Still needed for fallback support
5. **Modifying scripts/claude-agent-runner.ts** - Uses Claude Agent SDK, not OpenCode SDK

## Implementation Approach

The refactoring follows a "dual-path" strategy:
1. **Primary path**: Use `client.auth.set()` with credentials from environment or auth.json
2. **Fallback path**: If auth.set() fails, throw a clear error with instructions

The auth.set() call happens AFTER server creation, using the provider as the auth ID.

## Files to Edit

1. `src/lib/opencode.ts` (lines 95-197)
   - Remove `apiKey` from `OpencodeServerOptions` interface
   - Add new function `setupAuthentication(client, provider, apiKey?)`
   - Modify `createOpencodeServer()` to call setupAuthentication after client creation
   - Remove apiKey from provider config

2. `src/lib/agent-runner.ts` (lines 39-101)
   - Remove `getApiKey(provider)` call at line 48
   - Remove `apiKey` from createOpencodeServer options at line 79
   - Optionally pass apiKey from env as fallback parameter

3. `src/lib/utils.ts` (lines 50-67)
   - Keep `getApiKey()` for fallback support but make it return optional

4. `src/lib/types.ts` (lines 17-20)
   - Make `apiKey` optional in `ProviderConfig` interface

---

## Task 1: Update OpencodeClient Interface and Add auth.set() Types

**File**: `src/lib/opencode.ts`

**Description of Changes**:
Add the `auth` property to the `OpencodeClient` interface to expose the `auth.set()` method. Define the auth data types (OAuth, ApiKey, WellKnown) as a discriminated union to match the SDK's expected structure.

The interface additions should include:
- `auth: { set(options: AuthSetOptions): Promise<{ data?: boolean; error?: unknown }> }`
- Type definitions for `AuthData` with three variants: oauth, api_key, wellknown

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `bun run type-check`
- [ ] No TypeScript errors related to auth types

#### Manual Verification:
- [ ] Interface matches SDK behavior from bundled code analysis

---

## Task 2: Remove apiKey from OpencodeServerOptions and Provider Config

**File**: `src/lib/opencode.ts`

**Description of Changes**:
Remove the `apiKey` required field from `OpencodeServerOptions` interface (line 97). In `createOpencodeServer()`, remove the `apiKey` extraction from options (line 142) and remove apiKey from the provider configuration object (lines 154-162). The provider config should only have `timeout: false`.

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `bun run type-check`
- [ ] Build succeeds: `bun run build`

#### Manual Verification:
- [ ] Provider config no longer contains apiKey
- [ ] OpencodeServerOptions interface is cleaner

---

## Task 3: Create setupAuthentication Function

**File**: `src/lib/opencode.ts`

**Description of Changes**:
Add a new exported async function `setupAuthentication(client: OpencodeClient, provider: Provider, apiKey?: string)` that:
1. Attempts to call `client.auth.set()` with the provided apiKey (if available) or environment variable
2. Uses provider ID as the auth ID ("anthropic", "openai", "google")
3. Formats the auth body as `{ type: "api_key", key: apiKey }` or `{ type: "oauth", token: oauthToken }` depending on what's available
4. Throws a descriptive error if auth fails
5. Logs success/failure to stderr

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `bun run type-check`
- [ ] Function is exported and callable

#### Manual Verification:
- [ ] Function handles both oauth token and api key
- [ ] Error messages are clear and actionable

---

## Task 4: Integrate setupAuthentication into createOpencodeServer

**File**: `src/lib/opencode.ts`

**Description of Changes**:
Modify `createOpencodeServer()` to call `setupAuthentication(client, provider, apiKey)` after the server is created (after line 192) but before returning. The apiKey parameter should be optional and come from the caller as a fallback.

Add a new optional `apiKey` field back to OpencodeServerOptions, but document it as "optional fallback for CI/CD environments".

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `bun run type-check`
- [ ] Build succeeds: `bun run build`

#### Manual Verification:
- [ ] Auth is set after server creation
- [ ] Fallback apiKey is used when provided

---

## Task 5: Update agent-runner.ts to Use New Auth Flow

**File**: `src/lib/agent-runner.ts`

**Description of Changes**:
1. Keep the `getApiKey(provider)` call but wrap it in try-catch to make it optional
2. Pass the apiKey as an optional fallback to createOpencodeServer
3. Update the logging to indicate the authentication flow being used
4. Update the validateEnvVars call to not require provider API keys (they're now optional)

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `bun run type-check`
- [ ] Build succeeds: `bun run build`

#### Manual Verification:
- [ ] Agents work with auth.json present (no env vars)
- [ ] Agents work with env vars only (fallback)

---

## Task 6: Update types.ts ProviderConfig Interface

**File**: `src/lib/types.ts`

**Description of Changes**:
Make the `apiKey` field optional in the `ProviderConfig` interface:
```typescript
export interface ProviderConfig {
  apiKey?: string;  // Optional, can use auth.json instead
  timeout?: boolean;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `bun run type-check`

#### Manual Verification:
- [ ] Interface reflects new optional nature of apiKey

---

## Task 7: Build and Verify

**File**: N/A (build step)

**Description of Changes**:
1. Run `bun run build` to compile TypeScript to dist/
2. Run `bun run type-check` to verify no type errors
3. Verify the bundled templates are updated with new code

### Success Criteria:

#### Automated Verification:
- [ ] Build succeeds: `bun run build`
- [ ] Type checking passes: `bun run type-check`
- [ ] Linting passes: `bun run lint` (if available)

#### Manual Verification:
- [ ] dist/ directory contains updated files
- [ ] templates/scripts/*.js files are regenerated

---

## Migration Notes

### For Local Development:
Users can now authenticate by running `opencode auth login` once, which persists credentials to `~/.local/share/opencode/auth.json`. The agents will automatically use these credentials.

### For CI/CD:
No changes required. GitHub Actions workflows will continue to pass secrets via environment variables:
- `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY` for Anthropic
- `OPENAI_API_KEY` for OpenAI
- `GOOGLE_GENERATIVE_AI_API_KEY` for Google

The code will use these environment variables as fallback when auth.set() is called.

### Error Handling:
If both auth.json and environment variables are missing, the system will throw a clear error:
```
Authentication failed for provider "anthropic".
No credentials found in auth.json and no API key in environment.
Please either:
  - Run 'opencode auth login' to authenticate, or
  - Set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN environment variable
```

## References

- OpenCode SDK Auth class: `templates/scripts/planning-agent.js:10061-10100`
- auth.set() method: `templates/scripts/planning-agent.js:10090-10099`
- Current implementation: `src/lib/opencode.ts:137-197`
- Agent runner: `src/lib/agent-runner.ts:39-101`
- API key utility: `src/lib/utils.ts:50-67`
- Type definitions: `src/lib/types.ts:17-43`
