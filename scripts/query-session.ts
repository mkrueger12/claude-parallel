#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

// Parse arguments
const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const positional = args.filter((a) => !a.startsWith("--"));

if (positional.length === 0 || flags.includes("--help") || flags.includes("-h")) {
  console.log(`
Usage: query-session.ts [options] <session-id>

Query and export local session data.

Options:
  --json        Output raw JSON
  --messages    Include all messages
  --tools       Include tool calls
  --help, -h    Show this help message

Examples:
  query-session.ts abc-123-def              Show session summary
  query-session.ts abc-123-def --json       Export as JSON
  query-session.ts abc-123-def --messages   Include messages
  query-session.ts abc-123-def --tools      Include tool calls
`);
  process.exit(0);
}

const sessionId = positional[0];
const showJson = flags.includes("--json");
const showMessages = flags.includes("--messages");
const showTools = flags.includes("--tools");

async function main() {
  const dbPath = join(process.cwd(), ".turso", "sessions", `${sessionId}.db`);

  if (!existsSync(dbPath)) {
    console.error(`Session not found: ${sessionId}`);
    console.error(`Expected database at: ${dbPath}`);
    process.exit(1);
  }

  const client = createClient({ url: `file:${dbPath}` });

  // Get session
  const sessionResult = await client.execute({
    sql: "SELECT * FROM sessions WHERE id = ?",
    args: [sessionId],
  });

  if (sessionResult.rows.length === 0) {
    console.error(`No session record found for: ${sessionId}`);
    process.exit(1);
  }

  const session = sessionResult.rows[0];

  // Get counts
  const messagesCount = await client.execute({
    sql: "SELECT COUNT(*) as count FROM messages WHERE session_id = ?",
    args: [sessionId],
  });

  const toolsCount = await client.execute({
    sql: "SELECT COUNT(*) as count FROM tool_calls WHERE session_id = ?",
    args: [sessionId],
  });

  const result: {
    session: Record<string, unknown>;
    messageCount: unknown;
    toolCallCount: unknown;
    messages?: Record<string, unknown>[];
    toolCalls?: Record<string, unknown>[];
  } = {
    session: Object.fromEntries(Object.entries(session)),
    messageCount: messagesCount.rows[0].count,
    toolCallCount: toolsCount.rows[0].count,
  };

  if (showMessages) {
    const messages = await client.execute({
      sql: "SELECT * FROM messages WHERE session_id = ? ORDER BY sequence",
      args: [sessionId],
    });
    result.messages = messages.rows.map((r) => Object.fromEntries(Object.entries(r)));
  }

  if (showTools) {
    const tools = await client.execute({
      sql: "SELECT * FROM tool_calls WHERE session_id = ? ORDER BY sequence",
      args: [sessionId],
    });
    result.toolCalls = tools.rows.map((r) => Object.fromEntries(Object.entries(r)));
  }

  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("\n=== Session Summary ===");
    console.log(`ID: ${session.id}`);
    console.log(`Model: ${session.model}`);
    console.log(`Mode: ${session.mode}`);
    console.log(`Started: ${new Date(Number(session.started_at)).toISOString()}`);
    if (session.ended_at) {
      console.log(`Ended: ${new Date(Number(session.ended_at)).toISOString()}`);
      console.log(`Duration: ${session.duration_ms}ms`);
    }
    console.log(`Result: ${session.result_type} (${session.result_subtype})`);
    console.log(`Messages: ${result.messageCount}`);
    console.log(`Tool Calls: ${result.toolCallCount}`);
    console.log(`CWD: ${session.cwd}`);

    if (session.github_run_id) {
      console.log(`\n=== GitHub Context ===`);
      console.log(`Run ID: ${session.github_run_id}`);
      console.log(`Repository: ${session.github_repository}`);
      console.log(`Ref: ${session.github_ref}`);
    }

    if (showMessages && result.messages) {
      console.log(`\n=== Messages (${result.messages.length}) ===`);
      for (const msg of result.messages) {
        console.log(`[${msg.sequence}] ${msg.type}${msg.subtype ? ` (${msg.subtype})` : ""}`);
      }
    }

    if (showTools && result.toolCalls) {
      console.log(`\n=== Tool Calls (${result.toolCalls.length}) ===`);
      for (const tool of result.toolCalls) {
        console.log(`[${tool.sequence}] ${tool.tool_name} - ${tool.status || "unknown"}`);
      }
    }
  }

  client.close();
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
