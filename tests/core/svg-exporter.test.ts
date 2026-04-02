import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("puppeteer", () => ({
  default: {
    launch: vi.fn(),
  },
}));

import puppeteer from "puppeteer";
import { exportSvg } from "@typeset-ai/core/svg-exporter.js";

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head><style>@page { size: 210mm 297mm; }</style></head>
<body>
<section class="chapter" data-chapter="1">
<h1>Chapter One</h1>
<section class="section"><h2>Intro</h2><p>Hello world.</p></section>
</section>
<section class="chapter" data-chapter="2">
<h1>Chapter Two</h1>
<section class="section"><h2>More</h2><p>Goodbye world.</p></section>
</section>
</body>
</html>`;

const mockPage = {
  setContent: vi.fn(),
  waitForFunction: vi.fn(),
  evaluate: vi.fn(),
  $$eval: vi.fn(),
  $eval: vi.fn(),
  setViewport: vi.fn(),
};

const mockBrowser = {
  newPage: vi.fn(),
  close: vi.fn(),
};

describe("exportSvg", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPage.setContent.mockResolvedValue(undefined);
    mockPage.waitForFunction.mockResolvedValue(undefined);
    mockPage.setViewport.mockResolvedValue(undefined);

    mockPage.evaluate.mockImplementation(async (fn: Function) => {
      if (typeof fn === "function") {
        return [
          '<svg xmlns="http://www.w3.org/2000/svg" width="595" height="842"><text x="10" y="30">Chapter One</text></svg>',
          '<svg xmlns="http://www.w3.org/2000/svg" width="595" height="842"><text x="10" y="30">Chapter Two</text></svg>',
        ];
      }
      return [];
    });

    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockBrowser.close.mockResolvedValue(undefined);

    vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as never);
  });

  it("should return an array of SVG strings", async () => {
    const result = await exportSvg(SAMPLE_HTML, { embedImages: true, preserveText: true });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return valid SVG content for each page", async () => {
    const result = await exportSvg(SAMPLE_HTML, { embedImages: true, preserveText: true });

    for (const svg of result) {
      expect(svg).toContain("<svg");
      expect(svg).toContain("xmlns");
    }
  });

  it("should launch and close the browser", async () => {
    await exportSvg(SAMPLE_HTML, { embedImages: true, preserveText: true });

    expect(puppeteer.launch).toHaveBeenCalledWith(
      expect.objectContaining({ headless: true }),
    );
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("should set the HTML content and wait for Paged.js", async () => {
    await exportSvg(SAMPLE_HTML, { embedImages: true, preserveText: true });

    expect(mockPage.setContent).toHaveBeenCalledWith(SAMPLE_HTML, {
      waitUntil: "networkidle0",
    });
    expect(mockPage.waitForFunction).toHaveBeenCalled();
  });

  it("should close browser even if an error occurs", async () => {
    mockPage.evaluate.mockRejectedValue(new Error("render failed"));

    await expect(
      exportSvg(SAMPLE_HTML, { embedImages: true, preserveText: true }),
    ).rejects.toThrow("render failed");

    expect(mockBrowser.close).toHaveBeenCalled();
  });
});
