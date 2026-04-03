import { describe, it, expect, vi } from "vitest";

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: `Here is the layout.\n\`\`\`css\n@page { size: 129mm 198mm; margin: 20mm; }\nbody { font-family: Georgia, serif; font-size: 11pt; }\n\`\`\`\nThis is the analysis.`,
            },
          ],
          usage: { input_tokens: 100, output_tokens: 200 },
        }),
      };
    },
  };
});

import { ClaudeProvider, createProvider } from "@typeset-ai/providers";

describe("ClaudeProvider", () => {
  it("generateLayout should return CSS string", async () => {
    const provider = new ClaudeProvider({ apiKey: "test-key" });
    const result = await provider.generateLayout({
      contentSummary: "Chapters: 3, Paragraphs: 20",
      bookType: "novel",
      pageSize: "129mm 198mm",
    });

    expect(typeof result.css).toBe("string");
    expect(result.css).toContain("@page");
    expect(result.css).not.toContain("```");
    expect(result.usage.inputTokens).toBe(100);
    expect(result.usage.outputTokens).toBe(200);
  });

  it("chat should return message and CSS", async () => {
    const provider = new ClaudeProvider({ apiKey: "test-key" });
    const result = await provider.chat({
      message: "Make the font larger",
      currentCss: "@page { size: A4; } body { font-size: 11pt; }",
      contentSummary: "Chapters: 3",
      history: [],
    });

    expect(typeof result.message).toBe("string");
    expect(typeof result.css).toBe("string");
    expect(result.css).toContain("@page");
    expect(result.css).not.toContain("```");
    expect(result.usage.inputTokens).toBe(100);
    expect(result.usage.outputTokens).toBe(200);
  });

  it("analyzeReference should return CSS and analysis", async () => {
    const provider = new ClaudeProvider({ apiKey: "test-key" });
    const result = await provider.analyzeReference("base64imagedata==", "image/jpeg");

    expect(typeof result.css).toBe("string");
    expect(result.css).toContain("@page");
    expect(typeof result.analysis).toBe("string");
    expect(result.analysis.length).toBeGreaterThan(0);
    expect(result.usage.inputTokens).toBe(100);
    expect(result.usage.outputTokens).toBe(200);
  });
});

describe("createProvider", () => {
  it("createProvider('claude') should return a ClaudeProvider instance", () => {
    const provider = createProvider("claude", { apiKey: "test-key" });

    expect(provider).toBeInstanceOf(ClaudeProvider);
    expect(provider.metadata.name).toBe("claude");
    expect(provider.metadata.supportsVision).toBe(true);
  });
});
