# Refactor to Server-Inherited Authentication Implementation Plan

## Overview

Refactor claude-parallel to use the OpenCode SDK's `client.auth.set()` API instead of passing API keys explicitly through environment variables. This allows agents to inherit credentials via the SDK's auth infrastructure, providing a cleaner authentication flow.

## Implementation Task List

1. Create new authentication module with `setProviderAuth()` function
2. Update `OpencodeServerOptions` to remove `apiKey` requirement
3. Refactor `createOpencodeServer()` to call auth setup after client creation
4. Update `agent-runner.ts` to stop passing `apiKey` explicitly
5. Update environment variable validation logic
6. Update GitHub Actions setup workflow
7. Add tests for the new authentication flow

## Current State Analysis

### Current Authentication Flow

1. **Agent Runner** (`src/lib/agent-runner.ts:48`) calls `getApiKey(provider)` to retrieve API key from env vars
2. **API Key is passed** to `createOpencodeServer()` as part of `OpencodeServerOptions` (line 79)
3. **OpenCode configuration** (`src/lib/opencode.ts:154-162`) embeds the key directly in provider config:
   ```typescript
   provider: {
     [provider]: {
       options: {
         apiKey,
         timeout: false,
       },
     },
   },
   ```

### Current Files Involved

- `src/lib/agent-runner.ts` - Retrieves API key and passes to server creation
- `src/lib/opencode.ts` - Accepts `apiKey` in options, embeds in config
- `src/lib/utils.ts` - Contains `getApiKey()` helper function
- `src/lib/types.ts` - Contains `API_KEY_ENV_VARS` mapping

## Desired End State

After implementation:

1. `createOpencodeServer()` creates the client first, then calls `client.auth.set()` for each configured provider
2. API keys are no longer passed through the config object; they are set via the SDK's auth API
3. Support for OAuth credentials (Anthropic) via `ANTHROPIC_OAUTH_ACCESS`, `ANTHROPIC_OAUTH_REFRESH`, `ANTHROPIC_OAUTH_EXPIRES`
4. Support for API key auth for all providers as fallback
5. Clear error messages when authentication fails

### Verification Criteria

- Run `bun run type-check` - no TypeScript errors
- Run planning agent locally with `ANTHROPIC_API_KEY` set
- Run planning agent locally with Anthropic OAuth credentials set
- Verify error messages are clear when credentials are missing

## What We're NOT Doing

- Not changing the Claude Agent SDK authentication (`src/lib/claude-agent-sdk.ts`) - that's a separate code path
- Not implementing `auth.json` file reading (the SDK server handles that internally)
- Not adding automatic credential refresh - OAuth refresh is handled by the SDK
- Not changing the Linear MCP authentication approach (already uses Authorization header)

## Implementation Approach

We will:
1. Create a new `setProviderAuth()` function in `src/lib/opencode.ts` that calls `client.auth.set()`
2. Make `apiKey` optional in `OpencodeServerOptions`
3. Call `setProviderAuth()` after `createOpencode()` returns the client
4. Remove the `apiKey` from the provider config object
5. Update validation to check for either OAuth or API key credentials

## Files to Edit

| File | Lines | Change Description |
|------|-------|-------------------|
| `src/lib/opencode.ts` | 95-121, 137-197 | Remove apiKey from interface, add auth setup function, refactor server creation |
| `src/lib/agent-runner.ts` | 48, 77-101 | Remove getApiKey call and apiKey param |
| `src/lib/utils.ts` | 50-67 | Refactor getApiKey or add getAuthCredentials |
| `src/lib/types.ts` | 39-43 | Add OAuth environment variable names |
| `.github/actions/setup-opencode/action.yml` | 46-79 | Add OAuth env var support |

---

## Task 1: Add OAuth Environment Variable Types

**File**: `src/lib/types.ts`

**Description of Changes**:

Add new type definitions for OAuth credentials and extend the `API_KEY_ENV_VARS` mapping to include OAuth environment variable names. Create a new `OAUTH_ENV_VARS` constant that maps providers to their OAuth credential environment variable names.

