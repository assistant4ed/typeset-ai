import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { buildHtml, exportSvg } from "@typeset-ai/core";
import { readdir, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
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

  const outputDir = join(tmpdir(), `typeset-svg-${params.id}-${Date.now()}`);
  await mkdir(outputDir, { recursive: true });

  try {
    await exportSvg(html, {
      outputDir,
      embedImages: true,
      preserveText: true,
    });

    // Zip all SVG files
    const files = (await readdir(outputDir)).filter((f) => f.endsWith(".svg"));
    const zip = new JSZip();
    await Promise.all(
      files.map(async (filename) => {
        const data = await readFile(join(outputDir, filename));
        zip.file(filename, data);
      })
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    await logActivity(params.id, authSession!.user.id, "export_generated", {
      format: "svg",
      pageCount: files.length,
    });

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${params.id}-pages.zip"`,
        "Content-Length": String(zipBuffer.byteLength),
      },
    });
  } finally {
    await rm(outputDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
