import Link from "next/link";
import type { DbProject, DbUser } from "@/lib/supabase/types";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

const BOOK_TYPE_LABELS: Record<string, string> = {
  novel: "Novel",
  non_fiction: "Non-fiction",
  children: "Children's",
  academic: "Academic",
  poetry: "Poetry",
  comic: "Comic",
  other: "Other",
};

interface ProjectCardProps {
  project: DbProject;
  assignee?: Pick<DbUser, "name" | "avatar_url"> | null;
}

function formatDueDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function ProjectCard({ project, assignee }: ProjectCardProps) {
  const dueDate = formatDueDate(project.due_date);
  const isOverdue =
    project.due_date &&
    project.status !== "completed" &&
    new Date(project.due_date) < new Date();

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {/* Thumbnail placeholder */}
      <div
        aria-hidden="true"
        className="mb-4 h-32 w-full rounded-lg bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center"
      >
        <svg className="h-10 w-10 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      </div>

      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-brand-600">
          {project.name}
        </h3>
        <StatusBadge status={project.status} />
      </div>

      {/* Book type */}
      <p className="mb-4 text-xs text-gray-500">
        {BOOK_TYPE_LABELS[project.book_type] ?? project.book_type}
        {project.page_count ? ` · ${project.page_count} pages` : ""}
      </p>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2">
        {assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar src={assignee.avatar_url} name={assignee.name} size="sm" />
            <span className="text-xs text-gray-500 truncate max-w-[120px]">
              {assignee.name ?? "Assigned"}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Unassigned</span>
        )}
        {dueDate && (
          <span
            className={[
              "text-xs",
              isOverdue ? "text-red-600 font-medium" : "text-gray-400",
            ].join(" ")}
          >
            {isOverdue ? "Overdue · " : "Due "}
            {dueDate}
          </span>
        )}
      </div>
    </Link>
  );
}
