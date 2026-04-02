# Phase 3: Dashboard & User Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web dashboard with Google SSO authentication, project management, template management, and team collaboration for the TypeSet AI typesetting platform.

**Architecture:** Next.js 14+ App Router with React Server Components, PostgreSQL via Supabase for data, NextAuth.js for Google OAuth, Tailwind CSS for styling. API routes handle CRUD operations with role-based access control.

**Tech Stack:** Next.js 14+, React 18+, NextAuth.js v5, Supabase (PostgreSQL + Realtime + Storage), Tailwind CSS, Resend (email)

---

## File Structure

```
typeset-ai/
├── apps/
│   └── web/                                      # NEW — Next.js dashboard
│       ├── package.json                          # NEW
│       ├── tsconfig.json                         # NEW
│       ├── tailwind.config.ts                    # NEW
│       ├── postcss.config.js                     # NEW
│       ├── next.config.ts                        # NEW
│       ├── .env.example                          # NEW
│       ├── supabase/
│       │   └── migrations/
│       │       └── 001_initial_schema.sql        # NEW
│       └── src/
│           ├── middleware.ts                     # NEW — route protection
│           ├── app/
│           │   ├── layout.tsx                    # NEW — root layout
│           │   ├── page.tsx                      # NEW — root redirect
│           │   ├── (auth)/
│           │   │   └── login/
│           │   │       └── page.tsx              # NEW — login page
│           │   ├── (dashboard)/
│           │   │   └── layout.tsx                # NEW — dashboard shell
│           │   └── api/
│           │       ├── auth/
│           │       │   └── [...nextauth]/
│           │       │       └── route.ts          # NEW — NextAuth handler
│           │       └── v1/
│           │           ├── users/
│           │           │   ├── route.ts          # NEW — GET list, POST invite
│           │           │   └── [id]/
│           │           │       └── route.ts      # NEW — PATCH update
│           │           ├── projects/
│           │           │   ├── route.ts          # NEW — GET list, POST create
│           │           │   └── [id]/
│           │           │       └── route.ts      # NEW — GET, PATCH, DELETE
│           │           └── templates/
│           │               ├── route.ts          # NEW — GET list, POST create
│           │               └── [id]/
│           │                   └── route.ts      # NEW — GET, PATCH, DELETE
│           └── lib/
│               ├── auth.ts                       # NEW — NextAuth config
│               ├── activity.ts                   # NEW — activity log service
│               ├── rbac.ts                       # NEW — role-based access control
│               └── supabase/
│                   ├── client.ts                 # NEW — browser client
│                   ├── server.ts                 # NEW — server client
│                   └── types.ts                  # NEW — database types
```

---

## Task 1: Next.js App Scaffolding

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/.env.example`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@typeset-ai/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@auth/supabase-adapter": "1.4.2",
    "@supabase/supabase-js": "2.43.4",
    "next": "14.2.3",
    "next-auth": "5.0.0-beta.19",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "resend": "3.2.0"
  },
  "devDependencies": {
    "@types/node": "20.11.16",
    "@types/react": "18.3.1",
    "@types/react-dom": "18.3.0",
    "autoprefixer": "10.4.19",
    "postcss": "8.4.38",
    "tailwindcss": "3.4.3",
    "typescript": "5.3.3"
  }
}
```

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    },
    "outDir": undefined,
    "rootDir": undefined,
    "declaration": false,
    "declarationMap": false,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `apps/web/tailwind.config.ts`**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          500: "#4f6ef7",
          600: "#3d5be0",
          700: "#2d48c8",
          900: "#1a2d8a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Create `apps/web/postcss.config.js`**

```js
/** @type {import('postcss').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

module.exports = config;
```

- [ ] **Step 5: Create `apps/web/next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/a/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 6: Create `apps/web/.env.example`**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
AUTH_SECRET=generate-with-openssl-rand-base64-32
AUTH_GOOGLE_ID=your-google-oauth-client-id
AUTH_GOOGLE_SECRET=your-google-oauth-client-secret
NEXTAUTH_URL=http://localhost:3000

# Resend (email)
RESEND_API_KEY=re_your-resend-api-key
RESEND_FROM_EMAIL=noreply@typeset.ai
```

- [ ] **Step 7: Create `apps/web/src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TypeSet AI",
    template: "%s | TypeSet AI",
  },
  description: "AI-powered book typesetting platform",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create `apps/web/src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }

  * {
    box-sizing: border-box;
  }

  body {
    @apply text-gray-900;
  }
}
```

- [ ] **Step 9: Create `apps/web/src/app/page.tsx`**

```tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
```

- [ ] **Step 10: Create `apps/web/src/app/(dashboard)/layout.tsx`**

```tsx
interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

