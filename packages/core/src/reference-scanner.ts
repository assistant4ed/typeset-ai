import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "node:fs";

export interface ScanResult {
  css: string;
  analysis: string;
}

function getMediaType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const mediaTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  return mediaTypes[ext] ?? "image/jpeg";
}

function extractCssFromResponse(response: string): string {
  const match = response.match(/```css\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  return "";
}

function extractAnalysisFromResponse(response: string): string {
  return response.replace(/```[\s\S]*?```/, "").trim();
}

export async function scanReference(imagePath: string): Promise<ScanResult> {
  const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["GOOGLE_AI_API_KEY"] ?? "";
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable");
  }

  const imageBuffer = readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const mediaType = getMediaType(imagePath);

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro-preview-05-06",
    config: { maxOutputTokens: 4096 },
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: mediaType, data: base64Image } },
          {
            text: `Analyze this book/publication design and generate CSS that recreates its layout style. Focus on:

1. Page dimensions and margins
2. Typography: font families, sizes, line height, letter spacing
3. Grid structure: columns, gutters, alignment
4. Color palette: text color, heading color, accent colors
5. Spacing: paragraph spacing, section spacing, image margins
6. Special elements: headers, footers, page numbers, captions

Output:
1. A CSS code block using CSS Paged Media spec (@page rules, print measurements in mm/pt)
2. A brief analysis section describing the design characteristics

Use widely-available fonts. All measurements in mm or pt.`,
          },
        ],
      },
    ],
  });

  const text = response.text ?? "";

  return {
    css: extractCssFromResponse(text),
    analysis: extractAnalysisFromResponse(text),
  };
}
