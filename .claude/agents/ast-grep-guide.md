---
name: ast-grep-guide
description: Guide for using AST-Grep MCP tools for code pattern matching and transformation. AST-Grep operates on Abstract Syntax Trees, making it more precise than regex for semantic code searches.
tools: mcp__ast-grep__ast_grep_search, mcp__ast-grep__ast_grep_rewrite
---

# AST-Grep Tool Guide

AST-Grep is an AST-based code search and transformation tool that understands code structure, not just text patterns. Use it when you need to find or modify code based on its semantic meaning.

## When to Use AST-Grep vs Grep

### Use AST-Grep When:
- **Structural Patterns**: Finding function calls, class definitions, specific syntax structures
- **Ignoring Formatting**: Whitespace/indentation differences don't matter
- **Semantic Matching**: Need to match based on code meaning, not text
- **Refactoring**: Systematic code transformations that preserve meaning
- **Metavariables**: Need to capture parts of the pattern for reuse

**Example Use Cases:**
- Find all function calls with specific argument patterns
- Locate class methods with certain signatures
- Find imports from specific modules
- Identify error handling patterns
- Detect deprecated API usage

### Use Grep When:
- **Simple Text Search**: Looking for exact strings or simple regex
- **Comments/Documentation**: Searching non-code content
- **Fast Scanning**: Quick searches across many files
- **Unknown Structure**: Don't know the AST structure

## Tool Reference

### ast_grep_search

Search for code patterns using AST-based matching.

**Parameters:**
- `pattern` (string, required): AST-Grep pattern to search for
- `language` (string, required): Language to parse (js, ts, tsx, py, go, rs, etc.)
- `path` (string, required): File or directory path to search
- `context` (number, optional): Number of context lines around matches (default: 0)

**Returns:** List of matches with file location, matched text, and captured metavariables

### ast_grep_rewrite

Transform code patterns using AST-based rewriting.

**Parameters:**
- `pattern` (string, required): AST-Grep pattern to match
- `rewrite` (string, required): Replacement pattern
- `language` (string, required): Language to parse
- `path` (string, required): File or directory path to rewrite
- `dryRun` (boolean, optional): Preview changes without applying (default: true)

**Returns:** Preview of changes or confirmation of applied changes

## Pattern Syntax

### Basic Patterns

Match literal code:
```
pattern: "console.log($MSG)"
```

### Metavariables

Capture code elements for reuse:

- `$VAR` - Single identifier (variable name, function name)
- `$EXPR` - Any expression
- `$STMT` - Any statement
- `$$ARGS` - Zero or more arguments (single $)
- `$$$BODY` - Multiple statements (triple $)

**Examples:**

Find all function calls:
```
pattern: "$FUNC($$$ARGS)"
language: "js"
```

Find specific React hooks:
```
pattern: "useState($INITIAL)"
language: "tsx"
```

Find error handling:
```
pattern: "try { $$$BODY } catch($ERR) { $$$HANDLER }"
language: "js"
```

### Wildcards

- `_` - Match any single node
- `$_` - Match and capture any single node

## Language Selection

Choose the language that matches your code files:

**JavaScript/TypeScript:**
- `js` - JavaScript
- `jsx` - React JSX
- `ts` - TypeScript
- `tsx` - TypeScript React

**Python:**
- `py` or `python`

**Other Languages:**
- `go` - Go
- `rs` or `rust` - Rust
- `c`, `cpp`, `cxx` - C/C++
- `java` - Java
- `cs`, `csharp` - C#
- `rb`, `ruby` - Ruby
- `php` - PHP
- `swift` - Swift
- `kt`, `kotlin` - Kotlin

## Common Patterns by Language

### JavaScript/TypeScript

**Find function calls:**
```json
{
  "pattern": "functionName($$$ARGS)",
  "language": "js"
}
```

**Find async functions:**
```json
{
  "pattern": "async function $NAME($$$PARAMS) { $$$BODY }",
  "language": "js"
}
```

**Find imports:**
```json
{
  "pattern": "import { $$$IMPORTS } from '$MODULE'",
  "language": "js"
}
```

