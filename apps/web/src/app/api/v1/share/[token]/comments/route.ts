import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

interface RouteParams {
  params: { token: string };
}

const MAX_COMMENT_LENGTH = 2000;
const MAX_AUTHOR_LENGTH = 100;

export async function GET(_request: Request, { params }: RouteParams) {
  const db = createServerClient();

  const { data: shareLink } = await db
    .from("share_links")
    .select("id, project_id, permissions, expires_at")
    .eq("token", params.token)
    .single();

  if (!shareLink) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Share link not found or expired" } },
      { status: 404 }
    );
  }

  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return NextResponse.json(
      { error: { code: "GONE", message: "This share link has expired" } },
      { status: 410 }
    );
  }

  const { data: comments, error } = await db
    .from("comments")
    .select("id, page_number, x_position, y_position, content, author_name, resolved, created_at")
    .eq("project_id", shareLink.project_id)
    .eq("resolved", false)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch comments" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: comments ?? [], requestId: crypto.randomUUID() });
}

export async function POST(request: Request, { params }: RouteParams) {
  const db = createServerClient();

  const { data: shareLink } = await db
    .from("share_links")
    .select("id, project_id, permissions, expires_at")
    .eq("token", params.token)
    .single();

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

  if (shareLink.permissions !== "comment") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "This share link does not allow comments" } },
      { status: 403 }
    );
  }

  let body: {
    content: string;
    author_name: string;
    page_number: number;
    x_position: number;
    y_position: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { content, author_name, page_number, x_position, y_position } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Comment content is required" } },
      { status: 422 }
    );
  }

  if (content.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: `Comment must be under ${MAX_COMMENT_LENGTH} characters` } },
      { status: 422 }
    );
  }

  if (!author_name || typeof author_name !== "string") {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Author name is required" } },
      { status: 422 }
    );
  }

  if (author_name.length > MAX_AUTHOR_LENGTH) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: `Author name must be under ${MAX_AUTHOR_LENGTH} characters` } },
      { status: 422 }
    );
  }

  const { data: comment, error } = await db
    .from("comments")
    .insert({
      project_id: shareLink.project_id,
      page_number: page_number ?? 1,
      x_position: x_position ?? 0,
      y_position: y_position ?? 0,
      content: content.trim(),
      author_name: author_name.trim(),
      author_id: null,
      share_link_id: shareLink.id,
      resolved: false,
    })
    .select()
    .single();

  if (error || !comment) {
    console.error("Failed to insert comment", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save comment" } },
      { status: 500 }
    );
  }

  await logActivity(shareLink.project_id, "anonymous", "comment_added", {
    share_token: params.token,
    page_number,
  });

  return NextResponse.json({ data: comment, requestId: crypto.randomUUID() }, { status: 201 });
}
