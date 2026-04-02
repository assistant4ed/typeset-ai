"use client";

// Stub implementation — full export panel built in Task 7.

interface ExportPanelProps {
  projectId: string;
}

export function ExportPanel({ projectId: _projectId }: ExportPanelProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-sm font-medium text-gray-700">Export</p>
      <p className="text-xs text-gray-400">Export panel coming in Task 7.</p>
    </div>
  );
}
