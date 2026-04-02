import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession, requireRole, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import type { BookType } from "@/lib/supabase/types";

const ALLOWED_BOOK_TYPES: BookType[] = ["novel", "non_fiction", "children", "academic", "poetry", "comic", "other"];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  try {
    await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const bookType = searchParams.get("book_type") as BookType | null;
  const isSystem = searchParams.get("is_system");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10),
    MAX_LIMIT
  );

  const db = createServerClient();

  let query = db
    .from("templates")
    .select(
      "id, name, description, book_type, thumbnail_url, is_system, created_by, created_at, updated_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (bookType && ALLOWED_BOOK_TYPES.includes(bookType)) {
    query = query.eq("book_type", bookType);
  }
  if (isSystem !== null) {
    query = query.eq("is_system", isSystem === "true");
  }
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to list templates", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch templates" } },
      { status: 500 }
    );
  }

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
    session = await requireRole("editor");
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  let body: {
    name: string;
    description?: string;
    book_type?: BookType;
    css_content: string;
    thumbnail_url?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { name, description, book_type = "other", css_content, thumbnail_url } = body;
  const validationErrors: Array<{ field: string; issue: string }> = [];

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    validationErrors.push({ field: "name", issue: "Must be a non-empty string" });
  }
  if (css_content === undefined || typeof css_content !== "string") {
    validationErrors.push({ field: "css_content", issue: "Must be a string (can be empty)" });
  }
  if (!ALLOWED_BOOK_TYPES.includes(book_type)) {
    validationErrors.push({ field: "book_type", issue: `Must be one of: ${ALLOWED_BOOK_TYPES.join(", ")}` });
  }

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Validation failed", details: validationErrors } },
      { status: 422 }
    );
  }

  const db = createServerClient();

  const { data: template, error } = await db
    .from("templates")
    .insert({
      name: name.trim(),
      description: description ?? null,
      book_type,
      css_content,
      thumbnail_url: thumbnail_url ?? null,
      is_system: false,
      created_by: session!.user.id,
    })
    .select()
    .single();

  if (error || !template) {
    console.error("Failed to create template", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create template" } },
      { status: 500 }
    );
  }

  await logActivity(null, session!.user.id, "template_created", {
    template_id: template.id,
    template_name: template.name,
  });

  return NextResponse.json({ data: template, requestId: crypto.randomUUID() }, { status: 201 });
}
