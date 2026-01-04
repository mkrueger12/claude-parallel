#!/usr/bin/env node
/**
 * implementation-agent.ts
 *
 * Implements a feature using a custom implementation agent.
 * The implementation agent is configured for read/write operations with full bash capabilities.
 *
 * Usage:
 *   implementation-agent.ts <feature-description>
 */

import { runAgent } from "../lib/agent-runner.js";

async function main() {
  await runAgent({
    name: "implementation-agent",
    description: "Implement a feature based on a given description",
    requiredEnvVars: [], // API keys are handled by runAgent based on provider
    promptFileName: "implementation.md",
    getAgentTools: () => ({
      write: true,
      edit: true,
      bash: true,
      read: true,
      list: true,
      glob: true,
      grep: true,
      webfetch: true,
    }),
    getAgentPermissions: () => ({
      edit: "allow",
      bash: "allow",
      webfetch: "allow",
    }),
    processPrompt: (template) => {
      const args = process.argv.slice(2);
      if (args.length < 1) {
        console.error("Usage: implementation-agent.ts <feature-description>");
        process.exit(1);
      }
      return template; // The feature description is passed as the user prompt in runAgent
    },
  });
}

main().catch((error) => {
  console.error("FATAL ERROR:", error);
  process.exit(1);
});
