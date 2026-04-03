import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ContentTree, LayoutOptions } from "./types.js";

const MODEL_ID = "gemini-2.0-flash";
const MAX_TOKENS = 8192;

function getTemplatesDir(): string {
  const currentDir = resolve(fileURLToPath(import.meta.url), "..");
  return resolve(currentDir, "../../../templates");
}

function loadBaseTemplate(bookType: string): string {
  const cssPath = resolve(getTemplatesDir(), "book-types", `${bookType}.css`);
  try {
    return readFileSync(cssPath, "utf-8");
  } catch {
    return "";
  }
}

function summarizeContent(content: ContentTree): string {
  const chapters = content.chapters ?? [];
  const raw = (content as unknown as Record<string, unknown>).raw;

  if (chapters.length === 0 && typeof raw === "string") {
    const wordCount = raw.split(/\s+/).length;
    return `Content: ${wordCount} words (plain text)`;
  }

  let paragraphCount = 0;
  let imageCount = 0;
  let tableCount = 0;

  for (const chapter of chapters) {
    for (const section of chapter.sections ?? []) {
      for (const block of section.blocks ?? []) {
        if (block.type === "paragraph") paragraphCount++;
        else if (block.type === "image") imageCount++;
        else if (block.type === "table") tableCount++;
      }
    }
  }

  return [
    `Chapters: ${chapters.length}`,
    `Paragraphs: ${paragraphCount}`,
    `Images: ${imageCount}`,
    `Tables: ${tableCount}`,
    `Assets: ${(content.assets ?? []).length}`,
  ].join("\n");
}

function extractCssFromResponse(response: string): string {
  const match = response.match(/```css\s*([\s\S]*?)```/);
  if (match) {
    return match[1].trim();
  }
  return response.trim();
}

export async function generateLayout(
  content: ContentTree,
  options: LayoutOptions,
): Promise<string> {
  const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["GOOGLE_AI_API_KEY"] ?? "";
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable");
  }

  const ai = new GoogleGenAI({ apiKey });
  const baseTemplate = loadBaseTemplate(options.bookType);
  const contentSummary = summarizeContent(content);

  const systemPrompt =
    "You are an expert book designer specializing in CSS Paged Media. " +
    "Generate professional, print-ready CSS layouts using the CSS Paged Media specification. " +
    "Always wrap your CSS output in a ```css code block.";

  const baseTemplateSection = baseTemplate
    ? `\nBase template CSS to build upon:\n\`\`\`css\n${baseTemplate}\n\`\`\``
    : "";

  const userPrompt =
    `Generate a CSS layout for a ${options.bookType} book.\n` +
    `Page size: ${options.pageSize}\n` +
    `\nContent structure:\n${contentSummary}` +
    baseTemplateSection;

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    config: {
      maxOutputTokens: MAX_TOKENS,
      systemInstruction: systemPrompt,
    },
    contents: userPrompt,
  });

  return extractCssFromResponse(response.text ?? "");
}
