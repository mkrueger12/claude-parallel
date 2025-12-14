#!/usr/bin/env node
/**
 * test-timeout.ts
 * Quick test to verify timeout configuration is working
 */
import { createOpencode } from '@opencode-ai/sdk';
async function testTimeout() {
    console.log('Testing OpenCode timeout configuration...\n');
    const config = {
        provider: {
            anthropic: {
                options: {
                    apiKey: process.env.CLAUDE_CODE_OAUTH_TOKEN,
                    timeout: 600_000, // 10 minutes
                },
            },
        },
    };
    console.log('[DEBUG] Creating OpenCode server with config:');
    console.log(JSON.stringify({
        provider: {
            anthropic: { options: { apiKey: '***', timeout: config.provider.anthropic.options.timeout } },
        }
    }, null, 2));
    console.log();
    const { client, server } = await createOpencode({
        hostname: '127.0.0.1',
        port: 0,
        config,
    });
    console.log(`✓ OpenCode server started at ${server.url}`);
    console.log('[DEBUG] Config passed via OPENCODE_CONFIG_CONTENT env var\n');
    try {
        console.log('[anthropic] Creating session...');
        const sessionResponse = await client.session.create({
            body: { title: 'Timeout Test' },
        });
        if (!sessionResponse.data) {
            throw new Error('Failed to create session');
        }
        console.log(`[anthropic] Session created: ${sessionResponse.data.id}`);
        const startTime = Date.now();
        console.log(`[anthropic] Sending test prompt at ${new Date().toISOString()}...`);
        console.log(`[DEBUG] Request start time: ${startTime}\n`);
        const promptResponse = await client.session.prompt({
            path: { id: sessionResponse.data.id },
            body: {
                model: {
                    providerID: 'anthropic',
                    modelID: 'claude-opus-4-5-20251101',
                },
                parts: [{ type: 'text', text: 'Say "timeout test successful"' }],
            },
        });
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        const durationSec = (durationMs / 1000).toFixed(2);
        console.log(`[DEBUG] Request completed in ${durationMs}ms (${durationSec}s)`);
        if (promptResponse.data) {
            console.log(`\n✓ Test successful! Response received.`);
        }
        else {
            console.log(`\n✗ Test failed: No response data`);
        }
    }
    catch (error) {
        console.error(`\n✗ Test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    finally {
        await server.close();
        console.log('\nServer closed.');
    }
}
testTimeout().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=test-timeout.js.map