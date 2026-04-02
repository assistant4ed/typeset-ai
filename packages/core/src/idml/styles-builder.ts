import { PARAGRAPH_STYLE_PREFIX, CHARACTER_STYLE_PREFIX, OBJECT_STYLE_PREFIX, IDPKG_NAMESPACE } from "./constants.js";

export interface ParagraphStyleDef {
  name: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  alignment: "left" | "center" | "right" | "justify";
}

export interface CharacterStyleDef {
  name: string;
  fontStyle: string;
}

export interface ObjectStyleDef {
  name: string;
  fillColor: string;
  strokeColor: string;
  strokeWeight: number;
}

export interface StylesInput {
  paragraphStyles: ParagraphStyleDef[];
  characterStyles: CharacterStyleDef[];
  objectStyles: ObjectStyleDef[];
}

const ALIGNMENT_MAP: Record<string, string> = {
  left: "LeftAlign",
  center: "CenterAlign",
  right: "RightAlign",
  justify: "LeftJustified",
};

export function buildParagraphStyle(
  name: string,
  options: Omit<ParagraphStyleDef, "name">,
): string {
  const selfId = `${PARAGRAPH_STYLE_PREFIX}${name}`;
  const justification = ALIGNMENT_MAP[options.alignment] ?? "LeftAlign";

  return [
    `<ParagraphStyle Self="${selfId}" Name="${name}"`,
    ` Justification="${justification}"`,
    ` Leading="${options.lineHeight}">`,
    `  <Properties>`,
    `    <AppliedFont type="string">${options.fontFamily}</AppliedFont>`,
    `  </Properties>`,
    `  <CharacterStyleRange PointSize="${options.fontSize}">`,
    `    <Properties>`,
    `      <AppliedFont type="string">${options.fontFamily}</AppliedFont>`,
    `    </Properties>`,
    `  </CharacterStyleRange>`,
    `</ParagraphStyle>`,
  ].join("\n");
}

export function buildCharacterStyle(
  name: string,
  options: Omit<CharacterStyleDef, "name">,
): string {
  const selfId = `${CHARACTER_STYLE_PREFIX}${name}`;

  return [
    `<CharacterStyle Self="${selfId}" Name="${name}"`,
    ` FontStyle="${options.fontStyle}">`,
    `</CharacterStyle>`,
  ].join("\n");
}

export function buildObjectStyle(
  name: string,
  options: Omit<ObjectStyleDef, "name">,
): string {
  const selfId = `${OBJECT_STYLE_PREFIX}${name}`;

  return [
    `<ObjectStyle Self="${selfId}" Name="${name}"`,
    ` FillColor="${options.fillColor}"`,
    ` StrokeColor="${options.strokeColor}"`,
    ` StrokeWeight="${options.strokeWeight}">`,
    `</ObjectStyle>`,
  ].join("\n");
}

export function buildStylesXml(input: StylesInput): string {
  const paragraphStylesXml = input.paragraphStyles
    .map((s) => buildParagraphStyle(s.name, s))
    .join("\n    ");

  const characterStylesXml = input.characterStyles
    .map((s) => buildCharacterStyle(s.name, s))
    .join("\n    ");

  const objectStylesXml = input.objectStyles
    .map((s) => buildObjectStyle(s.name, s))
    .join("\n    ");

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Styles xmlns:idPkg="${IDPKG_NAMESPACE}"`,
    `  DOMVersion="19.1">`,
    `  <RootParagraphStyleGroup Self="dParagraphStyleGroupn0">`,
    `    ${paragraphStylesXml}`,
    `  </RootParagraphStyleGroup>`,
    `  <RootCharacterStyleGroup Self="dCharacterStyleGroupn0">`,
    `    ${characterStylesXml}`,
    `  </RootCharacterStyleGroup>`,
    `  <RootObjectStyleGroup Self="dObjectStyleGroupn0">`,
    `    ${objectStylesXml}`,
    `  </RootObjectStyleGroup>`,
    `</idPkg:Styles>`,
  ].join("\n");
}
