import puppeteer from "puppeteer";

import type { RenderOptions } from "./types.js";

const PAGED_JS_READY_CHECK = `
  async () => {
    if (typeof window.PagedPolyfill !== 'undefined') {
      await window.PagedPolyfill.ready;
      return true;
    }
    return true;
  }
`;

export async function renderPdf(
  html: string,
  options: RenderOptions,
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    // Wait for Paged.js polyfill to finish paginating
    await page.waitForFunction(PAGED_JS_READY_CHECK, { timeout: 30000 });

    const isProof = options.format === "pdf-proof";

    if (isProof) {
      // Add watermark for proof PDFs
      await page.evaluate(() => {
        const watermark = document.createElement("div");
        watermark.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 72pt;
          color: rgba(200, 200, 200, 0.3);
          pointer-events: none;
          z-index: 9999;
          font-family: sans-serif;
          font-weight: bold;
        `;
        watermark.textContent = "PROOF";
        document.body.appendChild(watermark);
      });
    }

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
