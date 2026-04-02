"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { DbTemplate } from "@/lib/supabase/types";

const BOOK_TYPE_OPTIONS = [
  { value: "novel", label: "Novel" },
  { value: "non_fiction", label: "Non-fiction" },
  { value: "children", label: "Children's" },
  { value: "academic", label: "Academic" },
  { value: "poetry", label: "Poetry" },
  { value: "comic", label: "Comic" },
  { value: "other", label: "Other" },
];

const TEMPLATE_ICON = (
  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
  </svg>
);

interface TemplateResponse {
  data: DbTemplate[];
}

async function fetchTemplates(url: string): Promise<TemplateResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load templates");
  return res.json();
}

export default function TemplatesPage() {
  const { data, error, isLoading, mutate } = useSWR<TemplateResponse>(
    "/api/v1/templates",
    fetchTemplates
  );
  const [selectedTemplate, setSelectedTemplate] = useState<DbTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBookType, setNewBookType] = useState("novel");
  const [cssContent, setCssContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !cssContent.trim()) return;

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/v1/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          book_type: newBookType,
          css_content: cssContent.trim(),
          is_system: false,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setCreateError(json.error?.message ?? "Failed to create template.");
        return;
      }

      setIsCreating(false);
      setNewName("");
      setCssContent("");
      mutate();
    } finally {
      setIsSubmitting(false);
    }
  }

  const templates = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
        <Button onClick={() => setIsCreating(true)}>
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Template
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" label="Loading templates..." />
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load templates.
        </div>
      )}

      {!isLoading && !error && templates.length === 0 && (
        <EmptyState
          icon={TEMPLATE_ICON}
          title="No templates yet"
          description="Create a reusable CSS layout template for common book types."
          action={<Button onClick={() => setIsCreating(true)}>Create a template</Button>}
        />
      )}

      {templates.length > 0 && (
        <ul
          role="list"
          aria-label="Templates"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {templates.map((template) => (
            <li key={template.id}>
              <button
                onClick={() => setSelectedTemplate(template)}
                className="group w-full flex flex-col rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <div
                  aria-hidden="true"
                  className="mb-4 h-24 w-full overflow-hidden rounded-lg bg-gray-900"
                >
                  <pre className="p-2 text-[10px] text-gray-400 leading-relaxed overflow-hidden">
                    <code>{template.css_content.slice(0, 200)}</code>
                  </pre>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-brand-600">
                  {template.name}
                  {template.is_system && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">(System)</span>
                  )}
                </h3>
                <p className="mt-1 text-xs text-gray-500">{template.book_type}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Create modal */}
      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title="New Template"
        size="lg"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4" noValidate>
          {createError && (
            <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {createError}
            </div>
          )}
          <Input
            label="Template Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Literary Novel"
            required
            autoFocus
          />
          <Select
            label="Book Type"
            options={BOOK_TYPE_OPTIONS}
            value={newBookType}
            onChange={(e) => setNewBookType(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="css-editor" className="text-sm font-medium text-gray-700">
              CSS Content
            </label>
            <textarea
              id="css-editor"
              value={cssContent}
              onChange={(e) => setCssContent(e.target.value)}
              placeholder="/* Paste or write your CSS layout here */"
              rows={10}
              required
              className="rounded-md border border-gray-300 px-3 py-2 font-mono text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Template
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview modal */}
      {selectedTemplate && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTemplate(null)}
          title={selectedTemplate.name}
          size="lg"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{selectedTemplate.book_type}</span>
              {selectedTemplate.is_system && (
                <span className="text-xs text-gray-400">· System template</span>
              )}
            </div>
            {selectedTemplate.description && (
              <p className="text-sm text-gray-700">{selectedTemplate.description}</p>
            )}
            <pre className="max-h-96 overflow-auto rounded-lg border border-gray-200 bg-gray-900 p-4 text-xs text-gray-100 font-mono">
              <code>{selectedTemplate.css_content}</code>
            </pre>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedTemplate(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
