import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import type { SharePermission } from "@/lib/supabase/types";

const ALLOWED_PERMISSIONS: SharePermission[] = ["view", "comment"];
const DEFAULT_EXPIRY_DAYS = 7;

interface RouteParams {
  params: { id: string };
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export async function POST(request: Request, { params }: RouteParams) {
  let authSession;
  try {
    authSession = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  let body: {
    permissions?: SharePermission;
    expires_in_days?: number;
  };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const permissions = body.permissions ?? "view";
  const expiresInDays = body.expires_in_days ?? DEFAULT_EXPIRY_DAYS;

  if (!ALLOWED_PERMISSIONS.includes(permissions)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "Invalid permissions value",
          details: [{ field: "permissions", issue: "Must be 'view' or 'comment'" }],
        },
      },
      { status: 422 }
    );
  }

  const db = createServerClient();

  // Verify project exists
  const { data: projectRaw } = await db
    .from("projects")
    .select("id, name")
    .eq("id", params.id)
    .single();

  const project = projectRaw as any;

  if (!project) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 }
    );
  }

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data: shareLinkRaw, error } = await (db.from("share_links") as any)
    .insert({
      project_id: params.id,
      token,
      permissions,
      expires_at: expiresAt.toISOString(),
      created_by: authSession!.user.id,
      password_hash: null,
    })
    .select()
    .single();

  const shareLink = shareLinkRaw as any;

  if (error || !shareLink) {
    console.error("Failed to create share link", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create share link" } },
      { status: 500 }
    );
  }

  await logActivity(params.id, authSession!.user.id, "share_link_created", {
    token,
    permissions,
    expires_at: expiresAt.toISOString(),
  });

  return NextResponse.json(
    {
      data: {
        ...shareLink,
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/share/${token}`,
      },
      requestId: crypto.randomUUID(),
    },
    { status: 201 }
  );
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const { data: linksRaw, error } = await db
    .from("share_links")
    .select("id, token, permissions, expires_at, created_at, created_by")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch share links" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: (linksRaw as any) ?? [], requestId: crypto.randomUUID() });
}
