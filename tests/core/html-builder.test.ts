import { describe, it, expect } from "vitest";
import { buildHtml } from "@typeset-ai/core/html-builder.js";
import type { ContentTree } from "@typeset-ai/core/types.js";

const MINIMAL_TREE: ContentTree = {
  metadata: {
    title: "Test Book",
    author: "Test Author",
    source: "markdown",
    pageCount: 1,
  },
  frontMatter: [],
  backMatter: [],
  assets: [],
  chapters: [
    {
      title: "Chapter One",
      number: 1,
      sections: [
        {
          heading: "First Section",
          level: 2,
          blocks: [
            {
              type: "paragraph",
              content: "Hello world paragraph.",
              attributes: {},
            },
          ],
        },
      ],
    },
  ],
};

const IMAGE_TREE: ContentTree = {
  ...MINIMAL_TREE,
  chapters: [
    {
      title: "Image Chapter",
      number: 1,
      sections: [
        {
          heading: "Image Section",
          level: 2,
          blocks: [
            {
              type: "image",
              content: "",
              attributes: { src: "images/photo.jpg", alt: "A scenic photo" },
            },
          ],
        },
      ],
    },
  ],
};

const TABLE_TREE: ContentTree = {
  ...MINIMAL_TREE,
  chapters: [
    {
      title: "Table Chapter",
      number: 1,
      sections: [
        {
          heading: "Table Section",
          level: 2,
          blocks: [
            {
              type: "table",
              content: "<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Alice</td></tr></tbody></table>",
              attributes: {},
            },
          ],
        },
      ],
    },
  ],
};

const BLOCKQUOTE_TREE: ContentTree = {
  ...MINIMAL_TREE,
  chapters: [
    {
      title: "Quote Chapter",
      number: 1,
      sections: [
        {
          heading: "Quote Section",
          level: 2,
          blocks: [
            {
              type: "blockquote",
              content: "Every book is a journey.",
              attributes: {},
            },
          ],
        },
      ],
    },
  ],
};

describe("buildHtml", () => {
  it("should produce a complete HTML document", () => {
    const html = buildHtml(MINIMAL_TREE, "");

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("should include the CSS in a style tag", () => {
    const css = "body { font-family: serif; }";
    const html = buildHtml(MINIMAL_TREE, css);

    expect(html).toContain(`<style>${css}</style>`);
  });

  it("should render chapter titles as h1", () => {
    const html = buildHtml(MINIMAL_TREE, "");

    expect(html).toContain("<h1>Chapter One</h1>");
  });

  it("should render section headings as h2", () => {
    const html = buildHtml(MINIMAL_TREE, "");

    expect(html).toContain("<h2>First Section</h2>");
  });

  it("should render paragraphs", () => {
    const html = buildHtml(MINIMAL_TREE, "");

    expect(html).toContain("<p>Hello world paragraph.</p>");
  });

  it("should render images with src and alt", () => {
    const html = buildHtml(IMAGE_TREE, "");

    expect(html).toContain('src="images/photo.jpg"');
    expect(html).toContain('alt="A scenic photo"');
    expect(html).toContain("<figure>");
    expect(html).toContain("<img");
  });

  it("should render tables as raw HTML", () => {
    const html = buildHtml(TABLE_TREE, "");

    expect(html).toContain("<table>");
    expect(html).toContain("<th>Name</th>");
    expect(html).toContain("<td>Alice</td>");
  });

  it("should render blockquotes", () => {
    const html = buildHtml(BLOCKQUOTE_TREE, "");

    expect(html).toContain("<blockquote>");
    expect(html).toContain("Every book is a journey.");
  });

  it("should include the Paged.js polyfill script", () => {
    const html = buildHtml(MINIMAL_TREE, "");

    expect(html).toContain("pagedjs");
    expect(html).toContain("<script");
  });

  it("should wrap each chapter in a section with class chapter", () => {
    const html = buildHtml(MINIMAL_TREE, "");

    expect(html).toContain('class="chapter"');
    expect(html).toContain('data-chapter="1"');
  });
});
