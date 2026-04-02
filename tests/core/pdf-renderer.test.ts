import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("puppeteer", () => ({
  default: {
    launch: vi.fn(),
  },
}));

import puppeteer from "puppeteer";
import { renderPdf } from "@typeset-ai/core/pdf-renderer.js";
import type { RenderOptions } from "@typeset-ai/core";

const mockPage = {
  setContent: vi.fn(),
  waitForFunction: vi.fn(),
  pdf: vi.fn(),
  evaluate: vi.fn(),
};

const mockBrowser = {
  newPage: vi.fn(),
  close: vi.fn(),
};

const BASE_OPTIONS: RenderOptions = {
  format: "pdf",
  outputPath: "/tmp/output.pdf",
  colorProfile: "cmyk",
  includeBleed: false,
  includeCropMarks: false,
};

describe("renderPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPage.setContent.mockResolvedValue(undefined);
    mockPage.waitForFunction.mockResolvedValue(undefined);
    mockPage.pdf.mockResolvedValue(Buffer.from("fake-pdf"));
    mockPage.evaluate.mockResolvedValue(undefined);

    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockBrowser.close.mockResolvedValue(undefined);

    vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as never);
  });

  it("should return a PDF buffer", async () => {
    const html = "<html><body><p>Hello</p></body></html>";
    const result = await renderPdf(html, BASE_OPTIONS);

    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("should set HTML content on the page", async () => {
    const html = "<html><body><p>Hello</p></body></html>";
    await renderPdf(html, BASE_OPTIONS);

    expect(mockPage.setContent).toHaveBeenCalledWith(html, {
      waitUntil: "networkidle0",
    });
  });

  it("should wait for Paged.js to finish rendering", async () => {
    const html = "<html><body><p>Hello</p></body></html>";
    await renderPdf(html, BASE_OPTIONS);

    expect(mockPage.waitForFunction).toHaveBeenCalled();
  });

  it("should close the browser after rendering", async () => {
    const html = "<html><body><p>Hello</p></body></html>";
    await renderPdf(html, BASE_OPTIONS);

    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("should generate proof PDF with different settings", async () => {
    const html = "<html><body><p>Hello</p></body></html>";
    const proofOptions: RenderOptions = { ...BASE_OPTIONS, format: "pdf-proof" };
    await renderPdf(html, proofOptions);

    expect(mockPage.pdf).toHaveBeenCalled();
  });
});
