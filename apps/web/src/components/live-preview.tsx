"use client";

import { useState, useEffect, useCallback } from "react";

import { Spinner } from "@/components/ui/spinner";

const MIN_SCALE = 20;
const MAX_SCALE = 150;
const DEFAULT_SCALE = 50;
const SCALE_STEP = 10;
const MM_TO_PX_AT_96DPI = 3.78;

interface LivePreviewProps {
  projectId: string;
  currentDesign: string;
  pageWidth: number;
  pageHeight: number;
  bleed: number;
  refreshTrigger: number;
}

export function LivePreview({
  projectId,
  currentDesign,
  pageWidth,
  pageHeight,
  bleed,
  refreshTrigger,
}: LivePreviewProps) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(DEFAULT_SCALE);

  const renderPreview = useCallback(async () => {
    setIsRendering(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/render-preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            designMarkup: currentDesign,
            pageWidth,
            pageHeight,
            bleed,
          }),
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          (json as Record<string, Record<string, string>>).error?.message ??
            `Render failed (${res.status})`,
        );
      }

      const json = (await res.json()) as {
        data?: { html?: string; pages?: string[] };
      };
      setPreviewHtml(json.data?.html ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Preview failed",
      );
    } finally {
      setIsRendering(false);
    }
  }, [projectId, currentDesign, pageWidth, pageHeight, bleed]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview, refreshTrigger]);

  function zoomOut() {
    setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP));
  }

  function zoomIn() {
    setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP));
  }

  function resetZoom() {
    setScale(DEFAULT_SCALE);
  }

  const isFirstLoad = isRendering && !previewHtml;
  const hasContent = !!previewHtml;
  const isEmpty = !error && !hasContent && !isRendering;

  return (
    <div className="flex flex-col h-full">
      {/* Controls bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Preview</span>
          {hasContent && (
            <span
              className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"
              aria-live="polite"
            >
              Preview ready
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Zoom out"
          >
            &minus;
          </button>
          <span
            className="text-xs text-gray-500 w-10 text-center"
            aria-live="polite"
            aria-atomic="true"
          >
            {scale}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={resetZoom}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 ml-1"
          >
            Fit
          </button>
          <button
            onClick={renderPreview}
            disabled={isRendering}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 ml-2"
            aria-label={isRendering ? "Rendering in progress" : "Refresh preview"}
          >
            {isRendering ? "..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Pages display */}
      <div className="flex-1 overflow-auto bg-gray-200 p-6">
        {isFirstLoad && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Spinner size="lg" label="Typesetting..." />
            <p className="text-sm text-gray-500">
              Rendering with Typst engine...
            </p>
          </div>
        )}

        {error && !isRendering && (
          <div className="flex items-center justify-center h-full">
            <div
              className="bg-red-50 text-red-700 rounded-lg px-6 py-4 text-sm max-w-md text-center"
              role="alert"
            >
              <p className="font-medium">Render failed</p>
              <p className="mt-1 text-red-500 text-xs">{error}</p>
              <button
                onClick={renderPreview}
                className="mt-3 px-4 py-1.5 bg-red-100 rounded hover:bg-red-200 text-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-2" aria-hidden="true">
                &mdash;
              </p>
              <p className="text-sm">Upload content and apply a style</p>
            </div>
          </div>
        )}

        {hasContent && (
          <div className="relative">
            {isRendering && (
              <div
                className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full z-10 shadow"
                role="status"
              >
                Updating...
              </div>
            )}
            <div
              style={{
                transform: `scale(${scale / 100})`,
                transformOrigin: "top center",
                width: `${100 / (scale / 100)}%`,
              }}
            >
              <iframe
                srcDoc={previewHtml ?? ""}
                title="Typeset preview"
                className="w-full border-0 bg-transparent"
                style={{ minHeight: "200vh", height: "3000px" }}
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
