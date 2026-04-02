import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseMarkdown } from "@typeset-ai/core/content-parser.js";

const FIXTURE_DIR = resolve(__dirname, "../fixtures");

function loadFixture(filename: string): string {
  return readFileSync(resolve(FIXTURE_DIR, filename), "utf-8");
}

describe("parseMarkdown", () => {
  it("parses a full markdown manuscript into a ContentTree", () => {
    const markdown = loadFixture("sample-manuscript.md");
    const tree = parseMarkdown(markdown);

    expect(tree).toHaveProperty("metadata");
    expect(tree).toHaveProperty("chapters");
    expect(tree).toHaveProperty("assets");
    expect(tree).toHaveProperty("frontMatter");
    expect(tree).toHaveProperty("backMatter");
    expect(tree.metadata.source).toBe("markdown");
  });

  it("extracts chapters from h1 headings", () => {
    const markdown = loadFixture("sample-manuscript.md");
    const tree = parseMarkdown(markdown);

    expect(tree.chapters).toHaveLength(2);
    expect(tree.chapters[0].title).toBe("Chapter 1: The Beginning");
    expect(tree.chapters[0].number).toBe(1);
    expect(tree.chapters[1].title).toBe("Chapter 2: The Journey");
    expect(tree.chapters[1].number).toBe(2);
  });

  it("extracts sections from h2 headings within chapters", () => {
    const markdown = loadFixture("sample-manuscript.md");
    const tree = parseMarkdown(markdown);

    const chapter1 = tree.chapters[0];
    expect(chapter1.sections).toHaveLength(2);
    expect(chapter1.sections[0].heading).toBe("The Morning");
    expect(chapter1.sections[0].level).toBe(2);
    expect(chapter1.sections[1].heading).toBe("The Discovery");

    const chapter2 = tree.chapters[1];
    expect(chapter2.sections).toHaveLength(1);
    expect(chapter2.sections[0].heading).toBe("Setting Out");
  });

  it("parses paragraphs as ContentBlocks", () => {
    const markdown = loadFixture("sample-manuscript.md");
    const tree = parseMarkdown(markdown);

    const morningSection = tree.chapters[0].sections[0];
    const paragraphs = morningSection.blocks.filter((b) => b.type === "paragraph");

    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].content).toContain("bright cold day in April");
    expect(paragraphs[1].content).toContain("Winston Smith");
  });

  it("parses blockquotes", () => {
    const markdown = loadFixture("sample-manuscript.md");
    const tree = parseMarkdown(markdown);

    const discoverySection = tree.chapters[0].sections[1];
    const blockquotes = discoverySection.blocks.filter((b) => b.type === "blockquote");

    expect(blockquotes).toHaveLength(1);
    expect(blockquotes[0].content).toContain("Every book is a journey");
  });

  it("parses images and registers them as assets", () => {
    const markdown = loadFixture("sample-manuscript.md");
    const tree = parseMarkdown(markdown);

    expect(tree.assets).toHaveLength(1);
    expect(tree.assets[0].originalName).toBe("mountain.jpg");
    expect(tree.assets[0].localPath).toBe("images/mountain.jpg");
    expect(tree.assets[0].mimeType).toBe("image/jpeg");

    const settingOutSection = tree.chapters[1].sections[0];
    const imageBlocks = settingOutSection.blocks.filter((b) => b.type === "image");
    expect(imageBlocks).toHaveLength(1);
    expect(imageBlocks[0].attributes["alt"]).toBe("Mountain landscape");
    expect(imageBlocks[0].attributes["assetId"]).toBe("asset-0");
  });

  it("parses lists", () => {
    const markdown = loadFixture("sample-manuscript.md");
    const tree = parseMarkdown(markdown);

    const discoverySection = tree.chapters[0].sections[1];
    const listBlocks = discoverySection.blocks.filter((b) => b.type === "list");

    expect(listBlocks).toHaveLength(1);
    expect(listBlocks[0].content).toContain("<ul>");
    expect(listBlocks[0].content).toContain("<li>Item one of a list</li>");
    expect(listBlocks[0].content).toContain("<li>Item two of a list</li>");
    expect(listBlocks[0].content).toContain("<li>Item three of a list</li>");
    expect(listBlocks[0].attributes["ordered"]).toBe("false");
  });

  it("parses tables", () => {
    const markdown = loadFixture("sample-manuscript.md");
    const tree = parseMarkdown(markdown);

    const settingOutSection = tree.chapters[1].sections[0];
    const tableBlocks = settingOutSection.blocks.filter((b) => b.type === "table");

    expect(tableBlocks).toHaveLength(1);
    expect(tableBlocks[0].content).toContain("<table>");
    expect(tableBlocks[0].content).toContain("<th>Destination</th>");
    expect(tableBlocks[0].content).toContain("<td>Village</td>");
    expect(tableBlocks[0].content).toContain("<td>10km</td>");
  });

  it("extracts front matter metadata", () => {
    const markdown = loadFixture("sample-manuscript.md");
    const tree = parseMarkdown(markdown);

    expect(tree.metadata.title).toBe("The Great Adventure");
    expect(tree.metadata.author).toBe("Jane Smith");
    expect(tree.metadata.source).toBe("markdown");
  });

  it("handles markdown with no front matter", () => {
    const markdown = `# Chapter 1: Just a Chapter\n\n## A Section\n\nSome paragraph content here.\n`;
    const tree = parseMarkdown(markdown);

    expect(tree.metadata.title).toBe("");
    expect(tree.metadata.author).toBe("");
    expect(tree.chapters).toHaveLength(1);
    expect(tree.chapters[0].title).toBe("Chapter 1: Just a Chapter");
    expect(tree.chapters[0].sections[0].blocks[0].type).toBe("paragraph");
    expect(tree.chapters[0].sections[0].blocks[0].content).toBe("Some paragraph content here.");
  });
});
