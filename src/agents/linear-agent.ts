#!/usr/bin/env node
/**
 * linear-agent.ts
 *
 * Consolidates three implementation plans from different AI providers and creates Linear issues.
 * This is the v2 workflow approach that receives pre-generated plans via environment variables.
 *
 * Usage:
 *   linear-agent.ts
 */

import { runAgent } from "@swellai/agent-core";

async function main() {
  await runAgent({
    name: "linear-agent",
    description: "Consolidate implementation plans and create Linear issues",
    requiredEnvVars: [
      "ANTHROPIC_PLAN",
      "OPENAI_PLAN",
      "GOOGLE_PLAN",
      "GITHUB_ISSUE_URL",
      "ISSUE_TITLE",
      "LINEAR_TEAM_ID",
      "LINEAR_API_KEY",
    ],
    promptFileName: "consolidate-and-create-linear.md",
    getAgentTools: (linearApiKey) => ({
      write: false,
      edit: false,
      bash: true,
      read: true,
      list: true,
      glob: true,
      grep: true,
      webfetch: true,
      ...(linearApiKey && { "mcp__linear__*": true }),
    }),
    getAgentPermissions: (linearApiKey) => ({
      edit: "deny",
      bash: "allow",
      webfetch: "allow",
      ...(linearApiKey && { "mcp__linear__*": "allow" }),
    }),
    processPrompt: (template, env) => {
      return template
        .replace(/\{\{ANTHROPIC_PLAN\}\}/g, env.ANTHROPIC_PLAN || "")
        .replace(/\{\{OPENAI_PLAN\}\}/g, env.OPENAI_PLAN || "")
        .replace(/\{\{GOOGLE_PLAN\}\}/g, env.GOOGLE_PLAN || "")
        .replace(/\{\{GITHUB_ISSUE_URL\}\}/g, env.GITHUB_ISSUE_URL || "")
        .replace(/\{\{ISSUE_TITLE\}\}/g, env.ISSUE_TITLE || "")
        .replace(/\{\{LINEAR_TEAM_ID\}\}/g, env.LINEAR_TEAM_ID || "")
        .replace(/\{\{LINEAR_PROJECT_ID\}\}/g, env.LINEAR_PROJECT_ID || "");
    },
  });
}

main().catch((error) => {
  console.error("FATAL ERROR:", error);
  process.exit(1);
});