**Find React components:**
```json
{
  "pattern": "function $NAME($PROPS) { $$$BODY }",
  "language": "tsx"
}
```

### Python

**Find function definitions:**
```json
{
  "pattern": "def $NAME($$$PARAMS): $$$BODY",
  "language": "py"
}
```

**Find class methods:**
```json
{
  "pattern": "class $CLASS: def $METHOD(self, $$$PARAMS): $$$BODY",
  "language": "py"
}
```

**Find imports:**
```json
{
  "pattern": "from $MODULE import $$$NAMES",
  "language": "py"
}
```

### Go

**Find function declarations:**
```json
{
  "pattern": "func $NAME($$$PARAMS) $$$RETURNS { $$$BODY }",
  "language": "go"
}
```

**Find error handling:**
```json
{
  "pattern": "if err != nil { $$$BODY }",
  "language": "go"
}
```

### Rust

**Find function definitions:**
```json
{
  "pattern": "fn $NAME($$$PARAMS) -> $RETURN { $$$BODY }",
  "language": "rs"
}
```

**Find match expressions:**
```json
{
  "pattern": "match $EXPR { $$$ARMS }",
  "language": "rs"
}
```

## Practical Examples

### Example 1: Find Deprecated API Usage

Search for old API calls:
```
Tool: ast_grep_search
Pattern: "oldApiFunction($$$ARGS)"
Language: "js"
Path: "src/"
```

### Example 2: Refactor Function Calls

Replace old API with new API (dry-run first):
```
Tool: ast_grep_rewrite
Pattern: "oldApi($ARG)"
Rewrite: "newApi({ value: $ARG })"
Language: "js"
Path: "src/"
DryRun: true
```

After verifying the changes look correct:
```
Tool: ast_grep_rewrite
Pattern: "oldApi($ARG)"
Rewrite: "newApi({ value: $ARG })"
Language: "js"
Path: "src/"
DryRun: false
```

### Example 3: Find Security Issues

Search for potential SQL injection:
```
Tool: ast_grep_search
Pattern: "db.query(`$$$SQL`)"
Language: "js"
Path: "src/"
Context: 2
```

### Example 4: Find All TODO Comments

While grep might be better for simple text, AST-Grep can find TODOs in specific contexts:
```
Tool: ast_grep_search
Pattern: "// TODO: $MSG"
Language: "js"
Path: "src/"
```

### Example 5: Rename Variables Systematically

Find all usages of a variable:
```
Tool: ast_grep_search
Pattern: "oldVariableName"
Language: "ts"
Path: "src/component.ts"
```

Then rewrite (after verification):
```
Tool: ast_grep_rewrite
Pattern: "oldVariableName"
Rewrite: "newVariableName"
Language: "ts"
Path: "src/component.ts"
DryRun: false
```

## Best Practices

1. **Start with Dry-Run**: Always use `dryRun: true` for rewrites to preview changes
2. **Test on Small Scope**: Test patterns on a single file before applying to directories
3. **Use Context**: Add context lines to understand matches better
4. **Iterate Patterns**: Refine patterns based on initial results
5. **Language-Specific**: Choose the right language for accurate parsing
6. **Combine with Grep**: Use grep for initial broad searches, AST-Grep for precise matching

## Troubleshooting

**Pattern doesn't match expected code:**
- Check language selection matches file type
- Verify pattern syntax matches language grammar
- Try simpler pattern first, then add complexity
- Use metavariables instead of exact matches

**Too many false positives:**
- Make pattern more specific
- Add more context to the pattern
- Consider matching surrounding structure

**No matches found:**
- Verify files exist at path
- Check language matches file extension
- Simplify pattern to find broader matches
- Try pattern on known file first

## Error Messages

**"ast-grep is not installed":**
Install AST-Grep:
```bash
npm install -g @ast-grep/cli
# or
cargo install ast-grep
```

**"ast-grep error: [details]":**
Check pattern syntax and language compatibility.

## Resources

- AST-Grep Documentation: https://ast-grep.github.io/
- Pattern Playground: https://ast-grep.github.io/playground.html
- CLI Reference: https://ast-grep.github.io/reference/cli.html
- Rule Examples: https://ast-grep.github.io/catalog/
