"use client";

import { useState } from "react";
import { LivePreview } from "@/components/live-preview";
import { WorkspaceTabs } from "@/components/workspace-tabs";
import { ContentPanel } from "@/components/content-panel";
import { StylePicker } from "@/components/style-picker";
import { ChatPanel } from "@/components/chat-panel";
import { ExportPanel } from "@/components/export-panel";

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

export function WorkspaceLayout({
  projectId,
  initialCss,
  initialBookType,
  sharedReferences,
  activityPanel,
}: WorkspaceLayoutProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  function triggerRefresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Live preview */}
      <div className="hidden w-[55%] shrink-0 border-r border-gray-200 lg:flex lg:flex-col">
        <LivePreview projectId={projectId} refreshKey={refreshKey} />
      </div>

      {/* Right: Tabbed panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <WorkspaceTabs
          projectId={projectId}
          contentPanel={
            <ContentPanel projectId={projectId} onContentChange={triggerRefresh} />
          }
          layoutPanel={
            <div className="p-4">
              <StylePicker
                projectId={projectId}
                initialBookType={initialBookType}
                sharedReferences={sharedReferences}
                onStyleApplied={() => triggerRefresh()}
              />
            </div>
          }
          chatPanel={
            <ChatPanel
              projectId={projectId}
              initialCss={initialCss}
              onStyleChange={triggerRefresh}
            />
          }
          exportPanel={<ExportPanel projectId={projectId} />}
          activityPanel={activityPanel}
        />
      </div>
    </div>
  );
}
