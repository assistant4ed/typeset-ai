# TypeSet AI — Design Specification

## Overview

TypeSet AI is an AI-powered typesetting platform for graphic design companies that do book design and print services. It ingests content from Google Docs, applies AI-generated layouts via HTML/CSS templates, and outputs print-ready PDFs or editable files for Adobe InDesign/Illustrator.

**Target users:** Graphic design companies doing book layout and print production.

**Book types supported:** Novels, coffee table books, magazines, catalogs, children's books, textbooks, corporate reports, and any mixed-layout publication.

## Core Problems Solved

1. **Speed** — Layouts take too long to create from scratch
2. **Consistency** — Maintaining style rules across pages/chapters is tedious
3. **Repetitive work** — Similar layout structures get rebuilt over and over
4. **Cost** — Reduce designer hours per project
5. **Scalability** — Handle more projects without hiring more designers

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       TypeSet AI Platform                        │
├──────────┬───────────┬──────────┬───────────┬────────────────────┤
│  INGEST  │  AI CHAT  │  LAYOUT  │  RENDER   │    DASHBOARD       │
│          │  ENGINE   │  ENGINE  │  ENGINE   │                    │
├──────────┼───────────┼──────────┼───────────┼────────────────────┤
│ GDocs API│ Chat UI   │ CSS      │ Paged.js  │ Auth (Google SSO)  │
│ Markdown │ Image/PDF │ Template │ PDF       │ Project Manager    │
│ Parser   │ Reference │ Library  │ Puppeteer │ User/Role Manager  │
│ Asset    │ Analysis  │ AI Gen   │ IDML      │ Share Links        │
│ Extractor│ Live Edit │ (Claude) │ SVG       │ Designer Accounts  │
│ Image/PDF│ via Chat  │          │ Preflight │ Team Collaboration │
│ Scanner  │           │          │           │                    │
└──────────┴───────────┴──────────┴───────────┴────────────────────┘
```

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Runtime | Node.js 20+ / TypeScript 5+ | Strong HTML/PDF tooling ecosystem |
| AI | Claude API (`@anthropic-ai/sdk`) | Best at generating structured HTML/CSS, vision for reference analysis |
| PDF Engine | Paged.js + Puppeteer | Free, open-source, CSS Paged Media standard |
| Content Parser | `mammoth` (docx→HTML) + `unified`/`rehype` (normalize) | Reliable document conversion |
| PDF Parsing | `pdf.js` + Claude Vision | Extract text and analyze layouts from reference PDFs |
| Template CSS | CSS Paged Media + design tokens | Print-standard: bleeds, crop marks, CMYK |
| IDML Export | Custom XML builder | Generate InDesign-compatible files |
| SVG Export | Puppeteer page-level SVG | Illustrator-compatible vector output |
| Frontend | Next.js 14+ (App Router, React Server Components) | Dashboard, AI chat UI, live preview |
| Auth | NextAuth.js + Google OAuth 2.0 | Google SSO, role-based access |
| Database | PostgreSQL via Supabase | Projects, users, templates, activity logs |
| Real-time | WebSocket (AI chat) + Supabase Realtime (collaboration) | Live updates |
| File Storage | Supabase Storage | Assets, templates, exported files |
| Email | Resend | Notifications, share link delivery |
| Deployment | Cloudflare Pages (frontend) + Railway (API/workers) | Global CDN + managed backend |
| CLI (Phase 1) | Commander.js | Terminal interface for designers |

## Phase 1: CLI Tool

### 1.1 Content Ingestion

**Google Docs source:**
- OAuth 2.0 flow to authenticate with Google
- Google Docs API reads document structure
- `mammoth.js` converts to clean HTML
- `unified`/`rehype` normalizes heading hierarchy, lists, tables
- Asset extractor downloads embedded images to local `assets/` directory
- Output: structured JSON content tree

```typescript
interface ContentTree {
  metadata: {
    title: string;
    author: string;
    source: "google-docs" | "markdown" | "pdf" | "manual";
    pageCount: number;
  };
  frontMatter: ContentBlock[];  // title page, copyright, dedication, TOC
  chapters: Chapter[];
  backMatter: ContentBlock[];   // index, appendix, colophon
  assets: Asset[];              // images with paths and dimensions
}

