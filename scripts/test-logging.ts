#!/usr/bin/env node
/**
 * Test script to verify conversation logging works correctly
 */

import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { ConversationLogger } from "../src/lib/conversation-logger.js";
import type { AgentMessage } from "../src/lib/types.js";

const SESSIONS_DIR = join(process.cwd(), ".turso", "sessions");

async function main() {
  console.log("=== Testing Turso Conversation Logging ===\n");

  // Clean up
  if (existsSync(SESSIONS_DIR)) {
    rmSync(SESSIONS_DIR, { recursive: true });
    console.log("✓ Cleaned up existing sessions directory");
  }

  // Test 1: Create a session
  const sessionId = `test-${Date.now()}`;
  console.log(`\nTest 1: Creating session ${sessionId}`);

  const logger = new ConversationLogger(sessionId);

  await logger.startSession({
    model: "test-model",
    mode: "implementation",
    promptLength: 100,
    cwd: process.cwd(),
  });
  console.log("✓ Session started");

  // Log some messages
  await logger.logMessage(
    { type: "assistant", content: "Hello" } as AgentMessage,
    1,
  );
  await logger.logMessage(
    { type: "user", content: "Hi" } as AgentMessage,
    2,
  );
  await logger.logMessage(
    { type: "result", subtype: "success" } as AgentMessage,
    3,
  );
  console.log("✓ Messages logged");

  // End session
  await logger.endSession({
    type: "result",
    subtype: "success",
  } as AgentMessage);
  console.log("✓ Session ended");

  // Test 2: Verify database was created
  console.log("\nTest 2: Verifying database creation");

  if (!existsSync(SESSIONS_DIR)) {
    console.error("✗ Sessions directory not created");
    process.exit(1);
  }
  console.log("✓ Sessions directory exists");

  const dbPath = join(SESSIONS_DIR, `${sessionId}.db`);
  if (!existsSync(dbPath)) {
    console.error("✗ Database file not created");
    process.exit(1);
  }
  console.log("✓ Database file exists");

  // Test 3: Query the database
  console.log("\nTest 3: Querying database");

  const client = createClient({ url: `file:${dbPath}` });

  const sessions = await client.execute("SELECT * FROM sessions");
  if (sessions.rows.length !== 1) {
    console.error(`✗ Expected 1 session, found ${sessions.rows.length}`);
    process.exit(1);
  }
  console.log("✓ Session record found");

  const messages = await client.execute("SELECT * FROM messages");
  if (messages.rows.length !== 3) {
    console.error(`✗ Expected 3 messages, found ${messages.rows.length}`);
    process.exit(1);
  }
  console.log("✓ Message records found");

  // Test 4: Verify no cloud credentials (graceful degradation)
  console.log("\nTest 4: Verifying graceful degradation without cloud credentials");

  if (process.env.TURSO_DATABASE_URL || process.env.TURSO_AUTH_TOKEN) {
    console.log("⚠ Cloud credentials are set - skipping graceful degradation test");
  } else {
    console.log("✓ No cloud credentials set");
    console.log("✓ Local logging worked without cloud credentials");
  }

  client.close();

  console.log("\n=== All Tests Passed! ===");
  console.log(`Session ID: ${sessionId}`);
  console.log(`Database: ${dbPath}`);
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