---

## Task 2: Supabase Database Schema

**Files:**
- Create: `apps/web/supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create `apps/web/supabase/migrations/001_initial_schema.sql`**

```sql
-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('admin', 'editor', 'viewer');
create type project_status as enum ('draft', 'in_progress', 'review', 'completed', 'archived');
create type book_type as enum ('novel', 'non_fiction', 'children', 'academic', 'poetry', 'comic', 'other');
create type page_size as enum ('A4', 'A5', 'US_Letter', 'US_Trade', 'Digest', 'Custom');
create type chat_role as enum ('user', 'assistant', 'system');
create type share_permission as enum ('view', 'comment');
create type activity_action as enum (
  'project_created', 'project_updated', 'project_deleted',
  'style_applied', 'style_updated', 'content_imported',
  'export_generated', 'template_created', 'template_updated',
  'share_link_created', 'comment_added', 'comment_resolved',
  'user_invited', 'user_role_changed'
);

-- ============================================================
-- USERS
-- ============================================================

create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text,
  avatar_url    text,
  role          user_role not null default 'viewer',
  google_id     text unique,
  google_refresh_token text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_users_email on users (email);
create index idx_users_google_id on users (google_id) where google_id is not null;
create index idx_users_role on users (role);

-- ============================================================
-- PROJECTS
-- ============================================================

create table projects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  book_type     book_type not null default 'other',
  status        project_status not null default 'draft',
  page_size     page_size not null default 'A5',
  page_count    integer,
  assigned_to   uuid references users (id) on delete set null,
  created_by    uuid not null references users (id) on delete restrict,
  due_date      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_projects_status on projects (status);
create index idx_projects_book_type on projects (book_type);
create index idx_projects_assigned_to on projects (assigned_to) where assigned_to is not null;
create index idx_projects_created_by on projects (created_by);
create index idx_projects_due_date on projects (due_date) where due_date is not null;

-- ============================================================
-- PROJECT CONTENT
-- ============================================================

create table project_content (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  content_tree  jsonb not null default '{}',
  source        text not null default 'manual',
  source_id     text,
  version       integer not null default 1,
  created_at    timestamptz not null default now()
);

create index idx_project_content_project_id on project_content (project_id);
create index idx_project_content_version on project_content (project_id, version desc);

-- ============================================================
-- PROJECT STYLES
-- ============================================================

