#!/usr/bin/env node

import { runAgent } from "@swellai/agent-core";

const MODE = process.env.MODE || "implementation";

const config =
  MODE === "review"
    ? {
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
        processPrompt: (template: string, env: NodeJS.ProcessEnv) => {
          return template
            .replace(/\{\{NUM_IMPLEMENTATIONS\}\}/g, env.NUM_IMPLEMENTATIONS || "3")
            .replace(/\{\{WORKTREES_DIR\}\}/g, env.WORKTREES_DIR || "")
            .replace(/\{\{LINEAR_ISSUE\}\}/g, env.LINEAR_ISSUE || "");
        },
      }
    : {
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
        processPrompt: (template: string) => template,
      };

await runAgent(config);
