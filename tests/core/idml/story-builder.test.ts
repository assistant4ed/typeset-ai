import { describe, it, expect } from "vitest";
import {
  buildStoryXml,
  contentBlockToStoryFragment,
} from "@typeset-ai/core/idml/story-builder.js";
import type { ContentBlock, Chapter } from "@typeset-ai/core/types.js";

describe("contentBlockToStoryFragment", () => {
  it("should convert a paragraph block to ParagraphStyleRange XML", () => {
    const block: ContentBlock = {
      type: "paragraph",
      content: "Hello world.",
      attributes: {},
    };

    const xml = contentBlockToStoryFragment(block);

    expect(xml).toContain('AppliedParagraphStyle="ParagraphStyle/Body"');
    expect(xml).toContain("<Content>Hello world.</Content>");
  });

  it("should convert a heading block to a Heading style", () => {
    const block: ContentBlock = {
      type: "heading",
      content: "Chapter Title",
      attributes: { level: "1" },
    };

    const xml = contentBlockToStoryFragment(block);

    expect(xml).toContain('AppliedParagraphStyle="ParagraphStyle/Heading1"');
    expect(xml).toContain("<Content>Chapter Title</Content>");
  });

  it("should convert a blockquote to BlockQuote style", () => {
    const block: ContentBlock = {
      type: "blockquote",
      content: "A wise saying.",
      attributes: {},
    };

    const xml = contentBlockToStoryFragment(block);

    expect(xml).toContain('AppliedParagraphStyle="ParagraphStyle/BlockQuote"');
    expect(xml).toContain("<Content>A wise saying.</Content>");
  });

  it("should escape XML special characters in content", () => {
    const block: ContentBlock = {
      type: "paragraph",
      content: 'She said "hello" & waved.',
      attributes: {},
    };

    const xml = contentBlockToStoryFragment(block);

    expect(xml).toContain("&amp;");
    expect(xml).toContain("&quot;");
  });
});

describe("buildStoryXml", () => {
  it("should wrap content in a Story element with a unique self ID", () => {
    const chapter: Chapter = {
      title: "Chapter One",
      number: 1,
      sections: [
        {
          heading: "Intro",
          level: 2,
          blocks: [
            { type: "paragraph", content: "Some text.", attributes: {} },
          ],
        },
      ],
    };

    const xml = buildStoryXml("story-1", chapter);

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('Self="story-1"');
    expect(xml).toContain("idPkg:Story");
    expect(xml).toContain("<Content>Chapter One</Content>");
    expect(xml).toContain("<Content>Intro</Content>");
    expect(xml).toContain("<Content>Some text.</Content>");
  });

  it("should include the chapter title as an h1 paragraph style", () => {
    const chapter: Chapter = {
      title: "Test Chapter",
      number: 1,
      sections: [],
    };

    const xml = buildStoryXml("story-2", chapter);

    expect(xml).toContain('AppliedParagraphStyle="ParagraphStyle/Heading1"');
    expect(xml).toContain("<Content>Test Chapter</Content>");
  });

  it("should include section headings as h2 paragraph style", () => {
    const chapter: Chapter = {
      title: "Ch",
      number: 1,
      sections: [
        {
          heading: "My Section",
          level: 2,
          blocks: [],
        },
      ],
    };

    const xml = buildStoryXml("story-3", chapter);

    expect(xml).toContain('AppliedParagraphStyle="ParagraphStyle/Heading2"');
    expect(xml).toContain("<Content>My Section</Content>");
  });
});
