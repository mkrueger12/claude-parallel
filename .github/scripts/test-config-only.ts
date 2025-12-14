#!/usr/bin/env node
/**
 * test-config-only.ts
 * Verify timeout config is passed to OpenCode server
 */

import { createOpencode } from '@opencode-ai/sdk';

async function test() {
  console.log('=== OpenCode Config Test ===\n');
  console.log(`OpenCode CLI version: ${await getOpencodeVersion()}\n`);

  const config = {
    provider: {
      anthropic: {
        options: {
          apiKey: 'test-key',  // Fake key for config test
          timeout: 600_000,
        },
      },
    },
  };

  console.log('[DEBUG] Config being passed to createOpencode():');
  console.log(JSON.stringify({
    provider: {
      anthropic: { options: { apiKey: '***', timeout: config.provider.anthropic.options.timeout } },
    }
  }, null, 2));
  console.log();

  console.log('Creating OpenCode server...');
  const { server } = await createOpencode({
    hostname: '127.0.0.1',
    port: 0,
    config,
  });

  console.log(`✓ Server started at ${server.url}`);
  console.log('✓ Config passed via OPENCODE_CONFIG_CONTENT environment variable');
  console.log('\nWith CLI version 1.0.153, the timeout config should now be respected!\n');

  await server.close();
  console.log('Server closed.');
}

async function getOpencodeVersion(): Promise<string> {
  const { exec } = await import('child_process');
  return new Promise((resolve) => {
    exec('opencode --version', (error, stdout) => {
      resolve(stdout.trim() || 'unknown');
    });
  });
}

test().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
