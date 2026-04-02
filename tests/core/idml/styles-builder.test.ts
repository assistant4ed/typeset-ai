import { describe, it, expect } from "vitest";
import {
  buildParagraphStyle,
  buildCharacterStyle,
  buildObjectStyle,
  buildStylesXml,
} from "@typeset-ai/core/idml/styles-builder.js";

describe("buildParagraphStyle", () => {
  it("should create XML for a paragraph style with font and size", () => {
    const xml = buildParagraphStyle("Body", {
      fontFamily: "Minion Pro",
      fontSize: 11,
      lineHeight: 13.2,
      alignment: "left",
    });

    expect(xml).toContain('Self="ParagraphStyle/Body"');
    expect(xml).toContain('Name="Body"');
    expect(xml).toContain('PointSize="11"');
    expect(xml).toContain('Leading="13.2"');
    expect(xml).toContain('Justification="LeftAlign"');
  });

  it("should create a heading style with larger font size", () => {
    const xml = buildParagraphStyle("Heading1", {
      fontFamily: "Minion Pro",
      fontSize: 24,
      lineHeight: 28.8,
      alignment: "center",
    });

    expect(xml).toContain('Self="ParagraphStyle/Heading1"');
    expect(xml).toContain('PointSize="24"');
    expect(xml).toContain('Justification="CenterAlign"');
  });
});

describe("buildCharacterStyle", () => {
  it("should create XML for a character style", () => {
    const xml = buildCharacterStyle("Bold", {
      fontStyle: "Bold",
    });

    expect(xml).toContain('Self="CharacterStyle/Bold"');
    expect(xml).toContain('Name="Bold"');
    expect(xml).toContain('FontStyle="Bold"');
  });

  it("should create an italic character style", () => {
    const xml = buildCharacterStyle("Italic", {
      fontStyle: "Italic",
    });

    expect(xml).toContain('FontStyle="Italic"');
  });
});

describe("buildObjectStyle", () => {
  it("should create XML for an object style with dimensions", () => {
    const xml = buildObjectStyle("ImageFrame", {
      fillColor: "None",
      strokeColor: "None",
      strokeWeight: 0,
    });

    expect(xml).toContain('Self="ObjectStyle/ImageFrame"');
    expect(xml).toContain('Name="ImageFrame"');
  });
});

describe("buildStylesXml", () => {
  it("should produce a complete Styles.xml document", () => {
    const xml = buildStylesXml({
      paragraphStyles: [
        { name: "Body", fontFamily: "Minion Pro", fontSize: 11, lineHeight: 13.2, alignment: "left" },
        { name: "Heading1", fontFamily: "Minion Pro", fontSize: 24, lineHeight: 28.8, alignment: "center" },
      ],
      characterStyles: [
        { name: "Bold", fontStyle: "Bold" },
      ],
      objectStyles: [
        { name: "ImageFrame", fillColor: "None", strokeColor: "None", strokeWeight: 0 },
      ],
    });

    expect(xml).toContain("<?xml");
    expect(xml).toContain("idPkg:Styles");
    expect(xml).toContain("RootParagraphStyleGroup");
    expect(xml).toContain("RootCharacterStyleGroup");
    expect(xml).toContain("RootObjectStyleGroup");
    expect(xml).toContain('Self="ParagraphStyle/Body"');
    expect(xml).toContain('Self="ParagraphStyle/Heading1"');
    expect(xml).toContain('Self="CharacterStyle/Bold"');
    expect(xml).toContain('Self="ObjectStyle/ImageFrame"');
  });
});
