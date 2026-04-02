import { describe, it, expect, vi } from "vitest";

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: `\`\`\`css
@page { size: 129mm 198mm; margin: 20mm; }
body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.6; }
.chapter h1 { font-size: 24pt; text-align: center; }
\`\`\``,
            },
          ],
        }),
      };
    },
  };
});

import { generateLayout } from "@typeset-ai/core/ai-layout.js";
import type { ContentTree, LayoutOptions } from "@typeset-ai/core";

const MINIMAL_TREE: ContentTree = {
  metadata: {
    title: "Test Book",
    author: "Test Author",
    source: "markdown",
    pageCount: 0,
  },
  frontMatter: [],
  chapters: [
    {
      title: "Chapter 1",
      number: 1,
      sections: [
        {
          heading: "Introduction",
          level: 2,
          blocks: [
            { type: "paragraph", content: "Hello world.", attributes: {} },
          ],
        },
      ],
    },
  ],
  backMatter: [],
  assets: [],
};

const LAYOUT_OPTIONS: LayoutOptions = {
  bookType: "novel",
  pageSize: "129mm 198mm",
};

describe("generateLayout", () => {
  it("should return a CSS string", async () => {
    const result = await generateLayout(MINIMAL_TREE, LAYOUT_OPTIONS);

    expect(typeof result).toBe("string");
    expect(result).toContain("@page");
    expect(result).toContain("font-family");
  });

  it("should include page size from options", async () => {
    const result = await generateLayout(MINIMAL_TREE, LAYOUT_OPTIONS);

    expect(result).toContain("129mm 198mm");
  });

  it("should extract CSS from markdown code blocks", async () => {
    const result = await generateLayout(MINIMAL_TREE, LAYOUT_OPTIONS);

    expect(result).not.toContain("```");
  });
});
