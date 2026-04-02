"use client";

// Stub implementation — full AI chat panel built in Task 5.

interface ChatPanelProps {
  projectId: string;
  initialCss: string;
}

export function ChatPanel({ projectId: _projectId, initialCss: _initialCss }: ChatPanelProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-sm font-medium text-gray-700">AI Chat</p>
      <p className="text-xs text-gray-400">Chat panel coming in Task 5.</p>
    </div>
  );
}
