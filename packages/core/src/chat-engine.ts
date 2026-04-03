import Anthropic from "@anthropic-ai/sdk";
import { createPatch } from "diff";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

import type {
  ContentTree,
  ChatSession,
  ChatMessage,
  ChatResponse,
  CssDiff,
} from "./types.js";

const MODEL_ID = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const EXTENSION_TO_MEDIA_TYPE: Record<string, ImageMediaType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function summarizeContent(content: ContentTree): string {
  const chapters = content.chapters ?? [];
  const assets = content.assets ?? [];
  const metadata = content.metadata ?? { title: "Untitled", author: "" };
  const raw = (content as Record<string, unknown>).raw;

  if (chapters.length === 0 && typeof raw === "string" && raw.length > 0) {
    const wordCount = raw.split(/\s+/).length;
    return [
      `Title: ${metadata.title || "Untitled"}`,
      `Content: ${wordCount} words (plain text)`,
    ].join("\n");
  }

  const chapterTitles = chapters.map((c) => `  - ${c.title}`).join("\n");
  return [
    `Title: ${metadata.title || "Untitled"}`,
    `Author: ${metadata.author || "Unknown"}`,
    `Chapters (${chapters.length}):`,
    chapterTitles || "  (none)",
    `Assets: ${assets.length}`,
  ].join("\n");
}

function extractCssFromResponse(response: string): string {
  const match = response.match(/```css\s*([\s\S]*?)```/);
  if (match) {
    return match[1].trim();
  }
  return "";
}

function extractMessageFromResponse(response: string): string {
  const withoutCss = response.replace(/```css[\s\S]*?```/, "").trim();
  return withoutCss || response;
}

function generateCssDiff(before: string, after: string): CssDiff {
  const patch = createPatch("layout.css", before, after, "previous", "updated");
  return { before, after, patch };
}

function getMediaType(imagePath: string): ImageMediaType {
  const ext = imagePath.split(".").pop()?.toLowerCase() ?? "";
  const mediaType = EXTENSION_TO_MEDIA_TYPE[ext];
  if (!mediaType) {
    throw new Error(`Unsupported image format: .${ext}`);
  }
  return mediaType;
}

function buildSystemPrompt(content: ContentTree, currentCss: string): string {
  const contentSummary = summarizeContent(content);

  return [
    "You are an expert book designer helping a designer refine a CSS layout for print.",
    "The designer will describe changes they want. You must:",
    "1. Understand their request in the context of the current layout.",
    "2. Modify the CSS accordingly.",
    "3. Explain what you changed and why.",
    "4. Return the COMPLETE updated CSS in a ```css code block.",
    "",
    "Important rules:",
    "- Always return the FULL CSS, not just the changed parts.",
    "- Use CSS Paged Media specification (@page, @top-center, etc.).",
    "- Use print-appropriate units: mm, cm, in, pt — avoid px.",
    "- Preserve existing styles unless the user explicitly asks to change them.",
    "",
    `Book content summary:\n${contentSummary}`,
    "",
    `Current CSS:\n\`\`\`css\n${currentCss}\n\`\`\``,
  ].join("\n");
}

export function createChatSession(
  contentTree: ContentTree,
  initialCss: string,
): ChatSession {
  return {
    id: randomUUID(),
    contentTree,
    currentCss: initialCss,
    history: [],
    undoStack: [],
    redoStack: [],
  };
}

export async function sendChatMessage(
  session: ChatSession,
  userMessage: string,
  referenceImagePath?: string,
): Promise<ChatResponse> {
  const client = new Anthropic({
    apiKey: process.env["ANTHROPIC_API_KEY"] ?? "test-key",
  });

  const now = new Date().toISOString();

  const userChatMessage: ChatMessage = {
    role: "user",
    content: userMessage,
    timestamp: now,
    referenceImagePath,
  };

  session.history.push(userChatMessage);

  const systemPrompt = buildSystemPrompt(session.contentTree, session.currentCss);

  const conversationMessages: Anthropic.MessageParam[] = session.history.map(
    (msg) => {
      if (msg.role === "user" && msg.referenceImagePath) {
        const imageBuffer = readFileSync(msg.referenceImagePath);
        const base64Data = imageBuffer.toString("base64");
        const mediaType = getMediaType(msg.referenceImagePath);

        return {
          role: "user" as const,
          content: [
            {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text" as const,
              text: msg.content,
            },
          ],
        };
      }

      return {
        role: msg.role as "user" | "assistant",
        content: msg.content,
      };
    },
  );

  const response = await client.messages.create({
    model: MODEL_ID,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: conversationMessages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const rawText = textBlock && textBlock.type === "text" ? textBlock.text : "";

  const newCss = extractCssFromResponse(rawText);
  const message = extractMessageFromResponse(rawText);

  const assistantMessage: ChatMessage = {
    role: "assistant",
    content: rawText,
    timestamp: new Date().toISOString(),
  };
  session.history.push(assistantMessage);

  if (newCss) {
    const diff = generateCssDiff(session.currentCss, newCss);
    session.undoStack.push(session.currentCss);
    session.redoStack = [];
    session.currentCss = newCss;

    return {
      message,
      css: newCss,
      diff,
      isApplied: true,
    };
  }

  return {
    message,
    css: session.currentCss,
    diff: { before: session.currentCss, after: session.currentCss, patch: "" },
    isApplied: false,
  };
}

export function undoLastChange(session: ChatSession): boolean {
  if (session.undoStack.length === 0) {
    return false;
  }

  const previousCss = session.undoStack.pop()!;
  session.redoStack.push(session.currentCss);
  session.currentCss = previousCss;
  return true;
}

export function redoLastChange(session: ChatSession): boolean {
  if (session.redoStack.length === 0) {
    return false;
  }

  const nextCss = session.redoStack.pop()!;
  session.undoStack.push(session.currentCss);
  session.currentCss = nextCss;
  return true;
}

export function getChatHistory(session: ChatSession): ChatMessage[] {
  return [...session.history];
}
