import JSZip from "jszip";

import { buildDesignMapXml } from "./idml/designmap-builder.js";
import { buildStoryXml } from "./idml/story-builder.js";
import { buildSpreadXml } from "./idml/spread-builder.js";
import { buildStylesXml } from "./idml/styles-builder.js";
import {
  MIMETYPE_CONTENT,
  DEFAULT_PAGE_WIDTH,
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_MARGIN,
  POINTS_PER_MM,
  IDPKG_NAMESPACE,
} from "./idml/constants.js";

import type { ContentTree } from "./types.js";
import type { FrameDef } from "./idml/spread-builder.js";
import type { ParagraphStyleDef, CharacterStyleDef, ObjectStyleDef } from "./idml/styles-builder.js";

interface ParsedPageSize {
  width: number;
  height: number;
}

function parsePageSizeFromCss(css: string): ParsedPageSize {
  const sizeMatch = css.match(/@page\s*\{[^}]*size:\s*([^;]+);/);
  if (!sizeMatch) {
    return { width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT };
  }

  const sizeValue = sizeMatch[1].trim();

  const namedSizes: Record<string, ParsedPageSize> = {
    A4: { width: 210 * POINTS_PER_MM, height: 297 * POINTS_PER_MM },
    A5: { width: 148 * POINTS_PER_MM, height: 210 * POINTS_PER_MM },
    letter: { width: 612, height: 792 },
  };

  if (namedSizes[sizeValue]) {
    return namedSizes[sizeValue];
  }

  const mmMatch = sizeValue.match(/(\d+(?:\.\d+)?)\s*mm\s+(\d+(?:\.\d+)?)\s*mm/);
  if (mmMatch) {
    return {
      width: parseFloat(mmMatch[1]) * POINTS_PER_MM,
      height: parseFloat(mmMatch[2]) * POINTS_PER_MM,
    };
  }

  return { width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT };
}

function parseMarginFromCss(css: string): number {
  const marginMatch = css.match(/@page\s*\{[^}]*margin:\s*(\d+(?:\.\d+)?)\s*mm/);
  if (marginMatch) {
    return parseFloat(marginMatch[1]) * POINTS_PER_MM;
  }
  return DEFAULT_MARGIN;
}

function buildDefaultStyles(): {
  paragraphStyles: ParagraphStyleDef[];
  characterStyles: CharacterStyleDef[];
  objectStyles: ObjectStyleDef[];
} {
  return {
    paragraphStyles: [
      { name: "Body", fontFamily: "Minion Pro", fontSize: 11, lineHeight: 13.2, alignment: "left" },
      { name: "Heading1", fontFamily: "Minion Pro", fontSize: 24, lineHeight: 28.8, alignment: "center" },
      { name: "Heading2", fontFamily: "Minion Pro", fontSize: 18, lineHeight: 21.6, alignment: "left" },
      { name: "Heading3", fontFamily: "Minion Pro", fontSize: 14, lineHeight: 16.8, alignment: "left" },
      { name: "BlockQuote", fontFamily: "Minion Pro", fontSize: 11, lineHeight: 13.2, alignment: "left" },
      { name: "Footnote", fontFamily: "Minion Pro", fontSize: 9, lineHeight: 10.8, alignment: "left" },
      { name: "ListItem", fontFamily: "Minion Pro", fontSize: 11, lineHeight: 13.2, alignment: "left" },
    ],
    characterStyles: [
      { name: "Bold", fontStyle: "Bold" },
      { name: "Italic", fontStyle: "Italic" },
      { name: "BoldItalic", fontStyle: "Bold Italic" },
    ],
    objectStyles: [
      { name: "TextFrame", fillColor: "None", strokeColor: "None", strokeWeight: 0 },
      { name: "ImageFrame", fillColor: "None", strokeColor: "None", strokeWeight: 0 },
    ],
  };
}

