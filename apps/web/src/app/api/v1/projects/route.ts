import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession, requireRole, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import type { BookType, ProjectStatus } from "@/lib/supabase/types";

const ALLOWED_STATUSES: ProjectStatus[] = ["draft", "in_progress", "review", "completed", "archived"];
const ALLOWED_BOOK_TYPES: BookType[] = ["novel", "non_fiction", "children", "academic", "poetry", "comic", "other"];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as ProjectStatus | null;
  const bookType = searchParams.get("book_type") as BookType | null;
  const assignedTo = searchParams.get("assigned_to");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10),
    MAX_LIMIT
  );

  const db = createServerClient();

  let query = db
    .from("projects")
    .select(
      "id, name, description, book_type, status, page_size, page_count, assigned_to, created_by, due_date, created_at, updated_at",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (status && ALLOWED_STATUSES.includes(status)) {
    query = query.eq("status", status);
  }
  if (bookType && ALLOWED_BOOK_TYPES.includes(bookType)) {
    query = query.eq("book_type", bookType);
  }
  if (assignedTo) {
    query = query.eq("assigned_to", assignedTo);
  }
  if (cursor) {
    query = query.lt("updated_at", cursor);
  }

  // Viewers only see projects assigned to them
  if (session!.user.role === "viewer") {
    query = query.eq("assigned_to", session!.user.id);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to list projects", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch projects" } },
      { status: 500 }
    );
  }

  const lastItem = data?.[data.length - 1];
  const nextCursor = data?.length === limit ? lastItem?.updated_at : null;

  return NextResponse.json({
    data,
    meta: { cursor: nextCursor, hasMore: nextCursor !== null, total: count },
    requestId: crypto.randomUUID(),
  });
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requireRole("editor");
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  let body: {
    name: string;
    description?: string;
    book_type?: BookType;
    page_size?: string;
    assigned_to?: string;
    due_date?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { name, description, book_type = "other", page_size = "A5", assigned_to, due_date } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Project name is required", details: [{ field: "name", issue: "Must be a non-empty string" }] } },
      { status: 422 }
    );
  }

  if (!ALLOWED_BOOK_TYPES.includes(book_type)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Invalid book type", details: [{ field: "book_type", issue: `Must be one of: ${ALLOWED_BOOK_TYPES.join(", ")}` }] } },
      { status: 422 }
    );
  }

  const db = createServerClient();

  const { data: project, error } = await db
    .from("projects")
    .insert({
      name: name.trim(),
      description: description ?? null,
      book_type,
      page_size: page_size as never,
      status: "draft",
      assigned_to: assigned_to ?? null,
      created_by: session!.user.id,
      due_date: due_date ?? null,
    })
    .select()
    .single();

  if (error || !project) {
    console.error("Failed to create project", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create project" } },
      { status: 500 }
    );
  }

  await logActivity(project.id, session!.user.id, "project_created", {
    project_name: project.name,
    book_type: project.book_type,
  });

  return NextResponse.json({ data: project, requestId: crypto.randomUUID() }, { status: 201 });
}
