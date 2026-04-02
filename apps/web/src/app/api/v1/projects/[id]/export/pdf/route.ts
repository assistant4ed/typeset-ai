import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { buildHtml, renderPdf } from "@typeset-ai/core";
import { readFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
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

  const [{ data: styles }, { data: content }] = await Promise.all([
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

  if (!content) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "No content found for this project" } },
      { status: 404 }
    );
  }

  const contentTree = content.content_tree as ContentTree;
  const css = styles?.css_content ?? "";
  const html = buildHtml(contentTree, css);

  const outputDir = join(tmpdir(), "typeset-exports");
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, `${params.id}-${Date.now()}.pdf`);

  try {
    await renderPdf(html, {
      format: isProof ? "pdf-proof" : "pdf",
      outputPath,
      colorProfile: isProof ? "rgb" : "cmyk",
      includeBleed: !isProof,
      includeCropMarks: !isProof,
    });

    const pdfBuffer = await readFile(outputPath);

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
  } finally {
    await unlink(outputPath).catch(() => undefined);
  }
}