create table project_styles (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  css_content   text not null default '',
  version       integer not null default 1,
  created_by    uuid references users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index idx_project_styles_project_id on project_styles (project_id);
create index idx_project_styles_version on project_styles (project_id, version desc);

-- ============================================================
-- TEMPLATES
-- ============================================================

create table templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  book_type     book_type not null default 'other',
  css_content   text not null default '',
  thumbnail_url text,
  is_system     boolean not null default false,
  created_by    uuid references users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_templates_book_type on templates (book_type);
create index idx_templates_is_system on templates (is_system);
create index idx_templates_created_by on templates (created_by) where created_by is not null;

-- ============================================================
-- CHAT
-- ============================================================

create table chat_conversations (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  user_id       uuid not null references users (id) on delete cascade,
  title         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_chat_conversations_project_id on chat_conversations (project_id);
create index idx_chat_conversations_user_id on chat_conversations (user_id);

create table chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations (id) on delete cascade,
  role            chat_role not null,
  content         text not null,
  token_count     integer,
  created_at      timestamptz not null default now()
);

create index idx_chat_messages_conversation_id on chat_messages (conversation_id);

-- ============================================================
-- STYLE CHANGES (undo/redo audit)
-- ============================================================

create table style_changes (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects (id) on delete cascade,
  conversation_id uuid references chat_conversations (id) on delete set null,
  css_before      text not null,
  css_after       text not null,
  description     text,
  created_by      uuid references users (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index idx_style_changes_project_id on style_changes (project_id);

-- ============================================================
-- SHARE LINKS
-- ============================================================

create table share_links (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  token         text not null unique default encode(gen_random_bytes(24), 'base64url'),
  password_hash text,
  expires_at    timestamptz,
  permissions   share_permission not null default 'view',
  created_by    uuid references users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index idx_share_links_project_id on share_links (project_id);
create index idx_share_links_token on share_links (token);
create index idx_share_links_expires_at on share_links (expires_at) where expires_at is not null;

-- ============================================================
-- COMMENTS
-- ============================================================

create table comments (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  page_number   integer not null,
  x_position    numeric(6, 2) not null,
  y_position    numeric(6, 2) not null,
  content       text not null,
  author_name   text not null,
  author_id     uuid references users (id) on delete set null,
  share_link_id uuid references share_links (id) on delete set null,
  resolved      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index idx_comments_project_id on comments (project_id);
create index idx_comments_page_number on comments (project_id, page_number);
create index idx_comments_resolved on comments (project_id, resolved);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================

create table activity_log (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references projects (id) on delete cascade,
  user_id       uuid references users (id) on delete set null,
  action        activity_action not null,
  details       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index idx_activity_log_project_id on activity_log (project_id) where project_id is not null;
create index idx_activity_log_user_id on activity_log (user_id) where user_id is not null;
create index idx_activity_log_action on activity_log (action);
create index idx_activity_log_created_at on activity_log (created_at desc);

-- ============================================================
-- PROJECT ASSETS
-- ============================================================

create table project_assets (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  filename      text not null,
  storage_path  text not null,
  mime_type     text not null,
  size_bytes    bigint not null,
  uploaded_by   uuid references users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index idx_project_assets_project_id on project_assets (project_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

create trigger trg_templates_updated_at
  before update on templates
  for each row execute function set_updated_at();

create trigger trg_chat_conversations_updated_at
  before update on chat_conversations
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table users enable row level security;
alter table projects enable row level security;
alter table project_content enable row level security;
alter table project_styles enable row level security;
alter table templates enable row level security;
alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;
alter table style_changes enable row level security;
alter table share_links enable row level security;
alter table comments enable row level security;
alter table activity_log enable row level security;
alter table project_assets enable row level security;

-- Service role bypasses RLS (used by server-side API routes)
-- Application enforces authorization in API layer
```

---

## Task 3: Supabase Client Setup

**Files:**
- Create: `apps/web/src/lib/supabase/client.ts`
- Create: `apps/web/src/lib/supabase/server.ts`
- Create: `apps/web/src/lib/supabase/types.ts`

- [ ] **Step 1: Create `apps/web/src/lib/supabase/types.ts`**

```typescript
export type UserRole = "admin" | "editor" | "viewer";
export type ProjectStatus = "draft" | "in_progress" | "review" | "completed" | "archived";
export type BookType = "novel" | "non_fiction" | "children" | "academic" | "poetry" | "comic" | "other";
export type PageSize = "A4" | "A5" | "US_Letter" | "US_Trade" | "Digest" | "Custom";
export type ChatRole = "user" | "assistant" | "system";
export type SharePermission = "view" | "comment";
export type ActivityAction =
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "style_applied"
  | "style_updated"
  | "content_imported"
  | "export_generated"
  | "template_created"
  | "template_updated"
  | "share_link_created"
  | "comment_added"
  | "comment_resolved"
  | "user_invited"
  | "user_role_changed";

export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  google_id: string | null;
  google_refresh_token: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbProject {
  id: string;
  name: string;
  description: string | null;
  book_type: BookType;
  status: ProjectStatus;
  page_size: PageSize;
  page_count: number | null;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProjectContent {
  id: string;
  project_id: string;
  content_tree: Record<string, unknown>;
  source: string;
  source_id: string | null;
  version: number;
  created_at: string;
}

export interface DbProjectStyles {
  id: string;
  project_id: string;
  css_content: string;
  version: number;
  created_by: string | null;
  created_at: string;
}

export interface DbTemplate {
  id: string;
  name: string;
  description: string | null;
  book_type: BookType;
  css_content: string;
  thumbnail_url: string | null;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbChatConversation {
  id: string;
  project_id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbChatMessage {
  id: string;
  conversation_id: string;
  role: ChatRole;
  content: string;
  token_count: number | null;
  created_at: string;
}

export interface DbShareLink {
  id: string;
  project_id: string;
  token: string;
  password_hash: string | null;
  expires_at: string | null;
  permissions: SharePermission;
  created_by: string | null;
  created_at: string;
}

export interface DbComment {
  id: string;
  project_id: string;
  page_number: number;
  x_position: number;
  y_position: number;
  content: string;
  author_name: string;
  author_id: string | null;
  share_link_id: string | null;
  resolved: boolean;
  created_at: string;
}

export interface DbActivityLog {
  id: string;
  project_id: string | null;
  user_id: string | null;
  action: ActivityAction;
  details: Record<string, unknown>;
  created_at: string;
}

export interface DbProjectAsset {
  id: string;
  project_id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: { Row: DbUser; Insert: Omit<DbUser, "id" | "created_at" | "updated_at">; Update: Partial<Omit<DbUser, "id" | "created_at">> };
      projects: { Row: DbProject; Insert: Omit<DbProject, "id" | "created_at" | "updated_at">; Update: Partial<Omit<DbProject, "id" | "created_at">> };
      project_content: { Row: DbProjectContent; Insert: Omit<DbProjectContent, "id" | "created_at">; Update: Partial<Omit<DbProjectContent, "id" | "created_at">> };
      project_styles: { Row: DbProjectStyles; Insert: Omit<DbProjectStyles, "id" | "created_at">; Update: Partial<Omit<DbProjectStyles, "id" | "created_at">> };
      templates: { Row: DbTemplate; Insert: Omit<DbTemplate, "id" | "created_at" | "updated_at">; Update: Partial<Omit<DbTemplate, "id" | "created_at">> };
      chat_conversations: { Row: DbChatConversation; Insert: Omit<DbChatConversation, "id" | "created_at" | "updated_at">; Update: Partial<Omit<DbChatConversation, "id" | "created_at">> };
      chat_messages: { Row: DbChatMessage; Insert: Omit<DbChatMessage, "id" | "created_at">; Update: never };
      share_links: { Row: DbShareLink; Insert: Omit<DbShareLink, "id" | "created_at" | "token">; Update: Partial<Omit<DbShareLink, "id" | "created_at">> };
      comments: { Row: DbComment; Insert: Omit<DbComment, "id" | "created_at">; Update: Partial<Omit<DbComment, "id" | "created_at">> };
      activity_log: { Row: DbActivityLog; Insert: Omit<DbActivityLog, "id" | "created_at">; Update: never };
      project_assets: { Row: DbProjectAsset; Insert: Omit<DbProjectAsset, "id" | "created_at">; Update: never };
    };
  };
}
```

- [ ] **Step 2: Create `apps/web/src/lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables"
  );
}

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
```

- [ ] **Step 3: Create `apps/web/src/lib/supabase/server.ts`**

```typescript
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
}

/**
 * Server-side Supabase client using the service role key.
 * Bypasses RLS — only use in authenticated API routes after
 * verifying the caller's identity via NextAuth session.
 */
export function createServerClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
```

---

## Task 4: NextAuth.js Google OAuth

**Files:**
- Create: `apps/web/src/lib/auth.ts`
- Create: `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/web/src/middleware.ts`
- Create: `apps/web/src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create `apps/web/src/lib/auth.ts`**

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createServerClient } from "@/lib/supabase/server";
import type { DbUser, UserRole } from "@/lib/supabase/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: "openid email profile",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || account?.provider !== "google") return false;

      const db = createServerClient();

      const { data: existingUser } = await db
        .from("users")
        .select("id, is_active")
        .eq("email", user.email)
        .single();

      if (existingUser) {
        if (!existingUser.is_active) return false;

        await db
          .from("users")
          .update({
            name: user.name ?? undefined,
            avatar_url: user.image ?? undefined,
            google_id: account.providerAccountId,
            google_refresh_token: account.refresh_token ?? undefined,
          })
          .eq("id", existingUser.id);

        return true;
      }

      // Auto-provision first user as admin; subsequent users as viewers
      const { count } = await db
        .from("users")
        .select("id", { count: "exact", head: true });

      const role: UserRole = count === 0 ? "admin" : "viewer";

      const { error } = await db.from("users").insert({
        email: user.email,
        name: user.name ?? null,
        avatar_url: user.image ?? null,
        role,
        google_id: account.providerAccountId,
        google_refresh_token: account.refresh_token ?? null,
        is_active: true,
      });

      if (error) {
        console.error("Failed to create user on sign-in", { cause: error });
        return false;
      }

      return true;
    },

    async session({ session }) {
      if (!session.user?.email) return session;

      const db = createServerClient();
      const { data: dbUser } = await db
        .from("users")
        .select("id, role, is_active")
        .eq("email", session.user.email)
        .single<Pick<DbUser, "id" | "role" | "is_active">>();

      if (!dbUser || !dbUser.is_active) {
        // Force sign-out by returning an empty session
        return { ...session, user: undefined as never };
      }

      return {
        ...session,
        user: {
          ...session.user,
          id: dbUser.id,
          role: dbUser.role,
        },
      };
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      role: UserRole;
    };
  }
}
```

- [ ] **Step 2: Create `apps/web/src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 3: Create `apps/web/src/middleware.ts`**

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/login", "/api/auth"]);

function isPublicPath(pathname: string): boolean {
  for (const path of PUBLIC_PATHS) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return true;
  }
  return false;
}

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const session = (req as NextRequest & { auth: { user?: { id: string } } | null }).auth;
  if (!session?.user?.id) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
```

- [ ] **Step 4: Create `apps/web/src/app/(auth)/login/page.tsx`**

```tsx
import { signIn } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

interface LoginPageProps {
  searchParams: { callbackUrl?: string; error?: string };
}

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: "This email is linked to a different sign-in method.",
  AccessDenied: "Your account is inactive. Contact your administrator.",
  Default: "An error occurred during sign in. Please try again.",
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const errorMessage = searchParams.error
    ? (ERROR_MESSAGES[searchParams.error] ?? ERROR_MESSAGES.Default)
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            TypeSet AI
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your typesetting projects
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200"
          >
            {errorMessage}
          </div>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google", {
              redirectTo: searchParams.callbackUrl ?? "/dashboard",
            });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="20"
              height="20"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </form>

        <p className="text-center text-xs text-gray-500">
          By signing in, you agree to the TypeSet AI terms of service.
        </p>
      </div>
    </main>
  );
}
```

---

## Task 5: User Management API

**Files:**
- Create: `apps/web/src/lib/rbac.ts`
- Create: `apps/web/src/app/api/v1/users/route.ts`
- Create: `apps/web/src/app/api/v1/users/[id]/route.ts`

- [ ] **Step 1: Create `apps/web/src/lib/rbac.ts`**

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/supabase/types";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 401 | 403
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("Authentication required", 401);
  }
  return session;
}

export async function requireRole(minimumRole: UserRole) {
  const session = await requireSession();
  if (!hasRole(session.user.role, minimumRole)) {
    throw new AuthError(
      `Role '${minimumRole}' or higher is required`,
      403
    );
  }
  return session;
}

export function unauthorized(message = "Authentication required") {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message } },
    { status: 401 }
  );
}

export function forbidden(message = "Insufficient permissions") {
  return NextResponse.json(
    { error: { code: "FORBIDDEN", message } },
    { status: 403 }
  );
}

export function handleAuthError(err: unknown) {
  if (err instanceof AuthError) {
    if (err.statusCode === 401) return unauthorized(err.message);
    return forbidden(err.message);
  }
  return null;
}
```

