You are reviewing {{NUM_IMPLEMENTATIONS}} parallel implementations of this feature request:

"{{FEATURE_REQUEST}}"

The implementations are in:
- {{WORKTREES_DIR}}/impl-1
- {{WORKTREES_DIR}}/impl-2
- {{WORKTREES_DIR}}/impl-3

## Review Process

For each implementation:

1. **Examine the changes**:
   ```bash
   cd {{WORKTREES_DIR}}/impl-N
   git diff main...HEAD
   git log main...HEAD --oneline
   ```

2. **Evaluate on these criteria**:
   - **Code quality**: Clean, maintainable, follows conventions, proper error handling
   - **Completeness**: Fully implements the feature, handles edge cases
   - **Correctness**: Logic is sound, no bugs
   - **Simplicity**: Not over-engineered

3. **Check for issues**:
   - Security vulnerabilities
   - Breaking changes
   - Missing tests
   - Incomplete implementation

## Decision

After reviewing all implementations, select the best one.

Respond with ONLY valid JSON (no markdown, no code blocks):

{"best": 1, "reasoning": "Detailed comparison of all implementations explaining why this one is best", "quality_score": 85, "completeness_score": 90}

Where:
- "best" is 1, 2, or 3
- "reasoning" is a detailed explanation
- "quality_score" is 0-100
- "completeness_score" is 0-100
