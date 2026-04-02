import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/supabase/types";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 401 | 403
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("Authentication required", 401);
  }
  return session;
}

export async function requireRole(minimumRole: UserRole) {
  const session = await requireSession();
  if (!hasRole(session.user.role, minimumRole)) {
    throw new AuthError(
      `Role '${minimumRole}' or higher is required`,
      403
    );
  }
  return session;
}

export function unauthorized(message = "Authentication required") {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message } },
    { status: 401 }
  );
}

export function forbidden(message = "Insufficient permissions") {
  return NextResponse.json(
    { error: { code: "FORBIDDEN", message } },
    { status: 403 }
  );
}

export function handleAuthError(err: unknown) {
  if (err instanceof AuthError) {
    if (err.statusCode === 401) return unauthorized(err.message);
    return forbidden(err.message);
  }
  return null;
}