Add these new exports:
- `OAUTH_ENV_VARS` constant mapping `anthropic` to `["ANTHROPIC_OAUTH_ACCESS", "ANTHROPIC_OAUTH_REFRESH", "ANTHROPIC_OAUTH_EXPIRES"]`
- Keep existing `API_KEY_ENV_VARS` for backward compatibility

**Lines to modify**: After line 43, add new constant

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `bun run type-check`
- [ ] No linting errors: `bun run lint` (if configured)

#### Manual Verification:
- [ ] New types are properly exported and importable

---

## Task 2: Create Authentication Setup Function in opencode.ts

**File**: `src/lib/opencode.ts`

**Description of Changes**:

1. Remove `apiKey` from the `OpencodeServerOptions` interface (line 97)
2. Add a new `provider` field to specify which provider to authenticate (already present)
3. Create a new async function `setProviderAuth()` that:
   - Accepts the OpenCode client and provider name
   - Checks for OAuth credentials first (`ANTHROPIC_OAUTH_ACCESS`, etc.)
   - Falls back to API key authentication
   - Calls `client.auth.set()` with the appropriate auth type
   - Throws a descriptive error if no credentials are found

The function signature:
```typescript
async function setProviderAuth(
  client: OpencodeClient,
  provider: Provider
): Promise<void>
```

4. Update `createOpencodeServer()` to:
   - Remove `apiKey` from the destructured options
   - Remove `apiKey` from the provider options in `opcodeConfig`
   - Call `setProviderAuth()` after client creation but before returning

**Lines to modify**:
- Line 97: Remove `apiKey: string;`
- Lines 140-151: Remove apiKey destructuring
- Lines 154-162: Remove apiKey from provider options
- Add new function after line 130

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `bun run type-check`
- [ ] Type imports resolve correctly

#### Manual Verification:
- [ ] `setProviderAuth` properly handles OAuth flow
- [ ] `setProviderAuth` properly handles API key flow
- [ ] Error messages are clear when no credentials are provided

---

## Task 3: Update Agent Runner to Remove API Key Handling

**File**: `src/lib/agent-runner.ts`

**Description of Changes**:

1. Remove the import of `getApiKey` from utils (line 6)
2. Remove line 48: `const apiKey = getApiKey(provider);`
3. Remove `apiKey` from the options passed to `createOpencodeServer()` (line 79)

The agent runner should now simply pass the provider name, and let `createOpencodeServer()` handle authentication internally via `client.auth.set()`.

**Lines to modify**:
- Line 6: Remove `getApiKey` from imports
- Line 48: Remove `const apiKey = getApiKey(provider);`
- Line 79: Remove `apiKey,`

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `bun run type-check`
- [ ] No unused import warnings

#### Manual Verification:
- [ ] Agent still authenticates correctly when run

---

## Task 4: Refactor getApiKey and Add getAuthCredentials

**File**: `src/lib/utils.ts`

**Description of Changes**:

1. Add a new function `getAuthCredentials()` that returns structured auth credentials:
   ```typescript
   export function getAuthCredentials(provider: Provider): {
     type: 'oauth' | 'api';
     oauth?: { access: string; refresh: string; expires: number };
     apiKey?: string;
   } | null
   ```

2. This function should:
   - Check for OAuth credentials first (for Anthropic)
   - Fall back to API key
   - Return `null` if no credentials are found (let caller decide on error)

3. Keep `getApiKey()` for backward compatibility but mark it with a JSDoc deprecation notice

**Lines to modify**:
- After line 67, add new `getAuthCredentials()` function
- Line 43-67: Add `@deprecated` JSDoc to `getApiKey()`

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `bun run type-check`
- [ ] Function returns correct types

#### Manual Verification:
- [ ] OAuth credentials are detected when all three env vars are set
- [ ] API key fallback works correctly

---

## Task 5: Update GitHub Actions Setup Workflow

**File**: `.github/actions/setup-opencode/action.yml`

**Description of Changes**:

1. Add new optional inputs for OAuth credentials:
   - `anthropic_oauth_access` - Anthropic OAuth access token
   - `anthropic_oauth_refresh` - Anthropic OAuth refresh token
   - `anthropic_oauth_expires` - Anthropic OAuth expiration timestamp

