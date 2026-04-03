"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { LivePreview } from "@/components/live-preview";
import { WorkspaceTabs } from "@/components/workspace-tabs";
import { ContentPanel } from "@/components/content-panel";
import { StylePicker } from "@/components/style-picker";
import { ChatPanel } from "@/components/chat-panel";
import { ExportPanel } from "@/components/export-panel";
import { PageSettings } from "@/components/page-settings";

interface ReferenceImage {
  id: string;
  name: string;
  thumbnail_url: string | null;
}

interface WorkspaceLayoutProps {
  projectId: string;
  initialCss: string;
  initialBookType?: string;
  sharedReferences: ReferenceImage[];
  activityPanel: React.ReactNode;
}

const DEFAULT_CSS = `body {
  font-family: "Noto Serif", Georgia, serif;
  font-size: 11pt;
  line-height: 1.7;
  color: #1a1a1a;
  padding: 15mm;
}
h1 {
  font-size: 22pt;
  text-align: center;
  margin: 30mm 0 15mm 0;
  font-weight: 700;
  letter-spacing: 0.02em;
}
h2 {
  font-size: 16pt;
  margin: 12mm 0 6mm 0;
  font-weight: 600;
}
h3 {
  font-size: 13pt;
  margin: 8mm 0 4mm 0;
}
p {
  text-indent: 1.5em;
  margin: 0 0 0.3em 0;
}
p:first-of-type {
  text-indent: 0;
}
blockquote {
  margin: 6mm 10mm;
  font-style: italic;
  color: #555;
  border-left: 2pt solid #ccc;
  padding-left: 4mm;
}`;

export function WorkspaceLayout({
  projectId,
  initialCss,
  initialBookType,
  sharedReferences,
  activityPanel,
}: WorkspaceLayoutProps) {
  const [currentCss, setCurrentCss] = useState(initialCss || DEFAULT_CSS);
  const [contentRaw, setContentRaw] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [pageWidth, setPageWidth] = useState(210);
  const [pageHeight, setPageHeight] = useState(297);

  const fetchContent = useCallback(async () => {
    setIsLoadingContent(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/content`);
      const json = await res.json();
      if (res.ok && json.data) {
        const raw = json.data.content_tree?.raw ?? null;
        setContentRaw(typeof raw === "string" ? raw : null);
      }
    } catch {
      // Non-critical
    } finally {
      setIsLoadingContent(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const bodyHtml = useMemo(() => {
    if (!contentRaw) return "";
    // Split by double newlines to form paragraphs
    return contentRaw
      .split(/\n{2,}/)
      .map((block) => {
        const t = block.trim();
        if (!t) return "";
        if (t.startsWith("### ")) return `<h3>${t.slice(4)}</h3>`;
        if (t.startsWith("## ")) return `<h2>${t.slice(3)}</h2>`;
        if (t.startsWith("# ")) return `<h1>${t.slice(2)}</h1>`;
        if (t.startsWith("> ")) return `<blockquote><p>${t.slice(2)}</p></blockquote>`;
        // Preserve line breaks within a block
        const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
        return lines.map((l) => `<p>${l}</p>`).join("\n");
      })
      .filter(Boolean)
      .join("\n");
  }, [contentRaw]);

  const previewHtml = useMemo(() => {
    if (isLoadingContent) {
      return `<!DOCTYPE html><html><head><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;color:#9ca3af;margin:0}</style></head><body><p>Loading...</p></body></html>`;
    }
    if (!contentRaw) {
      return `<!DOCTYPE html><html><head><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;color:#9ca3af;margin:0}</style></head><body><div style="text-align:center"><p style="font-size:36px;margin:0">📄</p><p>Upload content in the Content tab</p></div></body></html>`;
    }

    // Clean CSS for browser preview:
    // 1. Remove @page rules (handled by page container div)
    // 2. Convert CMYK colors to RGB equivalents
    // 3. Keep CSS variables (tokens should be loaded with the template)
    const cleanCss = currentCss
      .replace(/@page\s*[^{]*\{[^}]*\}/g, "")
      .replace(/@page\s*:[^{]*\{[^}]*\}/g, "")
      .replace(/cmyk\(0%,\s*0%,\s*0%,\s*100%\)/g, "#000000")
      .replace(/cmyk\(60%,\s*40%,\s*40%,\s*100%\)/g, "#0a0a0a")
      .replace(/cmyk\(0%,\s*0%,\s*0%,\s*80%\)/g, "#333333")
      .replace(/cmyk\(0%,\s*0%,\s*0%,\s*50%\)/g, "#808080")
      .replace(/cmyk\(0%,\s*0%,\s*0%,\s*20%\)/g, "#cccccc")
      .replace(/cmyk\(0%,\s*0%,\s*0%,\s*10%\)/g, "#e6e6e6")
      .replace(/cmyk\(0%,\s*0%,\s*0%,\s*0%\)/g, "#ffffff")
      .replace(/cmyk\([^)]+\)/g, "#333333");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; }
html { background: #e5e7eb; }
body { margin: 0; padding: 0; }
.page {
  width: ${pageWidth}mm;
  min-height: ${pageHeight}mm;
  background: white;
  margin: 10px auto;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  overflow: hidden;
  position: relative;
}
.page-content {
  padding: 15mm;
  column-count: 1;
}
${cleanCss}
</style>
</head>
<body>
<div class="page">
<div class="page-content">
${bodyHtml}
</div>
</div>
</body>
</html>`;
  }, [currentCss, bodyHtml, contentRaw, isLoadingContent, pageWidth, pageHeight]);

  function handleContentChange() {
    fetchContent();
  }

  function handleStyleChangeFromChat(css: string) {
    if (css) setCurrentCss(css);
  }

  function handleStyleApplied(_bookType: string, css: string) {
    if (css) setCurrentCss(css);
  }

  function handlePageSettingsChange(pageRule: string, width: number, height: number) {
    setPageWidth(width);
    setPageHeight(height);
  }

  function handleUndoRedoCss(css: string) {
    if (css) setCurrentCss(css);
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Live preview */}
      <div className="hidden w-[55%] shrink-0 border-r border-gray-200 lg:flex lg:flex-col">
        <LivePreview htmlContent={previewHtml} />
      </div>

      {/* Right: Tabbed panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <WorkspaceTabs
          projectId={projectId}
          contentPanel={
            <ContentPanel
              projectId={projectId}
              onContentChange={handleContentChange}
            />
          }
          layoutPanel={
            <div className="flex flex-col gap-6 p-4 overflow-auto">
              <PageSettings onPageSettingsChange={handlePageSettingsChange} />
              <div className="border-t border-gray-200 pt-4">
                <StylePicker
                  projectId={projectId}
                  initialBookType={initialBookType}
                  sharedReferences={sharedReferences}
                  onStyleApplied={handleStyleApplied}
                />
              </div>
            </div>
          }
          chatPanel={
            <ChatPanel
              projectId={projectId}
              initialCss={currentCss}
              onStyleChange={handleStyleChangeFromChat}
              onUndoRedoCss={handleUndoRedoCss}
            />
          }
          exportPanel={<ExportPanel projectId={projectId} />}
          activityPanel={activityPanel}
        />
      </div>
    </div>
  );
}
