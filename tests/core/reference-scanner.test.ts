import { describe, it, expect, vi } from "vitest";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    readFileSync: vi.fn((path: string) => {
      if (typeof path === "string" && path.endsWith(".jpg")) {
        return Buffer.from("fake-image-data");
      }
      return actual.readFileSync(path);
    }),
  };
});

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: `\`\`\`css
@page { size: 210mm 297mm; margin: 20mm 15mm; }
body { font-family: "Helvetica Neue", sans-serif; font-size: 10pt; line-height: 1.5; }
.chapter h1 { font-size: 28pt; font-weight: 300; text-transform: uppercase; }
\`\`\`

**Analysis:**
- Grid: Single column with generous margins
- Typography: Sans-serif, light weight headings
- Color: Monochrome
- Spacing: Open, airy layout`,
            },
          ],
        }),
      };
    },
  };
});

import { scanReference } from "@typeset-ai/core/reference-scanner.js";

describe("scanReference", () => {
  it("should return a CSS string from an image path", async () => {
    const result = await scanReference("design.jpg");

    expect(typeof result.css).toBe("string");
    expect(result.css).toContain("@page");
  });

  it("should return an analysis description", async () => {
    const result = await scanReference("design.jpg");

    expect(typeof result.analysis).toBe("string");
    expect(result.analysis.length).toBeGreaterThan(0);
  });

  it("should extract CSS from code blocks without markers", async () => {
    const result = await scanReference("design.jpg");

    expect(result.css).not.toContain("```");
  });
});
