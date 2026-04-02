import puppeteer from "puppeteer";

export interface SvgExportConfig {
  embedImages: boolean;
  preserveText: boolean;
}

const PAGED_JS_READY_CHECK = `
  () => {
    return typeof window.PagedPolyfill !== 'undefined'
      ? window.PagedPolyfill.ready
      : true;
  }
`;

function extractSvgPages(): string[] {
  const pages = document.querySelectorAll(".pagedjs_page");
  const svgNS = "http://www.w3.org/2000/svg";
  const xlinkNS = "http://www.w3.org/1999/xlink";

  if (pages.length === 0) {
    // Fallback: if Paged.js didn't create paginated pages,
    // serialize the entire body as one SVG
    const body = document.body;
    const rect = body.getBoundingClientRect();
    const serializer = new XMLSerializer();

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute("xmlns:xlink", xlinkNS);
    svg.setAttribute("width", String(Math.ceil(rect.width)));
    svg.setAttribute("height", String(Math.ceil(rect.height)));
    svg.setAttribute(
      "viewBox",
      `0 0 ${Math.ceil(rect.width)} ${Math.ceil(rect.height)}`,
    );

    const foreignObject = document.createElementNS(svgNS, "foreignObject");
    foreignObject.setAttribute("width", "100%");
    foreignObject.setAttribute("height", "100%");
    foreignObject.innerHTML = body.outerHTML;
    svg.appendChild(foreignObject);

    return [serializer.serializeToString(svg)];
  }

  return Array.from(pages).map((page) => {
    const rect = page.getBoundingClientRect();
    const serializer = new XMLSerializer();

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute("xmlns:xlink", xlinkNS);
    svg.setAttribute("width", String(Math.ceil(rect.width)));
    svg.setAttribute("height", String(Math.ceil(rect.height)));
    svg.setAttribute(
      "viewBox",
      `0 0 ${Math.ceil(rect.width)} ${Math.ceil(rect.height)}`,
    );

    const foreignObject = document.createElementNS(svgNS, "foreignObject");
    foreignObject.setAttribute("width", "100%");
    foreignObject.setAttribute("height", "100%");
    foreignObject.innerHTML = page.outerHTML;
    svg.appendChild(foreignObject);

    return serializer.serializeToString(svg);
  });
}

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

    const svgPages: string[] = await page.evaluate(extractSvgPages);

    return svgPages;
  } finally {
    await browser.close();
  }
}
