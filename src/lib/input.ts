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
