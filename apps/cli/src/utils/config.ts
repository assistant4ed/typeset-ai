import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });

export function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Add it to .env or set it as an environment variable.",
    );
  }
  return key;
}

export function getTemplatesDir(): string {
  return resolve(
    import.meta.dirname,
    "../../../..",
    "templates",
  );
}
