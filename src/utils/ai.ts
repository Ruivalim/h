import { loadConfig } from "./config";
import { exec, commandExists } from "./exec";

/**
 * Generate a response from AI based on a prompt
 * Uses the configured AI provider (Claude or Ollama)
 */
export async function generateAIResponse(prompt: string): Promise<string> {
  const config = loadConfig();

  if (config.ai.provider === "claude") {
    // Use Claude Code CLI
    return await exec(["claude", "--no-session-persistence", "-p", prompt]);
  } else if (config.ai.provider === "ollama") {
    // Use Ollama
    const model = config.ai.ollama?.model || "llama3.2";
    const baseUrl = config.ai.ollama?.baseUrl || "http://localhost:11434";

    // Call Ollama API
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || "";
  }

  throw new Error(`Unknown AI provider: ${config.ai.provider}`);
}

/**
 * Check if AI is configured and available
 */
export async function isAIAvailable(): Promise<boolean> {
  const config = loadConfig();

  try {
    if (config.ai.provider === "claude") {
      // Check if claude CLI is available
      return await commandExists("claude");
    } else if (config.ai.provider === "ollama") {
      // Check if Ollama is running
      const baseUrl = config.ai.ollama?.baseUrl || "http://localhost:11434";
      const response = await fetch(`${baseUrl}/api/tags`, { method: "GET" });
      return response.ok;
    }
  } catch (err) {
    return false;
  }

  return false;
}
