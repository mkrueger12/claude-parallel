## Overview

Add an `llm.txt` file to the project root following the llms.txt standard specification (https://llmstxt.org/). This file provides structured information about the project that helps LLMs understand and interact with the codebase at inference time.

## Implementation Task List:
1. Create llm.txt file - Add a properly formatted llm.txt file to the project root with project information

## Current State Analysis

The project "Claude Parallel Implementation Workflow" is a shell-based tool that:
- Creates 3 git worktrees for parallel Claude Code implementations
- Runs Claude Code in each worktree with the same feature request
- Reviews all implementations and selects the best one
- Creates a draft PR for the winning implementation

**Current file structure:**
- `parallel-impl.sh` - Main shell script
- `README.md` - Project documentation
- `coding-agent.md` - Coding agent instructions
- `prompts/` - Implementation and review prompt templates
- `.claude/agents/` - Agent configuration files
- `.github/` - GitHub workflows and prompts

**What's missing:** No `llm.txt` file exists for LLM-friendly project context.

## Desired End State

A valid `llm.txt` file exists at the project root (`/llm.txt`) that:
1. Follows the llms.txt specification format
2. Contains an H1 header with the project name
3. Includes a blockquote summary of the project
4. Lists key files with descriptions as markdown links
5. Is UTF-8 encoded

### Key Discoveries:
- Project is a CLI tool for running parallel Claude implementations
- Main entry point: `parallel-impl.sh`
- Key documentation: `README.md`
- Agent configurations in `.claude/agents/`
- Prompts templates in `prompts/` and `.github/prompts/`

## What We're NOT Doing

- NOT creating `llms-full.txt` variant (only the index file)
- NOT adding links to external URLs (only local file references)
- NOT modifying any existing files
- NOT adding automated testing for the llm.txt file

## Implementation Approach

Create a single `llm.txt` file in Markdown format following the llms.txt specification:
1. H1 header with project name
2. Blockquote with project summary
3. Details paragraph about usage
4. Sections with links to key project files

## Files to Edit

No existing files need to be edited. One new file will be created:
- `llm.txt` (new file in project root)

## Task 1: Create llm.txt file
**File**: `llm.txt` (new)
**Description of Changes**: Create a new file in the project root following the llms.txt Markdown specification. The file will contain:
- H1: "Claude Parallel Implementation Workflow"
- Blockquote: Brief description of what the tool does
- Usage paragraph: How to use the tool
- Sections for: Main Script, Documentation, Prompts, Agent Configurations, GitHub Integration

### Success Criteria:

#### Automated Verification:
- [ ] File exists at `./llm.txt`
- [ ] File is valid UTF-8 encoding
- [ ] File starts with H1 header (`# `)
- [ ] File contains blockquote summary (`> `)
- [ ] File contains markdown links to key files

#### Manual Verification:
- [ ] Content accurately describes the project
- [ ] All linked files actually exist in the repository
- [ ] Format follows llms.txt specification

---

## Migration Notes

No migration needed - this is a new file addition.

## References

- llms.txt specification: https://llmstxt.org/
- Project README: `README.md`
