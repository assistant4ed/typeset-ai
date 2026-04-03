import puppeteer from "puppeteer";

export interface SvgExportConfig {
  embedImages: boolean;
  preserveText: boolean;
}

const PAGED_JS_READY_CHECK = `
  async () => {
    if (typeof window.PagedPolyfill !== 'undefined') {
      await window.PagedPolyfill.ready;
      return true;
    }
    return true;
  }
`;

export async function exportSvg(
  html: string,
  config: SvgExportConfig,
): Promise<string[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.waitForFunction(PAGED_JS_READY_CHECK, { timeout: 30000 });

    const svgPages: string[] = await page.evaluate(() => {
      const pages = document.querySelectorAll(".pagedjs_page");
      if (pages.length === 0) {
        const serializer = new XMLSerializer();
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "210mm");
        svg.setAttribute("height", "297mm");
        const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        fo.setAttribute("width", "100%");
        fo.setAttribute("height", "100%");
        fo.appendChild(document.body.cloneNode(true));
        svg.appendChild(fo);
        return [serializer.serializeToString(svg)];
      }

      const serializer = new XMLSerializer();
      return Array.from(pages).map((page) => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "210mm");
        svg.setAttribute("height", "297mm");
        const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        fo.setAttribute("width", "100%");
        fo.setAttribute("height", "100%");
        fo.appendChild(page.cloneNode(true));
        svg.appendChild(fo);
        return serializer.serializeToString(svg);
      });
    });

    return svgPages;
  } finally {
    await browser.close();
  }
}
