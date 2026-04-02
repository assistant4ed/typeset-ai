import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { ShareViewer } from "@/components/share-viewer";
import type { Metadata } from "next";
import type { DbComment } from "@/lib/supabase/types";

interface PageProps {
  params: { token: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const db = createServerClient();
  const { data: shareLinkRaw } = await db
    .from("share_links")
    .select("project_id")
    .eq("token", params.token)
    .single();

  const shareLink = shareLinkRaw as any;

  if (!shareLink) return { title: "Not Found" };

  const { data: projectRaw } = await db
    .from("projects")
    .select("name")
    .eq("id", shareLink.project_id)
    .single();

  const project = projectRaw as any;

  return {
    title: project ? `Review: ${project.name}` : "Proof Review",
    robots: { index: false, follow: false },
  };
}

export default async function ShareViewerPage({ params }: PageProps) {
  const db = createServerClient();

  const { data: shareLinkRaw } = await db
    .from("share_links")
    .select("id, project_id, permissions, expires_at")
    .eq("token", params.token)
    .single();

  const shareLink = shareLinkRaw as any;

  if (!shareLink) notFound();

  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl bg-white p-8 shadow-sm text-center max-w-sm mx-auto">
          <p className="text-lg font-semibold text-gray-900">Link Expired</p>
          <p className="mt-2 text-sm text-gray-500">
            This review link has expired. Please request a new link from the project team.
          </p>
        </div>
      </div>
    );
  }

  const [{ data: projectRaw }, { data: commentsRaw }] = await Promise.all([
    db.from("projects").select("name, page_count").eq("id", shareLink.project_id).single(),
    db
      .from("comments")
      .select("id, page_number, x_position, y_position, content, author_name, created_at")
      .eq("project_id", shareLink.project_id)
      .eq("resolved", false)
      .order("created_at", { ascending: true }),
  ]);

  const project = projectRaw as any;
  const comments = commentsRaw as any;

  if (!project) notFound();

  return (
    <ShareViewer
      token={params.token}
      projectName={project.name}
      pageCount={project.page_count ?? 1}
      permissions={shareLink.permissions as "view" | "comment"}
      initialComments={(comments ?? []) as DbComment[]}
    />
  );
}
