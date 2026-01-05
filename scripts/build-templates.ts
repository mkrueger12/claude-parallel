#!/usr/bin/env bun

/**
 * build-templates.ts
 *
 * Bundles TypeScript agents into self-contained JavaScript files for templates/.
 *
 * This script:
 * 1. Uses Bun's built-in bundler to compile TypeScript to JavaScript
 * 2. Bundles all dependencies into single files
 * 3. Adds shebang to each output file
 * 4. Outputs to templates/scripts/
 *
 * Usage:
 *   bun run scripts/build-templates.ts
 */

import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "bun";

// ============================================================================
// Configuration
// ============================================================================

const TEMPLATES_DIR = join(process.cwd(), "templates", "scripts");
const SHEBANG = "#!/usr/bin/env node\n";

const ENTRYPOINTS = [
  {
    input: "./src/agents/planning-agent.ts",
    output: "planning-agent.js",
  },
  {
    input: "./src/agents/linear-agent.ts",
    output: "linear-agent.js",
  },
  {
    input: "./scripts/opencode-agent-runner.ts",
    output: "opencode-agent-runner.js",
  },
];

// ============================================================================
// Build Function
// ============================================================================

async function buildTemplates() {
  console.log("");
  console.log("=".repeat(60));
  console.log("Building Template Scripts");
  console.log("=".repeat(60));
  console.log("");

  // Ensure output directory exists
  try {
    await mkdir(TEMPLATES_DIR, { recursive: true });
    console.log(`✓ Created output directory: ${TEMPLATES_DIR}`);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code !== "EEXIST") {
      throw error;
    }
  }

  // Build each entrypoint
  for (const entry of ENTRYPOINTS) {
    console.log("");
    console.log(`Building ${entry.input} → ${entry.output}...`);

    try {
      // Use Bun's bundler
      const result = await build({
        entrypoints: [entry.input],
        outdir: TEMPLATES_DIR,
        target: "node",
        format: "esm",
        minify: false,
        sourcemap: "none",
        naming: {
          entry: "[dir]/[name].[ext]",
        },
        external: [], // Bundle all dependencies
      });

      if (!result.success) {
        console.error(`✗ Build failed for ${entry.input}`);
        for (const log of result.logs) {
          console.error(`  ${log.message}`);
        }
        process.exit(1);
      }

      console.log(`  ✓ Bundled successfully`);

      // Determine the actual output path
      // Bun outputs based on the input file structure
      const inputBasename = entry.input.split("/").pop()?.replace(".ts", ".js") || entry.output;
      const actualOutputPath = join(TEMPLATES_DIR, inputBasename);
      const targetOutputPath = join(TEMPLATES_DIR, entry.output);

      // Read the bundled file
      let bundledContent: string;
      try {
        bundledContent = await readFile(actualOutputPath, "utf-8");
      } catch (error) {
        console.error(`✗ Could not read bundled file: ${actualOutputPath}`);
        throw error;
      }

      // Add shebang if not present
      if (!bundledContent.startsWith("#!")) {
        bundledContent = SHEBANG + bundledContent;
      }

      // Write to target path (may be same as actual output)
      await writeFile(targetOutputPath, bundledContent, "utf-8");

      // Make executable
      await chmod(targetOutputPath, 0o755);

      console.log(`  ✓ Added shebang and made executable`);
      console.log(`  ✓ Output: ${targetOutputPath}`);
    } catch (error) {
      console.error(`✗ Error building ${entry.input}:`, error);
      throw error;
    }
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("Build Complete!");
  console.log("=".repeat(60));
  console.log("");
  console.log(`Bundled scripts in: ${TEMPLATES_DIR}`);
  console.log("");
}

// ============================================================================
// Main Execution
// ============================================================================

buildTemplates().catch((error) => {
  console.error("");
  console.error("=".repeat(60));
  console.error("BUILD FAILED");
  console.error("=".repeat(60));
  console.error(error);
  process.exit(1);
});
