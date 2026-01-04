#!/usr/bin/env node
/**
 * review-agent.ts
 *
 * Reviews parallel implementations and selects the best one.
 * The review agent is configured for read-only operations.
 *
 * Usage:
 *   review-agent.ts
 *
 * Expected environment variables:
 *   - NUM_IMPLEMENTATIONS: Number of implementations to review
 *   - WORKTREES_DIR: Directory containing implementation worktrees
 *   - LINEAR_ISSUE: Linear issue details
 */

import { runAgent } from "../lib/agent-runner.js";

async function main() {
  await runAgent({
    name: "review-agent",
    description: "Review parallel implementations and select the best one",
    requiredEnvVars: ["NUM_IMPLEMENTATIONS", "WORKTREES_DIR", "LINEAR_ISSUE"],
    promptFileName: "review.md",
    getAgentTools: () => ({
      write: false,
      edit: false,
      bash: false,
      read: true,
      list: true,
      glob: true,
      grep: true,
      webfetch: false,
    }),
    getAgentPermissions: () => ({
      edit: "deny",
      bash: "deny",
      webfetch: "deny",
    }),
    processPrompt: (template, env) => {
      // Replace template variables
      let processedPrompt = template
        .replace(/\{\{NUM_IMPLEMENTATIONS\}\}/g, env.NUM_IMPLEMENTATIONS || "3")
        .replace(/\{\{WORKTREES_DIR\}\}/g, env.WORKTREES_DIR || "")
        .replace(/\{\{LINEAR_ISSUE\}\}/g, env.LINEAR_ISSUE || "");

      // Append JSON schema requirements to enforce structured output
      processedPrompt += `

## CRITICAL: Output Format

You MUST respond with valid JSON matching this exact schema:

\`\`\`json
{
  "best": <integer>,
  "reasoning": "<string>"
}
\`\`\`

Where:
- "best" is the 1-based index of the best implementation (e.g., 1, 2, or 3)
- "reasoning" is a detailed explanation comparing all implementations and justifying your choice

Example valid response:
\`\`\`json
{
  "best": 2,
  "reasoning": "Implementation 2 provides the most comprehensive solution with proper error handling, clean code structure, and complete test coverage. Implementation 1 had a simpler approach but missed edge cases. Implementation 3 was over-engineered with unnecessary abstractions."
}
\`\`\`

DO NOT include any text before or after the JSON object. Your entire response must be valid JSON.
`;

      return processedPrompt;
    },
  });
}

main().catch((error) => {
  console.error("FATAL ERROR:", error);
  process.exit(1);
});
