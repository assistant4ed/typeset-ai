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

const DEFAULT_CSS = `@page {
  size: 210mm 297mm;
  margin: 20mm 15mm 25mm 20mm;
}
body {
  font-family: Georgia, serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #1a1a1a;
}
h1 {
  font-size: 24pt;
  text-align: center;
  margin-top: 40mm;
  margin-bottom: 20mm;
}
h2 {
  font-size: 18pt;
  margin-top: 15mm;
  margin-bottom: 8mm;
}
h3 {
  font-size: 14pt;
  margin-top: 10mm;
  margin-bottom: 5mm;
}
p {
  text-indent: 1.5em;
  margin: 0 0 0.5em 0;
}
p:first-of-type {
  text-indent: 0;
}
blockquote {
  margin: 8mm 15mm;
  font-style: italic;
  color: #555;
  border-left: 2pt solid #ddd;
  padding-left: 5mm;
}
.chapter {
  break-before: page;
}
.chapter:first-child {
  break-before: auto;
}
p, h2, h3, li {
  orphans: 2;
  widows: 2;
}`;

const SCREEN_STYLES = `@media screen {
  body {
    background: #e5e7eb;
    margin: 0;
    padding: 20px 0;
  }
  .pagedjs_pages {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 20px;
    padding: 20px;
  }
  .pagedjs_page {
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    flex-shrink: 0;
  }
}`;

const PLACEHOLDER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body {
    font-family: system-ui, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    color: #9ca3af;
    margin: 0;
  }
</style>
</head>
<body>
  <div style="text-align:center">
    <p style="font-size:48px;margin:0">Upload content to see preview</p>
  </div>
</body>
</html>`;

function buildStyledHtml(raw: string): string {
  const lines = raw.split("\n");
  const chapters: string[] = [];
  let currentChapter = "";
  let currentSection = "";
  let chapterNum = 0;
  let inChapter = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("# ") || (!inChapter && trimmed.length > 0)) {
      if (currentSection) {
        currentChapter += `${currentSection}</section>\n`;
        currentSection = "";
      }
      if (inChapter) {
        chapters.push(`${currentChapter}</section>\n`);
        currentChapter = "";
      }

      chapterNum++;
      const title = trimmed.startsWith("# ") ? trimmed.slice(2) : `Section ${chapterNum}`;
      currentChapter = `<section class="chapter" data-chapter="${chapterNum}">\n<h1>${title}</h1>\n`;
      inChapter = true;

      if (!trimmed.startsWith("# ")) {
        currentSection = `<section class="section">\n<p>${trimmed}</p>\n`;
      }
      continue;
    }

    if (trimmed.startsWith("## ")) {
      if (currentSection) {
        currentChapter += `${currentSection}</section>\n`;
      }
      currentSection = `<section class="section">\n<h2>${trimmed.slice(3)}</h2>\n`;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      if (!currentSection) currentSection = `<section class="section">\n`;
      currentSection += `<h3>${trimmed.slice(4)}</h3>\n`;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      if (!currentSection) currentSection = `<section class="section">\n`;
      currentSection += `<blockquote><p>${trimmed.slice(2)}</p></blockquote>\n`;
      continue;
    }

    if (!inChapter) {
      chapterNum++;
      currentChapter = `<section class="chapter" data-chapter="${chapterNum}">\n`;
      inChapter = true;
    }
    if (!currentSection) currentSection = `<section class="section">\n`;
    currentSection += `<p>${trimmed}</p>\n`;
  }

  if (currentSection) currentChapter += `${currentSection}</section>\n`;
  if (inChapter) chapters.push(`${currentChapter}</section>\n`);

  if (chapters.length === 0) {
    const paragraphs = raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => `<p>${l.trim()}</p>`)
      .join("\n");
    return `<section class="chapter" data-chapter="1">\n<section class="section">\n${paragraphs}\n</section>\n</section>`;
  }

  return chapters.join("\n");
}

function replacePageRule(css: string, newPageRule: string): string {
  const pageRuleRegex = /@page\s*\{[^}]*\}/;
  if (pageRuleRegex.test(css)) {
    return css.replace(pageRuleRegex, newPageRule);
  }
  return `${newPageRule}\n${css}`;
}

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

  const fetchContent = useCallback(async () => {
    setIsLoadingContent(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/content`);
      const json = await res.json();
      if (res.ok && json.data) {
        const raw = json.data.content_tree?.raw ?? null;
        setContentRaw(raw);
      }
    } catch {
      // Content loading failure is non-critical for initial render
    } finally {
      setIsLoadingContent(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const previewHtml = useMemo(() => {
    if (isLoadingContent) return PLACEHOLDER_HTML;
    if (!contentRaw) return PLACEHOLDER_HTML;

    const bodyHtml = buildStyledHtml(contentRaw);

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
${SCREEN_STYLES}
${currentCss}
</style>
<script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"><\/script>
</head>
<body>
${bodyHtml}
</body>
</html>`;
  }, [currentCss, contentRaw, isLoadingContent]);

  function handleContentChange() {
    fetchContent();
  }

  function handleStyleChangeFromChat(css: string) {
    setCurrentCss(css);
  }

  function handleStyleApplied(_bookType: string, css: string) {
    if (css) {
      setCurrentCss(css);
    }
  }

  function handlePageSettingsChange(pageRule: string) {
    setCurrentCss((prev) => replacePageRule(prev, pageRule));
  }

  function handleUndoRedoCss(css: string) {
    setCurrentCss(css);
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
            <div className="flex flex-col gap-6 p-4">
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
