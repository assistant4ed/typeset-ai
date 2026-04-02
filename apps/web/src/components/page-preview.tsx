"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface PagePreviewProps {
  projectId: string;
  pageCount: number;
  currentCss: string;
}

export function PagePreview({
  projectId: _projectId,
  pageCount,
  currentCss: _currentCss,
}: PagePreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading] = useState(false);

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < pageCount;

  function goToPrev() {
    if (canGoPrev) setCurrentPage((p) => p - 1);
  }

  function goToNext() {
    if (canGoNext) setCurrentPage((p) => p + 1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") goToPrev();
    if (e.key === "ArrowRight") goToNext();
  }

  return (
    <div
      className="flex h-full flex-col bg-gray-100"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Page preview. Use arrow keys to navigate pages."
    >
      {/* Preview area */}
      <div className="flex flex-1 items-center justify-center p-6">
        {isLoading ? (
          <Spinner size="lg" label="Rendering page..." />
        ) : (
          <div
            role="img"
            aria-label={`Page ${currentPage} of ${pageCount}`}
            className="aspect-[3/4] w-full max-w-sm rounded-lg bg-white shadow-xl ring-1 ring-gray-200 flex items-center justify-center"
          >
            <div className="text-center text-gray-300">
              <p className="text-sm font-medium">Page {currentPage}</p>
              <p className="text-xs mt-1">Preview renders here</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation controls */}
      <div
        aria-label="Page navigation"
        className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 py-3"
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={goToPrev}
          disabled={!canGoPrev}
          aria-label="Previous page"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Prev
        </Button>

        <div className="flex items-center gap-2">
          <label htmlFor="page-input" className="sr-only">
            Go to page
          </label>
          <input
            id="page-input"
            type="number"
            min={1}
            max={pageCount}
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (val >= 1 && val <= pageCount) setCurrentPage(val);
            }}
            className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label={`Page ${currentPage} of ${pageCount}`}
          />
          <span className="text-sm text-gray-500">of {pageCount}</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={goToNext}
          disabled={!canGoNext}
          aria-label="Next page"
        >
          Next
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
