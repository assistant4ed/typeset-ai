import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { buildHtml, exportSvg } from "@typeset-ai/core";
import JSZip from "jszip";
import type { ContentTree } from "@typeset-ai/core";

interface RouteParams {
  params: { id: string };
}

export async function POST(_request: Request, { params }: RouteParams) {
  let authSession;
  try {
    authSession = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

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

  const contentTree = content.content_tree as ContentTree;
  const css = styles?.css_content ?? "";
  const html = buildHtml(contentTree, css);

  const svgPages = await exportSvg(html, {
    embedImages: true,
    preserveText: true,
  });

  const zip = new JSZip();
  svgPages.forEach((svgContent, index) => {
    const filename = `page-${String(index + 1).padStart(3, "0")}.svg`;
    zip.file(filename, svgContent);
  });

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  await logActivity(params.id, authSession!.user.id, "export_generated", {
    format: "svg",
    pageCount: svgPages.length,
  });

  return new Response(zipBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${params.id}-pages.zip"`,
      "Content-Length": String(zipBuffer.byteLength),
    },
  });
}