2. Update the "Set environment variables" step to:
   - Set `ANTHROPIC_OAUTH_ACCESS`, `ANTHROPIC_OAUTH_REFRESH`, `ANTHROPIC_OAUTH_EXPIRES` when provided
   - Keep existing `ANTHROPIC_API_KEY` as fallback

3. Update validation to require either OAuth credentials OR API key (not both required)

**Lines to modify**:
- After line 9: Add new OAuth input definitions
- Lines 101-128: Update environment variable setting logic
- Lines 46-79: Update validation logic to accept either auth method

### Success Criteria:

#### Automated Verification:
- [ ] GitHub Actions syntax is valid (validate with `actionlint` if available)

#### Manual Verification:
- [ ] Workflow accepts OAuth credentials
- [ ] Workflow accepts API key as fallback
- [ ] Error message is clear when neither is provided

---

## Task 6: Extend OpencodeClient Interface for Auth

**File**: `src/lib/opencode.ts`

**Description of Changes**:

The current `OpencodeClient` interface (lines 49-90) doesn't include the `auth` property. We need to extend it to include the auth methods.

Add to the interface:
```typescript
auth: {
  set(options: {
    path: { id: string };
    body: {
      type: 'oauth' | 'api';
      // OAuth fields
      access?: string;
      refresh?: string;
      expires?: number;
      // API key fields
      key?: string;
    };
  }): Promise<{ data?: boolean; error?: unknown }>;
};
```

**Lines to modify**: After line 89, add the `auth` property to the interface

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `bun run type-check`
- [ ] Type checking passes for `client.auth.set()` calls

#### Manual Verification:
- [ ] IDE provides proper autocomplete for auth methods

---

## Task 7: Add Integration Test for Authentication

**File**: `src/lib/__tests__/auth.test.ts` (new file)

**Description of Changes**:

Create a test file that verifies:
1. OAuth credentials are correctly detected from environment
2. API key fallback works when OAuth is not available
3. Error is thrown with clear message when no credentials exist
4. `client.auth.set()` is called with correct parameters

Use Bun's test runner:
```typescript
import { describe, test, expect, mock } from "bun:test";
```

### Success Criteria:

#### Automated Verification:
- [ ] Tests pass: `bun test src/lib/__tests__/auth.test.ts`

#### Manual Verification:
- [ ] Test coverage includes all auth paths

---

## Testing Strategy

### Unit Tests

- Test `getAuthCredentials()` returns correct structure for OAuth and API key scenarios
- Test `setProviderAuth()` calls `client.auth.set()` with correct parameters
- Test error handling when no credentials are available

### Integration Tests

End-to-end test with real SDK:
```bash
# Test with API key
ANTHROPIC_API_KEY="test-key" bun run src/agents/planning-agent.ts "Test feature"

# Test with OAuth (requires valid tokens)
ANTHROPIC_OAUTH_ACCESS="access-token" \
ANTHROPIC_OAUTH_REFRESH="refresh-token" \
ANTHROPIC_OAUTH_EXPIRES="1234567890" \
bun run src/agents/planning-agent.ts "Test feature"
```

### Manual Testing Steps

1. Set only `ANTHROPIC_API_KEY` - verify agent runs successfully
2. Set only OAuth credentials - verify agent runs successfully
3. Unset all credentials - verify clear error message is shown
4. Run full workflow in GitHub Actions with secrets configured

## Migration Notes

This is a **non-breaking change** for users:
- Existing API key environment variables continue to work
- OAuth support is additive
- No changes required to existing GitHub workflow configurations unless OAuth is desired

For users who want to switch to OAuth:
1. Obtain OAuth credentials from Anthropic
2. Add `ANTHROPIC_OAUTH_ACCESS`, `ANTHROPIC_OAUTH_REFRESH`, `ANTHROPIC_OAUTH_EXPIRES` to GitHub Secrets
3. Update workflow to pass OAuth secrets to the setup action

## References

- Original ticket: GitHub Issue #54
- OpenCode SDK Types: `node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts:1434-1450`
- Auth API: `node_modules/@opencode-ai/sdk/dist/gen/sdk.gen.d.ts:265-286`
- Current auth flow: `src/lib/agent-runner.ts:48`, `src/lib/opencode.ts:154-162`
