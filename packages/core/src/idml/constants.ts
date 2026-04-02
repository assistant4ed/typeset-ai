export const IDML_NAMESPACE = "http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging";
export const IDPKG_NAMESPACE = "http://ns.adobe.com/AdobeInDesign/idpkg/1.0";

export const POINTS_PER_MM = 2.834645669;
export const POINTS_PER_INCH = 72;

// A4 dimensions in points (210mm x 297mm)
export const DEFAULT_PAGE_WIDTH = 210 * POINTS_PER_MM;
export const DEFAULT_PAGE_HEIGHT = 297 * POINTS_PER_MM;
export const DEFAULT_MARGIN = 20 * POINTS_PER_MM;

export const MIMETYPE_CONTENT = "application/vnd.adobe.indesign-idml-package";

export const DEFAULT_FONT_FAMILY = "Minion Pro";
export const DEFAULT_FONT_SIZE = 11;
export const DEFAULT_LINE_HEIGHT = 13.2;

export const HEADING_FONT_SIZES: Record<string, number> = {
  h1: 24,
  h2: 18,
  h3: 14,
  h4: 12,
  h5: 11,
  h6: 10,
};

export const PARAGRAPH_STYLE_PREFIX = "ParagraphStyle/";
export const CHARACTER_STYLE_PREFIX = "CharacterStyle/";
export const OBJECT_STYLE_PREFIX = "ObjectStyle/";
