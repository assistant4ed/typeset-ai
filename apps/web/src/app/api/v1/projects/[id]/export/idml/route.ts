import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { exportIdml } from "@typeset-ai/core";
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

  const idmlBuffer = await exportIdml(contentTree, css);

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
}
