import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, resolveProviderApiKey } from "@typeset-ai/config";

describe("loadConfig", () => {
  const savedEnv: Record<string, string | undefined> = {};
  const envKeys = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "TYPESET_MODEL", "TYPESET_PAGE_SIZE"];

  beforeEach(() => {
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it("loadConfig should return defaults when no config files exist", () => {
    const { config } = loadConfig("/tmp/nonexistent-typeset-project-dir");

    expect(config.provider.name).toBe("claude");
    expect(config.provider.model).toBe("claude-sonnet-4-20250514");
    expect(config.provider.maxTokens).toBe(4096);
    expect(config.render.pageSize).toBe("A4");
    expect(config.render.colorProfile).toBe("cmyk");
    expect(config.render.includeBleed).toBe(true);
    expect(config.export.embedImages).toBe(true);
  });

  it("should include 'defaults' in sources", () => {
    const { sources } = loadConfig("/tmp/nonexistent-typeset-project-dir");

    expect(sources).toContain("defaults");
    expect(sources[0]).toBe("defaults");
  });

  it("should pick up ANTHROPIC_API_KEY from environment", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";

    const { config, sources } = loadConfig("/tmp/nonexistent-typeset-project-dir");

    expect(config.provider.apiKey).toBe("sk-ant-test-key");
    expect(config.provider.name).toBe("claude");
    expect(sources).toContain("env");
  });

  it("should pick up OPENAI_API_KEY and set provider to openai", () => {
    process.env.OPENAI_API_KEY = "sk-openai-test-key";

    const { config, sources } = loadConfig("/tmp/nonexistent-typeset-project-dir");

    expect(config.provider.apiKey).toBe("sk-openai-test-key");
    expect(config.provider.name).toBe("openai");
    expect(sources).toContain("env");
  });
});

describe("resolveProviderApiKey", () => {
  let savedAnthropicKey: string | undefined;
  let savedOpenaiKey: string | undefined;

  beforeEach(() => {
    savedAnthropicKey = process.env.ANTHROPIC_API_KEY;
    savedOpenaiKey = process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (savedAnthropicKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = savedAnthropicKey;
    }
    if (savedOpenaiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = savedOpenaiKey;
    }
  });

  it("resolveProviderApiKey should throw when no key available", () => {
    const { config } = loadConfig("/tmp/nonexistent-typeset-project-dir");

    expect(() => resolveProviderApiKey(config)).toThrow(
      "Missing API key. Set ANTHROPIC_API_KEY or configure in .typeset/config.json",
    );
  });
});