function buildGraphicXml(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Graphic xmlns:idPkg="${IDPKG_NAMESPACE}"`,
    `  DOMVersion="19.1">`,
    `  <Color Self="Color/Black" Model="Process"`,
    `    Space="CMYK" ColorValue="0 0 0 100" />`,
    `  <Color Self="Color/Registration" Model="Registration"`,
    `    Space="CMYK" ColorValue="100 100 100 100" />`,
    `  <Ink Self="Ink/Process Cyan" Name="Process Cyan"`,
    `    InkType="Normal" />`,
    `  <Ink Self="Ink/Process Magenta" Name="Process Magenta"`,
    `    InkType="Normal" />`,
    `  <Ink Self="Ink/Process Yellow" Name="Process Yellow"`,
    `    InkType="Normal" />`,
    `  <Ink Self="Ink/Process Black" Name="Process Black"`,
    `    InkType="Normal" />`,
    `</idPkg:Graphic>`,
  ].join("\n");
}

function buildPreferencesXml(pageWidth: number, pageHeight: number): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Preferences xmlns:idPkg="${IDPKG_NAMESPACE}"`,
    `  DOMVersion="19.1">`,
    `  <DocumentPreference PageWidth="${pageWidth}"`,
    `    PageHeight="${pageHeight}"`,
    `    PagesPerDocument="1"`,
    `    FacingPages="true" />`,
    `</idPkg:Preferences>`,
  ].join("\n");
}

function buildBackingStoryXml(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:BackingStory xmlns:idPkg="${IDPKG_NAMESPACE}"`,
    `  DOMVersion="19.1">`,
    `</idPkg:BackingStory>`,
  ].join("\n");
}

export async function exportIdml(
  content: ContentTree,
  css: string,
): Promise<Buffer> {
  const zip = new JSZip();
  const pageSize = parsePageSizeFromCss(css);
  const margin = parseMarginFromCss(css);

  // 1. mimetype (must be first, uncompressed)
  zip.file("mimetype", MIMETYPE_CONTENT, { compression: "STORE" });

  // 2. Build stories — one per chapter
  const storyIds: string[] = [];
  for (const chapter of content.chapters) {
    const storyId = `story-${chapter.number}`;
    storyIds.push(storyId);
    const storyXml = buildStoryXml(storyId, chapter);
    zip.file(`Stories/${storyId}.xml`, storyXml, { createFolders: false });
  }

  // 3. Build spreads — one per chapter (simplified: one spread = one page = one chapter)
  const spreadIds: string[] = [];
  const contentWidth = pageSize.width - margin * 2;
  const contentHeight = pageSize.height - margin * 2;

  for (let i = 0; i < content.chapters.length; i++) {
    const spreadId = `spread-${i + 1}`;
    spreadIds.push(spreadId);

    const frames: FrameDef[] = [];
    const chapter = content.chapters[i];
    const hasImages = chapter.sections.some((s) =>
      s.blocks.some((b) => b.type === "image"),
    );

    if (hasImages) {
      const textHeight = contentHeight * 0.6;
      const imageHeight = contentHeight * 0.35;
      const gap = contentHeight * 0.05;

      frames.push({
        type: "text",
        selfId: `tf-${spreadId}`,
        storyRef: `story-${chapter.number}`,
        x: margin,
        y: margin,
        width: contentWidth,
        height: textHeight,
      });

      const imageBlock = chapter.sections
        .flatMap((s) => s.blocks)
        .find((b) => b.type === "image");

      if (imageBlock) {
        frames.push({
          type: "image",
          selfId: `img-${spreadId}`,
          imagePath: imageBlock.content,
          x: margin,
          y: margin + textHeight + gap,
          width: contentWidth,
          height: imageHeight,
        });
      }
    } else {
      frames.push({
        type: "text",
        selfId: `tf-${spreadId}`,
        storyRef: `story-${chapter.number}`,
        x: margin,
        y: margin,
        width: contentWidth,
        height: contentHeight,
      });
    }

    const spreadXml = buildSpreadXml({
      spreadId,
      pageWidth: pageSize.width,
      pageHeight: pageSize.height,
      frames,
    });
    zip.file(`Spreads/${spreadId}.xml`, spreadXml, { createFolders: false });
  }

  // 4. Styles
  const styles = buildDefaultStyles();
  const stylesXml = buildStylesXml(styles);
  zip.file("Resources/Styles.xml", stylesXml, { createFolders: false });

  // 5. Graphic
  const graphicXml = buildGraphicXml();
  zip.file("Resources/Graphic.xml", graphicXml, { createFolders: false });

  // 6. Preferences
  const preferencesXml = buildPreferencesXml(pageSize.width, pageSize.height);
  zip.file("Resources/Preferences.xml", preferencesXml, { createFolders: false });

  // 7. BackingStory
  const backingStoryXml = buildBackingStoryXml();
  zip.file("Resources/BackingStory.xml", backingStoryXml, { createFolders: false });

  // 8. designmap.xml
  const designMapXml = buildDesignMapXml({ spreadIds, storyIds });
  zip.file("designmap.xml", designMapXml);

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return buffer;
}
