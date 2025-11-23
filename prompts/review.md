You are reviewing {{NUM_IMPLEMENTATIONS}} parallel implementations of the following feature request:

"{{FEATURE_REQUEST}}"

The implementations are located in:
- {{WORKTREES_DIR}}/impl-1
- {{WORKTREES_DIR}}/impl-2
- {{WORKTREES_DIR}}/impl-3

Your task:
1. Review each implementation by examining the git diff and code changes
2. Evaluate based on these criteria:
   - Code quality: Clean, maintainable, follows conventions, proper error handling
   - Completeness: Fully implements the requested feature, handles edge cases
   - Delegate up to 3 subagents to review areas in the codebase.

For each implementation, examine:
- Git diff to see what changed
- Code structure and organization
- Whether it fully addresses the feature request
- Code quality and maintainability

After reviewing all implementations, determine which one is best.

You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks, just the JSON):
{"best": 1, "reasoning": "Detailed explanation of why this implementation is best, comparing it to the others", "quality_score": 85, "completeness_score": 90}

Where:
- "best" is 1, 2, or 3 (the winning implementation number)
- "reasoning" is a detailed explanation comparing all implementations
- "quality_score" is 0-100
- "completeness_score" is 0-100

After completing the review, create a draft PR into HEAD with the branch you selected. If you do not select a branch do not create a PR.

The PR should have a descriptive title and have the following body:

- No emojis

```
Feature Request: [Feature request description]

Summary of changes:
[Bullet list of changes from the target branch]

Detailed review of changes:
[Provide an easily digestable review of the changes. Assume the user has some codebase knowledge but not all. Make it clear the important changes the reviewer should look at.]
```
