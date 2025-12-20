import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface Manifest {
  version: string;
  installedAt: string;
  files: Record<string, string>; // path -> sha256 hash
}

const MANIFEST_PATH = '.github/claude-parallel/.install-manifest.json';

/**
 * Calculate SHA256 hash of file contents
 */
export function calculateFileHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Read the manifest file from the target directory
 */
export function readManifest(targetDir: string): Manifest | null {
  const manifestPath = join(targetDir, MANIFEST_PATH);

  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    const content = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Warning: Could not read manifest at ${manifestPath}:`, error);
    return null;
  }
}

/**
 * Write the manifest file to the target directory
 */
export function writeManifest(targetDir: string, manifest: Manifest): void {
  const manifestPath = join(targetDir, MANIFEST_PATH);

  try {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write manifest to ${manifestPath}: ${error}`);
  }
}

/**
 * Create a new manifest with current timestamp and version
 */
export function createManifest(version: string, files: Record<string, string>): Manifest {
  return {
    version,
    installedAt: new Date().toISOString(),
    files,
  };
}

/**
 * Check if a file has been modified by the user since installation
 * Returns true if the file was modified, false otherwise
 */
export function isFileModified(
  filePath: string,
  currentContent: string,
  manifest: Manifest | null
): boolean {
  if (!manifest) {
    return false; // No manifest means fresh install, not modified
  }

  const recordedHash = manifest.files[filePath];
  if (!recordedHash) {
    return false; // File not in manifest, treat as new
  }

  const currentHash = calculateFileHash(currentContent);
  return currentHash !== recordedHash;
}
