"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PreflightResults } from "@/components/preflight-results";
import type { PreflightResult } from "@typeset-ai/core";

type ExportFormat = "pdf" | "proof" | "idml" | "svg";

interface ExportPanelProps {
  projectId: string;
}

interface ExportState {
  isRunning: boolean;
  format: ExportFormat | null;
  error: string | null;
}

const INITIAL_EXPORT_STATE: ExportState = {
  isRunning: false,
  format: null,
  error: null,
};

export function ExportPanel({ projectId }: ExportPanelProps) {
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [isCheckingPreflight, setIsCheckingPreflight] = useState(false);
  const [exportState, setExportState] = useState<ExportState>(INITIAL_EXPORT_STATE);

  async function runPreflight() {
    setIsCheckingPreflight(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/preflight`);
      const json = await res.json();
      if (res.ok) {
        setPreflight(json.data);
      }
    } catch {
      // Non-critical — user can still attempt export
    } finally {
      setIsCheckingPreflight(false);
    }
  }

  async function downloadExport(format: ExportFormat) {
    setExportState({ isRunning: true, format, error: null });

    try {
      const url =
        format === "proof"
          ? `/api/v1/projects/${projectId}/export/pdf?proof=true`
          : `/api/v1/projects/${projectId}/export/${format}`;

      const res = await fetch(url, { method: "POST" });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setExportState({
          isRunning: false,
          format: null,
          error: json.error?.message ?? "Export failed. Please try again.",
        });
        return;
      }

      // Trigger download from the binary response
      const blob = await res.blob();
      const extension = { pdf: "pdf", proof: "pdf", idml: "idml", svg: "zip" }[format];
      const filename = `export.${extension}`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(objectUrl);

      setExportState(INITIAL_EXPORT_STATE);
    } catch {
      setExportState({
        isRunning: false,
        format: null,
        error: "Network error during export. Please check your connection.",
      });
    }
  }

  const hasErrors = (preflight?.errors ?? []).length > 0;

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Preflight */}
      <section aria-labelledby="preflight-heading">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="preflight-heading" className="text-sm font-semibold text-gray-700">
            Preflight Check
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={runPreflight}
            isLoading={isCheckingPreflight}
          >
            Run Check
          </Button>
        </div>

        {!preflight && !isCheckingPreflight && (
          <p className="text-sm text-gray-500">
            Run a preflight check to verify your document is ready for export.
          </p>
        )}

        {isCheckingPreflight && (
          <div className="flex justify-center py-4">
            <Spinner size="sm" label="Running preflight checks..." />
          </div>
        )}

        {preflight && !isCheckingPreflight && (
          <PreflightResults result={preflight} />
        )}
      </section>

      {/* Export error */}
      {exportState.error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {exportState.error}
        </div>
      )}

      {/* Export buttons */}
      <section aria-labelledby="export-heading">
        <h2 id="export-heading" className="mb-3 text-sm font-semibold text-gray-700">
          Download
        </h2>

        {hasErrors && (
          <div role="status" className="mb-3 rounded-md bg-yellow-50 px-4 py-3 text-xs text-yellow-700">
            Preflight errors found. You can still export, but the output may have issues.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <ExportButton
            label="Print PDF"
            description="Press-ready PDF with crop marks"
            format="pdf"
            exportState={exportState}
            onExport={downloadExport}
          />
          <ExportButton
            label="Proof PDF"
            description="RGB PDF for screen review"
            format="proof"
            exportState={exportState}
            onExport={downloadExport}
          />
          <ExportButton
            label="IDML"
            description="InDesign compatible file"
            format="idml"
            exportState={exportState}
            onExport={downloadExport}
          />
          <ExportButton
            label="SVG Pages"
            description="Vector pages as ZIP"
            format="svg"
            exportState={exportState}
            onExport={downloadExport}
          />
        </div>
      </section>
    </div>
  );
}

interface ExportButtonProps {
  label: string;
  description: string;
  format: ExportFormat;
  exportState: ExportState;
  onExport: (format: ExportFormat) => void;
}

function ExportButton({
  label,
  description,
  format,
  exportState,
  onExport,
}: ExportButtonProps) {
  const isThisFormat = exportState.format === format;
  const isAnyRunning = exportState.isRunning;

  return (
    <button
      onClick={() => !isAnyRunning && onExport(format)}
      disabled={isAnyRunning}
      aria-label={`${label}: ${description}`}
      aria-busy={isThisFormat}
      className={[
        "flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        "disabled:cursor-not-allowed",
        isThisFormat
          ? "border-brand-300 bg-brand-50"
          : "border-gray-200 bg-white hover:border-brand-200 hover:bg-brand-50",
      ].join(" ")}
    >
      {isThisFormat && exportState.isRunning ? (
        <Spinner size="sm" label={`Generating ${label}...`} />
      ) : (
        <span className="text-sm font-medium text-gray-900">{label}</span>
      )}
      <span className="text-xs text-gray-500">{description}</span>
    </button>
  );
}
