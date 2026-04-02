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
