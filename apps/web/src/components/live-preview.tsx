"use client";

import { useState, useCallback } from "react";

const MIN_SCALE = 0.25;
const MAX_SCALE = 1.5;
const DEFAULT_SCALE = 0.5;
const SCALE_STEP = 0.1;

interface LivePreviewProps {
  htmlContent: string;
  scale?: number;
  onScaleChange?: (scale: number) => void;
}

export function LivePreview({
  htmlContent,
  scale: controlledScale,
  onScaleChange,
}: LivePreviewProps) {
  const [internalScale, setInternalScale] = useState(DEFAULT_SCALE);
  const [isLoading, setIsLoading] = useState(true);

  const scale = controlledScale ?? internalScale;

  function updateScale(newScale: number) {
    const clamped = parseFloat(
      Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale)).toFixed(2),
    );
    setInternalScale(clamped);
    onScaleChange?.(clamped);
  }

  function zoomOut() {
    updateScale(scale - SCALE_STEP);
  }

  function zoomIn() {
    updateScale(scale + SCALE_STEP);
  }

  function resetZoom() {
    updateScale(DEFAULT_SCALE);
  }

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

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
            -
          </button>
          <span
            className="text-sm text-gray-600 w-12 text-center"
            aria-live="polite"
            aria-atomic="true"
          >
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
      <div
        className="flex-1 overflow-auto bg-gray-100"
        style={{ height: "calc(100vh - 50px)" }}
      >
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <span className="text-sm text-gray-400">Rendering preview...</span>
          </div>
        )}
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            width: `${100 / scale}%`,
          }}
        >
          <iframe
            srcDoc={htmlContent}
            title="Page preview"
            className="border-0 w-full bg-transparent"
            style={{
              minHeight: "200vh",
              display: "block",
            }}
            onLoad={handleLoad}
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      </div>
    </div>
  );
}
