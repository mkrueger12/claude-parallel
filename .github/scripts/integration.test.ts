import { createOpencode, OpencodeClient } from '@opencode-ai/sdk';

function extractTextFromParts(parts: any[]): string {
  if (!Array.isArray(parts)) return '';

  return parts
    .filter(part => part.type === 'text')
    .map(part => part.text || '')
    .join('\n');
}

// Function to send messages
async function sendMessage(client: OpencodeClient, message: string): Promise<{ responseText: string; sessionId: string }> {
  const sessionResponse = await client.session.create({
    body: { title: 'Message Sending Session' },
  });

  if (!sessionResponse.data) {
    throw new Error('Failed to create a session');
  }

  const response = await client.session.prompt({
    path: { id: sessionResponse.data.id },
    body: {
      parts: [{ type: 'text', text: message }],
    },
  });

  if (!response.data) {
    throw new Error('No response data');
  }

  const responseText = extractTextFromParts(response.data.parts);
  return { responseText, sessionId: sessionResponse.data.id };
}

// E2E Script Tests
// ========================================================================

(async () => {
  let opencodeClient: OpencodeClient | undefined;
  let opencodeServer: any; // Use 'any' to avoid type issues if OpencodeServer is not exported
  try {
    const { client, server } = await createOpencode({
      hostname: '127.0.0.1',
      port: 0, // Request a dynamic port to avoid EADDRINUSE
    });
    opencodeClient = client;
    opencodeServer = server;

    // Test 1: Responding to "hi"
    console.log('Starting E2E Test: Responding to "hi"');
    let sessionId1: string | undefined;
    try {
      const { responseText, sessionId } = await sendMessage(opencodeClient, "hi");
      sessionId1 = sessionId;
      if (!responseText.match(/hello|hi|greetings/i)) {
        throw new Error(`Unexpected response for "hi": ${responseText}`);
      }
      console.log('Test for sending "hi" passed. Response:', responseText);
    } catch (error) {
      console.error('Test for sending "hi" failed:', error);
    } finally {
      if (sessionId1) {
        await opencodeClient.session.delete({ path: { id: sessionId1 } });
      }
    }

    // Test 2: Responding to "say hi"
    console.log('Starting E2E Test: Responding to "say hi"');
    let sessionId2: string | undefined;
    try {
      const { responseText, sessionId } = await sendMessage(opencodeClient, "say hi");
      sessionId2 = sessionId;
      if (!responseText.match(/hello|hi|greetings/i)) {
        throw new Error(`Unexpected response for "say hi": ${responseText}`);
      }
      console.log('Test for sending "say hi" passed. Response:', responseText);
    } catch (error) {
      console.error('Test for sending "say hi" failed:', error);
    } finally {
      if (sessionId2) {
        await opencodeClient.session.delete({ path: { id: sessionId2 } });
      }
    }

  } catch (globalError) {
    console.error('Global E2E test setup failed:', globalError);
  } finally {
    if (opencodeServer) {
      opencodeServer.close();
    }
  }
})();
