/**
 * Repository Manager Service
 *
 * Handles repository cloning, cleanup, and workspace management
 * for parallel implementation jobs.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Get the working directory for cloned repositories
 * Defaults to /tmp/claude-parallel-jobs if WORK_DIR env var is not set
 */
export function getWorkDir(): string {
  return process.env.WORK_DIR || '/tmp/claude-parallel-jobs';
}

/**
 * Get the job-specific directory path
 * @param jobId - Unique job identifier
 * @returns Full path to job directory
 */
export function getJobDir(jobId: string): string {
  return path.join(getWorkDir(), jobId);
}

/**
 * Ensure the working directory exists
 * Creates the directory if it doesn't exist
 */
export function ensureWorkDir(): void {
  const workDir = getWorkDir();

  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir, { recursive: true });
  }
}

/**
 * Clone a git repository to the target directory
 *
 * @param repoUrl - Git repository URL (HTTPS format)
 * @param targetDir - Target directory path for cloning
 * @returns The target directory path on success
 * @throws Error if clone fails (network, auth, invalid repo, etc.)
 */
export function cloneRepository(repoUrl: string, targetDir: string): string {
  try {
    // Ensure parent directory exists
    const parentDir = path.dirname(targetDir);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Check if target directory already exists
    if (fs.existsSync(targetDir)) {
      throw new Error(`Target directory already exists: ${targetDir}`);
    }

    // Execute git clone command
    // Use --depth=1 for faster cloning (we only need latest state)
    execSync(`git clone "${repoUrl}" "${targetDir}"`, {
      stdio: 'pipe', // Capture output for error handling
      encoding: 'utf-8',
    });

    // Verify the clone was successful
    const gitDir = path.join(targetDir, '.git');
    if (!fs.existsSync(gitDir)) {
      throw new Error('Git clone succeeded but .git directory not found');
    }

    return targetDir;
  } catch (error) {
    // Clean up partial clone if it exists
    if (fs.existsSync(targetDir)) {
      try {
        fs.rmSync(targetDir, { recursive: true, force: true });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

    // Provide better error messages based on common failure modes
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        throw new Error(`Repository not found: ${repoUrl}`);
      } else if (errorMessage.includes('authentication') || errorMessage.includes('401') || errorMessage.includes('403')) {
        throw new Error(`Authentication failed for repository: ${repoUrl}`);
      } else if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('could not resolve')) {
        throw new Error(`Network error while cloning repository: ${repoUrl}`);
      } else if (errorMessage.includes('permission denied')) {
        throw new Error(`Permission denied when creating directory: ${targetDir}`);
      } else {
        throw new Error(`Failed to clone repository: ${error.message}`);
      }
    }

    throw new Error(`Failed to clone repository: ${String(error)}`);
  }
}

/**
 * Remove a cloned repository directory
 *
 * @param targetDir - Directory path to remove
 * @throws Error only for critical failures (permissions, etc.)
 *         Silently succeeds if directory doesn't exist
 */
export function cleanupRepository(targetDir: string): void {
  try {
    if (!fs.existsSync(targetDir)) {
      // Directory doesn't exist, nothing to clean up
      return;
    }

    // Remove directory and all contents
    fs.rmSync(targetDir, { recursive: true, force: true });
  } catch (error) {
    // Handle errors gracefully
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('permission denied') || errorMessage.includes('eacces')) {
        throw new Error(`Permission denied when removing directory: ${targetDir}`);
      } else if (errorMessage.includes('ebusy') || errorMessage.includes('in use')) {
        throw new Error(`Directory is in use and cannot be removed: ${targetDir}`);
      } else {
        // Log but don't throw for other errors
        console.warn(`Warning: Failed to cleanup directory ${targetDir}:`, error.message);
      }
    }
  }
}

/**
 * Copy parallel-impl.sh script and prompts to the cloned repository
 * This is required because parallel-impl.sh expects to find prompts/ in its directory
 *
 * @param targetDir - Target repository directory
 * @throws Error if script or prompts directory not found, or if copy fails
 */
export function copyScriptToRepo(targetDir: string): void {
  try {
    // Get the project root directory (where this package.json lives)
    // Since we're in dist/services/repository.js, we need to go up to the project root
    const projectRoot = process.cwd();

    const scriptSource = path.join(projectRoot, 'parallel-impl.sh');
    const promptsSource = path.join(projectRoot, 'prompts');

    // Verify source files exist
    if (!fs.existsSync(scriptSource)) {
      throw new Error(`parallel-impl.sh not found at: ${scriptSource}`);
    }
    if (!fs.existsSync(promptsSource)) {
      throw new Error(`prompts directory not found at: ${promptsSource}`);
    }

    // Verify target directory exists
    if (!fs.existsSync(targetDir)) {
      throw new Error(`Target directory does not exist: ${targetDir}`);
    }

    // Copy parallel-impl.sh
    const scriptTarget = path.join(targetDir, 'parallel-impl.sh');
    fs.copyFileSync(scriptSource, scriptTarget);

    // Make script executable
    fs.chmodSync(scriptTarget, 0o755);

    // Copy prompts directory recursively
    const promptsTarget = path.join(targetDir, 'prompts');
    copyDirectoryRecursive(promptsSource, promptsTarget);

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to copy script to repository: ${error.message}`);
    }
    throw new Error(`Failed to copy script to repository: ${String(error)}`);
  }
}

/**
 * Helper function to recursively copy a directory
 * @param source - Source directory path
 * @param target - Target directory path
 */
function copyDirectoryRecursive(source: string, target: string): void {
  // Create target directory
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Read all files and subdirectories
  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectory
      copyDirectoryRecursive(sourcePath, targetPath);
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}
