import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculateFileHash,
  createManifest,
  isFileModified,
  type Manifest,
  readManifest,
  writeManifest,
} from "./manifest.js";

export interface InstallOptions {
  force?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  targetDir?: string;
}

interface FileAction {
  sourcePath: string;
  destPath: string;
  action: "install" | "skip-modified" | "skip-exists" | "overwrite";
  reason?: string;
}

// Get the directory where the installed package is located
function getPackageDir(): string {
  // When running from dist/cli/install.js, we need to go up to the package root
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // dist/cli/install.js -> go up two levels to package root
  return join(__dirname, "..", "..");
}

/**
 * Find all template files recursively
 */
function findTemplateFiles(templatesDir: string, baseDir: string = templatesDir): string[] {
  const files: string[] = [];

  const entries = readdirSync(templatesDir);

  for (const entry of entries) {
    const fullPath = join(templatesDir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findTemplateFiles(fullPath, baseDir));
    } else if (stat.isFile()) {
      // Get relative path from templates directory
      files.push(relative(baseDir, fullPath));
    }
  }

  return files;
}

/**
 * Map template file paths to destination paths in target repository
 */
function getDestinationPath(templateRelativePath: string): string {
  // workflows/* -> .github/workflows/*
  if (templateRelativePath.startsWith("workflows/")) {
    return templateRelativePath.replace("workflows/", ".github/workflows/");
  }

  // scripts/* -> .github/claude-parallel/scripts/*
  if (templateRelativePath.startsWith("scripts/")) {
    return templateRelativePath.replace("scripts/", ".github/claude-parallel/scripts/");
  }

  // prompts/* -> .github/claude-parallel/prompts/*
  if (templateRelativePath.startsWith("prompts/")) {
    return templateRelativePath.replace("prompts/", ".github/claude-parallel/prompts/");
  }

  // agents/* -> .claude/agents/*
  if (templateRelativePath.startsWith("agents/")) {
    return templateRelativePath.replace("agents/", ".claude/agents/");
  }

  // .env.example -> .env.example (root)
  if (templateRelativePath === ".env.example") {
    return ".env.example";
  }

  // Default: keep the same path
  return templateRelativePath;
}

/**
 * Determine what action to take for each file
 */
function planFileActions(
  templateFiles: string[],
  templatesDir: string,
  targetDir: string,
  manifest: Manifest | null,
  options: InstallOptions
): FileAction[] {
  const actions: FileAction[] = [];

  for (const templateFile of templateFiles) {
    const sourcePath = join(templatesDir, templateFile);
    const destRelativePath = getDestinationPath(templateFile);
    const destPath = join(targetDir, destRelativePath);

    // If destination doesn't exist, install it
    if (!existsSync(destPath)) {
      actions.push({
        sourcePath,
        destPath,
        action: "install",
      });
      continue;
    }

    // Destination exists - check if it was modified
    const destContent = readFileSync(destPath, "utf-8");
    const wasModified = isFileModified(destRelativePath, destContent, manifest);

    if (options.force) {
      actions.push({
        sourcePath,
        destPath,
        action: "overwrite",
        reason: wasModified ? "user modified, forcing overwrite" : "forcing overwrite",
      });
    } else if (wasModified) {
      actions.push({
        sourcePath,
        destPath,
        action: "skip-modified",
        reason: "file was modified by user",
      });
    } else {
      // File exists but wasn't modified (same hash as manifest) - update it
      actions.push({
        sourcePath,
        destPath,
        action: "install",
        reason: "updating to new version",
      });
    }
  }

  return actions;
}

/**
 * Execute the planned file actions
 */
