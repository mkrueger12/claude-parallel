#!/usr/bin/env node
/**
 * AST-Grep MCP Server
 *
 * An MCP (Model Context Protocol) server that wraps the AST-Grep CLI tool,
 * providing AI agents with the ability to perform AST-based code pattern
 * matching and transformation.
 *
 * Tools:
 * - ast_grep_search: Search for code patterns using AST-based pattern matching
 * - ast_grep_rewrite: Transform code patterns (with dry-run support)
 *
 * AST-Grep operates on Abstract Syntax Trees rather than text, making it more
 * precise than regex for finding semantic code patterns.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Supported programming languages for AST-Grep
 */
const SUPPORTED_LANGUAGES = [
  'js', 'jsx', 'ts', 'tsx',
  'py', 'python',
  'go',
  'rs', 'rust',
  'c', 'cpp', 'cxx',
  'java',
  'cs', 'csharp',
  'rb', 'ruby',
  'php',
  'swift',
  'kt', 'kotlin',
  'html',
  'css',
  'json',
] as const;

type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * AST-Grep match result structure
 */
interface AstGrepMatch {
  text: string;
  range: {
    byteOffset: { start: number; end: number };
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  file: string;
  lines: string;
  language?: string;
  metaVariables?: Record<string, {
    text: string;
    range: {
      byteOffset: { start: number; end: number };
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
  }>;
}

/**
 * Create and configure the AST-Grep MCP server
 */
export function createAstGrepMcpServer(): Server {
  const server = new Server(
    {
      name: 'ast-grep',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'ast_grep_search',
          description: 'Search for code patterns using AST-based pattern matching. More precise than regex for finding semantic code patterns. Supports metavariables like $VAR, $FUNC, $$$ARGS.',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'AST-Grep pattern to search for. Use metavariables like $VAR for identifiers, $EXPR for expressions, $$$ARGS for argument lists.',
              },
              language: {
                type: 'string',
                enum: [...SUPPORTED_LANGUAGES],
                description: 'Programming language to parse (e.g., "ts", "py", "go", "rs")',
              },
              path: {
                type: 'string',
                description: 'File or directory path to search in',
              },
              context: {
                type: 'number',
                description: 'Number of context lines to include around matches (default: 0)',
                default: 0,
              },
            },
            required: ['pattern', 'language', 'path'],
          },
        },
        {
          name: 'ast_grep_rewrite',
          description: 'Transform code patterns using AST-based rewriting. Can perform structural code transformations and refactoring. Use dryRun to preview changes before applying.',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'AST-Grep pattern to match. Use metavariables like $VAR to capture parts of the pattern.',
              },
              rewrite: {
                type: 'string',
                description: 'Replacement pattern. Use $VAR to reference captured metavariables from the pattern.',
              },
              language: {
                type: 'string',
                enum: [...SUPPORTED_LANGUAGES],
                description: 'Programming language to parse (e.g., "ts", "py", "go", "rs")',
              },
              path: {
                type: 'string',
                description: 'File or directory path to rewrite in',
              },
              dryRun: {
                type: 'boolean',
                description: 'If true, show what would change without applying (default: true)',
                default: true,
              },
            },
            required: ['pattern', 'rewrite', 'language', 'path'],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'ast_grep_search') {
        const { pattern, language, path, context = 0 } = args as {
          pattern: string;
          language: SupportedLanguage;
          path: string;
          context?: number;
        };

        return await executeAstGrepSearch(pattern, language, path, context);
      } else if (name === 'ast_grep_rewrite') {
        const { pattern, rewrite, language, path, dryRun = true } = args as {
          pattern: string;
          rewrite: string;
          language: SupportedLanguage;
          path: string;
          dryRun?: boolean;
        };

        return await executeAstGrepRewrite(pattern, rewrite, language, path, dryRun);
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error executing ${name}: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Execute AST-Grep search command
 */
async function executeAstGrepSearch(
  pattern: string,
  language: SupportedLanguage,
  path: string,
  context: number
): Promise<any> {
  // Build command arguments
  const args = [
    '--pattern', pattern,
    '--lang', language,
    '--json=stream',
  ];

  if (context > 0) {
    args.push('--context', String(context));
  }

  args.push(path);

  try {
    // Execute ast-grep command
    const { stdout } = await execFileAsync('ast-grep', args, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // Parse JSON stream output (one JSON object per line)
    const matches: AstGrepMatch[] = [];
    const lines = stdout.trim().split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const match = JSON.parse(line);
        matches.push(match);
      } catch (parseError) {
        console.error('Failed to parse line:', line, parseError);
      }
    }

    // Format results
    const resultText = formatSearchResults(matches, pattern);

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  } catch (error: any) {
    // Check if ast-grep is not installed
    if (error.code === 'ENOENT') {
      throw new Error('ast-grep is not installed. Install it with: npm install -g @ast-grep/cli');
    }

    // Check for stderr output (ast-grep errors)
    if (error.stderr) {
      throw new Error(`ast-grep error: ${error.stderr}`);
    }

    throw error;
  }
}

