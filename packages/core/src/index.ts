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
export { exportSvg } from "./svg-exporter.js";
export type { SvgExportConfig } from "./svg-exporter.js";
export {
  createChatSession,
  sendChatMessage,
  undoLastChange,
  redoLastChange,
  getChatHistory,
} from "./chat-engine.js";
export {
  contentToTypst,
  renderToPdf,
  renderToHtml,
  renderToSvg,
  getPageCount,
} from "./typst-renderer.js";
export type { TypstRenderOptions, TypstRenderResult } from "./typst-renderer.js";
