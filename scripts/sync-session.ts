#!/usr/bin/env bun

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { type Client, createClient } from "@libsql/client";
import { createRemoteClient, syncToCloud } from "../src/lib/turso-client.js";

// Parse arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: sync-session.ts [options] [session-id]

Sync local session databases to Turso cloud.

Options:
  --all         Sync all local sessions
  --help, -h    Show this help message

Examples:
  sync-session.ts abc-123-def    Sync specific session
  sync-session.ts --all          Sync all sessions
`);
  process.exit(0);
}

async function main() {
  // Check for remote client (createRemoteClient initializes schema automatically)
  const remoteClient = await createRemoteClient();
  if (!remoteClient) {
    console.error("Error: Cannot sync - Turso cloud credentials not configured");
    console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables");
    process.exit(1);
  }

  const sessionsDir = join(process.cwd(), ".turso", "sessions");

  if (args.includes("--all")) {
    // Sync all sessions
    let files: string[];
    try {
      files = readdirSync(sessionsDir).filter((f) => f.endsWith(".db"));
    } catch {
      console.error("No local sessions found in .turso/sessions/");
      process.exit(1);
    }

    console.log(`Found ${files.length} local session(s)`);

    for (const file of files) {
      const sessionId = file.replace(".db", "");
      await syncSession(sessionId, sessionsDir, remoteClient);
    }
  } else {
    // Sync specific session
    const sessionId = args[0];
    await syncSession(sessionId, sessionsDir, remoteClient);
  }

  remoteClient.close();
  console.log("Done!");
}

async function syncSession(sessionId: string, sessionsDir: string, remoteClient: Client) {
  console.log(`Syncing session: ${sessionId}`);

  const dbPath = join(sessionsDir, `${sessionId}.db`);
  const localClient = createClient({ url: `file:${dbPath}` });

  const success = await syncToCloud(localClient, remoteClient, sessionId);

  if (success) {
    console.log(`  ✓ Session ${sessionId} synced successfully`);
  } else {
    console.error(`  ✗ Failed to sync session ${sessionId}`);
  }

  localClient.close();
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
