export type {
  ContentTree,
  BookMetadata,
  Chapter,
  Section,
  ContentBlock,
  BlockType,
  Asset,
  BookType,
  LayoutOptions,
  RenderOptions,
  PreflightResult,
  PreflightIssue,
  IdmlExportOptions,
  SvgExportOptions,
  ChatMessage,
  ChatSession,
  ChatResponse,
  CssDiff,
} from "./types.js";

export { parseMarkdown } from "./content-parser.js";
export { buildHtml } from "./html-builder.js";
export { runPreflight } from "./preflight.js";
export { generateLayout } from "./ai-layout.js";
export { scanReference } from "./reference-scanner.js";
export type { ScanResult } from "./reference-scanner.js";
export { renderPdf } from "./pdf-renderer.js";
export { exportIdml } from "./idml-exporter.js";
