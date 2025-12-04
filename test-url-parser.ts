#!/usr/bin/env tsx

import { parseGitHubIssueUrl } from './src/services/github.js';

console.log('Testing parseGitHubIssueUrl function...\n');

const testUrl = 'https://github.com/owner/repo/issues/123';
console.log(`Test URL: ${testUrl}`);

try {
  const result = parseGitHubIssueUrl(testUrl);
  console.log('\nExtracted values:');
  console.log(`  owner: ${result.owner}`);
  console.log(`  repo: ${result.repo}`);
  console.log(`  issueNumber: ${result.issueNumber}`);

  // Verify the values
  const ownerOk = result.owner === 'owner';
  const repoOk = result.repo === 'repo';
  const issueNumberOk = result.issueNumber === 123;

  console.log('\nValidation:');
  console.log(`  ✓ owner === 'owner': ${ownerOk ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ repo === 'repo': ${repoOk ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ issueNumber === 123: ${issueNumberOk ? 'PASS' : 'FAIL'}`);

  if (ownerOk && repoOk && issueNumberOk) {
    console.log('\n✅ TEST PASSED: parseGitHubIssueUrl correctly extracts all components');
    process.exit(0);
  } else {
    console.log('\n❌ TEST FAILED: One or more values do not match expected');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ TEST FAILED with error:', error);
  process.exit(1);
}
