import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";

export interface ScanResult {
  css: string;
  analysis: string;
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const EXTENSION_TO_MEDIA_TYPE: Record<string, ImageMediaType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

const SCAN_PROMPT = `Analyze this design reference image and generate matching CSS for typeset/print layout.

Please examine and describe:
1. Page dimensions and margins
2. Typography (font families, sizes, weights, line heights)
3. Grid structure and column layout
4. Color palette (background, text, accent colors)
5. Spacing patterns (padding, margins between elements)
6. Special elements (headers, footers, pull quotes, captions)

Then provide a complete CSS stylesheet that replicates this design for print/PDF output.

Format your response as:
1. A CSS code block (using \`\`\`css ... \`\`\`) with all the styles
2. Followed by a detailed analysis of the design decisions`;

function getMediaType(imagePath: string): ImageMediaType {
  const ext = imagePath.split(".").pop()?.toLowerCase() ?? "";
  const mediaType = EXTENSION_TO_MEDIA_TYPE[ext];
  if (!mediaType) {
    throw new Error(`Unsupported image format: .${ext}`);
  }
  return mediaType;
}

function extractCssFromResponse(responseText: string): string {
  const cssMatch = responseText.match(/```css\s*([\s\S]*?)```/);
  return cssMatch ? cssMatch[1].trim() : "";
}

function extractAnalysisFromResponse(responseText: string): string {
  const afterCodeBlock = responseText.replace(/```css[\s\S]*?```/, "").trim();
  return afterCodeBlock;
}

export async function scanReference(imagePath: string): Promise<ScanResult> {
  const imageBuffer = readFileSync(imagePath);
  const base64Data = imageBuffer.toString("base64");
  const mediaType = getMediaType(imagePath);

  const client = new Anthropic({
    apiKey: process.env["ANTHROPIC_API_KEY"] ?? "test-key",
  });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Data,
            },
          },
          {
            type: "text",
            text: SCAN_PROMPT,
          },
        ],
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === "text");
  const responseText = textContent?.type === "text" ? textContent.text : "";

  return {
    css: extractCssFromResponse(responseText),
    analysis: extractAnalysisFromResponse(responseText),
  };
}
