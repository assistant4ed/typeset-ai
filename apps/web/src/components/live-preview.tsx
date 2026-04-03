"use client";

import { useState, useEffect, useCallback } from "react";
import { Spinner } from "@/components/ui/spinner";

const MIN_SCALE = 0.25;
const MAX_SCALE = 1.5;
const DEFAULT_SCALE = 0.5;
const SCALE_STEP = 0.1;

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

interface LivePreviewProps {
  projectId: string;
  refreshKey?: number;
}

export function LivePreview({ projectId, refreshKey = 0 }: LivePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [scale, setScale] = useState(DEFAULT_SCALE);

  const previewUrl = `/api/v1/projects/${projectId}/preview?t=${refreshKey}`;

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [refreshKey]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  function zoomOut() {
    setScale((s) => Math.max(MIN_SCALE, parseFloat((s - SCALE_STEP).toFixed(2))));
  }

  function zoomIn() {
    setScale((s) => Math.min(MAX_SCALE, parseFloat((s + SCALE_STEP).toFixed(2))));
  }

  function resetZoom() {
    setScale(DEFAULT_SCALE);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Zoom controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        <span className="text-sm text-gray-600">Preview</span>
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="text-sm text-gray-600 w-12 text-center" aria-live="polite" aria-atomic="true">
            {Math.round(scale * 100)}%
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
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Spinner label="Loading preview..." />
          </div>
        )}
        {hasError && !isLoading && (
          <div className="flex items-center justify-center h-full text-red-500 text-sm">
            Failed to load preview
          </div>
        )}
        {/* Page container — sized to match the scaled A4 dimensions */}
        <div
          className="mx-auto bg-white shadow-lg overflow-hidden"
          style={{
            width: `${PAGE_WIDTH_MM * scale}mm`,
            minHeight: `${PAGE_HEIGHT_MM * scale}mm`,
          }}
          aria-hidden={isLoading || hasError}
        >
          <iframe
            key={refreshKey}
            src={previewUrl}
            title="Page preview"
            className="border-0"
            style={{
              width: `${PAGE_WIDTH_MM / scale}mm`,
              height: `${PAGE_HEIGHT_MM / scale}mm`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              display: "block",
            }}
            onLoad={handleLoad}
            onError={handleError}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
