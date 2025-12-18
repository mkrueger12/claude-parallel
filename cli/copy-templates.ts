import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import type { FeatureSelection, InstallOptions } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the templates directory path
 * Works for both development (../templates) and installed package
 */
export function getTemplatesDir(): string {
  // Try development path first
  const devPath = path.join(__dirname, '..', 'templates');
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  // Try installed package path
  const installedPath = path.join(__dirname, '..', '..', 'templates');
  if (fs.existsSync(installedPath)) {
    return installedPath;
  }
  throw new Error('Could not find templates directory');
}

/**
 * Copy a single file with overwrite protection
 */
export async function copyFile(
  src: string,
  dest: string,
  options: { force: boolean; dryRun: boolean }
): Promise<boolean> {
  const exists = await fs.pathExists(dest);

  if (exists && !options.force) {
    console.log(`  Skipping: ${dest} (already exists)`);
    return false;
  }

  if (options.dryRun) {
    console.log(`  Would create: ${dest}`);
    return true;
  }

  await fs.ensureDir(path.dirname(dest));
  await fs.copy(src, dest, { overwrite: options.force });
  console.log(`  Created: ${dest}`);
  return true;
}

/**
 * Copy an entire directory recursively
 */
export async function copyDir(
  src: string,
  dest: string,
  options: { force: boolean; dryRun: boolean }
): Promise<number> {
  let count = 0;
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      count += await copyDir(srcPath, destPath, options);
    } else {
      const copied = await copyFile(srcPath, destPath, options);
      if (copied) count++;
    }
  }

  return count;
}

/**
 * Main function to copy all templates based on feature selection
 */
export async function copyTemplates(
  targetDir: string,
  features: FeatureSelection,
  options: InstallOptions
): Promise<void> {
  const templatesDir = getTemplatesDir();
  const copyOpts = { force: options.force, dryRun: options.dryRun };

  console.log('\nCopying template files...\n');

  let totalCopied = 0;

  // Always copy actions (required for workflows)
  console.log('Installing GitHub Actions...');
  const actionsCount = await copyDir(
    path.join(templatesDir, 'actions'),
    path.join(targetDir, '.github', 'actions'),
    copyOpts
  );
  totalCopied += actionsCount;

  // Always copy scripts (required for workflows)
  console.log('Installing scripts...');
  const scriptsCount = await copyDir(
    path.join(templatesDir, 'scripts'),
    path.join(targetDir, '.github', 'claude-parallel', 'scripts'),
    copyOpts
  );
  totalCopied += scriptsCount;

  // Always copy prompts (required for workflows)
  console.log('Installing prompts...');
  const promptsCount = await copyDir(
    path.join(templatesDir, 'prompts'),
    path.join(targetDir, '.github', 'claude-parallel', 'prompts'),
    copyOpts
  );
  totalCopied += promptsCount;

  // Copy planning workflow if selected
  if (features.planningWorkflow) {
    console.log('Installing planning workflow...');
    const copied = await copyFile(
      path.join(templatesDir, 'workflows', 'claude-plan.yml'),
      path.join(targetDir, '.github', 'workflows', 'claude-plan.yml'),
      copyOpts
    );
    if (copied) totalCopied++;
  }

  // Copy implementation workflow if selected
  if (features.implementWorkflow) {
    console.log('Installing implementation workflow...');
    const copied = await copyFile(
      path.join(templatesDir, 'workflows', 'claude-implement.yml'),
      path.join(targetDir, '.github', 'workflows', 'claude-implement.yml'),
      copyOpts
    );
    if (copied) totalCopied++;
  }

  // Copy agents if selected
  if (features.agents) {
    console.log('Installing Claude agents...');
    const agentsCount = await copyDir(
      path.join(templatesDir, 'agents'),
      path.join(targetDir, '.claude', 'agents'),
      copyOpts
    );
    totalCopied += agentsCount;
  }

  console.log(`\n${options.dryRun ? 'Would create' : 'Created'} ${totalCopied} files.`);
}
