import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";

export interface ProviderConfig {
  name: "claude" | "openai";
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens: number;
}

export interface RenderConfig {
  pageSize: string;
  colorProfile: "cmyk" | "rgb";
  includeBleed: boolean;
  includeCropMarks: boolean;
}

export interface ExportConfig {
  embedImages: boolean;
  preserveStyles: boolean;
  preserveText: boolean;
}

export interface TypesetConfig {
  provider: ProviderConfig;
  render: RenderConfig;
  export: ExportConfig;
}

const DEFAULTS: TypesetConfig = {
  provider: {
    name: "claude",
    model: "claude-sonnet-4-20250514",
    apiKey: "",
    maxTokens: 4096,
  },
  render: {
    pageSize: "A4",
    colorProfile: "cmyk",
    includeBleed: true,
    includeCropMarks: true,
  },
  export: {
    embedImages: true,
    preserveStyles: true,
    preserveText: true,
  },
};

function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const val = override[key];
    if (val !== undefined && val !== null && typeof val === "object" && !Array.isArray(val)) {
      result[key] = deepMerge(
        (result[key] ?? {}) as Record<string, unknown>,
        val as Record<string, unknown>,
      ) as T[keyof T];
    } else if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

function loadJsonFile(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

export type ConfigSource = "defaults" | "user" | "project" | "env";

export interface ConfigLoadResult {
  config: TypesetConfig;
  sources: ConfigSource[];
}

export function loadConfig(projectDir?: string): ConfigLoadResult {
  const sources: ConfigSource[] = ["defaults"];
  let config = JSON.parse(JSON.stringify(DEFAULTS)) as Record<string, unknown>;

  // Layer 1: User config (~/.typeset/config.json)
  const userConfigPath = join(homedir(), ".typeset", "config.json");
  const userConfig = loadJsonFile(userConfigPath);
  if (Object.keys(userConfig).length > 0) {
    config = deepMerge(config, userConfig);
    sources.push("user");
  }

  // Layer 2: Project config (.typeset/config.json)
  const dir = projectDir ?? process.cwd();
  const projectConfigPath = resolve(dir, ".typeset", "config.json");
  const projectConfig = loadJsonFile(projectConfigPath);
  if (Object.keys(projectConfig).length > 0) {
    config = deepMerge(config, projectConfig);
    sources.push("project");
  }

  const typedConfig = config as unknown as TypesetConfig;

  // Layer 3: Environment variables (highest priority)
  if (process.env.ANTHROPIC_API_KEY) {
    typedConfig.provider.apiKey = process.env.ANTHROPIC_API_KEY;
    typedConfig.provider.name = "claude";
    sources.push("env");
  } else if (process.env.OPENAI_API_KEY) {
    typedConfig.provider.apiKey = process.env.OPENAI_API_KEY;
    typedConfig.provider.name = "openai";
    sources.push("env");
  }

  if (process.env.TYPESET_MODEL) {
    typedConfig.provider.model = process.env.TYPESET_MODEL;
  }

  if (process.env.TYPESET_PAGE_SIZE) {
    typedConfig.render.pageSize = process.env.TYPESET_PAGE_SIZE;
  }

  return { config: typedConfig, sources };
}

export function resolveProviderApiKey(config: TypesetConfig): string {
  if (config.provider.apiKey) return config.provider.apiKey;

  const envKey =
    config.provider.name === "claude"
      ? process.env.ANTHROPIC_API_KEY
      : process.env.OPENAI_API_KEY;

  if (!envKey) {
    const envVar =
      config.provider.name === "claude" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    throw new Error(`Missing API key. Set ${envVar} or configure in .typeset/config.json`);
  }

  return envKey;
}
