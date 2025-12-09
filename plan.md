## Overview

Add an `llms.txt` file to the project root following the standard specification from [llmstxt.org](https://llmstxt.org/). This file will provide LLM-friendly documentation for the Claude Parallel Implementation Workflow project, making it easier for AI models to understand the project's purpose, structure, and usage.

## Implementation Task List:
1. Create llms.txt file - Add a properly formatted llms.txt file to the project root with project description and links to key documentation files

## Current State Analysis

**What exists now:**
- `README.md` - Comprehensive documentation about the project (311 lines)
- `coding-agent.md` - Instructions for coding agents (183 lines)
- `prompts/implementation.md` - Implementation prompt template
- `prompts/review.md` - Review prompt template
- `parallel-impl.sh` - Main shell script for parallel implementations

**What's missing:**
- An `llms.txt` file at the project root

**Key constraints:**
- The file must follow the llms.txt specification format
- Must use Markdown formatting
- Should provide concise overview of the project
- Should link to key documentation files

### Key Discoveries:
- README.md:1-14 - Contains project description and overview
- README.md:14-65 - Contains usage instructions and prerequisites
- prompts/ directory - Contains prompt templates used by the workflow
- parallel-impl.sh - Main executable script

## Desired End State

After implementation:
1. A new `llms.txt` file exists at the project root (`/llms.txt`)
2. The file follows the llms.txt specification format with:
   - H1 heading with project name
   - Blockquote with brief project description
   - Key information about the project
   - H2 sections linking to detailed documentation
3. The file is readable by both humans and LLMs

**Verification:**
- File exists at project root
- File follows correct Markdown format
- Links are valid and point to existing files
- Content accurately describes the project

## What We're NOT Doing

- NOT creating an `llms-full.txt` (the comprehensive single-file version)
- NOT adding `.md` versions of HTML pages (no HTML pages exist)
- NOT modifying existing documentation files
- NOT creating additional documentation
- NOT setting up automated generation of llms.txt

## Implementation Approach

Create a single `llms.txt` file that:
1. Uses the project name as H1 heading
2. Provides a concise blockquote summary
3. Lists key project information (purpose, how it works)
4. Links to the main documentation files (README.md, coding-agent.md, prompt templates)
5. Uses the "Optional" section for secondary resources

## Files to Edit

**New file to create:**
- `/llms.txt` - New file at project root

## Task 1: Create llms.txt file
**File**: `llms.txt` (new file)
**Description of Changes**: Create a new llms.txt file at the project root following the standard specification. The file should contain:
- H1 heading: "Claude Parallel Implementation Workflow"
- Blockquote: Brief description of the project's purpose
- Key information section explaining the workflow
- H2 "Documentation" section with links to README.md and coding-agent.md
- H2 "Prompt Templates" section with links to prompt files
- H2 "Optional" section with links to secondary resources like the shell script

### Success Criteria:

#### Automated Verification:
- [ ] File exists: `test -f llms.txt`
- [ ] File is valid Markdown: no syntax errors
- [ ] File starts with H1 heading
- [ ] File contains required blockquote
- [ ] All internal links reference existing files

#### Manual Verification:
- [ ] Content accurately describes the project
- [ ] Links work correctly
- [ ] Format is readable by humans
- [ ] Content is appropriate for LLM consumption

---

## References

- llms.txt specification: https://llmstxt.org/
- Main project documentation: `README.md`
- Agent instructions: `coding-agent.md`
