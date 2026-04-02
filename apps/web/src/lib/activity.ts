import { createServerClient } from "@/lib/supabase/server";
import type { ActivityAction } from "@/lib/supabase/types";

/**
 * Log an activity event to the activity_log table.
 * Failures are caught and logged to stderr — a failed audit log
 * should never break the calling operation.
 */
export async function logActivity(
  projectId: string | null,
  userId: string,
  action: ActivityAction,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const db = createServerClient();
    const { error } = await db.from("activity_log").insert({
      project_id: projectId,
      user_id: userId,
      action,
      details,
    });

    if (error) {
      console.error("activity_log insert failed", {
        action,
        projectId,
        userId,
        cause: error,
      });
    }
  } catch (err) {
    console.error("activity_log unexpected error", {
      action,
      projectId,
      userId,
      cause: err,
    });
  }
}

export interface ActivityEntry {
  id: string;
  project_id: string | null;
  user_id: string | null;
  action: ActivityAction;
  details: Record<string, unknown>;
  created_at: string;
}

/**
 * Fetch recent activity for a project with cursor-based pagination.
 * Returns at most `limit` entries ordered by most recent first.
 */
export async function getProjectActivity(
  projectId: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<{ entries: ActivityEntry[]; nextCursor: string | null }> {
  const { limit = 20, cursor } = options;
  const db = createServerClient();

  let query = db
    .from("activity_log")
    .select("id, project_id, user_id, action, details, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Failed to fetch project activity", { cause: error });
  }

  const entries = (data ?? []) as ActivityEntry[];
  const lastEntry = entries[entries.length - 1];
  const nextCursor = entries.length === limit ? (lastEntry?.created_at ?? null) : null;

  return { entries, nextCursor };
}
