import { IDPKG_NAMESPACE, PARAGRAPH_STYLE_PREFIX } from "./constants.js";

import type { ContentBlock, Chapter } from "../types.js";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getStyleNameForBlock(block: ContentBlock): string {
  switch (block.type) {
    case "paragraph":
      return "Body";
    case "heading": {
      const level = block.attributes["level"] ?? "3";
      return `Heading${level}`;
    }
    case "blockquote":
      return "BlockQuote";
    case "footnote":
      return "Footnote";
    case "list":
      return "ListItem";
    default:
      return "Body";
  }
}

export function contentBlockToStoryFragment(block: ContentBlock): string {
  if (block.type === "image") {
    return "";
  }

  const styleName = getStyleNameForBlock(block);
  const escapedContent = escapeXml(block.content);
  const styleRef = `${PARAGRAPH_STYLE_PREFIX}${styleName}`;

  return [
    `<ParagraphStyleRange AppliedParagraphStyle="${styleRef}">`,
    `  <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">`,
    `    <Content>${escapedContent}</Content>`,
    `  </CharacterStyleRange>`,
    `</ParagraphStyleRange>`,
  ].join("\n");
}

export function buildStoryXml(storyId: string, chapter: Chapter): string {
  const fragments: string[] = [];

  const titleFragment = [
    `<ParagraphStyleRange AppliedParagraphStyle="${PARAGRAPH_STYLE_PREFIX}Heading1">`,
    `  <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">`,
    `    <Content>${escapeXml(chapter.title)}</Content>`,
    `  </CharacterStyleRange>`,
    `</ParagraphStyleRange>`,
  ].join("\n");
  fragments.push(titleFragment);

  for (const section of chapter.sections) {
    if (section.heading) {
      const headingFragment = [
        `<ParagraphStyleRange AppliedParagraphStyle="${PARAGRAPH_STYLE_PREFIX}Heading2">`,
        `  <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">`,
        `    <Content>${escapeXml(section.heading)}</Content>`,
        `  </CharacterStyleRange>`,
        `</ParagraphStyleRange>`,
      ].join("\n");
      fragments.push(headingFragment);
    }

    for (const block of section.blocks) {
      const fragment = contentBlockToStoryFragment(block);
      if (fragment) {
        fragments.push(fragment);
      }
    }
  }

  const body = fragments.map((f) => `    ${f.replace(/\n/g, "\n    ")}`).join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Story xmlns:idPkg="${IDPKG_NAMESPACE}"`,
    `  DOMVersion="19.1">`,
    `  <Story Self="${storyId}" AppliedTOCStyle="n"`,
    `    TrackChanges="false" StoryTitle="">`,
    body,
    `  </Story>`,
    `</idPkg:Story>`,
  ].join("\n");
}
