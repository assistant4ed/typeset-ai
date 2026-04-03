import type { AiProvider } from "./types.js";
import { ClaudeProvider } from "./claude-provider.js";

export type ProviderName = "claude" | "openai";

export interface ProviderOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export function createProvider(name: ProviderName, options: ProviderOptions = {}): AiProvider {
  switch (name) {
    case "claude":
      return new ClaudeProvider(options);
    case "openai":
      throw new Error("OpenAI provider not yet implemented. Use claude.");
    default:
      throw new Error(`Unknown provider: ${name}. Supported: claude, openai`);
  }
}

export function detectProvider(): { name: ProviderName; apiKey: string } {
  if (process.env.ANTHROPIC_API_KEY) {
    return { name: "claude", apiKey: process.env.ANTHROPIC_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    return { name: "openai", apiKey: process.env.OPENAI_API_KEY };
  }
  throw new Error("No AI provider credentials found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
}
