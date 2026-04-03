import { NextResponse } from "next/server";
import { requireSession, hasRole, handleAuthError } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { parseMarkdown } from "@typeset-ai/core";

interface RouteParams {
  params: { id: string };
}

const ALLOWED_EXTENSIONS = new Set(["md", "txt", "docx", "pdf"]);
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

async function processFile(file: File): Promise<{ raw: string; source: string; fileName: string }> {
  const ext = getFileExtension(file.name);

  if (ext === "md" || ext === "txt") {
    const raw = await file.text();
    return { raw, source: ext === "md" ? "markdown" : "text", fileName: file.name };
  }

  if (ext === "docx") {
    // mammoth is available via @typeset-ai/core's node_modules
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await mammoth.convertToHtml({ buffer });
    return { raw: result.value, source: "docx", fileName: file.name };
  }

  if (ext === "pdf") {
    // Basic PDF text extraction — store raw text for now
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Extract printable ASCII text from the PDF binary as a best-effort fallback
    const rawText = buffer
      .toString("latin1")
      .replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .replace(/\s{3,}/g, "\n\n")
      .trim();
    return { raw: rawText, source: "pdf", fileName: file.name };
  }

  throw new Error(`Unsupported file type: .${ext}`);
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

  const { data: projectRaw } = await db
    .from("projects")
    .select("id, assigned_to")
    .eq("id", params.id)
    .single();

  const project = projectRaw as any;

  if (!project) {
    return NextResponse.json(
      { data: null, error: null, requestId: crypto.randomUUID() },
      { status: 200 }
    );
  }

  if (
    session!.user.role === "viewer" &&
    project.assigned_to !== session!.user.id
  ) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 }
    );
  }

  const { data: contentRaw, error } = await db
    .from("project_content")
    .select("id, project_id, content_tree, source, version, created_at")
    .eq("project_id", params.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch content" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: contentRaw as any, error: null, requestId: crypto.randomUUID() });
}

export async function POST(request: Request, { params }: RouteParams) {
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Expected multipart/form-data" } },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  const text = formData.get("text") as string | null;
  const googleDocsUrl = formData.get("googleDocsUrl") as string | null;

  let contentTree: { raw: string; source: string; fileName?: string };

  if (file && file.size > 0) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: { code: "PAYLOAD_TOO_LARGE", message: "File must be under 20 MB" } },
        { status: 413 }
      );
    }

    const ext = getFileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: { code: "UNSUPPORTED_FILE_TYPE", message: "Supported formats: .docx, .pdf, .md, .txt" } },
        { status: 422 }
      );
    }

    try {
      const processed = await processFile(file);
      contentTree = processed;
    } catch (err) {
      console.error("File processing failed", { cause: err, fileName: file.name });
      return NextResponse.json(
        { error: { code: "PROCESSING_ERROR", message: "Failed to process file. Please check the format and try again." } },
        { status: 422 }
      );
    }
  } else if (text && text.trim().length > 0) {
    contentTree = { raw: text.trim(), source: "text" };
  } else if (googleDocsUrl && googleDocsUrl.trim().length > 0) {
    const url = googleDocsUrl.trim();
    if (!url.startsWith("https://docs.google.com/")) {
      return NextResponse.json(
        { error: { code: "INVALID_URL", message: "Please provide a valid Google Docs URL" } },
        { status: 422 }
      );
    }
    contentTree = { raw: "", source: "google-docs", fileName: url };
  } else {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Provide a file, text, or Google Docs URL" } },
      { status: 400 }
    );
  }

  // For markdown source, parse into a full ContentTree; otherwise store as flat raw
  let parsedTree: Record<string, unknown>;
  if (contentTree.source === "markdown") {
    try {
      const tree = parseMarkdown(contentTree.raw);
      parsedTree = { ...tree, raw: contentTree.raw, source: contentTree.source, fileName: contentTree.fileName };
    } catch {
      parsedTree = contentTree as Record<string, unknown>;
    }
  } else {
    parsedTree = contentTree as Record<string, unknown>;
  }

  const db = createServerClient();

  // Get next version number
  const { data: latestRaw } = await db
    .from("project_content")
    .select("version")
    .eq("project_id", params.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latest = latestRaw as any;
  const nextVersion = (latest?.version ?? 0) + 1;

  const { data: savedRaw, error: insertError } = await (db.from("project_content") as any)
    .insert({
      project_id: params.id,
      content_tree: parsedTree,
      source: contentTree.source,
      version: nextVersion,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to save content", { cause: insertError, projectId: params.id });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save content" } },
      { status: 500 }
    );
  }

  await logActivity(params.id, session!.user.id, "content_imported", {
    source: contentTree.source,
    fileName: contentTree.fileName ?? null,
    version: nextVersion,
  });

  return NextResponse.json(
    { data: savedRaw as any, error: null, requestId: crypto.randomUUID() },
    { status: 201 }
  );
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

  let body: { raw?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (typeof body.raw !== "string") {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Field 'raw' (string) is required" } },
      { status: 400 }
    );
  }

  const db = createServerClient();

  // Get the current latest version to build upon
  const { data: latestRaw } = await db
    .from("project_content")
    .select("id, content_tree, version")
    .eq("project_id", params.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latest = latestRaw as any;

  if (!latest) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "No content found for this project" } },
      { status: 404 }
    );
  }

  const existingTree = (latest.content_tree ?? {}) as Record<string, unknown>;
  const updatedTree: Record<string, unknown> = { ...existingTree, raw: body.raw };

  // Re-parse markdown if the original source was markdown
  if (existingTree.source === "markdown") {
    try {
      const reparsed = parseMarkdown(body.raw);
      Object.assign(updatedTree, reparsed);
    } catch {
      // Keep existing tree shape if reparsing fails
    }
  }

  const nextVersion = (latest.version ?? 0) + 1;

  const { data: savedRaw, error: insertError } = await (db.from("project_content") as any)
    .insert({
      project_id: params.id,
      content_tree: updatedTree,
      source: existingTree.source ?? "text",
      version: nextVersion,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to save updated content", { cause: insertError, projectId: params.id });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save content" } },
      { status: 500 }
    );
  }

  await logActivity(params.id, session!.user.id, "content_imported", {
    source: existingTree.source ?? "text",
    version: nextVersion,
    action: "edit",
  });

  return NextResponse.json(
    { data: savedRaw as any, error: null, requestId: crypto.randomUUID() },
    { status: 200 }
  );
}
