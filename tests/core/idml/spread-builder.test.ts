import { describe, it, expect } from "vitest";
import {
  buildSpreadXml,
  buildTextFrame,
  buildImageFrame,
} from "@typeset-ai/core/idml/spread-builder.js";

describe("buildTextFrame", () => {
  it("should create a TextFrame element with coordinates", () => {
    const xml = buildTextFrame({
      selfId: "tf-1",
      storyRef: "story-1",
      x: 56.69,
      y: 56.69,
      width: 496.06,
      height: 728.5,
    });

    expect(xml).toContain('Self="tf-1"');
    expect(xml).toContain('ParentStory="story-1"');
    expect(xml).toContain("PathPointType");
    expect(xml).toContain("56.69");
  });

  it("should include content type attribute", () => {
    const xml = buildTextFrame({
      selfId: "tf-2",
      storyRef: "story-2",
      x: 0,
      y: 0,
      width: 100,
      height: 200,
    });

    expect(xml).toContain('ContentType="TextType"');
  });
});

describe("buildImageFrame", () => {
  it("should create a Rectangle element for an image", () => {
    const xml = buildImageFrame({
      selfId: "img-1",
      imagePath: "images/photo.jpg",
      x: 56.69,
      y: 400,
      width: 200,
      height: 150,
    });

    expect(xml).toContain('Self="img-1"');
    expect(xml).toContain('ContentType="GraphicType"');
    expect(xml).toContain("images/photo.jpg");
  });
});

describe("buildSpreadXml", () => {
  it("should produce a valid Spread XML document", () => {
    const xml = buildSpreadXml({
      spreadId: "spread-1",
      pageWidth: 595.28,
      pageHeight: 841.89,
      frames: [
        {
          type: "text",
          selfId: "tf-1",
          storyRef: "story-1",
          x: 56.69,
          y: 56.69,
          width: 481.89,
          height: 728.5,
        },
      ],
    });

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("idPkg:Spread");
    expect(xml).toContain('Self="spread-1"');
    expect(xml).toContain("Page");
    expect(xml).toContain("TextFrame");
  });

  it("should include both text and image frames", () => {
    const xml = buildSpreadXml({
      spreadId: "spread-2",
      pageWidth: 595.28,
      pageHeight: 841.89,
      frames: [
        {
          type: "text",
          selfId: "tf-1",
          storyRef: "story-1",
          x: 56.69,
          y: 56.69,
          width: 481.89,
          height: 400,
        },
        {
          type: "image",
          selfId: "img-1",
          imagePath: "cover.jpg",
          x: 56.69,
          y: 460,
          width: 481.89,
          height: 300,
        },
      ],
    });

    expect(xml).toContain("TextFrame");
    expect(xml).toContain("Rectangle");
    expect(xml).toContain("cover.jpg");
  });
});
