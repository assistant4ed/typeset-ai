import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/rbac";
import { WorkspaceTabs } from "@/components/workspace-tabs";
import { PagePreview } from "@/components/page-preview";
import { ChatPanel } from "@/components/chat-panel";
import { ContentPanel } from "@/components/content-panel";
import { ExportPanel } from "@/components/export-panel";
import { StylePicker } from "@/components/style-picker";
import { StatusBadge } from "@/components/ui/badge";
import type { Metadata } from "next";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const db = createServerClient();
  const { data: project } = await db
    .from("projects")
    .select("name")
    .eq("id", params.id)
    .single();

  const name = (project as { name?: string } | null)?.name;

  return {
    title: name ?? "Project",
  };
}

export default async function ProjectWorkspacePage({ params }: PageProps) {
  const session = await requireSession().catch(() => null);
  if (!session) notFound();

  const db = createServerClient();

  const [projectRes, stylesRes, referencesRes] = await Promise.all([
    db.from("projects").select("*").eq("id", params.id).single(),
    db
      .from("project_styles")
      .select("css_content, version")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("templates")
      .select("id, name, thumbnail_url")
      .eq("is_system", true)
      .not("thumbnail_url", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = projectRes.data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const styles = stylesRes.data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharedReferences = (referencesRes.data ?? []) as any[];

  if (!project) notFound();

  // Viewers can only see their assigned projects
  if (
    session.user.role === "viewer" &&
    project.assigned_to !== session.user.id
  ) {
    notFound();
  }

  const currentCss = styles?.css_content ?? "";
  const pageCount = project.page_count ?? 1;

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col">
      {/* Workspace header */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="truncate text-lg font-semibold text-gray-900">
            {project.name}
          </h1>
          <StatusBadge status={project.status} />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 shrink-0">
          <span>{project.book_type}</span>
          <span aria-hidden="true">·</span>
          <span>{project.page_size}</span>
        </div>
      </header>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Page preview */}
        <div className="hidden w-[55%] shrink-0 border-r border-gray-200 lg:flex lg:flex-col">
          <PagePreview
            projectId={project.id}
            pageCount={pageCount}
            currentCss={currentCss}
          />
        </div>

        {/* Right: Tabbed panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <WorkspaceTabs
            projectId={project.id}
            contentPanel={
              <ContentPanel projectId={project.id} />
            }
            layoutPanel={
              <div className="p-4">
                <StylePicker
                  projectId={project.id}
                  initialBookType={project.book_type ?? undefined}
                  sharedReferences={sharedReferences}
                />
              </div>
            }
            chatPanel={
              <ChatPanel projectId={project.id} initialCss={currentCss} />
            }
            exportPanel={
              <ExportPanel projectId={project.id} />
            }
            activityPanel={
              <div className="p-4">
                <ActivityPanel projectId={project.id} />
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}


async function ActivityPanel({ projectId }: { projectId: string }) {
  const { getProjectActivity } = await import("@/lib/activity");
  const { entries } = await getProjectActivity(projectId, { limit: 20 });

  const ACTION_LABELS: Record<string, string> = {
    project_created: "Project created",
    project_updated: "Project updated",
    style_applied: "Layout applied",
    style_updated: "Layout updated",
    content_imported: "Content imported",
    export_generated: "Export generated",
    share_link_created: "Share link created",
    comment_added: "Comment added",
    comment_resolved: "Comment resolved",
  };

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500">No activity yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
      <ol aria-label="Project activity" className="relative space-y-4 border-l border-gray-200 pl-4">
        {entries.map((entry) => (
          <li key={entry.id} className="text-sm">
            <time
              dateTime={entry.created_at}
              className="block text-xs text-gray-400"
            >
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(entry.created_at))}
            </time>
            <p className="text-gray-700">
              {ACTION_LABELS[entry.action] ?? entry.action}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
