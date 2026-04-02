import type { ContentTree, PreflightIssue, PreflightResult } from "./types.js";

const MIN_PRINT_DPI = 300;
const CRITICAL_MIN_DPI = 72;

function checkImageResolution(content: ContentTree): PreflightIssue[] {
  const issues: PreflightIssue[] = [];

  for (const asset of content.assets) {
    if (asset.dpi > 0 && asset.dpi < CRITICAL_MIN_DPI) {
      issues.push({
        severity: "error",
        code: "VERY_LOW_DPI",
        message: `Image "${asset.originalName}" is ${asset.dpi} DPI — minimum for print is ${CRITICAL_MIN_DPI} DPI. Image will appear pixelated.`,
        element: asset.localPath,
      });
    } else if (asset.dpi > 0 && asset.dpi < MIN_PRINT_DPI) {
      issues.push({
        severity: "warning",
        code: "LOW_DPI",
        message: `Image "${asset.originalName}" is ${asset.dpi} DPI — recommended minimum for print is ${MIN_PRINT_DPI} DPI.`,
        element: asset.localPath,
      });
    }
  }

  return issues;
}

function checkCssPageRules(css: string): PreflightIssue[] {
  const issues: PreflightIssue[] = [];

  if (!css.includes("@page")) {
    issues.push({
      severity: "warning",
      code: "NO_PAGE_RULE",
      message:
        "CSS has no @page rule. Page dimensions, margins, and print settings may use browser defaults.",
    });
  }

  if (/\d+px/.test(css)) {
    issues.push({
      severity: "warning",
      code: "PX_UNITS",
      message:
        "CSS uses pixel (px) units. For print, use mm, cm, in, or pt instead.",
    });
  }

  if (css.includes("@page") && !css.includes("bleed")) {
    issues.push({
      severity: "warning",
      code: "NO_BLEED",
      message:
        "No bleed defined in @page rule. Print shops typically require 3mm bleed for full-bleed elements.",
    });
  }

  return issues;
}

export function runPreflight(
  content: ContentTree,
  css: string,
): PreflightResult {
  const allIssues = [
    ...checkImageResolution(content),
    ...checkCssPageRules(css),
  ];

  const errors = allIssues.filter((i) => i.severity === "error");
  const warnings = allIssues.filter((i) => i.severity === "warning");

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