interface Chapter {
  title: string;
  number: number;
  sections: Section[];
}

interface Section {
  heading: string;
  level: number;
  blocks: ContentBlock[];
}

interface ContentBlock {
  type: "paragraph" | "heading" | "image" | "table" | "list" | "blockquote" | "footnote" | "page-break";
  content: string;        // HTML content
  attributes: Record<string, string>;
}

interface Asset {
  id: string;
  originalName: string;
  localPath: string;
  mimeType: string;
  width: number;
  height: number;
  dpi: number;
}
```

**Reference image/PDF analysis:**
- User uploads a photo or PDF of a design they want to match
- Claude Vision API analyzes: grid structure, typography hierarchy, color palette, spacing, image placement patterns
- System generates a matching CSS template
- Designer reviews and adjusts

**CLI commands:**
```bash
typeset ingest --source google-docs --doc-id <id>      # from Google Docs
typeset ingest --source file --path ./manuscript.md     # from Markdown
typeset ingest --source reference --path ./sample.pdf   # analyze reference
typeset ingest --source reference --path ./photo.jpg    # analyze photo
```

### 1.2 Template & Layout Engine

**Template structure:**
```
templates/
├── book-types/
│   ├── novel.css              # Text-heavy, single column
│   ├── coffee-table.css       # Image-heavy, full bleed
│   ├── children-book.css      # Large type, illustration frames
│   ├── textbook.css           # Multi-column, sidebars, callouts
│   ├── catalog.css            # Grid layouts, product cards
│   ├── corporate-report.css   # Charts, data tables, brand colors
│   └── magazine.css           # Mixed media, pull quotes
├── components/
│   ├── cover.css              # Front/back cover layouts
│   ├── toc.css                # Table of contents styles
│   ├── chapter-opener.css     # Chapter title pages
│   ├── footnotes.css          # Footnote positioning
│   ├── index.css              # Book index formatting
│   └── colophon.css           # Credits/imprint page
└── tokens/
    ├── typography.css          # Font stacks, sizes, leading
    ├── spacing.css             # Margins, gutters, padding
    ├── colors.css              # CMYK color definitions
    └── grid.css               # Column grid systems
```

**CSS Paged Media features used:**
- `@page` rules for page size, margins, bleeds, crop marks
- `:left` / `:right` page selectors for alternating margins
- `@page :first` for special first page handling
- Running headers/footers via `string-set` and `content`
- Page counters and cross-references
- Named pages for chapter openers, full-bleed spreads
- Widow/orphan control
- Column spans and multi-column layouts

**AI layout generation:**
- Input: content tree + book type + optional reference images
- Claude API generates customized CSS:
  - Selects appropriate base template
  - Adjusts typography scale for content length
  - Places images based on content flow
  - Generates chapter opener styles
  - Handles special pages (TOC, index, colophon)
- Output: complete CSS file ready for rendering

**CLI commands:**
```bash
typeset layout --type novel --content ./content.json
typeset layout --type catalog --content ./content.json --reference ./sample.jpg
typeset layout --template ./custom-template.css --content ./content.json
```

### 1.3 Render & Export Engine

**PDF generation:**
- Paged.js renders HTML + CSS in Puppeteer (headless Chromium)
- Print-ready settings: CMYK color profile (ISO Coated v2), 300 DPI minimum, embedded fonts
- Crop marks and bleed marks generated automatically
- Spine width calculated from page count and paper weight

**Preflight checks (run before final export):**
- Image resolution: warn if any image below 300 DPI
- Color space: flag RGB images that should be CMYK
- Bleed: verify images at page edge extend into bleed area
- Fonts: confirm all fonts are embedded (no system font fallback)
- Page dimensions: validate against target printer specs
- Overset text: detect text that doesn't fit its container

**IDML export (InDesign):**
- Parse the rendered DOM structure
- Map HTML elements to IDML equivalents:
  - `<h1>` → TextFrame + ParagraphStyle "Heading1"
  - `<p>` → TextFrame + ParagraphStyle "Body"
  - `<img>` → Rectangle + linked Image
  - CSS positioning → IDML frame coordinates
- Generate paragraph styles, character styles, and object styles matching the CSS
- Package as IDML (ZIP of XML files)
- Designer opens directly in InDesign with all styles intact

**SVG export (Illustrator):**
- Puppeteer renders each page as SVG
- Text remains as editable text elements (not rasterized)
- Images linked or embedded based on user preference
- Vector shapes preserved
- Designer opens per-page SVGs in Illustrator

**CLI commands:**
```bash
typeset render --format pdf --output ./output/book.pdf
typeset render --format pdf-proof --output ./output/proof.pdf   # RGB, watermarked
typeset render --format idml --output ./output/book.idml        # InDesign
typeset render --format svg --output ./output/pages/            # Illustrator
typeset preflight --content ./content.json --template ./style.css
```

## Phase 2: AI Chat + Adobe Export Refinement

### 2.1 AI Chat Engine

**Purpose:** Designers converse with the AI to refine layouts in real-time instead of manually editing CSS.

**Interface:** Split-pane view — live PDF preview on left, chat on right.

**Capabilities:**
- Natural language layout commands: "make chapter titles bigger", "add more whitespace between paragraphs", "move images to the outer margin"
- Upload reference images mid-chat: AI analyzes and applies matching styles
- CSS diff preview: shows exactly what changed before applying
- Undo/redo stack: every AI change is reversible
- Save as template: chat-generated styles saved as reusable CSS templates
- Page-specific edits: "on page 12, make the image full-bleed"

**Technical implementation:**
- WebSocket connection for streaming AI responses
- Conversation history maintained per project
- Each AI response returns a CSS patch (diff format)
- Paged.js re-renders preview on each change (debounced)
- Change history stored in database for undo/redo

**AI prompt structure:**
```
System: You are a book designer assistant. You modify CSS layouts
based on designer requests. Always respond with:
1. What you changed (plain English)
2. The CSS diff (what was added/removed/modified)
3. Any print-related warnings (DPI, bleed, margins)

