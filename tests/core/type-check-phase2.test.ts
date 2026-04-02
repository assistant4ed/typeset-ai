import { describe, it, expect } from "vitest";
import type {
  IdmlExportOptions,
  SvgExportOptions,
  ChatMessage,
  ChatSession,
  ChatResponse,
  CssDiff,
} from "@typeset-ai/core/types.js";

describe("Phase 2 types", () => {
  it("should define IdmlExportOptions with required fields", () => {
    const options: IdmlExportOptions = {
      outputPath: "/tmp/output.idml",
      preserveStyles: true,
      embedImages: false,
    };

    expect(options.outputPath).toBe("/tmp/output.idml");
    expect(options.preserveStyles).toBe(true);
    expect(options.embedImages).toBe(false);
  });

  it("should define SvgExportOptions with required fields", () => {
    const options: SvgExportOptions = {
      outputDir: "/tmp/svg-output",
      embedImages: true,
      preserveText: true,
    };

    expect(options.outputDir).toBe("/tmp/svg-output");
    expect(options.embedImages).toBe(true);
    expect(options.preserveText).toBe(true);
  });

  it("should define ChatMessage with role and content", () => {
    const message: ChatMessage = {
      role: "user",
      content: "Make the headings bigger",
      timestamp: "2026-04-02T10:00:00Z",
    };

    expect(message.role).toBe("user");
    expect(message.content).toBe("Make the headings bigger");
  });

  it("should define ChatResponse with css and diff", () => {
    const response: ChatResponse = {
      message: "I increased the heading size from 24pt to 32pt.",
      css: ".chapter h1 { font-size: 32pt; }",
      diff: {
        before: ".chapter h1 { font-size: 24pt; }",
        after: ".chapter h1 { font-size: 32pt; }",
        patch: "- .chapter h1 { font-size: 24pt; }\n+ .chapter h1 { font-size: 32pt; }",
      },
      isApplied: false,
    };

    expect(response.css).toContain("32pt");
    expect(response.diff.patch).toContain("+");
  });

  it("should define ChatSession with history and undo stack", () => {
    const session: ChatSession = {
      id: "session-1",
      contentTree: {
        metadata: { title: "Test", author: "A", source: "markdown", pageCount: 0 },
        frontMatter: [],
        chapters: [],
        backMatter: [],
        assets: [],
      },
      currentCss: "body { font-size: 12pt; }",
      history: [],
      undoStack: [],
      redoStack: [],
    };

    expect(session.id).toBe("session-1");
    expect(session.undoStack).toHaveLength(0);
  });
});