function executeFileActions(actions: FileAction[], dryRun: boolean): void {
  const installed: string[] = [];
  const skipped: string[] = [];
  const overwritten: string[] = [];

  for (const action of actions) {
    const destRelative = action.destPath.split("/").slice(-5).join("/"); // Show last 5 path segments

    if (action.action === "skip-modified" || action.action === "skip-exists") {
      skipped.push(`  ⚠ ${destRelative} (${action.reason || "user modified"})`);
      continue;
    }

    if (dryRun) {
      if (action.action === "overwrite") {
        overwritten.push(`  ↻ ${destRelative} (would overwrite)`);
      } else {
        installed.push(`  ✓ ${destRelative} (would install)`);
      }
    } else {
      // Create directory if needed
      const destDir = dirname(action.destPath);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      // Copy the file
      const content = readFileSync(action.sourcePath, "utf-8");
      writeFileSync(action.destPath, content, "utf-8");

      // Copy executable permissions if source is executable
      const sourceStat = statSync(action.sourcePath);
      if (sourceStat.mode & 0o111) {
        // Make the destination executable
        chmodSync(action.destPath, 0o755);
      }

      if (action.action === "overwrite") {
        overwritten.push(`  ↻ ${destRelative}`);
      } else {
        installed.push(`  ✓ ${destRelative}`);
      }
    }
  }

  // Print summary
  if (installed.length > 0) {
    console.log(dryRun ? "\nWould install:" : "\nInstalled:");
    installed.forEach((msg) => console.log(msg));
  }

  if (overwritten.length > 0) {
    console.log(dryRun ? "\nWould overwrite:" : "\nOverwritten:");
    overwritten.forEach((msg) => console.log(msg));
  }

  if (skipped.length > 0) {
    console.log("\nSkipped (user modified):");
    skipped.forEach((msg) => console.log(msg));
    if (!dryRun) {
      console.log("\nUse --force to overwrite user-modified files.");
    }
  }
}

/**
 * Main install function
 */
export async function install(options: InstallOptions = {}): Promise<void> {
  const targetDir = options.targetDir || process.cwd();
  const packageDir = getPackageDir();
  const templatesDir = join(packageDir, "templates");

  console.log(`Installing claude-parallel to ${targetDir}...\n`);

  // Check if running in a git repository
  if (!existsSync(join(targetDir, ".git"))) {
    console.warn("⚠ Warning: Target directory is not a git repository.");
    console.warn("  claude-parallel works best in git repositories.\n");
  }

  // Check if templates directory exists
  if (!existsSync(templatesDir)) {
    throw new Error(`Templates directory not found at ${templatesDir}`);
  }

  // Read existing manifest
  const manifest = readManifest(targetDir);

  // Find all template files
  const templateFiles = findTemplateFiles(templatesDir);

  if (templateFiles.length === 0) {
    throw new Error("No template files found");
  }

  // Plan what to do with each file
  const actions = planFileActions(templateFiles, templatesDir, targetDir, manifest, options);

  // Show what directories will be created
  const dirsToCreate = new Set<string>();
  for (const action of actions) {
    if (action.action === "install" || action.action === "overwrite") {
      let dir = dirname(action.destPath);
      while (dir !== targetDir && dir !== ".") {
        dirsToCreate.add(dir);
        dir = dirname(dir);
      }
    }
  }

  if (dirsToCreate.size > 0) {
    console.log("Creating directories:");
    Array.from(dirsToCreate)
      .sort()
      .forEach((dir) => {
        const relDir = relative(targetDir, dir);
        console.log(`  - ${relDir}/`);
        if (!options.dryRun && !existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      });
    console.log("");
  }

  // Execute the actions
  executeFileActions(actions, !!options.dryRun);

  // Write manifest (unless dry-run)
  if (!options.dryRun) {
    const newManifest = createManifest(
      "1.0.0",
      Object.fromEntries(
        actions
          .filter((a) => a.action === "install" || a.action === "overwrite")
          .map((a) => {
            const destRelative = relative(targetDir, a.destPath);
            const content = readFileSync(a.sourcePath, "utf-8");
            return [destRelative, calculateFileHash(content)];
          })
      )
    );

    // Merge with skipped files from old manifest
    if (manifest) {
      for (const action of actions) {
        if (action.action === "skip-modified") {
          const destRelative = relative(targetDir, action.destPath);
          if (manifest.files[destRelative]) {
            // Keep the old hash for skipped files
            newManifest.files[destRelative] = manifest.files[destRelative];
          }
        }
      }
    }

    writeManifest(targetDir, newManifest);
    console.log("\n✓ Manifest saved to .github/claude-parallel/.install-manifest.json");
  }

  // Print summary
  const installedCount = actions.filter(
    (a) => a.action === "install" || a.action === "overwrite"
  ).length;
  const skippedCount = actions.filter((a) => a.action === "skip-modified").length;

  console.log("\nSummary:");
  console.log(
    `  - ${installedCount} file${installedCount !== 1 ? "s" : ""} ${options.dryRun ? "would be installed" : "installed"}`
  );
  if (skippedCount > 0) {
    console.log(`  - ${skippedCount} file${skippedCount !== 1 ? "s" : ""} skipped (user modified)`);
  }

  if (!options.dryRun) {
    console.log("\nDone! Run 'cat .env.example' to see required environment variables.");
  }
}
