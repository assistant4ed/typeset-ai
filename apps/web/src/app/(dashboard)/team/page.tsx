import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { TeamPageClient } from "./team-page-client";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const session = await auth();

  if (!session?.user || !hasRole(session.user.role, "admin")) {
    redirect("/projects");
  }

  const db = createServerClient();
  const { data: users } = await db
    .from("users")
    .select("id, email, name, avatar_url, role, is_active, created_at")
    .order("created_at", { ascending: true });

  return <TeamPageClient users={(users as any) ?? []} currentUserId={session.user.id} />;
}
