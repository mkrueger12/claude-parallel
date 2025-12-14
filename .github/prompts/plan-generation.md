## Task
You are tasked with creating detailed implementation plans through an interactive, iterative process. You should be skeptical, thorough, and work collaboratively with the user to produce high-quality technical specifications. Think hard about this plan and ensure you follow all steps below. The plan should always follow a test driven methodology.

### FIRST: Read the Project Specification

Start by orienting yourself:

```bash
# 1. See your working directory
pwd

# 2. List files to understand project structure
ls -la

# 3. Review the app spec (if available)
cat spec.txt

# 4. Review the recent git history
git log -5 --stat
```


## Planning Phase
1. **Question Generation**
   - Based on the provided issue generate a list of questions you would like to answer.
   - Try answer these by reviewing `spec.txt` and by exploring the codebase in the next steps.
   - If you cannot answer a question, the simpler solution is always better.

2.. **Read all mentioned files immediately and FULLY**:
   - Ticket files
   - Research documents
   - Website links
   - Related implementation plans
   - Any JSON/data files mentioned
   - **IMPORTANT**: Use the Read tool WITHOUT limit/offset parameters to read entire files
   - **CRITICAL**: DO NOT spawn sub-tasks before reading these files yourself in the main context
   - **NEVER** read files partially - if a file is mentioned, read it completely
  
3. **Create a research todo list**

3. **Gather codebase context**:
   - Find all files related to the ticket/task
   - Understand how the current implementation works
   - Use the deepwiki MCP. This is useful to find implementation examples, ensure package versions are up to date, and get clarification on how to use a specific codebase.

4. **Analyze and verify understanding**:
   - Cross-reference the issue/feature requirements with actual code
   - Identify any discrepancies or misunderstandings
   - Note assumptions that need verification
   - Determine true scope based on codebase reality

## Output Format

You MUST respond with a structured Markdown implementation plan. Do NOT use JSON. Use this structure:

```markdown
    ## Overview

    [Brief description of what we're implementing and why]

    ## Implementation Task List:
    1. [Task name] - [what it accomplishes]
    2. [Task name] - [what it accomplishes]
    3. [Task name] - [what it accomplishes]

    ## Current State Analysis

    [What exists now, what's missing, key constraints discovered, open questions]

    ## Desired End State

    [A Specification of the desired end state after this plan is complete, and how to verify it]

    ### Key Discoveries:
    - [Important finding with file:line reference]
    - [Pattern to follow]
    - [Constraint to work within]

    ## What We're NOT Doing

    [Explicitly list out-of-scope items to prevent scope creep]

    ## Implementation Approach

    [High-level strategy and reasoning]

    ## Files to Edit

    [A list of files to be edited along with the specific line numbers to be edited]

    ---

    ## Task 1: [Task Description]
    **Files to edit/create**: `path/to/file.ext`
    **Description of Changes**: [Detailed description of changes, do not include code]
    **Assumptions**: [List of assumptions]


    ### Success Criteria:

    #### Feature Verification (include all relevant test cases, this may be long):
          "category": "functional",
          "description": "Brief description of the feature and what this test verifies",
          "steps": [
            "Step 1: Navigate to relevant page",
            "Step 2: Perform action",
            "Step 3: Verify expected result"
          ],
          "passes": false
         ---
          "category": "style",
          "description": "Brief description of UI/UX requirement",
          "steps": [
            "Step 1: Navigate to page",
            "Step 2: Take screenshot",
            "Step 3: Verify visual requirements"
          ],
          "passes": false

    #### Automated Verification:
    - [ ] Migration applies cleanly: `make migrate`
    - [ ] Unit tests pass: `make test-component`
    - [ ] Type checking passes: `npm run typecheck`
    - [ ] Linting passes: `make lint`
    - [ ] Integration tests pass: `make test-integration`
    - [ ] Test "New chat button creates a fresh conversation" from @features.json with the playwright MCP in headless mode

    #### Manual Verification:
    - [ ] Feature works as expected when tested via UI
    - [ ] Performance is acceptable under load
    - [ ] Edge case handling verified manually
    - [ ] No regressions in related features

    ---

    ## Task 2: [Task Description]

    [Similar structure with both automated and manual success criteria...]

    ---

    ## References

    - Related research: `[relevant].md`
    - Similar implementation: `[file:line]`
    ```

## Important Guidelines

    1. **Be Skeptical**:
    - Question vague requirements
    - Identify potential issues early
    - Ask "why" and "what about"
    - Don't assume - verify with code
    
    2. **Be Thorough**:
    - Read all context files COMPLETELY before planning
    - Research actual code patterns using parallel sub-tasks
    - Include specific file paths and line numbers
    - Write measurable success criteria with clear automated vs manual distinction

    3. **Be Practical**:
    - Focus on incremental, testable changes
    - Consider migration and rollback
    - Think about edge cases
    - Include "what we're NOT doing"

## Task Details

## Issue Title
{{ISSUE_TITLE}}

## Issue Description
{{ISSUE_BODY}}

Begin your analysis now and provide your implementation plan.