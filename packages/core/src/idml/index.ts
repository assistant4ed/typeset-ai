export {
  IDML_NAMESPACE,
  IDPKG_NAMESPACE,
  DEFAULT_PAGE_WIDTH,
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_MARGIN,
  POINTS_PER_MM,
  POINTS_PER_INCH,
  MIMETYPE_CONTENT,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  HEADING_FONT_SIZES,
  PARAGRAPH_STYLE_PREFIX,
  CHARACTER_STYLE_PREFIX,
  OBJECT_STYLE_PREFIX,
} from "./constants.js";

export {
  buildParagraphStyle,
  buildCharacterStyle,
  buildObjectStyle,
  buildStylesXml,
} from "./styles-builder.js";
export type {
  ParagraphStyleDef,
  CharacterStyleDef,
  ObjectStyleDef,
  StylesInput,
} from "./styles-builder.js";

export {
  buildStoryXml,
  contentBlockToStoryFragment,
} from "./story-builder.js";

export {
  buildTextFrame,
  buildImageFrame,
  buildSpreadXml,
} from "./spread-builder.js";
export type {
  TextFrameOptions,
  ImageFrameOptions,
  FrameDef,
  SpreadOptions,
} from "./spread-builder.js";

export { buildDesignMapXml } from "./designmap-builder.js";
export type { DesignMapOptions } from "./designmap-builder.js";
