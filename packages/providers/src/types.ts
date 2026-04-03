export interface ProviderMetadata {
  name: string;
  models: string[];
  defaultModel: string;
  maxTokens: number;
  supportsVision: boolean;
}

export interface LayoutRequest {
  contentSummary: string;
  bookType: string;
  pageSize: string;
  baseTemplateCss?: string;
  customCss?: string;
}

export interface LayoutResponse {
  css: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface ChatRequest {
  message: string;
  currentCss: string;
  contentSummary: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  referenceImage?: { data: string; mediaType: string };
}

export interface ChatResponse {
  message: string;
  css: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface ReferenceAnalysis {
  css: string;
  analysis: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface AiProvider {
  readonly metadata: ProviderMetadata;
  generateLayout(request: LayoutRequest): Promise<LayoutResponse>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  analyzeReference(imageBase64: string, mediaType: string): Promise<ReferenceAnalysis>;
}