- [ ] **Step 2: Create `apps/web/src/app/api/v1/users/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import type { UserRole } from "@/lib/supabase/types";

const ALLOWED_ROLES: UserRole[] = ["admin", "editor", "viewer"];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  try {
    await requireRole("admin");
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") as UserRole | null;
  const isActive = searchParams.get("is_active");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10),
    MAX_LIMIT
  );

  const db = createServerClient();
  let query = db
    .from("users")
    .select("id, email, name, avatar_url, role, is_active, created_at, updated_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (role && ALLOWED_ROLES.includes(role)) {
    query = query.eq("role", role);
  }
  if (isActive !== null) {
    query = query.eq("is_active", isActive === "true");
  }
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to list users", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch users" } },
      { status: 500 }
    );
  }

  const lastItem = data?.[data.length - 1];
  const nextCursor = data?.length === limit ? lastItem?.created_at : null;

  return NextResponse.json({
    data,
    meta: { cursor: nextCursor, hasMore: nextCursor !== null, total: count },
    requestId: crypto.randomUUID(),
  });
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requireRole("admin");
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  let body: { email: string; role?: UserRole; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { email, role = "viewer", name } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Valid email is required", details: [{ field: "email", issue: "Must be a valid email address" }] } },
      { status: 422 }
    );
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Invalid role", details: [{ field: "role", issue: `Must be one of: ${ALLOWED_ROLES.join(", ")}` }] } },
      { status: 422 }
    );
  }

  const db = createServerClient();

  const { data: existing } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "A user with this email already exists" } },
      { status: 409 }
    );
  }

  const { data: newUser, error } = await db
    .from("users")
    .insert({ email, role, name: name ?? null, is_active: true })
    .select()
    .single();

  if (error || !newUser) {
    console.error("Failed to invite user", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create user" } },
      { status: 500 }
    );
  }

  await logActivity(null, session!.user.id, "user_invited", {
    invited_user_id: newUser.id,
    invited_email: email,
    role,
  });

  return NextResponse.json({ data: newUser, requestId: crypto.randomUUID() }, { status: 201 });
}
```

