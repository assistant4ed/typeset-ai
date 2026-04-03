"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface BookTypeOption {
  id: string;
  name: string;
  icon: string;
  desc: string;
  pageSize: string;
}

const BOOK_TYPES: BookTypeOption[] = [
  {
    id: "novel",
    name: "Novel",
    icon: "📖",
    desc: "Single column, serif text, elegant chapter openers",
    pageSize: "129mm × 198mm",
  },
  {
    id: "coffee-table",
    name: "Coffee Table",
    icon: "📷",
    desc: "Large format, full-bleed images, minimal text",
    pageSize: "280mm × 280mm",
  },
  {
    id: "children-book",
    name: "Children's Book",
    icon: "🧒",
    desc: "Square format, large text, centered illustrations",
    pageSize: "250mm × 250mm",
  },
  {
    id: "textbook",
    name: "Textbook",
    icon: "📚",
    desc: "Multi-column, sidebars, running headers",
    pageSize: "A4",
  },
  {
    id: "catalog",
    name: "Catalog",
    icon: "📋",
    desc: "Grid layout, product cards, compact text",
    pageSize: "A4",
  },
  {
    id: "corporate-report",
    name: "Corporate Report",
    icon: "🏢",
    desc: "Professional, data tables, charts, brand colors",
    pageSize: "A4",
  },
  {
    id: "magazine",
    name: "Magazine",
    icon: "📰",
    desc: "Multi-column, pull quotes, dynamic layouts",
    pageSize: "210mm × 275mm",
  },
];

const ALLOWED_UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

interface ReferenceImage {
  id: string;
  name: string;
  thumbnail_url: string | null;
}

interface StylePickerProps {
  projectId: string;
  initialBookType?: string;
  sharedReferences?: ReferenceImage[];
  onStyleApplied?: (bookType: string, css: string) => void;
}

export function StylePicker({
  projectId,
  initialBookType,
  sharedReferences = [],
  onStyleApplied,
}: StylePickerProps) {
  const [selectedBookType, setSelectedBookType] = useState<string | null>(
    initialBookType ?? null
  );
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(file: File) {
    setUploadError(null);

    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      setUploadError("Only PNG, JPEG, WebP, or PDF files are accepted.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("File must be under 10 MB.");
      return;
    }

    setUploadedFile(file);
    setSelectedReference(null);

    if (file.type !== "application/pdf") {
      const url = URL.createObjectURL(file);
      setUploadPreviewUrl(url);
    } else {
      setUploadPreviewUrl(null);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  async function handleApplyStyle() {
    if (!selectedBookType && !uploadedFile && !selectedReference) return;

    setIsApplying(true);
    setApplyError(null);

    try {
      let referenceImageBase64: string | undefined;

      if (uploadedFile) {
        const buffer = await uploadedFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        referenceImageBase64 = btoa(binary);
      }

      const body: Record<string, unknown> = {};
      if (selectedBookType) body.bookType = selectedBookType;
      if (referenceImageBase64) body.referenceImageBase64 = referenceImageBase64;
      if (selectedReference) body.referenceTemplateId = selectedReference;

      const res = await fetch(`/api/v1/projects/${projectId}/style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        setApplyError(json.error?.message ?? "Failed to apply style. Please try again.");
        return;
      }

      onStyleApplied?.(selectedBookType ?? "", json.data?.css ?? "");
    } catch {
      setApplyError("Network error. Please check your connection and try again.");
    } finally {
      setIsApplying(false);
    }
  }

  const canApply = Boolean(selectedBookType || uploadedFile || selectedReference);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-sm font-semibold text-gray-700">Choose a Design Style</h2>

      {/* Built-in book type grid */}
      <div
        role="radiogroup"
        aria-label="Book design styles"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {BOOK_TYPES.map((bookType) => {
          const isSelected = selectedBookType === bookType.id;
          return (
            <button
              key={bookType.id}
              role="radio"
              aria-checked={isSelected}
              onClick={() => {
                setSelectedBookType(bookType.id);
                setSelectedReference(null);
              }}
              className={[
                "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                "cursor-pointer",
                isSelected
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                  : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50",
              ].join(" ")}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="text-2xl" aria-hidden="true">
                  {bookType.icon}
                </span>
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3 w-3"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{bookType.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">{bookType.desc}</p>
                <p className="mt-1 text-xs font-medium text-gray-400">{bookType.pageSize}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Reference image upload */}
      <div>
        <div className="relative mb-3 flex items-center">
          <div className="flex-1 border-t border-gray-200" aria-hidden="true" />
          <span className="mx-3 text-xs text-gray-400">Or upload a reference design</span>
          <div className="flex-1 border-t border-gray-200" aria-hidden="true" />
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a reference image or PDF"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={[
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            isDragOver
              ? "border-blue-400 bg-blue-50"
              : uploadedFile
              ? "border-blue-300 bg-blue-50"
              : "border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50",
          ].join(" ")}
        >
          {uploadedFile ? (
            <>
              {uploadPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={uploadPreviewUrl}
                  alt="Uploaded reference preview"
                  className="max-h-32 max-w-full rounded object-contain"
                />
              ) : (
                <span className="text-3xl" aria-hidden="true">
                  📄
                </span>
              )}
              <p className="text-sm font-medium text-gray-700">{uploadedFile.name}</p>
              <p className="text-xs text-gray-500">Click to replace</p>
            </>
          ) : (
            <>
              <span className="text-3xl" aria-hidden="true">
                🖼️
              </span>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Drop an image or PDF of a design you'd like to match
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPEG, WebP, or PDF up to 10 MB
                </p>
              </div>
              <span className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm">
                Browse
              </span>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleInputChange}
        />

        {uploadError && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {uploadError}
          </p>
        )}
      </div>

      {/* Shared reference library */}
      {sharedReferences.length > 0 && (
        <div>
          <div className="relative mb-3 flex items-center">
            <div className="flex-1 border-t border-gray-200" aria-hidden="true" />
            <span className="mx-3 text-xs text-gray-400">Shared Reference Library</span>
            <div className="flex-1 border-t border-gray-200" aria-hidden="true" />
          </div>

          <p className="mb-3 text-xs text-gray-500">Admin-uploaded reference designs</p>

          <div
            role="radiogroup"
            aria-label="Shared reference designs"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {sharedReferences.map((ref) => {
              const isSelected = selectedReference === ref.id;
              return (
                <button
                  key={ref.id}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setSelectedReference(ref.id);
                    setSelectedBookType(null);
                    setUploadedFile(null);
                    setUploadPreviewUrl(null);
                  }}
                  className={[
                    "flex flex-col items-start overflow-hidden rounded-lg border text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    "cursor-pointer",
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-500"
                      : "border-gray-200 hover:border-blue-300",
                  ].join(" ")}
                >
                  <div className="relative h-24 w-full bg-gray-100">
                    {ref.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ref.thumbnail_url}
                        alt={ref.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        <span className="text-3xl" aria-hidden="true">
                          🖼️
                        </span>
                      </div>
                    )}
                    {isSelected && (
                      <span
                        aria-hidden="true"
                        className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-3 w-3"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="px-3 py-2 text-xs font-medium text-gray-700">{ref.name}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Error message */}
      {applyError && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {applyError}
        </div>
      )}

      {/* Apply button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="md"
          disabled={!canApply || isApplying}
          isLoading={isApplying}
          onClick={handleApplyStyle}
          aria-label="Apply selected design style to project"
        >
          Apply Style
        </Button>
      </div>
    </div>
  );
}
