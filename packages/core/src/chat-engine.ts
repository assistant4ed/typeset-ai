import { GoogleGenAI } from "@google/genai";
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

const MODEL_ID = "gemini-2.5-pro-preview-05-06";
const MAX_TOKENS = 8192;

function summarizeContent(content: ContentTree): string {
  const chapters = content.chapters ?? [];
  const assets = content.assets ?? [];
  const metadata = content.metadata ?? { title: "Untitled", author: "" };
  const raw = (content as unknown as Record<string, unknown>).raw;

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
  const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["GOOGLE_AI_API_KEY"] ?? "";
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable");
  }

  const ai = new GoogleGenAI({ apiKey });

  const now = new Date().toISOString();

  const userChatMessage: ChatMessage = {
    role: "user",
    content: userMessage,
    timestamp: now,
    referenceImagePath,
  };

  session.history.push(userChatMessage);

  const systemPrompt = buildSystemPrompt(session.contentTree, session.currentCss);

  // Build conversation history for Gemini
  const contents: Array<{ role: string; parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> }> = [];

  for (const msg of session.history) {
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    if (msg.role === "user" && msg.referenceImagePath) {
      try {
        const imageBuffer = readFileSync(msg.referenceImagePath);
        const base64Data = imageBuffer.toString("base64");
        const ext = msg.referenceImagePath.split(".").pop()?.toLowerCase() ?? "jpeg";
        const mimeMap: Record<string, string> = {
          jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
          gif: "image/gif", webp: "image/webp",
        };
        parts.push({
          inlineData: { mimeType: mimeMap[ext] ?? "image/jpeg", data: base64Data },
        });
      } catch {
        // Image file may no longer exist, skip it
      }
    }

    parts.push({ text: msg.content });
    contents.push({ role: msg.role === "assistant" ? "model" : "user", parts });
  }

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    config: {
      maxOutputTokens: MAX_TOKENS,
      systemInstruction: systemPrompt,
    },
    contents,
  });

  const rawText = response.text ?? "";

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
