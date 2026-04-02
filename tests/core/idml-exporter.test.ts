import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { exportIdml } from "@typeset-ai/core/idml-exporter.js";
import type { ContentTree, IdmlExportOptions } from "@typeset-ai/core/types.js";

const SAMPLE_TREE: ContentTree = {
  metadata: {
    title: "Test Book",
    author: "Test Author",
    source: "markdown",
    pageCount: 0,
  },
  frontMatter: [],
  chapters: [
    {
      title: "Chapter One",
      number: 1,
      sections: [
        {
          heading: "First Section",
          level: 2,
          blocks: [
            { type: "paragraph", content: "Hello world.", attributes: {} },
            { type: "paragraph", content: "Second paragraph.", attributes: {} },
          ],
        },
      ],
    },
    {
      title: "Chapter Two",
      number: 2,
      sections: [
        {
          heading: "Images",
          level: 2,
          blocks: [
            {
              type: "image",
              content: "images/photo.jpg",
              attributes: { alt: "A photo", assetId: "asset-0" },
            },
          ],
        },
      ],
    },
  ],
  backMatter: [],
  assets: [
    {
      id: "asset-0",
      originalName: "photo.jpg",
      localPath: "images/photo.jpg",
      mimeType: "image/jpeg",
      width: 800,
      height: 600,
      dpi: 300,
    },
  ],
};

const SAMPLE_CSS = `
@page { size: 210mm 297mm; margin: 20mm; }
body { font-family: "Minion Pro", serif; font-size: 11pt; line-height: 1.2; }
.chapter h1 { font-size: 24pt; text-align: center; }
h2 { font-size: 18pt; }
`;

describe("exportIdml", () => {
  it("should return a Buffer containing a valid ZIP", async () => {
    const buffer = await exportIdml(SAMPLE_TREE, SAMPLE_CSS);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    const zip = await JSZip.loadAsync(buffer);
    expect(zip).toBeDefined();
  });

  it("should include mimetype file as first entry", async () => {
    const buffer = await exportIdml(SAMPLE_TREE, SAMPLE_CSS);
    const zip = await JSZip.loadAsync(buffer);

    const mimetype = zip.file("mimetype");
    expect(mimetype).not.toBeNull();

    const content = await mimetype!.async("text");
    expect(content).toBe("application/vnd.adobe.indesign-idml-package");
  });

  it("should include designmap.xml", async () => {
    const buffer = await exportIdml(SAMPLE_TREE, SAMPLE_CSS);
    const zip = await JSZip.loadAsync(buffer);

    const designmap = zip.file("designmap.xml");
    expect(designmap).not.toBeNull();

    const content = await designmap!.async("text");
    expect(content).toContain("Document");
    expect(content).toContain("idPkg:Spread");
    expect(content).toContain("idPkg:Story");
  });

  it("should include story XML files for each chapter", async () => {
    const buffer = await exportIdml(SAMPLE_TREE, SAMPLE_CSS);
    const zip = await JSZip.loadAsync(buffer);

    const storyFiles = Object.keys(zip.files).filter((f) =>
      f.startsWith("Stories/"),
    );
    expect(storyFiles.length).toBe(2);

    const story1 = zip.file(storyFiles[0]);
    const content = await story1!.async("text");
    expect(content).toContain("Chapter One");
  });

  it("should include spread XML files", async () => {
    const buffer = await exportIdml(SAMPLE_TREE, SAMPLE_CSS);
    const zip = await JSZip.loadAsync(buffer);

    const spreadFiles = Object.keys(zip.files).filter((f) =>
      f.startsWith("Spreads/"),
    );
    expect(spreadFiles.length).toBeGreaterThan(0);

    const spread1 = zip.file(spreadFiles[0]);
    const content = await spread1!.async("text");
    expect(content).toContain("idPkg:Spread");
  });

  it("should include Resources/Styles.xml with paragraph styles", async () => {
    const buffer = await exportIdml(SAMPLE_TREE, SAMPLE_CSS);
    const zip = await JSZip.loadAsync(buffer);

    const styles = zip.file("Resources/Styles.xml");
    expect(styles).not.toBeNull();

    const content = await styles!.async("text");
    expect(content).toContain("ParagraphStyle/Body");
    expect(content).toContain("ParagraphStyle/Heading1");
    expect(content).toContain("ParagraphStyle/Heading2");
  });

  it("should include Resources/Graphic.xml", async () => {
    const buffer = await exportIdml(SAMPLE_TREE, SAMPLE_CSS);
    const zip = await JSZip.loadAsync(buffer);

    const graphic = zip.file("Resources/Graphic.xml");
    expect(graphic).not.toBeNull();
  });
});
