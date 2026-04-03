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

const MODEL_ID = "gemini-3-pro-image-preview";
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

function extractTypstFromResponse(response: string): string {
  const typstMatch = response.match(/```typst\s*([\s\S]*?)```/);
  if (typstMatch) return typstMatch[1].trim();
  // Fallback: also check for CSS blocks for backward compatibility
  const cssMatch = response.match(/```css\s*([\s\S]*?)```/);
  if (cssMatch) return cssMatch[1].trim();
  // Generic code block as last resort
  const genericMatch = response.match(/```\s*([\s\S]*?)```/);
  if (genericMatch) return genericMatch[1].trim();
  return "";
}

function extractMessageFromResponse(response: string): string {
  const withoutCode = response
    .replace(/```typst[\s\S]*?```/, "")
    .replace(/```css[\s\S]*?```/, "")
    .trim();
  return withoutCode || response;
}

function generateDesignDiff(before: string, after: string): CssDiff {
  const patch = createPatch("layout.typ", before, after, "previous", "updated");
  return { before, after, patch };
}

function buildSystemPrompt(content: ContentTree, currentCss: string): string {
  const contentSummary = summarizeContent(content);

  return [
    "You are an expert book designer. You help designers create beautiful book layouts using the Typst typesetting language.",
    "",
    "When the designer requests changes, you must:",
    "1. Understand their request in the context of the current layout.",
    "2. Generate Typst markup that implements the design.",
    "3. Explain what you changed and why.",
    "4. Return the COMPLETE Typst design code in a ```typst code block.",
    "",
    "Important rules:",
    "- Use Typst syntax (not CSS, not LaTeX).",
    "- Use #set page() for page dimensions.",
    "- Use #set text() for font settings.",
    "- Use #show heading for heading styles.",
    "- Use professional typography (proper margins, line spacing, font sizes).",
    "- Always return the FULL design code, not just changes.",
    "- Preserve existing styles unless the user explicitly asks to change them.",
    "",
    `Book content summary:\n${contentSummary}`,
    "",
    `Current Typst design:\n\`\`\`typst\n${currentCss}\n\`\`\``,
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

  const newDesign = extractTypstFromResponse(rawText);
  const message = extractMessageFromResponse(rawText);

  const assistantMessage: ChatMessage = {
    role: "assistant",
    content: rawText,
    timestamp: new Date().toISOString(),
  };
  session.history.push(assistantMessage);

  if (newDesign) {
    const diff = generateDesignDiff(session.currentCss, newDesign);
    session.undoStack.push(session.currentCss);
    session.redoStack = [];
    session.currentCss = newDesign;

    return {
      message,
      css: newDesign,
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
