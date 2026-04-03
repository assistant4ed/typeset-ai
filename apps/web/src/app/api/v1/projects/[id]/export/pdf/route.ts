import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { buildHtml, renderPdf } from "@typeset-ai/core";
import type { ContentTree } from "@typeset-ai/core";

interface RouteParams {
  params: { id: string };
}

export async function POST(request: Request, { params }: RouteParams) {
  let authSession;
  try {
    authSession = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const isProof = searchParams.get("proof") === "true";

  const db = createServerClient();

  const [{ data: stylesRaw }, { data: contentRaw }] = await Promise.all([
    db
      .from("project_styles")
      .select("css_content")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("project_content")
      .select("content_tree")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const styles = stylesRaw as any;
  const content = contentRaw as any;

  if (!content) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "No content found for this project" } },
      { status: 404 }
    );
  }

  const rawTree = (content as any).content_tree ?? {};
  const contentTree = {
    metadata: rawTree.metadata ?? { title: "Untitled", author: "", source: "manual", pageCount: 0 },
    frontMatter: rawTree.frontMatter ?? [],
    chapters: rawTree.chapters ?? [],
    backMatter: rawTree.backMatter ?? [],
    assets: rawTree.assets ?? [],
    raw: rawTree.raw ?? "",
  } as ContentTree;
  const css = styles?.css_content ?? "";
  const html = buildHtml(contentTree, css);

  const pdfBuffer = await renderPdf(html, {
    format: isProof ? "pdf-proof" : "pdf",
    outputPath: "",
    colorProfile: isProof ? "rgb" : "cmyk",
    includeBleed: !isProof,
    includeCropMarks: !isProof,
  });

  await logActivity(params.id, authSession!.user.id, "export_generated", {
    format: isProof ? "pdf-proof" : "pdf",
  });

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${params.id}-${isProof ? "proof" : "print"}.pdf"`,
      "Content-Length": String(pdfBuffer.byteLength),
    },
  });
}
