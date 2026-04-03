# TypeSet AI — Revision Plan

## Problems to Fix

1. **Puppeteer can't run on Vercel** — PDF rendering, SVG export, IDML export all fail in serverless
2. **AI Chat network errors** — chat API routes depend on Puppeteer for preview rendering
3. **No structured error handling** — raw strings, no retryability, poor error context
4. **Monolithic core package** — everything in one package, no clean separation
5. **No provider abstraction** — locked to Claude, can't add other AI providers
6. **No config layering** — hardcoded settings, no user/project overrides

## Solution: Move to Railway + Adopt Claw-Code Patterns

### Architecture Change

**Before (Vercel):**
```
Vercel (serverless) ← can't run Puppeteer, heavy operations timeout
├── Next.js dashboard
├── API routes (all in-process)
└── Core package (Puppeteer, JSZip, Claude API)
```

**After (Railway):**
```
Railway (full Node.js server)
├── Next.js dashboard + API routes
├── Core packages (modular, claw-code inspired):
│   ├── @typeset-ai/providers   — AI provider abstraction (Claude, OpenAI, etc.)
│   ├── @typeset-ai/engine      — Layout, render, export (Puppeteer runs fine here)
│   ├── @typeset-ai/config      — Layered config system
│   └── @typeset-ai/errors      — Structured error types with retryability
└── Supabase (PostgreSQL, unchanged)
```

### Pattern Adoptions from Claw-Code

#### 1. Provider Abstraction (from claw-code's `api/providers`)

```typescript
// packages/providers/src/types.ts
interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxTokens: number;
}

interface LayoutRequest {
  content: ContentTree;
  options: LayoutOptions;
  referenceImage?: Buffer;
}

interface LayoutResponse {
  css: string;
  analysis?: string;
  usage: { inputTokens: number; outputTokens: number };
}

interface ChatRequest {
  message: string;
  currentCss: string;
  history: ChatMessage[];
  referenceImage?: Buffer;
}

interface ChatResponse {
  message: string;
  css: string;
  diff: CssDiff;
}

// Provider trait
interface AiProvider {
  generateLayout(request: LayoutRequest): Promise<LayoutResponse>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  analyzeReference(image: Buffer): Promise<{ css: string; analysis: string }>;
}
```

Implementations: `ClaudeProvider`, `OpenAiProvider` (future)

#### 2. Structured Errors (from claw-code's `api/error.rs`)

```typescript
// packages/errors/src/index.ts
enum ErrorCode {
  MISSING_CREDENTIALS = "MISSING_CREDENTIALS",
  PROVIDER_ERROR = "PROVIDER_ERROR",
  RATE_LIMITED = "RATE_LIMITED",
  RENDER_FAILED = "RENDER_FAILED",
  EXPORT_FAILED = "EXPORT_FAILED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
}

class TypesetError extends Error {
  code: ErrorCode;
  retryable: boolean;
  context: Record<string, unknown>;
  
  static missingCredentials(provider: string, envVars: string[]): TypesetError;
  static providerError(provider: string, status: number, body: string): TypesetError;
  static rateLimited(retryAfter?: number): TypesetError;
}
```

#### 3. Config Layering (from claw-code's `runtime/config.rs`)

```typescript
// packages/config/src/index.ts
// Sources merged in order: defaults → user (~/.typeset/config.json) → project (.typeset/config.json) → env vars
interface TypesetConfig {
  provider: { name: "claude" | "openai"; model: string; apiKey: string };
  render: { pageSize: string; colorProfile: "cmyk" | "rgb" };
  export: { embedImages: boolean; preserveStyles: boolean };
}
```

#### 4. Modular Engine (from claw-code's crate structure)

Split current `@typeset-ai/core` into focused packages:
- `@typeset-ai/providers` — AI provider abstraction
- `@typeset-ai/engine` — content parsing, HTML building, rendering, exporting
- `@typeset-ai/config` — config loading and merging
- `@typeset-ai/errors` — structured error types

### Deployment: Railway

**Single service deployment:**
- Next.js runs as a full Node.js server (not serverless)
- Puppeteer, JSZip, etc. all work natively
- Custom Dockerfile with Chromium pre-installed
- Environment variables set via Railway dashboard

### Tasks

1. **Create structured error package** (`packages/errors/`)
2. **Create config package** (`packages/config/`)
3. **Create provider abstraction package** (`packages/providers/`)
4. **Refactor core into engine package** (`packages/engine/` — rename from core, update imports)
5. **Update all API routes** to use new packages + structured errors
6. **Create Dockerfile** for Railway deployment
7. **Deploy to Railway** with all env vars
8. **Remove Vercel** deployment
9. **Verify all features work** — login, projects, chat, export, share links
