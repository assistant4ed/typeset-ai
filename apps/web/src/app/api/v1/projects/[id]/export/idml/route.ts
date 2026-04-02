import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { buildHtml, exportIdml } from "@typeset-ai/core";
import { readFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
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

  const outputDir = join(tmpdir(), "typeset-exports");
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, `${params.id}-${Date.now()}.idml`);

  try {
    await exportIdml(html, {
      outputPath,
      preserveStyles: true,
      embedImages: true,
    });

    const idmlBuffer = await readFile(outputPath);

    await logActivity(params.id, authSession!.user.id, "export_generated", {
      format: "idml",
    });

    return new Response(idmlBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.adobe.indesign-idml-package",
        "Content-Disposition": `attachment; filename="${params.id}.idml"`,
        "Content-Length": String(idmlBuffer.byteLength),
      },
    });
  } finally {
    await unlink(outputPath).catch(() => undefined);
  }
}
