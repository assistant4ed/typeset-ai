import type { ChatSession } from "@typeset-ai/core";

// Module-level singleton — shared within a Node.js process
const store = new Map<string, ChatSession>();

export const chatSessionStore = {
  get: (projectId: string) => store.get(projectId),
  set: (projectId: string, session: ChatSession) => store.set(projectId, session),
  has: (projectId: string) => store.has(projectId),
  delete: (projectId: string) => store.delete(projectId),
};
