import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ContentTree, LayoutOptions } from "./types.js";

const MODEL_ID = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

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
  const chapterCount = content.chapters.length;
  let paragraphCount = 0;
  let imageCount = 0;
  let tableCount = 0;
  let listCount = 0;

  for (const chapter of content.chapters) {
    for (const section of chapter.sections) {
      for (const block of section.blocks) {
        if (block.type === "paragraph") paragraphCount++;
        else if (block.type === "image") imageCount++;
        else if (block.type === "table") tableCount++;
        else if (block.type === "list") listCount++;
      }
    }
  }

  const frontMatterCount = content.frontMatter.length;
  const backMatterCount = content.backMatter.length;
  const assetCount = content.assets.length;

  return [
    `Chapters: ${chapterCount}`,
    `Paragraphs: ${paragraphCount}`,
    `Images: ${imageCount}`,
    `Tables: ${tableCount}`,
    `Lists: ${listCount}`,
    `Front matter blocks: ${frontMatterCount}`,
    `Back matter blocks: ${backMatterCount}`,
    `Assets: ${assetCount}`,
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
  const client = new Anthropic({
    apiKey: process.env["ANTHROPIC_API_KEY"] ?? "test-key",
  });
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

  const response = await client.messages.create({
    model: MODEL_ID,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const rawText = textBlock && textBlock.type === "text" ? textBlock.text : "";

  return extractCssFromResponse(rawText);
}
