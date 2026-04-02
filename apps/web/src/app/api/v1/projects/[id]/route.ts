import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession, requireRole, hasRole, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import type { BookType, ProjectStatus } from "@/lib/supabase/types";

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const { data: project, error } = await db
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !project) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 }
    );
  }

  // Viewers can only see their assigned projects
  if (
    session!.user.role === "viewer" &&
    project.assigned_to !== session!.user.id
  ) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: project, requestId: crypto.randomUUID() });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  if (!hasRole(session!.user.role, "editor")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Editor role or higher is required" } },
      { status: 403 }
    );
  }

  let body: {
    name?: string;
    description?: string;
    book_type?: BookType;
    status?: ProjectStatus;
    page_size?: string;
    page_count?: number;
    assigned_to?: string | null;
    due_date?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const db = createServerClient();

  const { data: existing } = await db
    .from("projects")
    .select("id, status")
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 }
    );
  }

  const updates: Record<string, unknown> = {};
  const allowedFields = ["name", "description", "book_type", "status", "page_size", "page_count", "assigned_to", "due_date"] as const;

  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field] ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "No valid fields to update" } },
      { status: 400 }
    );
  }

  const { data: updated, error } = await db
    .from("projects")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error || !updated) {
    console.error("Failed to update project", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update project" } },
      { status: 500 }
    );
  }

  await logActivity(params.id, session!.user.id, "project_updated", {
    changed_fields: Object.keys(updates),
  });

  return NextResponse.json({ data: updated, requestId: crypto.randomUUID() });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireRole("admin");
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const { data: existing } = await db
    .from("projects")
    .select("id, name")
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 }
    );
  }

  const { error } = await db.from("projects").delete().eq("id", params.id);

  if (error) {
    console.error("Failed to delete project", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete project" } },
      { status: 500 }
    );
  }

  await logActivity(null, session!.user.id, "project_deleted", {
    deleted_project_id: params.id,
    deleted_project_name: existing.name,
  });

  return new Response(null, { status: 204 });
}
