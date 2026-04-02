"use client";

import { useState } from "react";

type TabId = "content" | "layout" | "chat" | "export" | "activity";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "content", label: "Content" },
  { id: "layout", label: "Layout" },
  { id: "chat", label: "AI Chat" },
  { id: "export", label: "Export" },
  { id: "activity", label: "Activity" },
];

interface WorkspaceTabsProps {
  projectId: string;
  contentPanel: React.ReactNode;
  layoutPanel: React.ReactNode;
  chatPanel: React.ReactNode;
  exportPanel: React.ReactNode;
  activityPanel: React.ReactNode;
}

export function WorkspaceTabs({
  projectId: _projectId,
  contentPanel,
  layoutPanel,
  chatPanel,
  exportPanel,
  activityPanel,
}: WorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  const panels: Record<TabId, React.ReactNode> = {
    content: contentPanel,
    layout: layoutPanel,
    chat: chatPanel,
    export: exportPanel,
    activity: activityPanel,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Tab list */}
      <div
        role="tablist"
        aria-label="Project panels"
        className="flex shrink-0 border-b border-gray-200 bg-white"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "px-4 py-3 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500",
              activeTab === tab.id
                ? "border-b-2 border-brand-500 text-brand-600"
                : "text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          className="flex-1 overflow-y-auto"
        >
          {activeTab === tab.id && panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