Current CSS: [attached]
Current HTML structure: [attached]
Book type: [type]
Page dimensions: [size]
```

### 2.2 Reference Scanner Improvements

- Batch upload: analyze multiple pages to capture the full design language
- Style extraction: separate typography, color, spacing, and grid into individual tokens
- Design report: generate a written analysis of the reference design's characteristics
- A/B comparison: show current layout side-by-side with reference target

## Phase 3: Dashboard & User Management

### 3.1 Authentication

**Google SSO:**
- NextAuth.js with Google OAuth 2.0 provider
- On first login, user record created in Supabase
- Google account linked for Docs API access (same OAuth flow)
- Session managed via HTTP-only cookies (secure, SameSite=Strict)

**Roles and permissions:**

| Permission | Admin | Designer | Client (share link) |
|---|---|---|---|
| Create projects | Yes | Yes | No |
| Edit layouts | Yes | Yes | No |
| Use AI chat | Yes | Yes | No |
| Export PDF/IDML/SVG | Yes | Yes | No |
| Manage templates | Yes | Own only | No |
| View proofs | Yes | Own projects | Shared projects |
| Leave comments | Yes | Yes | Yes |
| Approve proofs | Yes | No | Yes |
| Manage users | Yes | No | No |
| System settings | Yes | No | No |
| View activity logs | Yes | Own projects | No |

### 3.2 Database Schema

**Core tables:**

```sql
-- Users and authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'designer')),
  google_id TEXT UNIQUE,
  google_refresh_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  book_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'in_review', 'approved', 'exported', 'archived')),
  page_size TEXT NOT NULL DEFAULT '210mm 297mm',
  page_count INTEGER,
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id) NOT NULL,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Project content (the ingested content tree)
CREATE TABLE project_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  content_tree JSONB NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Project styles (CSS templates applied)
CREATE TABLE project_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  css_content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Templates (reusable CSS templates)
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  book_type TEXT NOT NULL,
  css_content TEXT NOT NULL,
  thumbnail_url TEXT,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI chat conversations
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  css_diff TEXT,
  reference_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CSS change history (for undo/redo)
