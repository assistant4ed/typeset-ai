import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import type { UserRole } from "@/lib/supabase/types";

const ALLOWED_ROLES: UserRole[] = ["admin", "editor", "viewer"];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  try {
    await requireRole("admin");
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") as UserRole | null;
  const isActive = searchParams.get("is_active");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10),
    MAX_LIMIT
  );

  const db = createServerClient();
  let query = db
    .from("users")
    .select("id, email, name, avatar_url, role, is_active, created_at, updated_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (role && ALLOWED_ROLES.includes(role)) {
    query = query.eq("role", role);
  }
  if (isActive !== null) {
    query = query.eq("is_active", isActive === "true");
  }
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: dataRaw, error, count } = await query;

  if (error) {
    console.error("Failed to list users", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch users" } },
      { status: 500 }
    );
  }

  const data = dataRaw as any[];
  const lastItem = data?.[data.length - 1];
  const nextCursor = data?.length === limit ? lastItem?.created_at : null;

  return NextResponse.json({
    data,
    meta: { cursor: nextCursor, hasMore: nextCursor !== null, total: count },
    requestId: crypto.randomUUID(),
  });
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requireRole("admin");
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  let body: { email: string; role?: UserRole; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { email, role = "viewer", name } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Valid email is required", details: [{ field: "email", issue: "Must be a valid email address" }] } },
      { status: 422 }
    );
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Invalid role", details: [{ field: "role", issue: `Must be one of: ${ALLOWED_ROLES.join(", ")}` }] } },
      { status: 422 }
    );
  }

  const db = createServerClient();

  const { data: existingRaw } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  const existing = existingRaw as any;

  if (existing) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "A user with this email already exists" } },
      { status: 409 }
    );
  }

  const { data: newUserRaw, error } = await (db.from("users") as any)
    .insert({ email, role, name: name ?? null, is_active: true })
    .select()
    .single();

  const newUser = newUserRaw as any;

  if (error || !newUser) {
    console.error("Failed to invite user", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create user" } },
      { status: 500 }
    );
  }

  await logActivity(null, session!.user.id, "user_invited", {
    invited_user_id: newUser.id,
    invited_email: email,
    role,
  });

  return NextResponse.json({ data: newUser, requestId: crypto.randomUUID() }, { status: 201 });
}
