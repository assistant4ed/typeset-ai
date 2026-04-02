import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import type { UserRole } from "@/lib/supabase/types";

const ALLOWED_ROLES: UserRole[] = ["admin", "editor", "viewer"];

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireRole("admin");
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const { id } = params;

  let body: { role?: UserRole; is_active?: boolean; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { role, is_active, name } = body;
  const validationErrors: Array<{ field: string; issue: string }> = [];

  if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
    validationErrors.push({ field: "role", issue: `Must be one of: ${ALLOWED_ROLES.join(", ")}` });
  }
  if (is_active !== undefined && typeof is_active !== "boolean") {
    validationErrors.push({ field: "is_active", issue: "Must be a boolean" });
  }

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Validation failed", details: validationErrors } },
      { status: 422 }
    );
  }

  // Prevent admins from demoting themselves
  if (id === session!.user.id && (role !== undefined || is_active === false)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "You cannot modify your own role or deactivate your own account" } },
      { status: 403 }
    );
  }

  const db = createServerClient();

  const updates: Record<string, unknown> = {};
  if (role !== undefined) updates.role = role;
  if (is_active !== undefined) updates.is_active = is_active;
  if (name !== undefined) updates.name = name;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "No valid fields to update" } },
      { status: 400 }
    );
  }

  const { data: updatedUserRaw, error } = await (db.from("users") as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  const updatedUser = updatedUserRaw as any;

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }
    console.error("Failed to update user", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update user" } },
      { status: 500 }
    );
  }

  if (role !== undefined) {
    await logActivity(null, session!.user.id, "user_role_changed", {
      target_user_id: id,
      new_role: role,
    });
  }

  return NextResponse.json({ data: updatedUser, requestId: crypto.randomUUID() });
}
