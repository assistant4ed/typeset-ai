import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { requireSession, handleAuthError } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteParams {
  params: { id: string };
}

const DEFAULT_PAGE_WIDTH_MM = 210;
const DEFAULT_PAGE_HEIGHT_MM = 297;
const MAX_PREVIEW_PAGES = 50;
const PX_PER_MM = 96 / 25.4;
const PAGED_JS_SETTLE_MS = 1000;
const PAGED_JS_CDN = "https://unpkg.com/pagedjs/dist/paged.polyfill.js";
const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600;700&family=Noto+Sans:wght@400;600;700&family=Source+Serif+4:wght@400;600;700&display=swap";

export async function POST(request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 },
    );
  }

  const db = createServerClient();
  const body = await request.json().catch(() => ({}));

  // Fetch content
  const { data: contentRow } = await db
    .from("project_content")
    .select("content_tree")
    .eq("project_id", params.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const content = (contentRow as Record<string, unknown>)?.content_tree as
    | Record<string, unknown>
    | undefined;

  if (!content?.raw) {
    return NextResponse.json({ data: { pages: [], pageCount: 0 } });
  }

  // Get CSS from request body (instant preview) or from DB
  let css = body.css as string | undefined;
  if (!css) {
    const { data: styleRow } = await db
      .from("project_styles")
      .select("css_content")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    css = ((styleRow as Record<string, unknown>)?.css_content as string) ?? "";
  }

  const pageWidth: number = body.pageWidth ?? DEFAULT_PAGE_WIDTH_MM;
  const pageHeight: number = body.pageHeight ?? DEFAULT_PAGE_HEIGHT_MM;
  const bleed: number = body.bleed ?? 0;

  const rawContent =
    typeof content.raw === "string"
      ? content.raw
      : JSON.stringify(content.raw);
  const bodyHtml = buildContentHtml(rawContent);
  const cleanCss = cleanCssForBrowser(css ?? "");

  const fullHtml = buildFullHtml({
    bodyHtml,
    cleanCss,
    pageWidth,
    pageHeight,
    bleed,
  });

  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: "new" as const,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    const page = await browser.newPage();

    const vpWidth = Math.round(pageWidth * PX_PER_MM);
    const vpHeight = Math.round(pageHeight * PX_PER_MM);
    await page.setViewport({ width: vpWidth, height: vpHeight });

    await page.setContent(fullHtml, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for Paged.js to finish pagination
    await page
      .waitForFunction(
        `(() => {
          var paged = window.PagedPolyfill;
          if (!paged) return true;
          return !(paged.ready instanceof Promise);
        })()`,
        { timeout: 20000 },
      )
      .catch(() => {
        // Paged.js might not load — continue with fallback
      });

    // Brief settle time for final rendering
    await new Promise((r) => setTimeout(r, PAGED_JS_SETTLE_MS));

    const pagedPageCount = await page.evaluate(() => {
      const pagedPages = document.querySelectorAll(".pagedjs_page");
      return pagedPages.length;
    });

    const pages: string[] = [];

    if (pagedPageCount > 1) {
      // Paged.js created pages — screenshot each one
      const count = Math.min(pagedPageCount, MAX_PREVIEW_PAGES);
      for (let i = 0; i < count; i++) {
        const clip = await page.evaluate((idx: number) => {
          const pageEl = document.querySelectorAll(".pagedjs_page")[idx];
          if (!pageEl) return null;
          const rect = pageEl.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        }, i);

        if (clip) {
          const screenshot = await page.screenshot({
            type: "png",
            clip: {
              x: clip.x,
              y: clip.y,
              width: clip.width,
              height: clip.height,
            },
          });
          pages.push(Buffer.from(screenshot).toString("base64"));
        }
      }
    } else {
      // No Paged.js pages — take full page and split into A4 pages
      const bodyHeight = await page.evaluate(
        () => document.body.scrollHeight,
      );
      const numPages = Math.max(1, Math.ceil(bodyHeight / vpHeight));
      const count = Math.min(numPages, MAX_PREVIEW_PAGES);

      for (let i = 0; i < count; i++) {
        const screenshot = await page.screenshot({
          type: "png",
          clip: {
            x: 0,
            y: i * vpHeight,
            width: vpWidth,
            height: vpHeight,
          },
        });
        pages.push(Buffer.from(screenshot).toString("base64"));
      }
    }

    await browser.close();

    return NextResponse.json({
      data: {
        pages,
        pageCount: pages.length,
        pageWidth,
        pageHeight,
      },
      requestId: crypto.randomUUID(),
    });
  } catch (err) {
    console.error("Render preview failed:", err);
    return NextResponse.json(
      {
        error: {
          code: "RENDER_FAILED",
          message:
            err instanceof Error
              ? err.message
              : "Preview rendering failed",
        },
      },
      { status: 500 },
    );
  }
}

