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

    const svg = renderToSvg(typstCode);
    const html = renderToHtml(typstCode);

    // Split SVG into individual pages
    const pageRegex = /<g[^>]*class="typst-page"[^>]*>[\s\S]*?<\/g>/g;
    const svgPages = svg.match(pageRegex) ?? [];

    const svgHeader =
      svg.match(/<svg[^>]*>/)?.[0] ?? '<svg xmlns="http://www.w3.org/2000/svg">';

    const pages =
      svgPages.length > 0
        ? svgPages.map((pageContent) => `${svgHeader}${pageContent}</svg>`)
        : [svg];

    return NextResponse.json({
      data: {
        pages,
        pageCount: pages.length,
        html,
        typstCode,
        pageWidth,
        pageHeight,
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