CREATE TABLE style_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  chat_message_id UUID REFERENCES chat_messages(id),
  css_before TEXT NOT NULL,
  css_after TEXT NOT NULL,
  description TEXT,
  applied BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Share links
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  permissions TEXT NOT NULL DEFAULT 'view'
    CHECK (permissions IN ('view', 'comment', 'approve')),
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Comments (from shared links or team)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER,
  x_position FLOAT,
  y_position FLOAT,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_id UUID REFERENCES users(id),
  share_link_id UUID REFERENCES share_links(id),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activity log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Project assets (uploaded images, reference files)
CREATE TABLE project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  dpi INTEGER,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 Dashboard Pages

**Projects list** — Grid/list view of all projects with status, assignee, due date, thumbnail preview. Filter by status, book type, assignee.

**Project workspace** — Split-pane: page preview (left) + tabs for Content, Layout, Chat, Export, Activity (right). Page navigation, zoom controls, page thumbnail strip.

**Template manager** — Browse system and custom templates. Preview with sample content. Create from scratch or save from project. Edit CSS with syntax highlighting.

**Team management** — Invite designers via email (Google account required). Assign roles, deactivate accounts. View per-designer project history.

**Settings** — Company profile, default page sizes, print presets, API key management, notification preferences.

## Phase 4: Share Links & Client Review

### 4.1 Share Links

- Generate unique token-based URLs: `app.typeset.ai/share/<token>`
- Optional password protection
- Optional expiry date
- Permission levels: view-only, comment, approve
- No login required for clients
- Mobile-responsive proof viewer

### 4.2 Client Review Flow

```
Designer generates share link
    → Client opens link in browser
    → Sees paginated proof viewer (rendered by Paged.js)
    → Can leave pin-drop comments on specific page locations
    → Can approve or request changes
    → Designer gets notified of comments/approval
    → Comments appear in project workspace
```

### 4.3 Notifications

- Email via Resend: new comments, approvals, project assignments
- In-app notification bell with unread count
- Configurable per user: which events trigger emails vs. in-app only

## API Design

### REST Endpoints

```
# Auth
POST   /api/auth/google          # Google OAuth callback
GET    /api/auth/session          # Current session
POST   /api/auth/logout           # End session

# Projects
GET    /api/v1/projects           # List projects (filtered, paginated)
POST   /api/v1/projects           # Create project
GET    /api/v1/projects/:id       # Get project details
PATCH  /api/v1/projects/:id       # Update project
DELETE /api/v1/projects/:id       # Archive project

# Content
POST   /api/v1/projects/:id/ingest           # Ingest content (Google Docs, file upload)
GET    /api/v1/projects/:id/content           # Get content tree
POST   /api/v1/projects/:id/reference         # Upload reference image/PDF

# Layout
GET    /api/v1/projects/:id/styles            # Get current CSS
POST   /api/v1/projects/:id/styles            # Apply new CSS
POST   /api/v1/projects/:id/generate-layout   # AI generate layout
GET    /api/v1/projects/:id/preview/:page     # Render page preview

# AI Chat
GET    /api/v1/projects/:id/chat              # Get chat history
POST   /api/v1/projects/:id/chat              # Send message (returns CSS diff)
POST   /api/v1/projects/:id/chat/undo         # Undo last change
POST   /api/v1/projects/:id/chat/redo         # Redo last undone change

# Export
POST   /api/v1/projects/:id/export/pdf        # Generate print-ready PDF
POST   /api/v1/projects/:id/export/proof       # Generate proof PDF
POST   /api/v1/projects/:id/export/idml        # Generate IDML for InDesign
POST   /api/v1/projects/:id/export/svg         # Generate SVG pages for Illustrator
GET    /api/v1/projects/:id/preflight          # Run preflight checks

# Templates
GET    /api/v1/templates                       # List templates
POST   /api/v1/templates                       # Create template
GET    /api/v1/templates/:id                   # Get template
PATCH  /api/v1/templates/:id                   # Update template
DELETE /api/v1/templates/:id                   # Delete template

# Share
POST   /api/v1/projects/:id/share             # Create share link
GET    /api/v1/share/:token                    # Access shared project (public)
POST   /api/v1/share/:token/comments           # Add comment (public)
POST   /api/v1/share/:token/approve            # Approve proof (public)

# Users (admin only)
GET    /api/v1/users                           # List users
POST   /api/v1/users/invite                    # Invite designer
PATCH  /api/v1/users/:id                       # Update user role/status
GET    /api/v1/users/:id/activity              # User activity

# Assets
POST   /api/v1/projects/:id/assets             # Upload asset
GET    /api/v1/projects/:id/assets              # List project assets
DELETE /api/v1/projects/:id/assets/:assetId     # Delete asset
```