- [ ] **Step 3: Create `apps/web/src/app/api/v1/users/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import type { UserRole } from "@/lib/supabase/types";

const ALLOWED_ROLES: UserRole[] = ["admin", "editor", "viewer"];

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireRole("admin");
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const { id } = params;

  let body: { role?: UserRole; is_active?: boolean; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { role, is_active, name } = body;
  const validationErrors: Array<{ field: string; issue: string }> = [];

  if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
    validationErrors.push({ field: "role", issue: `Must be one of: ${ALLOWED_ROLES.join(", ")}` });
  }
  if (is_active !== undefined && typeof is_active !== "boolean") {
    validationErrors.push({ field: "is_active", issue: "Must be a boolean" });
  }

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Validation failed", details: validationErrors } },
      { status: 422 }
    );
  }

  // Prevent admins from demoting themselves
  if (id === session!.user.id && (role !== undefined || is_active === false)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "You cannot modify your own role or deactivate your own account" } },
      { status: 403 }
    );
  }

  const db = createServerClient();

  const updates: Record<string, unknown> = {};
  if (role !== undefined) updates.role = role;
  if (is_active !== undefined) updates.is_active = is_active;
  if (name !== undefined) updates.name = name;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "No valid fields to update" } },
      { status: 400 }
    );
  }

  const { data: updatedUser, error } = await db
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }
    console.error("Failed to update user", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update user" } },
      { status: 500 }
    );
  }

  if (role !== undefined) {
    await logActivity(null, session!.user.id, "user_role_changed", {
      target_user_id: id,
      new_role: role,
    });
  }

  return NextResponse.json({ data: updatedUser, requestId: crypto.randomUUID() });
}
```

