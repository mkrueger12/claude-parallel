#!/usr/bin/env node

const fs = require('fs');
const yaml = require('yaml');

const files = [
  // .github/workflows
  '.github/workflows/ci.yml',
  '.github/workflows/claude-implement-issue.yml',
  '.github/workflows/claude.yml',
  '.github/workflows/test-opencode-version.yml',
  '.github/workflows/multi-provider-plan-v2.yml',
  '.github/workflows/reusable-implement-issue.yml',
  // templates/workflows
  'templates/workflows/claude-implement.yml',
  'templates/workflows/claude-plan.yml',
  // .github/actions
  '.github/actions/detect-runtime/action.yml',
  '.github/actions/fetch-agents/action.yml',
  '.github/actions/get-issue-details/action.yml',
  '.github/actions/setup-claude/action.yml',
  '.github/actions/setup-opencode/action.yml',
  '.github/actions/setup-opencode-environment/action.yml',
  '.github/actions/setup-runtime-and-deps/action.yml',
  '.github/actions/run-build-checks/action.yml',
  // templates/actions
  'templates/actions/detect-runtime/action.yml',
  'templates/actions/fetch-agents/action.yml',
  'templates/actions/get-issue-details/action.yml',
  'templates/actions/setup-claude/action.yml',
  'templates/actions/setup-opencode/action.yml',
  'templates/actions/setup-opencode-environment/action.yml',
  'templates/actions/setup-runtime-and-deps/action.yml',
  'templates/actions/run-build-checks/action.yml',
];

let hasErrors = false;

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    yaml.parse(content);
    console.log(`✓ ${file}`);
  } catch (error) {
    console.error(`✗ ${file}: ${error.message}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\nYAML validation failed!');
  process.exit(1);
} else {
  console.log('\nAll YAML files are valid!');
  process.exit(0);
}
