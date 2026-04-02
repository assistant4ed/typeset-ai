"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CssDiffView } from "@/components/css-diff-view";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  diff?: { patch: string };
  isApplied?: boolean;
}

interface ChatPanelProps {
  projectId: string;
  initialCss: string;
}

export function ChatPanel({ projectId, initialCss: _initialCss }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load existing chat history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/v1/projects/${projectId}/chat`);
        if (!res.ok) return;
        const { data } = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMessages(
            data.map((m: { id: string; role: "user" | "assistant"; content: string }) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            }))
          );
        }
      } catch {
        // Silently fail — chat history is non-critical
      }
    }
    loadHistory();
  }, [projectId]);

  async function handleSend() {
    const message = input.trim();
    if (!message || isSending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append("message", message);
      if (referenceFile) {
        formData.append("reference_image", referenceFile);
        setReferenceFile(null);
      }

      const res = await fetch(`/api/v1/projects/${projectId}/chat`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: json.error?.message ?? "Sorry, something went wrong. Please try again.",
          },
        ]);
        return;
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: json.data.message,
        diff: json.data.diff,
        isApplied: json.data.isApplied,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setCanUndo(json.data.canUndo ?? false);
      setCanRedo(false);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Network error. Please check your connection and try again.",
        },
      ]);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }

  async function handleUndo() {
    const res = await fetch(`/api/v1/projects/${projectId}/chat/undo`, {
      method: "POST",
    });
    const json = await res.json();
    if (res.ok) {
      setCanUndo(json.data.canUndo ?? false);
      setCanRedo(true);
    }
  }

  async function handleRedo() {
    const res = await fetch(`/api/v1/projects/${projectId}/chat/redo`, {
      method: "POST",
    });
    const json = await res.json();
    if (res.ok) {
      setCanUndo(true);
      setCanRedo(json.data.canRedo ?? false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUndo}
          disabled={!canUndo}
          aria-label="Undo last CSS change"
          title="Undo"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          Undo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRedo}
          disabled={!canRedo}
          aria-label="Redo last CSS change"
          title="Redo"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
          </svg>
          Redo
        </Button>
      </div>

      {/* Message list */}
      <div
        aria-live="polite"
        aria-label="Chat messages"
        className="flex-1 overflow-y-auto space-y-4 p-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">
                Describe the layout changes you want
              </p>
              <p className="mt-1 text-xs text-gray-400">
                e.g. "Increase the body font size to 12pt" or "Add a decorative drop cap to chapter openings"
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={[
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start",
            ].join(" ")}
          >
            <div
              className={[
                "max-w-[85%] rounded-xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-900",
              ].join(" ")}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              {msg.diff?.patch && msg.isApplied && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    CSS changes applied:
                  </p>
                  <CssDiffView patch={msg.diff.patch} />
                </div>
              )}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-gray-100 px-4 py-3">
              <Spinner size="sm" label="AI is thinking..." />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Reference image preview */}
      {referenceFile && (
        <div className="flex shrink-0 items-center gap-2 border-t border-gray-100 bg-gray-50 px-4 py-2">
          <svg aria-hidden="true" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <span className="text-xs text-gray-600 flex-1 truncate">{referenceFile.name}</span>
          <button
            onClick={() => setReferenceFile(null)}
            aria-label={`Remove reference image ${referenceFile.name}`}
            className="text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-gray-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach reference image"
            title="Attach reference image"
            className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-hidden="true"
            onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the layout change you want... (Enter to send)"
            rows={2}
            aria-label="Chat message"
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
          />
          <Button
            onClick={handleSend}
            isLoading={isSending}
            disabled={!input.trim()}
            size="sm"
            aria-label="Send message"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
