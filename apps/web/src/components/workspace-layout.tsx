"use client";

import { useState } from "react";

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

const DEFAULT_PAGE_WIDTH = 210;
const DEFAULT_PAGE_HEIGHT = 297;
const DEFAULT_BLEED = 0;

export function WorkspaceLayout({
  projectId,
  initialCss,
  initialBookType,
  sharedReferences,
  activityPanel,
}: WorkspaceLayoutProps) {
  const [currentDesign, setCurrentDesign] = useState(initialCss || "");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pageWidth, setPageWidth] = useState(DEFAULT_PAGE_WIDTH);
  const [pageHeight, setPageHeight] = useState(DEFAULT_PAGE_HEIGHT);
  const [bleed, setBleed] = useState(DEFAULT_BLEED);

  function triggerRefresh() {
    setRefreshTrigger((t) => t + 1);
  }

  function handleStyleChangeFromChat(design: string) {
    if (design) {
      setCurrentDesign(design);
      triggerRefresh();
    }
  }

  function handleStyleApplied(_bookType: string, design: string) {
    if (design) {
      setCurrentDesign(design);
      triggerRefresh();
    }
  }

  function handlePageSettingsChange(
    _pageRule: string,
    width: number,
    height: number,
  ) {
    setPageWidth(width);
    setPageHeight(height);
    triggerRefresh();
  }

  function handleContentChange() {
    triggerRefresh();
  }

  function handleUndoRedoDesign(design: string) {
    if (design) {
      setCurrentDesign(design);
      triggerRefresh();
    }
  }

  // Suppress unused variable warning for bleed setter until UI integrates it
  void setBleed;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Live preview */}
      <div className="hidden w-[55%] shrink-0 border-r border-gray-200 lg:flex lg:flex-col">
        <LivePreview
          projectId={projectId}
          currentDesign={currentDesign}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          bleed={bleed}
          refreshTrigger={refreshTrigger}
        />
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
              initialCss={currentDesign}
              onStyleChange={handleStyleChangeFromChat}
              onUndoRedoCss={handleUndoRedoDesign}
            />
          }
          exportPanel={<ExportPanel projectId={projectId} />}
          activityPanel={activityPanel}
        />
      </div>
    </div>
  );
}
