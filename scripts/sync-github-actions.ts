#!/usr/bin/env bun

/**
 * sync-github-actions.ts
 *
 * Syncs action files from templates/actions/ to .github/actions/.
 *
 * This script ensures that the `.github/actions/` directory stays in sync
 * with `templates/actions/`, which is the source of truth for composite actions.
 *
 * Usage:
 *   bun run scripts/sync-github-actions.ts          # Sync files
 *   bun run scripts/sync-github-actions.ts --check  # Check if files differ (exit 1 if different)
 *   bun run scripts/sync-github-actions.ts --dry-run # Preview changes without modifying
 *
 * Exit codes:
 *   0 - Success (files are in sync, or sync completed)
 *   1 - Files differ (in check mode), or error occurred
 */

import { copyFile, mkdir, readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

// ============================================================================
// Configuration
// ============================================================================

const SOURCE_DIR = join(process.cwd(), "templates", "actions");
const TARGET_DIR = join(process.cwd(), ".github", "actions");

// ============================================================================
// Types
// ============================================================================

interface FileComparison {
  relativePath: string;
  sourcePath: string;
  targetPath: string;
  status: "identical" | "modified" | "new" | "missing";
}

interface SyncResult {
  files: FileComparison[];
  inSync: boolean;
  modifiedCount: number;
  newCount: number;
  missingCount: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Recursively finds all files in a directory
 */
async function findAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await findAllFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      // Directory doesn't exist, return empty array
      return [];
    }
    throw error;
  }

  return files;
}

/**
 * Compares two files by content
 */
async function filesAreIdentical(file1: string, file2: string): Promise<boolean> {
  try {
    const [content1, content2] = await Promise.all([
      readFile(file1, "utf-8"),
      readFile(file2, "utf-8"),
    ]);
    return content1 === content2;
  } catch {
    return false;
  }
}

/**
 * Checks if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Compares source and target directories
 */
async function compareDirectories(): Promise<SyncResult> {
  const sourceFiles = await findAllFiles(SOURCE_DIR);
  const files: FileComparison[] = [];

  let modifiedCount = 0;
  let newCount = 0;
  const missingCount = 0;

  for (const sourcePath of sourceFiles) {
    const relativePath = relative(SOURCE_DIR, sourcePath);
    const targetPath = join(TARGET_DIR, relativePath);

    const targetExists = await fileExists(targetPath);

    if (!targetExists) {
      files.push({
        relativePath,
        sourcePath,
        targetPath,
        status: "new",
      });
      newCount++;
    } else {
      const identical = await filesAreIdentical(sourcePath, targetPath);
      if (identical) {
        files.push({
          relativePath,
          sourcePath,
          targetPath,
          status: "identical",
        });
      } else {
        files.push({
          relativePath,
          sourcePath,
          targetPath,
          status: "modified",
        });
        modifiedCount++;
      }
    }
  }

  const inSync = modifiedCount === 0 && newCount === 0 && missingCount === 0;

  return {
    files,
    inSync,
    modifiedCount,
    newCount,
    missingCount,
  };
}

/**
 * Ensures the parent directory exists for a file
 */
async function ensureParentDir(filePath: string): Promise<void> {
  const parentDir = filePath.substring(0, filePath.lastIndexOf("/"));
  await mkdir(parentDir, { recursive: true });
}

/**
 * Syncs files from source to target
 */
async function syncFiles(result: SyncResult): Promise<void> {
  for (const file of result.files) {
    if (file.status === "new" || file.status === "modified") {
      await ensureParentDir(file.targetPath);
      await copyFile(file.sourcePath, file.targetPath);
    }
  }
}

// ============================================================================
// Main Functions
// ============================================================================

function printUsage(): void {
  console.log("");
  console.log("Usage: sync-github-actions.ts [options]");
  console.log("");
  console.log("Options:");
  console.log("  --check    Check if files differ (exit 1 if different)");
  console.log("  --dry-run  Preview changes without modifying files");
  console.log("  --help     Show this help message");
  console.log("");
}

