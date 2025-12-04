import { execSync } from 'child_process';
import { mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Clone a GitHub repository to the target directory
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param targetDir - Directory to clone into
 * @throws Error if git clone fails
 */
export async function cloneRepository(
  owner: string,
  repo: string,
  targetDir: string
): Promise<void> {
  try {
    const repoUrl = `https://github.com/${owner}/${repo}.git`;
    const command = `git clone ${repoUrl} ${targetDir}`;

    execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to clone repository ${owner}/${repo}: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * Remove a directory and all its contents
 * @param targetDir - Directory to remove
 */
export async function cleanupRepository(targetDir: string): Promise<void> {
  try {
    if (existsSync(targetDir)) {
      await rm(targetDir, { recursive: true, force: true });
    }
  } catch (error) {
    if (error instanceof Error) {
      // Log error but don't throw - cleanup is best effort
      console.error(`Warning: Failed to cleanup directory ${targetDir}: ${error.message}`);
    }
  }
}

/**
 * Ensure the work directory exists, creating it if necessary
 * @param workDir - Work directory path
 * @throws Error if directory creation fails
 */
export async function ensureWorkDir(workDir: string): Promise<void> {
  try {
    if (!existsSync(workDir)) {
      await mkdir(workDir, { recursive: true, mode: 0o755 });
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create work directory ${workDir}: ${error.message}`);
    }
    throw error;
  }
}
