import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { requireSession, handleAuthError } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface RouteParams {
  params: { id: string };
}

const DEFAULT_PAGE_WIDTH_MM = 210;
const DEFAULT_PAGE_HEIGHT_MM = 297;

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
    return NextResponse.json({ data: { pages: [], pageCount: 0, html: "" } });
  }

  const rawContent =
    typeof content.raw === "string"
      ? content.raw
      : JSON.stringify(content.raw);
  const designMarkup = (body.designMarkup as string) ?? (body.css as string) ?? "";
  const pageWidth: number = body.pageWidth ?? DEFAULT_PAGE_WIDTH_MM;
  const pageHeight: number = body.pageHeight ?? DEFAULT_PAGE_HEIGHT_MM;
  const bleed: number = body.bleed ?? 0;

  try {
    const { contentToTypst, renderToHtml, renderToSvg } = await import("@typeset-ai/core");

    const typstCode = contentToTypst(rawContent, designMarkup, {
      pageWidth,
      pageHeight,
      bleed,
      margin: { top: 25, bottom: 30, left: 20, right: 15 },
    });

    const html = renderToHtml(typstCode);

    // Wrap HTML with web fonts for CJK/multilingual support
    const styledHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700&family=Noto+Sans+TC:wght@400;600;700&family=Noto+Serif:wght@400;600;700&family=Noto+Sans:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html { background: #e5e7eb; }
  body {
    margin: 0; padding: 0;
    font-family: "Noto Serif TC", "Noto Serif", "Noto Naskh Arabic", serif;
  }
  .typst-page, article, section {
    width: ${pageWidth}mm;
    min-height: ${pageHeight}mm;
    background: white;
    margin: 10px auto;
    padding: ${25}mm ${15}mm ${30}mm ${20}mm;
    box-shadow: 0 2px 12px rgba(0,0,0,0.12);
    overflow: hidden;
  }
</style>
</head>
<body>
${html}
</body>
</html>`;

    return NextResponse.json({
      data: {
        html: styledHtml,
        typstCode,
        pageWidth,
        pageHeight,
        mode: "html",
      },
      requestId: crypto.randomUUID(),
    });
  } catch (err) {
    console.error("Typst render failed:", err);
    return NextResponse.json(
      {
        error: {
          code: "RENDER_FAILED",
          message:
            err instanceof Error
              ? err.message
              : "Typst rendering failed",
        },
      },
      { status: 500 },
    );
  }
}
