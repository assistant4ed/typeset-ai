import { NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { chatSessionStore } from "@/lib/chat-session-store";
import {
  createChatSession,
  sendChatMessage,
  undoLastChange,
  redoLastChange,
} from "@typeset-ai/core";
import type { ContentTree } from "@typeset-ai/core";

interface RouteParams {
  params: { id: string };
}

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

async function getOrCreateSession(
  projectId: string,
  db: ReturnType<typeof createServerClient>
): Promise<ReturnType<typeof createChatSession>> {
  const existing = chatSessionStore.get(projectId);
  if (existing) return existing;

  const [{ data: stylesRaw }, { data: contentRaw }] = await Promise.all([
    db
      .from("project_styles")
      .select("css_content")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("project_content")
      .select("content_tree")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const styles = stylesRaw as any;
  const content = contentRaw as any;
  const currentCss = styles?.css_content ?? "";
  const rawTree = content?.content_tree ?? {};
  const contentTree = {
    metadata: rawTree.metadata ?? { title: "Untitled", author: "", source: "manual", pageCount: 0 },
    frontMatter: rawTree.frontMatter ?? [],
    chapters: rawTree.chapters ?? [],
    backMatter: rawTree.backMatter ?? [],
    assets: rawTree.assets ?? [],
    raw: rawTree.raw ?? "",
  } as ContentTree;

  const session = createChatSession(contentTree, currentCss);
  chatSessionStore.set(projectId, session);
  return session;
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

  const { data: messages, error } = await db
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true })
    .limit(100);

  // Graceful fallback: return empty array if no conversation exists yet
  if (error && error.code !== "PGRST116") {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch chat history" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: messages ?? [],
    requestId: crypto.randomUUID(),
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  let authSession;
  try {
    authSession = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  // Verify project exists and user has access
  const { data: project } = await db
    .from("projects")
    .select("id, assigned_to")
    .eq("id", params.id)
    .single();

  if (!project) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 }
    );
  }

  const formData = await request.formData();
  const message = formData.get("message");

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "Message is required",
          details: [{ field: "message", issue: "Must be a non-empty string" }],
        },
      },
      { status: 422 }
    );
  }

  // Handle optional reference image
  let imageTmpPath: string | undefined;
  const imageFile = formData.get("reference_image");

  if (imageFile instanceof File && imageFile.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Invalid image type",
            details: [{ field: "reference_image", issue: "Must be PNG, JPEG, or WebP" }],
          },
        },
        { status: 422 }
      );
    }

    if (imageFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Image too large",
            details: [{ field: "reference_image", issue: "Maximum size is 10 MB" }],
          },
        },
        { status: 422 }
      );
    }

    const tmpDir = join(tmpdir(), "typeset-uploads");
    await mkdir(tmpDir, { recursive: true });
    const ext = imageFile.type.split("/")[1];
    imageTmpPath = join(tmpDir, `${crypto.randomUUID()}.${ext}`);
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    await writeFile(imageTmpPath, buffer);
  }

  try {
    const chatSession = await getOrCreateSession(params.id, db);

    // Ensure history is always an array (prevents .map crash on corrupted sessions)
    if (!Array.isArray(chatSession.history)) {
      chatSession.history = [];
    }
    if (!Array.isArray(chatSession.undoStack)) {
      chatSession.undoStack = [];
    }
    if (!Array.isArray(chatSession.redoStack)) {
      chatSession.redoStack = [];
    }

    const response = await sendChatMessage(chatSession, message.trim(), imageTmpPath);

    // Persist chat messages to DB
    let { data: conversation } = await db
      .from("chat_conversations")
      .select("id")
      .eq("project_id", params.id)
      .maybeSingle();

    const conv = conversation as any;
    let conversationId = conv?.id;
    if (!conversationId) {
      const { data: newConv } = await (db.from("chat_conversations") as any)
        .insert({ project_id: params.id })
        .select("id")
        .single();
      conversationId = (newConv as any)?.id;
    }

    if (conversationId) {
      await (db.from("chat_messages") as any).insert({
        conversation_id: conversationId,
        role: "user",
        content: message.trim(),
      });
      await (db.from("chat_messages") as any).insert({
        conversation_id: conversationId,
        role: "assistant",
        content: response.message,
        css_diff: response.diff?.patch ?? null,
      });
    }

    // Persist updated CSS to project_styles
    if (response.isApplied) {
      const { data: latestStylesRaw } = await db
        .from("project_styles")
        .select("version")
        .eq("project_id", params.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      const latestStyles = latestStylesRaw as any;
      const nextVersion = (latestStyles?.version ?? 0) + 1;

      await (db.from("project_styles") as any).insert({
        project_id: params.id,
        css_content: response.css,
        version: nextVersion,
        created_by: authSession!.user.id,
      });
    }

    return NextResponse.json({
      data: {
        message: response.message,
        css: response.css,
        diff: response.diff,
        isApplied: response.isApplied,
        canUndo: chatSession.undoStack.length > 0,
        canRedo: chatSession.redoStack.length > 0,
      },
      requestId: crypto.randomUUID(),
    });
  } catch (err) {
    console.error("Chat error:", err);
    // Clear corrupted session so next request gets a fresh one
    chatSessionStore.delete(params.id);
    return NextResponse.json(
      {
        error: {
          code: "CHAT_ERROR",
          message: err instanceof Error ? err.message : "Failed to process chat message. Please try again.",
        },
      },
      { status: 500 },
    );
  } finally {
    // Always clean up the temp image file
    if (imageTmpPath) {
      await unlink(imageTmpPath).catch(() => undefined);
    }
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  const session = chatSessionStore.get(params.id);
  if (!session) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "No active chat session for this project" } },
      { status: 404 }
    );
  }

  const db = createServerClient();

  if (action === "undo") {
    const success = undoLastChange(session);
    if (success) {
      const { data: latestRaw } = await db
        .from("project_styles")
        .select("version")
        .eq("project_id", params.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const latest = latestRaw as any;
      const nextVersion = (latest?.version ?? 0) + 1;
      await (db.from("project_styles") as any).insert({
        project_id: params.id,
        css_content: session.currentCss,
        version: nextVersion,
      });
    }
    return NextResponse.json({
      data: {
        success,
        canUndo: session.undoStack.length > 0,
        canRedo: session.redoStack.length > 0,
        currentCss: session.currentCss,
      },
      requestId: crypto.randomUUID(),
    });
  }

  if (action === "redo") {
    const success = redoLastChange(session);
    if (success) {
      const { data: latestRaw } = await db
        .from("project_styles")
        .select("version")
        .eq("project_id", params.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const latest = latestRaw as any;
      const nextVersion = (latest?.version ?? 0) + 1;
      await (db.from("project_styles") as any).insert({
        project_id: params.id,
        css_content: session.currentCss,
        version: nextVersion,
      });
    }
    return NextResponse.json({
      data: {
        success,
        canUndo: session.undoStack.length > 0,
        canRedo: session.redoStack.length > 0,
        currentCss: session.currentCss,
      },
      requestId: crypto.randomUUID(),
    });
  }

  return NextResponse.json(
    { error: { code: "BAD_REQUEST", message: "Unknown action. Use ?action=undo or ?action=redo" } },
    { status: 400 }
  );
}