---

## Task 6: Project CRUD API

**Files:**
- Create: `apps/web/src/app/api/v1/projects/route.ts`
- Create: `apps/web/src/app/api/v1/projects/[id]/route.ts`

- [ ] **Step 1: Create `apps/web/src/app/api/v1/projects/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession, requireRole, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import type { BookType, ProjectStatus } from "@/lib/supabase/types";

const ALLOWED_STATUSES: ProjectStatus[] = ["draft", "in_progress", "review", "completed", "archived"];
const ALLOWED_BOOK_TYPES: BookType[] = ["novel", "non_fiction", "children", "academic", "poetry", "comic", "other"];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as ProjectStatus | null;
  const bookType = searchParams.get("book_type") as BookType | null;
  const assignedTo = searchParams.get("assigned_to");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10),
    MAX_LIMIT
  );

  const db = createServerClient();

  let query = db
    .from("projects")
    .select(
      "id, name, description, book_type, status, page_size, page_count, assigned_to, created_by, due_date, created_at, updated_at",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (status && ALLOWED_STATUSES.includes(status)) {
    query = query.eq("status", status);
  }
  if (bookType && ALLOWED_BOOK_TYPES.includes(bookType)) {
    query = query.eq("book_type", bookType);
  }
  if (assignedTo) {
    query = query.eq("assigned_to", assignedTo);
  }
  if (cursor) {
    query = query.lt("updated_at", cursor);
  }

  // Viewers only see projects assigned to them
  if (session!.user.role === "viewer") {
    query = query.eq("assigned_to", session!.user.id);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to list projects", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch projects" } },
      { status: 500 }
    );
  }

  const lastItem = data?.[data.length - 1];
  const nextCursor = data?.length === limit ? lastItem?.updated_at : null;

  return NextResponse.json({
    data,
    meta: { cursor: nextCursor, hasMore: nextCursor !== null, total: count },
    requestId: crypto.randomUUID(),
  });
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requireRole("editor");
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  let body: {
    name: string;
    description?: string;
    book_type?: BookType;
    page_size?: string;
    assigned_to?: string;
    due_date?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { name, description, book_type = "other", page_size = "A5", assigned_to, due_date } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Project name is required", details: [{ field: "name", issue: "Must be a non-empty string" }] } },
      { status: 422 }
    );
  }

  if (!ALLOWED_BOOK_TYPES.includes(book_type)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Invalid book type", details: [{ field: "book_type", issue: `Must be one of: ${ALLOWED_BOOK_TYPES.join(", ")}` }] } },
      { status: 422 }
    );
  }

  const db = createServerClient();

  const { data: project, error } = await db
    .from("projects")
    .insert({
      name: name.trim(),
      description: description ?? null,
      book_type,
      page_size: page_size as never,
      status: "draft",
      assigned_to: assigned_to ?? null,
      created_by: session!.user.id,
      due_date: due_date ?? null,
    })
    .select()
    .single();

  if (error || !project) {
    console.error("Failed to create project", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create project" } },
      { status: 500 }
    );
  }

  await logActivity(project.id, session!.user.id, "project_created", {
    project_name: project.name,
    book_type: project.book_type,
  });

  return NextResponse.json({ data: project, requestId: crypto.randomUUID() }, { status: 201 });
}
```