## File Structure

```
typeset-ai/
├── apps/
│   ├── cli/                        # Phase 1: CLI tool
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── ingest.ts       # Content ingestion command
│   │   │   │   ├── layout.ts       # Layout generation command
│   │   │   │   ├── render.ts       # Export/render command
│   │   │   │   └── preflight.ts    # Preflight check command
│   │   │   ├── services/
│   │   │   │   ├── google-docs.ts  # Google Docs API client
│   │   │   │   ├── content-parser.ts
│   │   │   │   ├── ai-layout.ts    # Claude API layout generation
│   │   │   │   ├── reference-scanner.ts  # Image/PDF analysis
│   │   │   │   ├── pdf-renderer.ts # Paged.js + Puppeteer
│   │   │   │   ├── idml-exporter.ts
│   │   │   │   ├── svg-exporter.ts
│   │   │   │   └── preflight.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── index.ts            # CLI entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                        # Phase 3: Dashboard
│       ├── src/
│       │   ├── app/                # Next.js App Router
│       │   │   ├── (auth)/
│       │   │   │   └── login/page.tsx
│       │   │   ├── (dashboard)/
│       │   │   │   ├── projects/
│       │   │   │   │   ├── page.tsx           # Project list
│       │   │   │   │   └── [id]/
│       │   │   │   │       ├── page.tsx       # Project workspace
│       │   │   │   │       ├── chat/page.tsx  # AI chat view
│       │   │   │   │       └── export/page.tsx
│       │   │   │   ├── templates/page.tsx
│       │   │   │   ├── team/page.tsx
│       │   │   │   └── settings/page.tsx
│       │   │   ├── share/[token]/page.tsx     # Public share view
│       │   │   ├── api/                       # API routes
│       │   │   └── layout.tsx
│       │   ├── components/
│       │   │   ├── page-preview.tsx
│       │   │   ├── chat-panel.tsx
│       │   │   ├── template-editor.tsx
│       │   │   └── comment-pin.tsx
│       │   └── lib/
│       │       ├── supabase.ts
│       │       ├── auth.ts
│       │       └── ai-client.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── core/                       # Shared typesetting engine
│       ├── src/
│       │   ├── content-parser.ts
│       │   ├── ai-layout.ts
│       │   ├── pdf-renderer.ts
│       │   ├── idml-exporter.ts
│       │   ├── svg-exporter.ts
│       │   ├── reference-scanner.ts
│       │   ├── preflight.ts
│       │   └── types.ts
│       ├── package.json
│       └── tsconfig.json
│
├── templates/                      # CSS template library
│   ├── book-types/
│   ├── components/
│   └── tokens/
│
├── docs/
│   └── superpowers/
│       └── specs/
│
├── package.json                    # Workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
└── .env.example
```

## Environment Variables

```bash
# AI
ANTHROPIC_API_KEY=sk-ant-...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Resend (email)
RESEND_API_KEY=re_...

# App
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
APP_URL=http://localhost:3000
```

## Build Order

| Phase | Scope | Dependencies |
|---|---|---|
| **Phase 1** | CLI: ingest → AI layout → PDF export | Anthropic SDK, Paged.js, Puppeteer, mammoth |
| **Phase 2** | IDML + SVG export, AI chat engine | Phase 1 core services |
| **Phase 3** | Dashboard, auth, project management | Phase 1+2 core, Supabase, NextAuth |
| **Phase 4** | Share links, client review, notifications | Phase 3 dashboard |

## Success Criteria

- A designer can go from Google Doc to print-ready PDF in under 10 minutes for a simple book
- AI chat can handle at least 80% of common layout adjustment requests
- IDML export opens in InDesign with editable styles and correct layout
- SVG export opens in Illustrator with editable text
- Preflight catches all critical print issues before export
- Dashboard supports concurrent projects with proper role isolation
- Share links work without requiring client login
