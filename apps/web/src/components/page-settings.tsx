"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PageSize {
  id: string;
  label: string;
  width: number;
  height: number;
}

const PAGE_SIZES: PageSize[] = [
  { id: "a4", label: "A4", width: 210, height: 297 },
  { id: "a5", label: "A5", width: 148, height: 210 },
  { id: "us-letter", label: "US Letter", width: 216, height: 279 },
  { id: "us-trade", label: "US Trade (6x9)", width: 152, height: 229 },
  { id: "custom", label: "Custom", width: 210, height: 297 },
];

interface BleedOption {
  id: string;
  label: string;
  value: number;
}

const BLEED_OPTIONS: BleedOption[] = [
  { id: "none", label: "No Bleed", value: 0 },
  { id: "3mm", label: "3mm", value: 3 },
  { id: "5mm", label: "5mm", value: 5 },
];

const MIN_DIMENSION_MM = 50;
const MAX_DIMENSION_MM = 500;

interface PageSettingsProps {
  onPageSettingsChange: (pageRule: string) => void;
}

function buildPageRule(
  width: number,
  height: number,
  bleed: number,
): string {
  const bleedBlock =
    bleed > 0
      ? `\n  bleed: ${bleed}mm;\n  marks: crop cross;`
      : "";

  return `@page {
  size: ${width}mm ${height}mm;
  margin: 20mm 15mm 25mm 20mm;${bleedBlock}
}`;
}

export function PageSettings({ onPageSettingsChange }: PageSettingsProps) {
  const [selectedSizeId, setSelectedSizeId] = useState("a4");
  const [customWidth, setCustomWidth] = useState(210);
  const [customHeight, setCustomHeight] = useState(297);
  const [selectedBleedId, setSelectedBleedId] = useState("none");

  const isCustom = selectedSizeId === "custom";

  function handleApply() {
    const size = PAGE_SIZES.find((s) => s.id === selectedSizeId);
    const bleed = BLEED_OPTIONS.find((b) => b.id === selectedBleedId);
    if (!size || !bleed) return;

    const width = isCustom ? customWidth : size.width;
    const height = isCustom ? customHeight : size.height;
    const pageRule = buildPageRule(width, height, bleed.value);
    onPageSettingsChange(pageRule);
  }

  function handleSizeChange(sizeId: string) {
    setSelectedSizeId(sizeId);
    const size = PAGE_SIZES.find((s) => s.id === sizeId);
    if (size && sizeId !== "custom") {
      setCustomWidth(size.width);
      setCustomHeight(size.height);
    }
  }

  function clampDimension(value: number): number {
    return Math.min(MAX_DIMENSION_MM, Math.max(MIN_DIMENSION_MM, value));
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Page Size
      </h3>

      <div
        role="radiogroup"
        aria-label="Page size"
        className="grid grid-cols-2 gap-2"
      >
        {PAGE_SIZES.map((size) => {
          const isSelected = selectedSizeId === size.id;
          return (
            <button
              key={size.id}
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSizeChange(size.id)}
              className={[
                "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isSelected
                  ? "border-blue-500 bg-blue-50 font-medium text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-blue-200",
              ].join(" ")}
            >
              <span className="block">{size.label}</span>
              {size.id !== "custom" && (
                <span className="block text-xs text-gray-400">
                  {size.width} x {size.height} mm
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isCustom && (
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-gray-500">Width (mm)</span>
            <input
              type="number"
              min={MIN_DIMENSION_MM}
              max={MAX_DIMENSION_MM}
              value={customWidth}
              onChange={(e) => setCustomWidth(clampDimension(Number(e.target.value)))}
              aria-label="Custom page width in millimeters"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-gray-500">Height (mm)</span>
            <input
              type="number"
              min={MIN_DIMENSION_MM}
              max={MAX_DIMENSION_MM}
              value={customHeight}
              onChange={(e) => setCustomHeight(clampDimension(Number(e.target.value)))}
              aria-label="Custom page height in millimeters"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
      )}

      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Bleed
      </h3>

      <div
        role="radiogroup"
        aria-label="Bleed setting"
        className="flex gap-2"
      >
        {BLEED_OPTIONS.map((option) => {
          const isSelected = selectedBleedId === option.id;
          return (
            <button
              key={option.id}
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelectedBleedId(option.id)}
              className={[
                "flex-1 rounded-md border px-3 py-2 text-center text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isSelected
                  ? "border-blue-500 bg-blue-50 font-medium text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-blue-200",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleApply}
          aria-label="Apply page size and bleed settings"
        >
          Apply Page Settings
        </Button>
      </div>
    </div>
  );
}