- [ ] **Step 2: Create `apps/web/src/app/api/v1/projects/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession, requireRole, hasRole, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import type { BookType, ProjectStatus } from "@/lib/supabase/types";

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const { data: project, error } = await db
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !project) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 }
    );
  }

  // Viewers can only see their assigned projects
  if (
    session!.user.role === "viewer" &&
    project.assigned_to !== session!.user.id
  ) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: project, requestId: crypto.randomUUID() });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  if (!hasRole(session!.user.role, "editor")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Editor role or higher is required" } },
      { status: 403 }
    );
  }

  let body: {
    name?: string;
    description?: string;
    book_type?: BookType;
    status?: ProjectStatus;
    page_size?: string;
    page_count?: number;
    assigned_to?: string | null;
    due_date?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const db = createServerClient();

  const { data: existing } = await db
    .from("projects")
    .select("id, status")
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 }
    );
  }

  const updates: Record<string, unknown> = {};
  const allowedFields = ["name", "description", "book_type", "status", "page_size", "page_count", "assigned_to", "due_date"] as const;

  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field] ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "No valid fields to update" } },
      { status: 400 }
    );
  }

  const { data: updated, error } = await db
    .from("projects")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error || !updated) {
    console.error("Failed to update project", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update project" } },
      { status: 500 }
    );
  }

  await logActivity(params.id, session!.user.id, "project_updated", {
    changed_fields: Object.keys(updates),
  });

  return NextResponse.json({ data: updated, requestId: crypto.randomUUID() });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireRole("admin");
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const { data: existing } = await db
    .from("projects")
    .select("id, name")
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 }
    );
  }

  const { error } = await db.from("projects").delete().eq("id", params.id);

  if (error) {
    console.error("Failed to delete project", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete project" } },
      { status: 500 }
    );
  }

  await logActivity(null, session!.user.id, "project_deleted", {
    deleted_project_id: params.id,
    deleted_project_name: existing.name,
  });

  return new Response(null, { status: 204 });
}
```

---

## Task 7: Template CRUD API

**Files:**
- Create: `apps/web/src/app/api/v1/templates/route.ts`
- Create: `apps/web/src/app/api/v1/templates/[id]/route.ts`

- [ ] **Step 1: Create `apps/web/src/app/api/v1/templates/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession, requireRole, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import type { BookType } from "@/lib/supabase/types";

const ALLOWED_BOOK_TYPES: BookType[] = ["novel", "non_fiction", "children", "academic", "poetry", "comic", "other"];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  try {
    await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const bookType = searchParams.get("book_type") as BookType | null;
  const isSystem = searchParams.get("is_system");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10),
    MAX_LIMIT
  );

  const db = createServerClient();

  let query = db
    .from("templates")
    .select(
      "id, name, description, book_type, thumbnail_url, is_system, created_by, created_at, updated_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (bookType && ALLOWED_BOOK_TYPES.includes(bookType)) {
    query = query.eq("book_type", bookType);
  }
  if (isSystem !== null) {
    query = query.eq("is_system", isSystem === "true");
  }
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to list templates", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch templates" } },
      { status: 500 }
    );
  }

  const lastItem = data?.[data.length - 1];
  const nextCursor = data?.length === limit ? lastItem?.created_at : null;

  return NextResponse.json({
    data,
    meta: { cursor: nextCursor, hasMore: nextCursor !== null, total: count },
    requestId: crypto.randomUUID(),
  });
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requireRole("editor");
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  let body: {
    name: string;
    description?: string;
    book_type?: BookType;
    css_content: string;
    thumbnail_url?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { name, description, book_type = "other", css_content, thumbnail_url } = body;
  const validationErrors: Array<{ field: string; issue: string }> = [];

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    validationErrors.push({ field: "name", issue: "Must be a non-empty string" });
  }
  if (css_content === undefined || typeof css_content !== "string") {
    validationErrors.push({ field: "css_content", issue: "Must be a string (can be empty)" });
  }
  if (!ALLOWED_BOOK_TYPES.includes(book_type)) {
    validationErrors.push({ field: "book_type", issue: `Must be one of: ${ALLOWED_BOOK_TYPES.join(", ")}` });
  }

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Validation failed", details: validationErrors } },
      { status: 422 }
    );
  }

  const db = createServerClient();

  const { data: template, error } = await db
    .from("templates")
    .insert({
      name: name.trim(),
      description: description ?? null,
      book_type,
      css_content,
      thumbnail_url: thumbnail_url ?? null,
      is_system: false,
      created_by: session!.user.id,
    })
    .select()
    .single();

  if (error || !template) {
    console.error("Failed to create template", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create template" } },
      { status: 500 }
    );
  }

  await logActivity(null, session!.user.id, "template_created", {
    template_id: template.id,
    template_name: template.name,
  });

  return NextResponse.json({ data: template, requestId: crypto.randomUUID() }, { status: 201 });
}
```