function printHeader(): void {
  console.log("");
  console.log("=".repeat(60));
  console.log("Sync GitHub Actions");
  console.log("=".repeat(60));
  console.log("");
  console.log(`Source:  ${SOURCE_DIR}`);
  console.log(`Target:  ${TARGET_DIR}`);
  console.log("");
}

function printResult(result: SyncResult, mode: "check" | "dry-run" | "sync"): void {
  const { files, inSync, modifiedCount, newCount } = result;

  if (inSync) {
    console.log("All files are in sync.");
    console.log("");
    return;
  }

  console.log("File Status:");
  console.log("-".repeat(60));

  for (const file of files) {
    let statusLabel: string;
    switch (file.status) {
      case "identical":
        statusLabel = "[OK]      ";
        break;
      case "modified":
        statusLabel = "[MODIFIED]";
        break;
      case "new":
        statusLabel = "[NEW]     ";
        break;
      case "missing":
        statusLabel = "[MISSING] ";
        break;
    }
    console.log(`${statusLabel} ${file.relativePath}`);
  }

  console.log("-".repeat(60));
  console.log("");

  const totalChanges = modifiedCount + newCount;

  if (mode === "check") {
    console.log(`Found ${totalChanges} file(s) out of sync:`);
    if (modifiedCount > 0) console.log(`  - ${modifiedCount} modified`);
    if (newCount > 0) console.log(`  - ${newCount} new`);
    console.log("");
    console.log("Run 'bun run sync-actions' to sync files.");
  } else if (mode === "dry-run") {
    console.log(`Would sync ${totalChanges} file(s):`);
    if (modifiedCount > 0) console.log(`  - ${modifiedCount} to update`);
    if (newCount > 0) console.log(`  - ${newCount} to create`);
  } else {
    console.log(`Synced ${totalChanges} file(s):`);
    if (modifiedCount > 0) console.log(`  - ${modifiedCount} updated`);
    if (newCount > 0) console.log(`  - ${newCount} created`);
  }
  console.log("");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse arguments
  const checkMode = args.includes("--check");
  const dryRunMode = args.includes("--dry-run");
  const helpMode = args.includes("--help") || args.includes("-h");

  if (helpMode) {
    printUsage();
    process.exit(0);
  }

  if (checkMode && dryRunMode) {
    console.error("Error: Cannot use --check and --dry-run together.");
    process.exit(1);
  }

  printHeader();

  // Check if source directory exists
  const sourceExists = await fileExists(SOURCE_DIR);
  if (!sourceExists) {
    console.error(`Error: Source directory does not exist: ${SOURCE_DIR}`);
    process.exit(1);
  }

  // Compare directories
  console.log("Comparing files...");
  console.log("");
  const result = await compareDirectories();

  // Handle check mode
  if (checkMode) {
    printResult(result, "check");
    if (!result.inSync) {
      console.log("=".repeat(60));
      console.log("SYNC CHECK FAILED");
      console.log("=".repeat(60));
      console.log("");
      process.exit(1);
    }
    console.log("=".repeat(60));
    console.log("SYNC CHECK PASSED");
    console.log("=".repeat(60));
    console.log("");
    process.exit(0);
  }

  // Handle dry-run mode
  if (dryRunMode) {
    printResult(result, "dry-run");
    console.log("=".repeat(60));
    console.log("DRY RUN COMPLETE (no files modified)");
    console.log("=".repeat(60));
    console.log("");
    process.exit(0);
  }

  // Sync mode
  if (result.inSync) {
    printResult(result, "sync");
    console.log("=".repeat(60));
    console.log("ALREADY IN SYNC");
    console.log("=".repeat(60));
    console.log("");
    process.exit(0);
  }

  // Perform sync
  console.log("Syncing files...");
  console.log("");
  await syncFiles(result);
  printResult(result, "sync");
  console.log("=".repeat(60));
  console.log("SYNC COMPLETE");
  console.log("=".repeat(60));
  console.log("");
}

// ============================================================================
// Main Execution
// ============================================================================

main().catch((error) => {
  console.error("");
  console.error("=".repeat(60));
  console.error("SYNC FAILED");
  console.error("=".repeat(60));
  console.error(error);
  process.exit(1);
});
