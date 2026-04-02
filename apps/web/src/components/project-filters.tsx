"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Select } from "@/components/ui/select";
import type { ProjectStatus, BookType } from "@/lib/supabase/types";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "In Review" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const BOOK_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "novel", label: "Novel" },
  { value: "non_fiction", label: "Non-fiction" },
  { value: "children", label: "Children's" },
  { value: "academic", label: "Academic" },
  { value: "poetry", label: "Poetry" },
  { value: "comic", label: "Comic" },
  { value: "other", label: "Other" },
];

interface TeamMember {
  id: string;
  name: string | null;
}

interface ProjectFiltersProps {
  teamMembers?: TeamMember[];
}

export function ProjectFilters({ teamMembers = [] }: ProjectFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const assigneeOptions = [
    { value: "", label: "All Assignees" },
    ...teamMembers.map((m) => ({ value: m.id, label: m.name ?? m.id })),
  ];

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("cursor"); // Reset pagination on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <div role="search" aria-label="Filter projects" className="flex flex-wrap items-center gap-3">
      <Select
        aria-label="Filter by status"
        options={STATUS_OPTIONS}
        value={(searchParams.get("status") as ProjectStatus) ?? ""}
        onChange={(e) => updateFilter("status", e.target.value)}
        className="w-40"
      />
      <Select
        aria-label="Filter by book type"
        options={BOOK_TYPE_OPTIONS}
        value={(searchParams.get("book_type") as BookType) ?? ""}
        onChange={(e) => updateFilter("book_type", e.target.value)}
        className="w-40"
      />
      {teamMembers.length > 0 && (
        <Select
          aria-label="Filter by assignee"
          options={assigneeOptions}
          value={searchParams.get("assigned_to") ?? ""}
          onChange={(e) => updateFilter("assigned_to", e.target.value)}
          className="w-44"
        />
      )}
    </div>
  );
}