- [ ] **Step 2: Create `apps/web/src/app/api/v1/templates/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession, requireRole, hasRole, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import type { BookType } from "@/lib/supabase/types";

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const { data: template, error } = await db
    .from("templates")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !template) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Template not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: template, requestId: crypto.randomUUID() });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  if (!hasRole(session!.user.role, "editor")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Editor role or higher is required" } },
      { status: 403 }
    );
  }

  const db = createServerClient();

  const { data: existing } = await db
    .from("templates")
    .select("id, is_system, created_by")
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Template not found" } },
      { status: 404 }
    );
  }

  // Only admins can edit system templates
  if (existing.is_system && !hasRole(session!.user.role, "admin")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Only admins can modify system templates" } },
      { status: 403 }
    );
  }

  // Editors can only edit their own templates
  if (
    !hasRole(session!.user.role, "admin") &&
    existing.created_by !== session!.user.id
  ) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "You can only edit your own templates" } },
      { status: 403 }
    );
  }

  let body: { name?: string; description?: string; book_type?: BookType; css_content?: string; thumbnail_url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  const allowedFields = ["name", "description", "book_type", "css_content", "thumbnail_url"] as const;
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field] ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "No valid fields to update" } },
      { status: 400 }
    );
  }

  const { data: updated, error } = await db
    .from("templates")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error || !updated) {
    console.error("Failed to update template", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update template" } },
      { status: 500 }
    );
  }

  await logActivity(null, session!.user.id, "template_updated", {
    template_id: params.id,
    changed_fields: Object.keys(updates),
  });

  return NextResponse.json({ data: updated, requestId: crypto.randomUUID() });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const { data: existing } = await db
    .from("templates")
    .select("id, is_system, created_by")
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Template not found" } },
      { status: 404 }
    );
  }

  // System templates require admin
  if (existing.is_system && !hasRole(session!.user.role, "admin")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Only admins can delete system templates" } },
      { status: 403 }
    );
  }

  // Editors can only delete their own templates
  if (
    !hasRole(session!.user.role, "admin") &&
    existing.created_by !== session!.user.id
  ) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "You can only delete your own templates" } },
      { status: 403 }
    );
  }

  const { error } = await db.from("templates").delete().eq("id", params.id);

  if (error) {
    console.error("Failed to delete template", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete template" } },
      { status: 500 }
    );
  }

  return new Response(null, { status: 204 });
}
```

---

## Task 8: Activity Log Service

**Files:**
- Create: `apps/web/src/lib/activity.ts`

- [ ] **Step 1: Create `apps/web/src/lib/activity.ts`**

```typescript
import { createServerClient } from "@/lib/supabase/server";
import type { ActivityAction } from "@/lib/supabase/types";

/**
 * Log an activity event to the activity_log table.
 * Failures are caught and logged to stderr — a failed audit log
 * should never break the calling operation.
 */
export async function logActivity(
  projectId: string | null,
  userId: string,
  action: ActivityAction,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const db = createServerClient();
    const { error } = await db.from("activity_log").insert({
      project_id: projectId,
      user_id: userId,
      action,
      details,
    });

    if (error) {
      console.error("activity_log insert failed", {
        action,
        projectId,
        userId,
        cause: error,
      });
    }
  } catch (err) {
    console.error("activity_log unexpected error", {
      action,
      projectId,
      userId,
      cause: err,
    });
  }
}

export interface ActivityEntry {
  id: string;
  project_id: string | null;
  user_id: string | null;
  action: ActivityAction;
  details: Record<string, unknown>;
  created_at: string;
}

/**
 * Fetch recent activity for a project with cursor-based pagination.
 * Returns at most `limit` entries ordered by most recent first.
 */
export async function getProjectActivity(
  projectId: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<{ entries: ActivityEntry[]; nextCursor: string | null }> {
  const { limit = 20, cursor } = options;
  const db = createServerClient();

  let query = db
    .from("activity_log")
    .select("id, project_id, user_id, action, details, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Failed to fetch project activity", { cause: error });
  }

  const entries = (data ?? []) as ActivityEntry[];
  const lastEntry = entries[entries.length - 1];
  const nextCursor = entries.length === limit ? (lastEntry?.created_at ?? null) : null;

  return { entries, nextCursor };
}
```

<!-- Tasks 9+ continue in the next section: Dashboard UI, Share Links, Notifications -->