interface FullHtmlOptions {
  bodyHtml: string;
  cleanCss: string;
  pageWidth: number;
  pageHeight: number;
  bleed: number;
}

function buildFullHtml({
  bodyHtml,
  cleanCss,
  pageWidth,
  pageHeight,
  bleed,
}: FullHtmlOptions): string {
  const bleedRule =
    bleed > 0 ? `bleed: ${bleed}mm; marks: crop cross;` : "";
  const cssToUse = cleanCss || defaultCss();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="${GOOGLE_FONTS_URL}" rel="stylesheet">
<style>
@page {
  size: ${pageWidth}mm ${pageHeight}mm;
  margin: 20mm 15mm 25mm 20mm;
  ${bleedRule}
}
body {
  margin: 0;
  padding: 0;
}
${cssToUse}
</style>
<script src="${PAGED_JS_CDN}"></script>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function defaultCss(): string {
  return `
body {
  font-family: "Noto Serif", Georgia, serif;
  font-size: 11pt;
  line-height: 1.7;
  color: #1a1a1a;
  padding: 0;
}
h1 {
  font-size: 22pt;
  text-align: center;
  margin: 30mm 0 15mm 0;
  font-weight: 700;
}
h2 { font-size: 16pt; margin: 12mm 0 6mm 0; }
h3 { font-size: 13pt; margin: 8mm 0 4mm 0; }
p { text-indent: 1.5em; margin: 0 0 0.3em 0; }
p:first-of-type { text-indent: 0; }
blockquote {
  margin: 6mm 10mm;
  font-style: italic;
  color: #555;
  border-left: 2pt solid #ccc;
  padding-left: 4mm;
}
.chapter { break-before: page; }
.chapter:first-child { break-before: auto; }
`;
}

function cleanCssForBrowser(css: string): string {
  return css
    .replace(/@import\s+["'][^"']+["']\s*;/g, "")
    .replace(/cmyk\(0%,\s*0%,\s*0%,\s*100%\)/g, "#000000")
    .replace(/cmyk\(60%,\s*40%,\s*40%,\s*100%\)/g, "#0a0a0a")
    .replace(/cmyk\(0%,\s*0%,\s*0%,\s*80%\)/g, "#333333")
    .replace(/cmyk\(0%,\s*0%,\s*0%,\s*50%\)/g, "#808080")
    .replace(/cmyk\(0%,\s*0%,\s*0%,\s*20%\)/g, "#cccccc")
    .replace(/cmyk\(0%,\s*0%,\s*0%,\s*10%\)/g, "#e6e6e6")
    .replace(/cmyk\(0%,\s*0%,\s*0%,\s*0%\)/g, "#ffffff")
    .replace(/cmyk\([^)]+\)/g, "#333333");
}

function buildContentHtml(raw: string): string {
  const blocks = raw.split(/\n{2,}/);
  const html: string[] = [];

  for (const block of blocks) {
    const t = block.trim();
    if (!t) continue;

    if (t.startsWith("### ")) {
      html.push(`<h3>${t.slice(4)}</h3>`);
      continue;
    }
    if (t.startsWith("## ")) {
      html.push(`<h2>${t.slice(3)}</h2>`);
      continue;
    }
    if (t.startsWith("# ")) {
      html.push(`<h1>${t.slice(2)}</h1>`);
      continue;
    }
    if (t.startsWith("> ")) {
      html.push(`<blockquote><p>${t.slice(2)}</p></blockquote>`);
      continue;
    }

    const lines = t.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      html.push(`<p>${line.trim()}</p>`);
    }
  }

  return html.join("\n");
}
