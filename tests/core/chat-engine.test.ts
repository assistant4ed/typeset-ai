import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@anthropic-ai/sdk", () => {
  const createMock = vi.fn();
  return {
    default: class MockAnthropic {
      messages = {
        create: createMock,
      };
    },
    __mockCreate: createMock,
  };
});

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

import {
  createChatSession,
  sendChatMessage,
  undoLastChange,
  redoLastChange,
  getChatHistory,
} from "@typeset-ai/core/chat-engine.js";
import type { ContentTree, ChatSession } from "@typeset-ai/core/types.js";

const { __mockCreate } = await import("@anthropic-ai/sdk") as { __mockCreate: ReturnType<typeof vi.fn> };

const SAMPLE_TREE: ContentTree = {
  metadata: {
    title: "Test Book",
    author: "Author",
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
          heading: "Intro",
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

const INITIAL_CSS = `
@page { size: A4; margin: 20mm; }
body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.6; }
.chapter h1 { font-size: 24pt; text-align: center; }
`;

describe("createChatSession", () => {
  it("should create a session with an ID, content, and CSS", () => {
    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);

    expect(session.id).toBeDefined();
    expect(session.id.length).toBeGreaterThan(0);
    expect(session.contentTree).toEqual(SAMPLE_TREE);
    expect(session.currentCss).toBe(INITIAL_CSS);
    expect(session.history).toHaveLength(0);
    expect(session.undoStack).toHaveLength(0);
    expect(session.redoStack).toHaveLength(0);
  });
});

describe("sendChatMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send a message and receive updated CSS", async () => {
    const newCss = `
@page { size: A4; margin: 20mm; }
body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.6; }
.chapter h1 { font-size: 32pt; text-align: center; }
`;
    __mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: `I've increased the chapter title size from 24pt to 32pt.\n\n\`\`\`css\n${newCss}\n\`\`\``,
        },
      ],
    });

    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    const response = await sendChatMessage(session, "Make chapter titles bigger");

    expect(response.message).toContain("increased");
    expect(response.css).toContain("32pt");
    expect(response.diff.patch).toBeDefined();
    expect(response.diff.patch.length).toBeGreaterThan(0);
  });

  it("should add messages to session history", async () => {
    __mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "Done.\n\n```css\nbody { font-size: 12pt; }\n```",
        },
      ],
    });

    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    await sendChatMessage(session, "Change font size");

    expect(session.history).toHaveLength(2);
    expect(session.history[0].role).toBe("user");
    expect(session.history[0].content).toBe("Change font size");
    expect(session.history[1].role).toBe("assistant");
  });

  it("should push previous CSS to undo stack on successful change", async () => {
    __mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "Updated.\n\n```css\nbody { font-size: 14pt; }\n```",
        },
      ],
    });

    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    await sendChatMessage(session, "Bigger font");

    expect(session.undoStack).toHaveLength(1);
    expect(session.undoStack[0]).toBe(INITIAL_CSS);
    expect(session.currentCss).toContain("14pt");
  });

  it("should clear redo stack on new change", async () => {
    __mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "Changed.\n\n```css\nbody { color: red; }\n```",
        },
      ],
    });

    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    session.redoStack.push("some old css");

    await sendChatMessage(session, "Make text red");

    expect(session.redoStack).toHaveLength(0);
  });
});

describe("undoLastChange", () => {
  it("should restore previous CSS from undo stack", () => {
    const session = createChatSession(SAMPLE_TREE, "body { color: blue; }");
    session.undoStack.push(INITIAL_CSS);

    const result = undoLastChange(session);

    expect(result).toBe(true);
    expect(session.currentCss).toBe(INITIAL_CSS);
    expect(session.undoStack).toHaveLength(0);
    expect(session.redoStack).toHaveLength(1);
    expect(session.redoStack[0]).toBe("body { color: blue; }");
  });

  it("should return false when undo stack is empty", () => {
    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    const result = undoLastChange(session);

    expect(result).toBe(false);
    expect(session.currentCss).toBe(INITIAL_CSS);
  });
});

describe("redoLastChange", () => {
  it("should restore CSS from redo stack", () => {
    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    session.redoStack.push("body { color: green; }");

    const result = redoLastChange(session);

    expect(result).toBe(true);
    expect(session.currentCss).toBe("body { color: green; }");
    expect(session.redoStack).toHaveLength(0);
    expect(session.undoStack).toHaveLength(1);
    expect(session.undoStack[0]).toBe(INITIAL_CSS);
  });

  it("should return false when redo stack is empty", () => {
    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    const result = redoLastChange(session);

    expect(result).toBe(false);
  });
});

describe("getChatHistory", () => {
  it("should return session history as an array of messages", () => {
    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    session.history.push(
      { role: "user", content: "hello", timestamp: "2026-04-02T10:00:00Z" },
      { role: "assistant", content: "hi there", timestamp: "2026-04-02T10:00:01Z" },
    );

    const history = getChatHistory(session);

    expect(history).toHaveLength(2);
    expect(history[0].role).toBe("user");
    expect(history[1].role).toBe("assistant");
  });
});
