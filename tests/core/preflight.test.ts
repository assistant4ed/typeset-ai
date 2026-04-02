import { describe, expect, it } from "vitest";

import { runPreflight } from "@typeset-ai/core/preflight.js";

import type { Asset, ContentTree } from "@typeset-ai/core";

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "asset-1",
    originalName: "image.png",
    localPath: "/tmp/image.png",
    mimeType: "image/png",
    width: 1000,
    height: 1000,
    dpi: 300,
    ...overrides,
  };
}

function makeTree(overrides: Partial<ContentTree> = {}): ContentTree {
  return {
    metadata: {
      title: "Test",
      author: "Author",
      source: "markdown",
      pageCount: 0,
    },
    frontMatter: [],
    chapters: [],
    backMatter: [],
    assets: [],
    ...overrides,
  };
}

describe("runPreflight", () => {
  it("should pass with no assets and valid CSS", () => {
    const css = "@page { size: A4; margin: 10mm; bleed: 3mm; }";
    const result = runPreflight(makeTree(), css);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should warn about low DPI images (150 DPI)", () => {
    const asset = makeAsset({ dpi: 150, originalName: "photo.jpg" });
    const css = "@page { size: A4; bleed: 3mm; }";
    const result = runPreflight(makeTree({ assets: [asset] }), css);

    const lowDpiWarning = result.warnings.find((w) => w.code === "LOW_DPI");
    expect(lowDpiWarning).toBeDefined();
    expect(lowDpiWarning?.severity).toBe("warning");
    expect(result.isValid).toBe(true);
  });

  it("should error on images below 72 DPI (50 DPI)", () => {
    const asset = makeAsset({ dpi: 50, originalName: "tiny.jpg" });
    const css = "@page { size: A4; bleed: 3mm; }";
    const result = runPreflight(makeTree({ assets: [asset] }), css);

    const veryLowDpiError = result.errors.find(
      (e) => e.code === "VERY_LOW_DPI",
    );
    expect(veryLowDpiError).toBeDefined();
    expect(veryLowDpiError?.severity).toBe("error");
    expect(result.isValid).toBe(false);
  });

  it("should warn when CSS has no @page rule", () => {
    const css = "body { font-size: 12pt; }";
    const result = runPreflight(makeTree(), css);

    const noPageWarning = result.warnings.find((w) => w.code === "NO_PAGE_RULE");
    expect(noPageWarning).toBeDefined();
    expect(noPageWarning?.severity).toBe("warning");
  });

  it("should warn when CSS uses px units", () => {
    const css = "@page { size: A4; bleed: 3mm; } body { font-size: 16px; }";
    const result = runPreflight(makeTree(), css);

    const pxWarning = result.warnings.find((w) => w.code === "PX_UNITS");
    expect(pxWarning).toBeDefined();
    expect(pxWarning?.severity).toBe("warning");
  });

  it("should warn about missing bleed in @page rule", () => {
    const css = "@page { size: A4; margin: 10mm; }";
    const result = runPreflight(makeTree(), css);

    const noBleedWarning = result.warnings.find((w) => w.code === "NO_BLEED");
    expect(noBleedWarning).toBeDefined();
    expect(noBleedWarning?.severity).toBe("warning");
  });

  it("should pass when all checks are satisfied (300 DPI, @page with bleed)", () => {
    const asset = makeAsset({ dpi: 300, originalName: "hires.png" });
    const css = "@page { size: A4; margin: 10mm; bleed: 3mm; marks: crop; }";
    const result = runPreflight(makeTree({ assets: [asset] }), css);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});
