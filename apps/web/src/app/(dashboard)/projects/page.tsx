"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectCard } from "@/components/project-card";
import { ProjectFilters } from "@/components/project-filters";
import { NewProjectModal } from "@/components/new-project-modal";
import type { DbProject } from "@/lib/supabase/types";

const FOLDER_ICON = (
  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

interface ProjectsResponse {
  data: DbProject[];
  meta: { cursor: string | null; hasMore: boolean; total: number };
}

async function fetchProjects(url: string): Promise<ProjectsResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load projects");
  return res.json();
}

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const apiUrl = buildApiUrl(searchParams);
  const { data, error, isLoading } = useSWR<ProjectsResponse>(apiUrl, fetchProjects);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          {data?.meta.total != null && (
            <p className="mt-1 text-sm text-gray-500">
              {data.meta.total} {data.meta.total === 1 ? "project" : "projects"}
            </p>
          )}
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Project
        </Button>
      </div>

      {/* Filters */}
      <ProjectFilters />

      {/* Content */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" label="Loading projects..." />
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load projects. Please refresh the page.
        </div>
      )}

      {!isLoading && !error && data?.data.length === 0 && (
        <EmptyState
          icon={FOLDER_ICON}
          title="No projects yet"
          description="Create your first project to get started with AI-powered typesetting."
          action={
            <Button onClick={() => setIsModalOpen(true)}>Create a project</Button>
          }
        />
      )}

      {!isLoading && !error && (data?.data ?? []).length > 0 && (
        <ul
          role="list"
          aria-label="Projects"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {data!.data.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}

      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

function buildApiUrl(searchParams: ReturnType<typeof useSearchParams>): string {
  const params = new URLSearchParams();
  const status = searchParams.get("status");
  const bookType = searchParams.get("book_type");
  const assignedTo = searchParams.get("assigned_to");
  const cursor = searchParams.get("cursor");

  if (status) params.set("status", status);
  if (bookType) params.set("book_type", bookType);
  if (assignedTo) params.set("assigned_to", assignedTo);
  if (cursor) params.set("cursor", cursor);

  return `/api/v1/projects?${params.toString()}`;
}
