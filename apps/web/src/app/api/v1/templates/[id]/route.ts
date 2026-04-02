import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession, requireRole, hasRole, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import type { BookType } from "@/lib/supabase/types";

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const { data: templateRaw, error } = await db
    .from("templates")
    .select("*")
    .eq("id", params.id)
    .single();

  const template = templateRaw as any;

  if (error || !template) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Template not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: template, requestId: crypto.randomUUID() });
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

  const db = createServerClient();

  const { data: existingRaw } = await db
    .from("templates")
    .select("id, is_system, created_by")
    .eq("id", params.id)
    .single();

  const existing = existingRaw as any;

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Template not found" } },
      { status: 404 }
    );
  }

  // Only admins can edit system templates
  if (existing.is_system && !hasRole(session!.user.role, "admin")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Only admins can modify system templates" } },
      { status: 403 }
    );
  }

  // Editors can only edit their own templates
  if (
    !hasRole(session!.user.role, "admin") &&
    existing.created_by !== session!.user.id
  ) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "You can only edit your own templates" } },
      { status: 403 }
    );
  }

  let body: { name?: string; description?: string; book_type?: BookType; css_content?: string; thumbnail_url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  const allowedFields = ["name", "description", "book_type", "css_content", "thumbnail_url"] as const;
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field] ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "No valid fields to update" } },
      { status: 400 }
    );
  }

  const { data: updatedRaw, error } = await (db.from("templates") as any)
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  const updated = updatedRaw as any;

  if (error || !updated) {
    console.error("Failed to update template", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update template" } },
      { status: 500 }
    );
  }

  await logActivity(null, session!.user.id, "template_updated", {
    template_id: params.id,
    changed_fields: Object.keys(updates),
  });

  return NextResponse.json({ data: updated, requestId: crypto.randomUUID() });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const { data: existingRaw } = await db
    .from("templates")
    .select("id, is_system, created_by")
    .eq("id", params.id)
    .single();

  const existing = existingRaw as any;

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Template not found" } },
      { status: 404 }
    );
  }

  // System templates require admin
  if (existing.is_system && !hasRole(session!.user.role, "admin")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Only admins can delete system templates" } },
      { status: 403 }
    );
  }

  // Editors can only delete their own templates
  if (
    !hasRole(session!.user.role, "admin") &&
    existing.created_by !== session!.user.id
  ) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "You can only delete your own templates" } },
      { status: 403 }
    );
  }

  const { error } = await db.from("templates").delete().eq("id", params.id);

  if (error) {
    console.error("Failed to delete template", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete template" } },
      { status: 500 }
    );
  }

  return new Response(null, { status: 204 });
}
