#!/usr/bin/env node
/**
 * planning-agent.ts
 *
 * Generates an implementation plan using a custom planning agent.
 * The planning agent is configured for read-only operations with web research capabilities.
 *
 * Usage:
 *   planning-agent.ts <feature-description>
 */

import { runAgent } from "@swellai/agent-core";

async function main() {
  await runAgent({
    name: "planning-agent",
    description: "Generate a comprehensive implementation plan for a given feature",
    requiredEnvVars: [], // API keys are handled by runAgent based on provider
    promptFileName: "plan-generation.md",
    getAgentTools: () => ({
      write: false,
      edit: false,
      bash: false,
      read: true,
      list: true,
      glob: true,
      grep: true,
      webfetch: true,
    }),
    getAgentPermissions: () => ({
      edit: "deny",
      bash: "deny",
      webfetch: "allow",
    }),
    processPrompt: (template) => {
      const args = process.argv.slice(2);
      if (args.length < 1) {
        console.error("Usage: planning-agent.ts <feature-description>");
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
