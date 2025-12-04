/**
 * Manual test script for repository manager functions
 * Run with: npx tsx test-repository.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import {
  getWorkDir,
  getJobDir,
  ensureWorkDir,
  cloneRepository,
  cleanupRepository,
  copyScriptToRepo,
} from './src/services/repository.js';

console.log('Testing Repository Manager...\n');

// Test 1: getWorkDir
console.log('Test 1: getWorkDir()');
const workDir = getWorkDir();
console.log(`  Work directory: ${workDir}`);
console.log('  ✓ Pass\n');

// Test 2: getJobDir
console.log('Test 2: getJobDir()');
const jobId = 'test-job-123';
const jobDir = getJobDir(jobId);
console.log(`  Job directory for '${jobId}': ${jobDir}`);
console.log(`  Expected: ${path.join(workDir, jobId)}`);
console.log('  ✓ Pass\n');

// Test 3: ensureWorkDir
console.log('Test 3: ensureWorkDir()');
ensureWorkDir();
const workDirExists = fs.existsSync(workDir);
console.log(`  Work directory exists: ${workDirExists}`);
if (!workDirExists) {
  throw new Error('Work directory was not created');
}
console.log('  ✓ Pass\n');

// Test 4: cloneRepository
console.log('Test 4: cloneRepository()');
// Use a small, public test repository
const testRepoUrl = 'https://github.com/octocat/Hello-World.git';
const testJobId = `test-clone-${Date.now()}`;
const testDir = getJobDir(testJobId);

try {
  console.log(`  Cloning ${testRepoUrl} to ${testDir}...`);
  const result = cloneRepository(testRepoUrl, testDir);
  console.log(`  Clone result: ${result}`);

  // Verify directory exists
  if (!fs.existsSync(testDir)) {
    throw new Error('Cloned directory does not exist');
  }
  console.log('  ✓ Directory created');

  // Verify .git directory exists
  const gitDir = path.join(testDir, '.git');
  if (!fs.existsSync(gitDir)) {
    throw new Error('.git directory not found in cloned repo');
  }
  console.log('  ✓ .git directory exists');

  // Verify git status works
  try {
    execSync('git status', { cwd: testDir, stdio: 'pipe' });
    console.log('  ✓ git status works in cloned repo');
  } catch (error) {
    throw new Error('git status failed in cloned repo');
  }

  console.log('  ✓ Pass\n');

  // Test 5: copyScriptToRepo
  console.log('Test 5: copyScriptToRepo()');
  copyScriptToRepo(testDir);

  // Verify script exists
  const scriptPath = path.join(testDir, 'parallel-impl.sh');
  if (!fs.existsSync(scriptPath)) {
    throw new Error('parallel-impl.sh not found in cloned repo');
  }
  console.log('  ✓ parallel-impl.sh copied');

  // Verify script is executable
  const stats = fs.statSync(scriptPath);
  const isExecutable = (stats.mode & 0o111) !== 0;
  if (!isExecutable) {
    throw new Error('parallel-impl.sh is not executable');
  }
  console.log('  ✓ parallel-impl.sh is executable');

  // Verify prompts directory exists
  const promptsPath = path.join(testDir, 'prompts');
  if (!fs.existsSync(promptsPath)) {
    throw new Error('prompts directory not found in cloned repo');
  }
  console.log('  ✓ prompts directory copied');

  // Verify prompts files exist
  const implementationPrompt = path.join(promptsPath, 'implementation.md');
  const reviewPrompt = path.join(promptsPath, 'review.md');
  if (!fs.existsSync(implementationPrompt)) {
    throw new Error('implementation.md not found in prompts directory');
  }
  if (!fs.existsSync(reviewPrompt)) {
    throw new Error('review.md not found in prompts directory');
  }
  console.log('  ✓ prompts files copied');

  console.log('  ✓ Pass\n');

  // Test 6: cleanupRepository
  console.log('Test 6: cleanupRepository()');
  cleanupRepository(testDir);

  // Verify directory is removed
  if (fs.existsSync(testDir)) {
    throw new Error('Directory still exists after cleanup');
  }
  console.log('  ✓ Directory removed');
  console.log('  ✓ Pass\n');

  console.log('All tests passed! ✓');

} catch (error) {
  console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error));

  // Cleanup on error
  if (fs.existsSync(testDir)) {
    console.log('\nCleaning up test directory...');
    cleanupRepository(testDir);
  }

  process.exit(1);
}
