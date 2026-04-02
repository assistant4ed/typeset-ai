import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

interface RouteParams {
  params: { token: string };
}

export async function POST(request: Request, { params }: RouteParams) {
  const db = createServerClient();

  const { data: shareLinkRaw } = await db
    .from("share_links")
    .select("id, project_id, permissions, expires_at")
    .eq("token", params.token)
    .single();

  const shareLink = shareLinkRaw as any;

  if (!shareLink) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Share link not found" } },
      { status: 404 }
    );
  }

  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return NextResponse.json(
      { error: { code: "GONE", message: "This share link has expired" } },
      { status: 410 }
    );
  }

  let body: { approved_by: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.approved_by || typeof body.approved_by !== "string") {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "approved_by name is required" } },
      { status: 422 }
    );
  }

  // Update the project status to 'completed'
  await (db.from("projects") as any)
    .update({ status: "completed" })
    .eq("id", shareLink.project_id);

  await logActivity(shareLink.project_id, "anonymous", "project_updated", {
    approved_by: body.approved_by.trim(),
    via_share_token: params.token,
    action: "client_approval",
  });

  return NextResponse.json({
    data: { approved: true, project_id: shareLink.project_id },
    requestId: crypto.randomUUID(),
  });
}
