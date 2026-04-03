import Anthropic from "@anthropic-ai/sdk";

import type {
  AiProvider,
  ProviderMetadata,
  LayoutRequest,
  LayoutResponse,
  ChatRequest,
  ChatResponse,
  ReferenceAnalysis,
} from "./types.js";

function extractCss(text: string): string {
  const match = text.match(/```css\n([\s\S]*?)```/);
  if (match) return match[1].trim();
  const generic = text.match(/```\n([\s\S]*?)```/);
  if (generic) return generic[1].trim();
  return text.trim();
}

export class ClaudeProvider implements AiProvider {
  private client: Anthropic;
  private model: string;

  readonly metadata: ProviderMetadata = {
    name: "claude",
    models: ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-haiku-4-5-20251001"],
    defaultModel: "claude-sonnet-4-20250514",
    maxTokens: 4096,
    supportsVision: true,
  };

  constructor(options: { apiKey?: string; model?: string; baseUrl?: string } = {}) {
    this.client = new Anthropic({
      apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY,
      ...(options.baseUrl ? { baseURL: options.baseUrl } : {}),
    });
    this.model = options.model ?? this.metadata.defaultModel;
  }

  async generateLayout(request: LayoutRequest): Promise<LayoutResponse> {
    const systemPrompt = `You are an expert book designer and CSS typesetter. Generate CSS layouts using CSS Paged Media specification for print-ready book production. Use @page rules for dimensions, margins, bleeds. Use mm or pt units (not px). Output ONLY CSS in a css code block.`;

    const userPrompt = `Generate CSS layout for:
Book type: ${request.bookType}
Page size: ${request.pageSize}
Content: ${request.contentSummary}
${request.baseTemplateCss ? `\nBase template:\n\`\`\`css\n${request.baseTemplateCss}\n\`\`\`` : ""}
${request.customCss ? `\nCustom CSS to incorporate:\n\`\`\`css\n${request.customCss}\n\`\`\`` : ""}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.metadata.maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("No text in response");

    return {
      css: extractCss(text.text),
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const systemPrompt = `You are a book designer assistant. Modify CSS layouts based on requests. Respond with:
1. Brief description of changes
2. The complete updated CSS in a css code block

Current CSS:
\`\`\`css
${request.currentCss}
\`\`\`

Content context: ${request.contentSummary}`;

    const messages: Anthropic.MessageParam[] = request.history.map((h) => ({
      role: h.role,
      content: h.content,
    }));

    const userContent: Anthropic.ContentBlockParam[] = [];
    if (request.referenceImage) {
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: request.referenceImage.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: request.referenceImage.data,
        },
      });
    }
    userContent.push({ type: "text", text: request.message });

    messages.push({ role: "user", content: userContent });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.metadata.maxTokens,
      system: systemPrompt,
      messages,
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("No text in response");

    return {
      message: text.text.replace(/```css[\s\S]*?```/g, "").trim(),
      css: extractCss(text.text),
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  }

  async analyzeReference(imageBase64: string, mediaType: string): Promise<ReferenceAnalysis> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.metadata.maxTokens,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Analyze this book/publication design. Generate matching CSS using CSS Paged Media spec.

Output:
1. CSS code block with @page rules, print measurements in mm/pt
2. Brief analysis of the design characteristics`,
            },
          ],
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("No text in response");

    const css = extractCss(text.text);
    const analysis = text.text.replace(/```[\s\S]*?```/g, "").trim();

    return {
      css,
      analysis,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  }
}
