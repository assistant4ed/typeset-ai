import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { chatSessionStore } from "@/lib/chat-session-store";
import { redoLastChange } from "@typeset-ai/core";

interface RouteParams {
  params: { id: string };
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const session = chatSessionStore.get(params.id);
  if (!session) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "No active session" } },
      { status: 404 }
    );
  }

  const success = redoLastChange(session);

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
