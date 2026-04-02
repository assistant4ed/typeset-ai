import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseMarkdown,
  buildHtml,
  runPreflight,
} from "@typeset-ai/core";

const FIXTURES_DIR = resolve(import.meta.dirname, "../fixtures");

describe("Full pipeline integration", () => {
  it("should parse markdown → build HTML → pass preflight", () => {
    const markdown = readFileSync(
      resolve(FIXTURES_DIR, "sample-manuscript.md"),
      "utf-8",
    );

    // Step 1: Parse markdown into ContentTree
    const contentTree = parseMarkdown(markdown);
    expect(contentTree.chapters.length).toBeGreaterThan(0);
    expect(contentTree.metadata.title).toBe("The Great Adventure");

    // Step 2: Build HTML with a basic CSS template
    const css = `
      @page { size: 129mm 198mm; margin: 20mm; bleed: 3mm; marks: crop; }
      body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.6; }
      .chapter h1 { font-size: 24pt; text-align: center; }
    `;
    const html = buildHtml(contentTree, css);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("The Great Adventure");
    expect(html).toContain("Chapter 1: The Beginning");
    expect(html).toContain("Chapter 2: The Journey");
    expect(html).toContain("<style>");

    // Step 3: Run preflight
    const preflight = runPreflight(contentTree, css);
    expect(preflight.isValid).toBe(true);
  });

  it("should handle content with no chapters gracefully", () => {
    const markdown = "Just a paragraph with no headings.";
    const contentTree = parseMarkdown(markdown);

    expect(contentTree.chapters).toHaveLength(0);
    expect(contentTree.metadata.title).toBe("");

    const html = buildHtml(contentTree, "body { font-size: 12pt; }");
    expect(html).toContain("<!DOCTYPE html>");
  });
});
