"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface ContentTree {
  raw?: string;
  source?: string;
  fileName?: string;
  chapters?: unknown[];
  assets?: unknown[];
}

interface ContentRecord {
  id: string;
  content_tree: ContentTree;
  source: string;
  version: number;
  created_at: string;
}

interface ContentPanelProps {
  projectId: string;
}

const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "text/markdown",
  "text/plain",
]);

const ALLOWED_EXTENSIONS = /\.(docx|pdf|md|txt)$/i;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countChapters(tree: ContentTree): number {
  if (Array.isArray(tree.chapters)) return tree.chapters.length;
  // Heuristic: count H1 headings in raw markdown/HTML
  const raw = tree.raw ?? "";
  return (raw.match(/^#{1}\s/gm) ?? []).length;
}

function countImages(tree: ContentTree): number {
  if (Array.isArray(tree.assets)) return tree.assets.length;
  const raw = tree.raw ?? "";
  return (raw.match(/!\[/g) ?? []).length;
}

function getSourceLabel(tree: ContentTree): string {
  const fileName = tree.fileName;
  if (fileName && !fileName.startsWith("https://")) return fileName;
  const source = tree.source ?? "";
  const SOURCE_LABELS: Record<string, string> = {
    markdown: "Markdown",
    text: "Plain text",
    docx: "Word document",
    pdf: "PDF",
    "google-docs": "Google Docs",
  };
  return SOURCE_LABELS[source] ?? source;
}

function isValidGoogleDocsUrl(url: string): boolean {
  return url.startsWith("https://docs.google.com/");
}

export function ContentPanel({ projectId }: ContentPanelProps) {
  const [content, setContent] = useState<ContentRecord | null>(null);
  const [editorText, setEditorText] = useState("");
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [googleDocsUrl, setGoogleDocsUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const loadContent = useCallback(async () => {
    setIsLoadingContent(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/content`);
      const json = await res.json();
      if (res.ok && json.data) {
        setContent(json.data as ContentRecord);
        setEditorText(json.data.content_tree?.raw ?? "");
      }
    } catch {
      setError("Failed to load content. Please refresh.");
    } finally {
      setIsLoadingContent(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  function validateFile(file: File): string | null {
    if (!ALLOWED_EXTENSIONS.test(file.name) && !ALLOWED_MIME_TYPES.has(file.type)) {
      return "Unsupported file type. Please upload a .docx, .pdf, .md, or .txt file.";
    }
    const MAX_BYTES = 20 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return "File must be under 20 MB.";
    }
    return null;
  }

  async function uploadFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/v1/projects/${projectId}/content`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message ?? "Upload failed. Please try again.");
        return;
      }

      const record = json.data as ContentRecord;
      setContent(record);
      setEditorText(record.content_tree?.raw ?? "");
    } catch {
      setError("Network error during upload. Please check your connection.");
    } finally {
      setIsUploading(false);
    }
  }

  async function importGoogleDoc() {
    const url = googleDocsUrl.trim();
    if (!url) {
      setError("Please enter a Google Docs URL.");
      return;
    }
    if (!isValidGoogleDocsUrl(url)) {
      setError("Please enter a valid Google Docs URL (starting with https://docs.google.com/).");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("googleDocsUrl", url);

      const res = await fetch(`/api/v1/projects/${projectId}/content`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message ?? "Import failed. Please try again.");
        return;
      }

      const record = json.data as ContentRecord;
      setContent(record);
      setEditorText(record.content_tree?.raw ?? "");
      setGoogleDocsUrl("");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsUploading(false);
    }
  }

  async function saveContent() {
    if (!content) return;
    setError(null);
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: editorText }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message ?? "Save failed. Please try again.");
        return;
      }

      setContent(json.data as ContentRecord);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset so the same file can be re-uploaded
    e.target.value = "";
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  const hasContent = content !== null;
  const tree = content?.content_tree ?? {};
  const wordCount = countWords(editorText);
  const chapterCount = countChapters(tree);
  const imageCount = countImages(tree);
  const sourceLabel = getSourceLabel(tree);
  const hasUnsavedChanges = hasContent && editorText !== (tree.raw ?? "");

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Content</h2>
        {hasContent && (
          <Button
            size="sm"
            variant="primary"
            onClick={saveContent}
            isLoading={isSaving}
            disabled={!hasUnsavedChanges || isSaving}
            aria-label="Save content changes"
          >
            {saveSuccess ? "Saved!" : "Save"}
          </Button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Upload zone */}
      <section aria-labelledby="upload-heading">
        <h3 id="upload-heading" className="sr-only">Upload content</h3>
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={[
            "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            isDragOver
              ? "border-brand-400 bg-brand-50"
              : "border-gray-200 bg-gray-50 hover:border-gray-300",
          ].join(" ")}
        >
          {isUploading ? (
            <Spinner size="md" label="Processing file..." />
          ) : (
            <>
              <div aria-hidden="true" className="mb-2 text-3xl text-gray-300">
                {isDragOver ? "⬇️" : "📄"}
              </div>
              <p className="mb-1 text-sm font-medium text-gray-700">
                {isDragOver ? "Drop to upload" : "Drop files here or click to browse"}
              </p>
              <p className="mb-3 text-xs text-gray-400">
                Supports: .docx .pdf .md .txt (max 20 MB)
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Browse Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf,.md,.txt"
                onChange={handleFileInputChange}
                className="sr-only"
                aria-label="Upload document file"
                tabIndex={-1}
              />
            </>
          )}
        </div>

        {/* Google Docs import */}
        <div className="mt-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200" aria-hidden="true" />
            <span className="text-xs text-gray-400">or paste Google Docs link</span>
            <div className="h-px flex-1 bg-gray-200" aria-hidden="true" />
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={googleDocsUrl}
              onChange={(e) => setGoogleDocsUrl(e.target.value)}
              placeholder="https://docs.google.com/document/d/..."
              aria-label="Google Docs URL"
              className={[
                "flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900",
                "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1",
              ].join(" ")}
              onKeyDown={(e) => e.key === "Enter" && importGoogleDoc()}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={importGoogleDoc}
              isLoading={isUploading}
              disabled={isUploading || !googleDocsUrl.trim()}
              type="button"
            >
              Import
            </Button>
          </div>
        </div>
      </section>

      {/* Editor */}
      <section aria-labelledby="editor-heading" className="flex flex-col gap-2">
        <h3 id="editor-heading" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Editor
        </h3>

        {isLoadingContent ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size="md" label="Loading content..." />
          </div>
        ) : hasContent ? (
          <textarea
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
            aria-label="Document content editor"
            aria-describedby="content-stats"
            spellCheck
            className={[
              "w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900",
              "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1",
              "resize-y leading-relaxed",
            ].join(" ")}
            style={{ minHeight: "400px" }}
          />
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-400">
              No content yet. Upload a file or paste a Google Docs link above.
            </p>
          </div>
        )}
      </section>

      {/* Content stats */}
      {hasContent && (
        <footer
          id="content-stats"
          aria-label="Content statistics"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500"
        >
          <span>
            <span className="font-medium text-gray-700">{wordCount.toLocaleString()}</span> words
          </span>
          <span aria-hidden="true" className="text-gray-200">|</span>
          <span>
            <span className="font-medium text-gray-700">{chapterCount}</span> chapters
          </span>
          <span aria-hidden="true" className="text-gray-200">|</span>
          <span>
            <span className="font-medium text-gray-700">{imageCount}</span> images
          </span>
          <span aria-hidden="true" className="text-gray-200">|</span>
          <span>
            Source: <span className="font-medium text-gray-700">{sourceLabel}</span>
          </span>
        </footer>
      )}
    </div>
  );
}
