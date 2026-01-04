import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createConversationLogger } from "./conversation-logger.js";
import { createOpencodeServer, setupEventMonitoring } from "./opencode.js";
import type { Provider } from "./types.js";
import { extractTextFromParts, getApiKey, validateEnvVars } from "./utils.js";

export interface AgentConfig {
  name: string;
  description: string;
  requiredEnvVars: string[];
  promptFileName: string;
  maxSteps?: number;
  getAgentTools?: (linearApiKey?: string) => Record<string, boolean | undefined>;
  getAgentPermissions?: (linearApiKey?: string) => Record<string, string | undefined>;
  processPrompt?: (template: string, env: NodeJS.ProcessEnv) => string;
}

async function findPromptFile(fileName: string): Promise<string> {
  const possiblePaths = [
    join(process.cwd(), ".github", "claude-parallel", "prompts", fileName),
    join(process.cwd(), "prompts", fileName),
  ];

  for (const path of possiblePaths) {
    try {
      await access(path);
      return path;
    } catch {
      // File doesn't exist at this path, try next
    }
  }

  throw new Error(
    `Could not find ${fileName} in any of these locations:\n${possiblePaths.map((p) => `  - ${p}`).join("\n")}`
  );
}

export async function runAgent(config: AgentConfig) {
  try {
    validateEnvVars(config.requiredEnvVars);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const provider = (process.env.PROVIDER || "anthropic") as Provider;

  // Try to get API key from environment, but make it optional
  // The setupAuthentication function will handle fallback to auth.set()
  let apiKey: string | undefined;
  try {
    apiKey = getApiKey(provider);
    console.error(`[Auth] Using explicit API key from environment variables`);
  } catch {
    // API key not found in environment, will rely on auth.set() fallback
    console.error(
      `[Auth] No explicit API key found for ${provider}, will use auth.set() fallback (OAuth or session credentials)`
    );
  }

  const model = process.env.MODEL || (provider === "anthropic" ? "claude-opus-4-5" : "");
  const linearApiKey = process.env.LINEAR_API_KEY;

  console.error(`\n${"=".repeat(60)}`);
  console.error(`${config.name}`);
  console.error(`${"=".repeat(60)}`);
  console.error(`Provider: ${provider}`);
  console.error(`Model: ${model}`);
  console.error("");

  const logger = await createConversationLogger();
  if (logger) {
    console.error(`✓ Conversation logging enabled`);
  }

  let prompt: string;
  try {
    const promptFile = await findPromptFile(config.promptFileName);
    const template = await readFile(promptFile, "utf-8");
    prompt = config.processPrompt ? config.processPrompt(template, process.env) : template;
    console.error(`✓ Loaded and processed prompt from ${promptFile}`);
  } catch (error) {
    console.error(
      `✗ Failed to load prompt: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }

  const { client, server } = await createOpencodeServer({
    provider,
    apiKey,
    model,
    agentName: config.name,
    agentDescription: config.description,
    agentPrompt: prompt,
    agentTools: config.getAgentTools
      ? config.getAgentTools(linearApiKey)
      : {
          read: true,
          list: true,
          glob: true,
          grep: true,
          webfetch: true,
        },
    agentPermissions: config.getAgentPermissions
      ? config.getAgentPermissions(linearApiKey)
      : {
          bash: "allow",
          webfetch: "allow",
        },
    maxSteps: config.maxSteps || 30,
    linearApiKey,
  });

  setupEventMonitoring(client, logger);

  try {
    if (logger) {
      await logger.startSession({
        id: crypto.randomUUID(),
        agentType: config.name,
        model,
        provider,
      });
    }

    const sessionResponse = await client.session.create({
      body: { title: `${config.name}: ${new Date().toISOString()}` },
    });

    if (!sessionResponse.data) {
      throw new Error("Failed to create session");
    }

    const session = sessionResponse.data;
    console.error(`✓ Session created: ${session.id}`);

    const promptResponse = await client.session.prompt({
      path: { id: session.id },
      body: {
        model: { providerID: provider, modelID: model },
        agent: config.name,
        parts: [{ type: "text", text: prompt }],
      },
    });

    if (!promptResponse.data) {
      throw new Error("Failed to get response");
    }

    const responseInfo = promptResponse.data.info;
    if (responseInfo?.error) {
      const err = responseInfo.error;
      throw new Error(`Provider error: ${err.name}`);
    }

    const resultText = extractTextFromParts(promptResponse.data.parts);
    if (resultText.length === 0) {
      throw new Error("Empty response from agent");
    }

    console.log(resultText);

    if (logger) {
      await logger.endSession("completed");
      await logger.syncToCloud();
    }

    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\nERROR: ${errorMessage}`);

    if (logger) {
      await logger.endSession("error", errorMessage);
      await logger.syncToCloud();
    }
    process.exit(1);
  } finally {
    server.close();
  }
}