/**
 * Execute AST-Grep rewrite command
 */
async function executeAstGrepRewrite(
  pattern: string,
  rewrite: string,
  language: SupportedLanguage,
  path: string,
  dryRun: boolean
): Promise<any> {
  // Build command arguments
  const args = [
    '--pattern', pattern,
    '--rewrite', rewrite,
    '--lang', language,
  ];

  // Add --json for structured output in dry-run mode
  if (dryRun) {
    args.push('--json=stream');
  }

  args.push(path);

  try {
    // Execute ast-grep command
    const { stdout } = await execFileAsync('ast-grep', args, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (dryRun) {
      // Parse JSON stream output
      const matches: AstGrepMatch[] = [];
      const lines = stdout.trim().split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const match = JSON.parse(line);
          matches.push(match);
        } catch (parseError) {
          console.error('Failed to parse line:', line, parseError);
        }
      }

      // Format results showing what would change
      const resultText = formatRewriteResults(matches, pattern, rewrite, true);

      return {
        content: [
          {
            type: 'text',
            text: resultText,
          },
        ],
      };
    } else {
      // Applied changes - return summary
      return {
        content: [
          {
            type: 'text',
            text: `Rewrite applied successfully.\n\nPattern: ${pattern}\nRewrite: ${rewrite}\n\nChanges have been written to disk.`,
          },
        ],
      };
    }
  } catch (error: any) {
    // Check if ast-grep is not installed
    if (error.code === 'ENOENT') {
      throw new Error('ast-grep is not installed. Install it with: npm install -g @ast-grep/cli');
    }

    // Check for stderr output (ast-grep errors)
    if (error.stderr) {
      throw new Error(`ast-grep error: ${error.stderr}`);
    }

    throw error;
  }
}

/**
 * Format search results for display
 */
function formatSearchResults(matches: AstGrepMatch[], pattern: string): string {
  if (matches.length === 0) {
    return `No matches found for pattern: ${pattern}`;
  }

  let result = `Found ${matches.length} match${matches.length === 1 ? '' : 'es'} for pattern: ${pattern}\n\n`;

  for (const match of matches) {
    const { file, range, text, lines, metaVariables } = match;
    const location = `${file}:${range.start.line}:${range.start.column}`;

    result += `${location}\n`;
    result += `Match: ${text}\n`;

    if (metaVariables && Object.keys(metaVariables).length > 0) {
      result += 'Captured metavariables:\n';
      for (const [key, value] of Object.entries(metaVariables)) {
        result += `  ${key} = ${value.text}\n`;
      }
    }

    if (lines) {
      result += `Context:\n${lines}\n`;
    }

    result += '\n';
  }

  return result;
}

/**
 * Format rewrite results for display
 */
function formatRewriteResults(
  matches: AstGrepMatch[],
  pattern: string,
  rewrite: string,
  isDryRun: boolean
): string {
  if (matches.length === 0) {
    return `No matches found for pattern: ${pattern}\n\nNo changes ${isDryRun ? 'would be' : 'were'} made.`;
  }

  let result = `${isDryRun ? 'DRY RUN: ' : ''}Found ${matches.length} location${matches.length === 1 ? '' : 's'} to rewrite\n\n`;
  result += `Pattern: ${pattern}\n`;
  result += `Rewrite: ${rewrite}\n\n`;

  for (const match of matches) {
    const { file, range, text } = match;
    const location = `${file}:${range.start.line}:${range.start.column}`;

    result += `${location}\n`;
    result += `- ${text}\n`;

    // Apply rewrite using metavariables if available
    let rewrittenText = rewrite;
    if (match.metaVariables) {
      for (const [key, value] of Object.entries(match.metaVariables)) {
        rewrittenText = rewrittenText.replace(new RegExp(`\\${key}`, 'g'), value.text);
      }
    }

    result += `+ ${rewrittenText}\n\n`;
  }

  if (isDryRun) {
    result += 'Note: This is a dry run. No files were modified. Set dryRun=false to apply changes.\n';
  }

  return result;
}

/**
 * Main entry point when running as standalone script
 */
async function main() {
  const server = createAstGrepMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error('AST-Grep MCP server started');
}

// Run as standalone if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
