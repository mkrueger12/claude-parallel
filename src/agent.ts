#!/usr/bin/env node
/**
 * agent.ts
 *
 * Unified CLI entry point for all claude-parallel agents.
 * Routes to the appropriate agent configuration based on agent name.
 *
 * Usage:
 *   agent.ts <agent-name>
 *   AGENT=<agent-name> agent.ts
 *
 * Available agents:
 *   - planning: Generate implementation plans for features
 *   - linear: Consolidate plans and create Linear issues
 *   - implementation: Implement features based on descriptions
 *   - review: Review multiple implementations and select the best
 */

import { type AgentConfig, runAgent } from "@swellai/agent-core";

const AVAILABLE_AGENTS = ["planning", "linear", "implementation", "review"] as const;
type AgentName = (typeof AVAILABLE_AGENTS)[number];

function showUsage(): never {
  console.error(`
Usage: agent.ts <agent-name>
       AGENT=<agent-name> agent.ts

Available agents:
  planning        Generate implementation plans for features
  linear          Consolidate plans and create Linear issues
  implementation  Implement features based on descriptions
  review          Review multiple implementations and select the best

Environment variables:
  AGENT           Agent name (alternative to CLI argument)
  PROVIDER        AI provider (default: anthropic)
  MODEL           Model to use (default: claude-opus-4-5)

Examples:
  agent.ts planning
  AGENT=implementation agent.ts
  PROVIDER=anthropic MODEL=claude-opus-4-5 agent.ts review
`);
  process.exit(1);
}

function getAgentConfig(agentName: AgentName): AgentConfig {
  switch (agentName) {
    case "planning":
      return {
        name: "planning-agent",
        description: "Generate a comprehensive implementation plan for a given feature",
        requiredEnvVars: [],
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
        processPrompt: (template) => template,
      };

    case "linear":
      return {
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
      };

    case "implementation":
      return {
        name: "implementation-agent",
        description: "Implements features based on a given description",
        requiredEnvVars: [],
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
        processPrompt: (template) => template,
      };

    case "review":
      return {
        name: "review-agent",
        description: "Reviews multiple implementations and selects the best one",
        requiredEnvVars: ["NUM_IMPLEMENTATIONS", "WORKTREES_DIR", "LINEAR_ISSUE"],
        promptFileName: "review.md",
        getAgentTools: () => ({
          read: true,
          list: true,
          glob: true,
          grep: true,
          webfetch: false,
        }),
        getAgentPermissions: () => ({
          webfetch: "allow",
        }),
        processPrompt: (template, env) => {
          return template
            .replace(/\{\{NUM_IMPLEMENTATIONS\}\}/g, env.NUM_IMPLEMENTATIONS || "3")
            .replace(/\{\{WORKTREES_DIR\}\}/g, env.WORKTREES_DIR || "")
            .replace(/\{\{LINEAR_ISSUE\}\}/g, env.LINEAR_ISSUE || "");
        },
      };
  }
}

async function main() {
  const agentName = (process.env.AGENT || process.argv[2]) as AgentName | undefined;

  if (!agentName) {
    showUsage();
  }

  if (!AVAILABLE_AGENTS.includes(agentName)) {
    console.error(`\nError: Unknown agent '${agentName}'`);
    console.error(`Available agents: ${AVAILABLE_AGENTS.join(", ")}`);
    showUsage();
  }

  const config = getAgentConfig(agentName);
  await runAgent(config);
}

main().catch((error) => {
  console.error("FATAL ERROR:", error);
  process.exit(1);
});
