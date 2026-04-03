import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";

interface RouteParams {
  params: { id: string };
}

// Book type IDs that map directly to CSS template files in templates/book-types/
const VALID_BOOK_TYPES = new Set([
  "novel",
  "coffee-table",
  "children-book",
  "textbook",
  "catalog",
  "corporate-report",
  "magazine",
]);

const TEMPLATES_DIR = join(process.cwd(), "..", "..", "templates", "book-types");

async function loadBookTypeCss(bookType: string): Promise<string | null> {
  try {
    const filePath = join(TEMPLATES_DIR, `${bookType}.css`);
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function getNextStyleVersion(
  db: ReturnType<typeof createServerClient>,
  projectId: string
): Promise<number> {
  const { data: latestRaw } = await db
    .from("project_styles")
    .select("version")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latest = latestRaw as any;
  return (latest?.version ?? 0) + 1;
}

export async function GET(_request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  void session;

  const db = createServerClient();

  const { data: styleRaw, error } = await db
    .from("project_styles")
    .select("id, project_id, css_content, version, created_by, created_at")
    .eq("project_id", params.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch project style", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch project style" } },
      { status: 500 }
    );
  }

  const style = styleRaw as any;

  return NextResponse.json({
    data: style ?? null,
    requestId: crypto.randomUUID(),
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  let body: {
    bookType?: string;
    referenceImageBase64?: string;
    referenceTemplateId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { bookType, referenceImageBase64, referenceTemplateId } = body;

  if (!bookType && !referenceImageBase64 && !referenceTemplateId) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "At least one of bookType, referenceImageBase64, or referenceTemplateId is required",
          details: [
            {
              field: "bookType",
              issue: "Provide a bookType, referenceImageBase64, or referenceTemplateId",
            },
          ],
        },
      },
      { status: 422 }
    );
  }

  const db = createServerClient();

  // Verify the project exists
  const { data: projectRaw } = await db
    .from("projects")
    .select("id, book_type")
    .eq("id", params.id)
    .single();

  const project = projectRaw as any;
  if (!project) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 }
    );
  }

  let cssContent: string;

  if (bookType) {
    if (!VALID_BOOK_TYPES.has(bookType)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: `Invalid bookType. Must be one of: ${[...VALID_BOOK_TYPES].join(", ")}`,
            details: [{ field: "bookType", issue: "Unknown book type" }],
          },
        },
        { status: 422 }
      );
    }

    const templateCss = await loadBookTypeCss(bookType);
    if (!templateCss) {
      console.error(`CSS template file not found for book type: ${bookType}`);
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "CSS template not found for the selected book type" } },
        { status: 500 }
      );
    }

    cssContent = templateCss;
  } else if (referenceTemplateId) {
    // Load CSS from an existing shared reference template
    const { data: templateRaw } = await db
      .from("templates")
      .select("css_content")
      .eq("id", referenceTemplateId)
      .eq("is_system", true)
      .single();

    const template = templateRaw as any;
    if (!template) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Reference template not found" } },
        { status: 404 }
      );
    }

    cssContent = template.css_content;
  } else {
    // referenceImageBase64 provided — store a placeholder pending AI analysis
    // The actual AI analysis requires the core package's vision capability
    cssContent = `/* Style generated from reference image — AI analysis pending */`;
  }

  const nextVersion = await getNextStyleVersion(db, params.id);

  const { data: savedStyleRaw, error: saveError } = await (db.from("project_styles") as any)
    .insert({
      project_id: params.id,
      css_content: cssContent,
      version: nextVersion,
      created_by: session!.user.id,
    })
    .select()
    .single();

  const savedStyle = savedStyleRaw as any;

  if (saveError || !savedStyle) {
    console.error("Failed to save project style", { cause: saveError });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save project style" } },
      { status: 500 }
    );
  }

  // Update the project's book_type field when a built-in template is used
  if (bookType) {
    await (db.from("projects") as any)
      .update({ book_type: bookType })
      .eq("id", params.id);
  }

  await logActivity(params.id, session!.user.id, "style_applied", {
    book_type: bookType ?? null,
    version: nextVersion,
    source: bookType ? "template" : referenceTemplateId ? "shared_reference" : "reference_image",
  });

  // Invalidate chat session so it picks up the new CSS on next message
  const { chatSessionStore } = await import("@/lib/chat-session-store");
  chatSessionStore.delete(params.id);

  return NextResponse.json({
    data: {
      id: savedStyle.id,
      css: savedStyle.css_content,
      version: savedStyle.version,
    },
    requestId: crypto.randomUUID(),
  });
}
