export interface ContentTree {
  metadata: BookMetadata;
  frontMatter: ContentBlock[];
  chapters: Chapter[];
  backMatter: ContentBlock[];
  assets: Asset[];
}

export interface BookMetadata {
  title: string;
  author: string;
  source: "google-docs" | "markdown" | "pdf" | "manual";
  pageCount: number;
}

export interface Chapter {
  title: string;
  number: number;
  sections: Section[];
}

export interface Section {
  heading: string;
  level: number;
  blocks: ContentBlock[];
}

export type BlockType =
  | "paragraph"
  | "heading"
  | "image"
  | "table"
  | "list"
  | "blockquote"
  | "footnote"
  | "page-break";

export interface ContentBlock {
  type: BlockType;
  content: string;
  attributes: Record<string, string>;
}

export interface Asset {
  id: string;
  originalName: string;
  localPath: string;
  mimeType: string;
  width: number;
  height: number;
  dpi: number;
}

export type BookType =
  | "novel"
  | "coffee-table"
  | "children-book"
  | "textbook"
  | "catalog"
  | "corporate-report"
  | "magazine";

export interface LayoutOptions {
  bookType: BookType;
  pageSize: string;
  customCss?: string;
  referenceImagePath?: string;
}

export interface RenderOptions {
  format: "pdf" | "pdf-proof";
  outputPath: string;
  colorProfile: "cmyk" | "rgb";
  includeBleed: boolean;
  includeCropMarks: boolean;
}

export interface PreflightResult {
  isValid: boolean;
  errors: PreflightIssue[];
  warnings: PreflightIssue[];
}

export interface PreflightIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  page?: number;
  element?: string;
}

// --- Phase 2: Export Types ---

export interface IdmlExportOptions {
  outputPath: string;
  preserveStyles: boolean;
  embedImages: boolean;
}

export interface SvgExportOptions {
  outputDir: string;
  embedImages: boolean;
  preserveText: boolean;
}

// --- Phase 2: Chat Engine Types ---

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  referenceImagePath?: string;
}

export interface CssDiff {
  before: string;
  after: string;
  patch: string;
}

export interface ChatResponse {
  message: string;
  css: string;
  diff: CssDiff;
  isApplied: boolean;
}

export interface ChatSession {
  id: string;
  contentTree: ContentTree;
  currentCss: string;
  history: ChatMessage[];
  undoStack: string[];
  redoStack: string[];
}
