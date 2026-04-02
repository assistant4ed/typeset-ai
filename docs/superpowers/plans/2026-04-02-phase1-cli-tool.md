# Phase 1: TypeSet AI CLI Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI tool that ingests content from Google Docs/Markdown/reference images, generates AI-powered book layouts via CSS, and exports print-ready PDFs.

**Architecture:** Monorepo with a shared `core` package (typesetting engine) and a `cli` app that wraps it with Commander.js commands. Content is parsed into a structured JSON tree, AI generates CSS layouts via Claude API, and Paged.js + Puppeteer renders print-ready PDFs.

**Tech Stack:** Node.js 20+, TypeScript 5+, pnpm workspaces, Commander.js, mammoth.js, unified/rehype, @anthropic-ai/sdk, Paged.js, Puppeteer, pdf.js

---

## File Structure

```
typeset-ai/
├── package.json                    # Workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
├── .gitignore
├── packages/
│   └── core/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── types.ts                # All shared types
│           ├── content-parser.ts       # Markdown/HTML → ContentTree
│           ├── google-docs.ts          # Google Docs API client
│           ├── ai-layout.ts            # Claude API layout generation
│           ├── reference-scanner.ts    # Image/PDF → CSS template via Vision
│           ├── pdf-renderer.ts         # Paged.js + Puppeteer → PDF
│           ├── preflight.ts            # Print preflight checks
│           ├── html-builder.ts         # ContentTree → styled HTML document
│           └── index.ts                # Public API re-exports
├── apps/
│   └── cli/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                # CLI entry point
│           ├── commands/
│           │   ├── ingest.ts           # `typeset ingest` command
│           │   ├── layout.ts           # `typeset layout` command
│           │   ├── render.ts           # `typeset render` command
│           │   └── preflight.ts        # `typeset preflight` command
│           └── utils/
│               └── config.ts           # CLI config loading (.env, defaults)
├── templates/
│   ├── book-types/
│   │   ├── novel.css
│   │   ├── coffee-table.css
│   │   ├── children-book.css
│   │   ├── textbook.css
│   │   ├── catalog.css
│   │   ├── corporate-report.css
│   │   └── magazine.css
│   ├── components/
│   │   ├── cover.css
│   │   ├── toc.css
│   │   ├── chapter-opener.css
│   │   ├── footnotes.css
│   │   └── colophon.css
│   └── tokens/
│       ├── typography.css
│       ├── spacing.css
│       ├── colors.css
│       └── grid.css
└── tests/
    ├── core/
    │   ├── content-parser.test.ts
    │   ├── google-docs.test.ts
    │   ├── ai-layout.test.ts
    │   ├── reference-scanner.test.ts
    │   ├── pdf-renderer.test.ts
    │   ├── preflight.test.ts
    │   └── html-builder.test.ts
    ├── cli/
    │   ├── ingest.test.ts
    │   ├── layout.test.ts
    │   ├── render.test.ts
    │   └── preflight.test.ts
    └── fixtures/
        ├── sample-manuscript.md
        ├── sample-content-tree.json
        ├── sample-novel.html
        └── sample-reference.jpg
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `apps/cli/package.json`
- Create: `apps/cli/tsconfig.json`
- Create: `.env.example`

- [ ] **Step 1: Create workspace root `package.json`**

```json
{
  "name": "typeset-ai",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "cli": "pnpm --filter @typeset-ai/cli start"
  },
  "devDependencies": {
    "@types/node": "20.11.16",
    "typescript": "5.3.3",
    "vitest": "1.2.2",
    "eslint": "8.56.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 4: Create `packages/core/package.json`**

```json
{
  "name": "@typeset-ai/core",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "0.39.0",
    "mammoth": "1.8.0",
    "unified": "11.0.5",
    "rehype-parse": "9.0.1",
    "rehype-stringify": "10.0.1",
    "rehype-sanitize": "6.0.0",
    "pdfjs-dist": "4.0.379",
    "puppeteer": "21.7.0",
    "pagedjs": "0.4.3"
  }
}
```

- [ ] **Step 5: Create `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create `apps/cli/package.json`**

```json
{
  "name": "@typeset-ai/cli",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "typeset": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@typeset-ai/core": "workspace:*",
    "commander": "12.0.0",
    "dotenv": "16.4.1",
    "chalk": "5.3.0",
    "ora": "8.0.1"
  },
  "devDependencies": {
    "tsx": "4.7.0"
  }
}
```

- [ ] **Step 7: Create `apps/cli/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 8: Create `.env.example`**

```bash
# AI - Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Google OAuth (for Google Docs access)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

- [ ] **Step 9: Install dependencies**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm install`
Expected: Lockfile created, all packages installed without errors.

- [ ] **Step 10: Verify TypeScript compiles**

Run: `pnpm build`
Expected: May warn about no source files yet — that's fine. No TypeScript config errors.

- [ ] **Step 11: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json packages/ apps/ .env.example pnpm-lock.yaml
git commit -m "chore: scaffold monorepo with core package and CLI app"
```

---

### Task 2: Core Types

**Files:**
- Create: `packages/core/src/types.ts`
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: Create `packages/core/src/types.ts`**

```typescript
export interface ContentTree {
  metadata: BookMetadata;
  frontMatter: ContentBlock[];
  chapters: Chapter[];
  backMatter: ContentBlock[];
  assets: Asset[];
}

export interface BookMetadata {
  title: string;
  author: string;
  source: "google-docs" | "markdown" | "pdf" | "manual";
  pageCount: number;
}

export interface Chapter {
  title: string;
  number: number;
  sections: Section[];
}

export interface Section {
  heading: string;
  level: number;
  blocks: ContentBlock[];
}

export type BlockType =
  | "paragraph"
  | "heading"
  | "image"
  | "table"
  | "list"
  | "blockquote"
  | "footnote"
  | "page-break";

export interface ContentBlock {
  type: BlockType;
  content: string;
  attributes: Record<string, string>;
}

export interface Asset {
  id: string;
  originalName: string;
  localPath: string;
  mimeType: string;
  width: number;
  height: number;
  dpi: number;
}

export type BookType =
  | "novel"
  | "coffee-table"
  | "children-book"
  | "textbook"
  | "catalog"
  | "corporate-report"
  | "magazine";

export interface LayoutOptions {
  bookType: BookType;
  pageSize: string;
  customCss?: string;
  referenceImagePath?: string;
}

export interface RenderOptions {
  format: "pdf" | "pdf-proof";
  outputPath: string;
  colorProfile: "cmyk" | "rgb";
  includeBleed: boolean;
  includeCropMarks: boolean;
}

export interface PreflightResult {
  isValid: boolean;
  errors: PreflightIssue[];
  warnings: PreflightIssue[];
}

export interface PreflightIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  page?: number;
  element?: string;
}
```

- [ ] **Step 2: Create `packages/core/src/index.ts`**

```typescript
export type {
  ContentTree,
  BookMetadata,
  Chapter,
  Section,
  ContentBlock,
  BlockType,
  Asset,
  BookType,
  LayoutOptions,
  RenderOptions,
  PreflightResult,
  PreflightIssue,
} from "./types.js";
```

- [ ] **Step 3: Verify it compiles**

Run: `cd packages/core && pnpm build`
Expected: Compiles with no errors. `dist/types.js`, `dist/types.d.ts`, `dist/index.js`, `dist/index.d.ts` created.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/index.ts
git commit -m "feat(core): add shared type definitions for content tree, layout, and render"
```

---

### Task 3: Content Parser (Markdown → ContentTree)

**Files:**
- Create: `packages/core/src/content-parser.ts`
- Create: `tests/core/content-parser.test.ts`
- Create: `tests/fixtures/sample-manuscript.md`
- Create: `tests/fixtures/sample-content-tree.json`

- [ ] **Step 1: Create test fixture `tests/fixtures/sample-manuscript.md`**

```markdown
---
title: The Great Adventure
author: Jane Smith
---

# Chapter 1: The Beginning

## The Morning

It was a bright cold day in April, and the clocks were striking thirteen. The hallway smelt of boiled cabbage and old rag mats.

Winston Smith, his chin nuzzled into his breast, slipped quickly through the glass doors.

## The Discovery

He found an old book in the attic. The pages were yellowed and fragile.

> "Every book is a journey," she whispered.

- Item one of a list
- Item two of a list
- Item three of a list

# Chapter 2: The Journey

## Setting Out

The road stretched endlessly before them, winding through hills covered in wildflowers.

![Mountain landscape](images/mountain.jpg)

| Destination | Distance | Time |
|---|---|---|
| Village | 10km | 2 hours |
| City | 50km | 1 day |
| Coast | 200km | 3 days |
```

- [ ] **Step 2: Create expected output fixture `tests/fixtures/sample-content-tree.json`**

```json
{
  "metadata": {
    "title": "The Great Adventure",
    "author": "Jane Smith",
    "source": "markdown",
    "pageCount": 0
  },
  "frontMatter": [],
  "chapters": [
    {
      "title": "Chapter 1: The Beginning",
      "number": 1,
      "sections": [
        {
          "heading": "The Morning",
          "level": 2,
          "blocks": [
            {
              "type": "paragraph",
              "content": "It was a bright cold day in April, and the clocks were striking thirteen. The hallway smelt of boiled cabbage and old rag mats.",
              "attributes": {}
            },
            {
              "type": "paragraph",
              "content": "Winston Smith, his chin nuzzled into his breast, slipped quickly through the glass doors.",
              "attributes": {}
            }
          ]
        },
        {
          "heading": "The Discovery",
          "level": 2,
          "blocks": [
            {
              "type": "paragraph",
              "content": "He found an old book in the attic. The pages were yellowed and fragile.",
              "attributes": {}
            },
            {
              "type": "blockquote",
              "content": "\"Every book is a journey,\" she whispered.",
              "attributes": {}
            },
            {
              "type": "list",
              "content": "<ul><li>Item one of a list</li><li>Item two of a list</li><li>Item three of a list</li></ul>",
              "attributes": { "listType": "unordered" }
            }
          ]
        }
      ]
    },
    {
      "title": "Chapter 2: The Journey",
      "number": 2,
      "sections": [
        {
          "heading": "Setting Out",
          "level": 2,
          "blocks": [
            {
              "type": "paragraph",
              "content": "The road stretched endlessly before them, winding through hills covered in wildflowers.",
              "attributes": {}
            },
            {
              "type": "image",
              "content": "",
              "attributes": {
                "src": "images/mountain.jpg",
                "alt": "Mountain landscape"
              }
            },
            {
              "type": "table",
              "content": "<table><thead><tr><th>Destination</th><th>Distance</th><th>Time</th></tr></thead><tbody><tr><td>Village</td><td>10km</td><td>2 hours</td></tr><tr><td>City</td><td>50km</td><td>1 day</td></tr><tr><td>Coast</td><td>200km</td><td>3 days</td></tr></tbody></table>",
              "attributes": {}
            }
          ]
        }
      ]
    }
  ],
  "backMatter": [],
  "assets": [
    {
      "id": "asset-1",
      "originalName": "mountain.jpg",
      "localPath": "images/mountain.jpg",
      "mimeType": "image/jpeg",
      "width": 0,
      "height": 0,
      "dpi": 0
    }
  ]
}
```

- [ ] **Step 3: Write the failing test**

Create `tests/core/content-parser.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseMarkdown } from "@typeset-ai/core";

const FIXTURES_DIR = resolve(import.meta.dirname, "../fixtures");

describe("parseMarkdown", () => {
  it("should parse a markdown manuscript into a ContentTree", () => {
    const markdown = readFileSync(
      resolve(FIXTURES_DIR, "sample-manuscript.md"),
      "utf-8",
    );
    const expected = JSON.parse(
      readFileSync(
        resolve(FIXTURES_DIR, "sample-content-tree.json"),
        "utf-8",
      ),
    );

    const result = parseMarkdown(markdown);

    expect(result.metadata.title).toBe(expected.metadata.title);
    expect(result.metadata.author).toBe(expected.metadata.author);
    expect(result.metadata.source).toBe("markdown");
    expect(result.chapters).toHaveLength(2);
  });

  it("should extract chapters from h1 headings", () => {
    const markdown = "# Chapter 1: First\n\nSome text.\n\n# Chapter 2: Second\n\nMore text.";
    const result = parseMarkdown(markdown);

    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].title).toBe("Chapter 1: First");
    expect(result.chapters[0].number).toBe(1);
    expect(result.chapters[1].title).toBe("Chapter 2: Second");
    expect(result.chapters[1].number).toBe(2);
  });

  it("should extract sections from h2 headings within chapters", () => {
    const markdown = "# Chapter 1\n\n## Section A\n\nText A.\n\n## Section B\n\nText B.";
    const result = parseMarkdown(markdown);

    expect(result.chapters[0].sections).toHaveLength(2);
    expect(result.chapters[0].sections[0].heading).toBe("Section A");
    expect(result.chapters[0].sections[0].level).toBe(2);
  });

  it("should parse paragraphs as ContentBlocks", () => {
    const markdown = "# Chapter 1\n\n## Intro\n\nFirst paragraph.\n\nSecond paragraph.";
    const result = parseMarkdown(markdown);

    const blocks = result.chapters[0].sections[0].blocks;
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[0].content).toBe("First paragraph.");
    expect(blocks[1].type).toBe("paragraph");
    expect(blocks[1].content).toBe("Second paragraph.");
  });

  it("should parse blockquotes", () => {
    const markdown = "# Ch1\n\n## S1\n\n> A wise quote.";
    const result = parseMarkdown(markdown);

    const blocks = result.chapters[0].sections[0].blocks;
    expect(blocks[0].type).toBe("blockquote");
    expect(blocks[0].content).toContain("A wise quote.");
  });

  it("should parse images and register them as assets", () => {
    const markdown = "# Ch1\n\n## S1\n\n![Alt text](images/photo.jpg)";
    const result = parseMarkdown(markdown);

    const blocks = result.chapters[0].sections[0].blocks;
    expect(blocks[0].type).toBe("image");
    expect(blocks[0].attributes.src).toBe("images/photo.jpg");
    expect(blocks[0].attributes.alt).toBe("Alt text");

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].originalName).toBe("photo.jpg");
    expect(result.assets[0].localPath).toBe("images/photo.jpg");
  });

  it("should parse lists", () => {
    const markdown = "# Ch1\n\n## S1\n\n- Apple\n- Banana\n- Cherry";
    const result = parseMarkdown(markdown);

    const blocks = result.chapters[0].sections[0].blocks;
    expect(blocks[0].type).toBe("list");
    expect(blocks[0].content).toContain("Apple");
    expect(blocks[0].content).toContain("Banana");
    expect(blocks[0].attributes.listType).toBe("unordered");
  });

  it("should parse tables", () => {
    const markdown = "# Ch1\n\n## S1\n\n| A | B |\n|---|---|\n| 1 | 2 |";
    const result = parseMarkdown(markdown);

    const blocks = result.chapters[0].sections[0].blocks;
    expect(blocks[0].type).toBe("table");
    expect(blocks[0].content).toContain("<table>");
    expect(blocks[0].content).toContain("<th>");
  });

  it("should extract front matter metadata", () => {
    const markdown = "---\ntitle: My Book\nauthor: John Doe\n---\n\n# Chapter 1\n\nText.";
    const result = parseMarkdown(markdown);

    expect(result.metadata.title).toBe("My Book");
    expect(result.metadata.author).toBe("John Doe");
  });

  it("should handle markdown with no front matter", () => {
    const markdown = "# Chapter 1\n\nText.";
    const result = parseMarkdown(markdown);

    expect(result.metadata.title).toBe("Chapter 1");
    expect(result.metadata.author).toBe("");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm test -- tests/core/content-parser.test.ts`
Expected: FAIL — `parseMarkdown` is not exported from `@typeset-ai/core`.

- [ ] **Step 5: Implement content parser**

Create `packages/core/src/content-parser.ts`:

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import type {
  ContentTree,
  Chapter,
  Section,
  ContentBlock,
  Asset,
} from "./types.js";

interface FrontMatter {
  title?: string;
  author?: string;
}

function parseFrontMatter(markdown: string): {
  frontMatter: FrontMatter;
  body: string;
} {
  const fmRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = markdown.match(fmRegex);

  if (!match) {
    return { frontMatter: {}, body: markdown };
  }

  const raw = match[1];
  const frontMatter: FrontMatter = {};

  for (const line of raw.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key === "title") frontMatter.title = value;
    if (key === "author") frontMatter.author = value;
  }

  return { frontMatter, body: markdown.slice(match[0].length) };
}

interface MdNode {
  type: string;
  children?: MdNode[];
  value?: string;
  depth?: number;
  url?: string;
  alt?: string;
  ordered?: boolean;
}

function mdNodeToHtml(node: MdNode): string {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify);

  // For simple inline content, reconstruct markdown and convert
  if (node.type === "text") return node.value ?? "";
  if (node.type === "paragraph") {
    return (node.children ?? []).map((c) => c.value ?? "").join("");
  }

  return "";
}

function extractTextContent(node: MdNode): string {
  if (node.value) return node.value;
  if (!node.children) return "";
  return node.children.map((c) => extractTextContent(c)).join("");
}

function nodeToContentBlock(node: MdNode): ContentBlock | null {
  switch (node.type) {
    case "paragraph": {
      // Check if paragraph contains only an image
      if (
        node.children?.length === 1 &&
        node.children[0].type === "image"
      ) {
        return nodeToContentBlock(node.children[0]);
      }
      return {
        type: "paragraph",
        content: extractTextContent(node),
        attributes: {},
      };
    }
    case "blockquote": {
      const text = (node.children ?? [])
        .map((c) => extractTextContent(c))
        .join("\n")
        .trim();
      return {
        type: "blockquote",
        content: text,
        attributes: {},
      };
    }
    case "image": {
      return {
        type: "image",
        content: "",
        attributes: {
          src: node.url ?? "",
          alt: node.alt ?? "",
        },
      };
    }
    case "list": {
      const tag = node.ordered ? "ol" : "ul";
      const items = (node.children ?? [])
        .map((li) => `<li>${extractTextContent(li)}</li>`)
        .join("");
      return {
        type: "list",
        content: `<${tag}>${items}</${tag}>`,
        attributes: {
          listType: node.ordered ? "ordered" : "unordered",
        },
      };
    }
    case "table": {
      return nodeToTableBlock(node);
    }
    case "thematicBreak": {
      return {
        type: "page-break",
        content: "",
        attributes: {},
      };
    }
    default:
      return null;
  }
}

function nodeToTableBlock(node: MdNode): ContentBlock {
  const rows = node.children ?? [];
  let html = "<table>";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.children ?? [];
    const isHeader = i === 0;

    if (isHeader) html += "<thead>";
    if (i === 1) html += "<tbody>";

    html += "<tr>";
    for (const cell of cells) {
      const tag = isHeader ? "th" : "td";
      html += `<${tag}>${extractTextContent(cell)}</${tag}>`;
    }
    html += "</tr>";

    if (isHeader) html += "</thead>";
  }

  html += "</tbody></table>";

  return {
    type: "table",
    content: html,
    attributes: {},
  };
}

function extractAssets(chapters: Chapter[]): Asset[] {
  const assets: Asset[] = [];
  let assetIdx = 0;

  for (const chapter of chapters) {
    for (const section of chapter.sections) {
      for (const block of section.blocks) {
        if (block.type === "image" && block.attributes.src) {
          assetIdx++;
          const src = block.attributes.src;
          const fileName = src.split("/").pop() ?? src;
          assets.push({
            id: `asset-${assetIdx}`,
            originalName: fileName,
            localPath: src,
            mimeType: guessMimeType(fileName),
            width: 0,
            height: 0,
            dpi: 0,
          });
        }
      }
    }
  }

  return assets;
}

function guessMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    tiff: "image/tiff",
    tif: "image/tiff",
  };
  return mimeMap[ext] ?? "application/octet-stream";
}

export function parseMarkdown(markdown: string): ContentTree {
  const { frontMatter, body } = parseFrontMatter(markdown);

  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkGfm);

  const tree = processor.parse(body) as MdNode;

  const chapters: Chapter[] = [];
  let currentChapter: Chapter | null = null;
  let currentSection: Section | null = null;
  let chapterNumber = 0;

  for (const node of tree.children ?? []) {
    if (node.type === "heading" && node.depth === 1) {
      chapterNumber++;
      currentChapter = {
        title: extractTextContent(node),
        number: chapterNumber,
        sections: [],
      };
      chapters.push(currentChapter);
      currentSection = null;
      continue;
    }

    if (node.type === "heading" && node.depth === 2 && currentChapter) {
      currentSection = {
        heading: extractTextContent(node),
        level: 2,
        blocks: [],
      };
      currentChapter.sections.push(currentSection);
      continue;
    }

    if (currentSection) {
      const block = nodeToContentBlock(node);
      if (block) {
        currentSection.blocks.push(block);
      }
    }
  }

  const title =
    frontMatter.title ?? (chapters[0]?.title || "Untitled");
  const author = frontMatter.author ?? "";
  const assets = extractAssets(chapters);

  return {
    metadata: {
      title,
      author,
      source: "markdown",
      pageCount: 0,
    },
    frontMatter: [],
    chapters,
    backMatter: [],
    assets,
  };
}
```

- [ ] **Step 6: Update `packages/core/src/index.ts` to export `parseMarkdown`**

```typescript
export type {
  ContentTree,
  BookMetadata,
  Chapter,
  Section,
  ContentBlock,
  BlockType,
  Asset,
  BookType,
  LayoutOptions,
  RenderOptions,
  PreflightResult,
  PreflightIssue,
} from "./types.js";

export { parseMarkdown } from "./content-parser.js";
```

- [ ] **Step 7: Add missing remark dependencies to `packages/core/package.json`**

Add to dependencies:
```json
{
  "remark-parse": "11.0.0",
  "remark-frontmatter": "5.0.0",
  "remark-gfm": "4.0.0",
  "remark-rehype": "11.1.1"
}
```

Run: `pnpm install`

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm test -- tests/core/content-parser.test.ts`
Expected: All 9 tests PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/content-parser.ts packages/core/src/index.ts tests/ packages/core/package.json
git commit -m "feat(core): add markdown content parser with chapter/section extraction"
```

---

### Task 4: HTML Builder (ContentTree → Styled HTML)

**Files:**
- Create: `packages/core/src/html-builder.ts`
- Create: `tests/core/html-builder.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/html-builder.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildHtml } from "@typeset-ai/core";
import type { ContentTree } from "@typeset-ai/core";

const MINIMAL_TREE: ContentTree = {
  metadata: {
    title: "Test Book",
    author: "Test Author",
    source: "markdown",
    pageCount: 0,
  },
  frontMatter: [],
  chapters: [
    {
      title: "Chapter 1",
      number: 1,
      sections: [
        {
          heading: "Introduction",
          level: 2,
          blocks: [
            { type: "paragraph", content: "Hello world.", attributes: {} },
          ],
        },
      ],
    },
  ],
  backMatter: [],
  assets: [],
};

describe("buildHtml", () => {
  it("should produce a complete HTML document", () => {
    const html = buildHtml(MINIMAL_TREE, "body { font-size: 12pt; }");

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("should include the CSS in a style tag", () => {
    const css = "body { font-family: Garamond; }";
    const html = buildHtml(MINIMAL_TREE, css);

    expect(html).toContain(`<style>${css}</style>`);
  });

  it("should render chapter titles as h1", () => {
    const html = buildHtml(MINIMAL_TREE, "");

    expect(html).toContain("<h1");
    expect(html).toContain("Chapter 1");
  });

  it("should render section headings as h2", () => {
    const html = buildHtml(MINIMAL_TREE, "");

    expect(html).toContain("<h2");
    expect(html).toContain("Introduction");
  });

  it("should render paragraphs", () => {
    const html = buildHtml(MINIMAL_TREE, "");

    expect(html).toContain("<p>Hello world.</p>");
  });

  it("should render images with src and alt", () => {
    const tree: ContentTree = {
      ...MINIMAL_TREE,
      chapters: [
        {
          title: "Ch1",
          number: 1,
          sections: [
            {
              heading: "S1",
              level: 2,
              blocks: [
                {
                  type: "image",
                  content: "",
                  attributes: { src: "images/photo.jpg", alt: "A photo" },
                },
              ],
            },
          ],
        },
      ],
    };

    const html = buildHtml(tree, "");
    expect(html).toContain('<img src="images/photo.jpg" alt="A photo"');
  });

  it("should render tables as raw HTML", () => {
    const tree: ContentTree = {
      ...MINIMAL_TREE,
      chapters: [
        {
          title: "Ch1",
          number: 1,
          sections: [
            {
              heading: "S1",
              level: 2,
              blocks: [
                {
                  type: "table",
                  content: "<table><tr><td>Cell</td></tr></table>",
                  attributes: {},
                },
              ],
            },
          ],
        },
      ],
    };

    const html = buildHtml(tree, "");
    expect(html).toContain("<table><tr><td>Cell</td></tr></table>");
  });

  it("should render blockquotes", () => {
    const tree: ContentTree = {
      ...MINIMAL_TREE,
      chapters: [
        {
          title: "Ch1",
          number: 1,
          sections: [
            {
              heading: "S1",
              level: 2,
              blocks: [
                {
                  type: "blockquote",
                  content: "A wise saying.",
                  attributes: {},
                },
              ],
            },
          ],
        },
      ],
    };

    const html = buildHtml(tree, "");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("A wise saying.");
  });

  it("should include the Paged.js polyfill script", () => {
    const html = buildHtml(MINIMAL_TREE, "");

    expect(html).toContain("paged.polyfill.js");
  });

  it("should wrap each chapter in a section with class chapter", () => {
    const html = buildHtml(MINIMAL_TREE, "");

    expect(html).toContain('<section class="chapter"');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/core/html-builder.test.ts`
Expected: FAIL — `buildHtml` is not exported.

- [ ] **Step 3: Implement HTML builder**

Create `packages/core/src/html-builder.ts`:

```typescript
import type { ContentTree, ContentBlock, Chapter, Section } from "./types.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBlock(block: ContentBlock): string {
  switch (block.type) {
    case "paragraph":
      return `<p>${block.content}</p>`;
    case "heading":
      return `<h3>${block.content}</h3>`;
    case "image":
      return `<figure><img src="${escapeHtml(block.attributes.src ?? "")}" alt="${escapeHtml(block.attributes.alt ?? "")}" /></figure>`;
    case "blockquote":
      return `<blockquote><p>${block.content}</p></blockquote>`;
    case "list":
      return block.content;
    case "table":
      return block.content;
    case "footnote":
      return `<aside class="footnote">${block.content}</aside>`;
    case "page-break":
      return '<div class="page-break"></div>';
    default:
      return `<div>${block.content}</div>`;
  }
}

function renderSection(section: Section): string {
  const blocks = section.blocks.map(renderBlock).join("\n");
  return `<section class="section">
<h2>${section.heading}</h2>
${blocks}
</section>`;
}

function renderChapter(chapter: Chapter): string {
  const sections = chapter.sections.map(renderSection).join("\n");
  return `<section class="chapter" data-chapter="${chapter.number}">
<h1>${chapter.title}</h1>
${sections}
</section>`;
}

export function buildHtml(content: ContentTree, css: string): string {
  const chapters = content.chapters.map(renderChapter).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(content.metadata.title)}</title>
<style>${css}</style>
<script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
</head>
<body>
${chapters}
</body>
</html>`;
}
```

- [ ] **Step 4: Update `packages/core/src/index.ts`**

Add export:
```typescript
export { buildHtml } from "./html-builder.js";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- tests/core/html-builder.test.ts`
Expected: All 9 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/html-builder.ts packages/core/src/index.ts tests/core/html-builder.test.ts
git commit -m "feat(core): add HTML builder to convert ContentTree into styled HTML document"
```

---

### Task 5: CSS Template Library

**Files:**
- Create: `templates/tokens/typography.css`
- Create: `templates/tokens/spacing.css`
- Create: `templates/tokens/colors.css`
- Create: `templates/tokens/grid.css`
- Create: `templates/book-types/novel.css`
- Create: `templates/book-types/coffee-table.css`
- Create: `templates/book-types/children-book.css`
- Create: `templates/book-types/textbook.css`
- Create: `templates/book-types/catalog.css`
- Create: `templates/book-types/corporate-report.css`
- Create: `templates/book-types/magazine.css`
- Create: `templates/components/chapter-opener.css`
- Create: `templates/components/toc.css`
- Create: `templates/components/cover.css`
- Create: `templates/components/footnotes.css`
- Create: `templates/components/colophon.css`

- [ ] **Step 1: Create `templates/tokens/typography.css`**

```css
:root {
  --font-serif: "Georgia", "Times New Roman", serif;
  --font-sans: "Helvetica Neue", "Arial", sans-serif;
  --font-mono: "Courier New", monospace;
  --font-display: var(--font-serif);

  --text-xs: 8pt;
  --text-sm: 9pt;
  --text-base: 11pt;
  --text-lg: 14pt;
  --text-xl: 18pt;
  --text-2xl: 24pt;
  --text-3xl: 32pt;
  --text-4xl: 42pt;

  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;

  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.05em;
}
```

- [ ] **Step 2: Create `templates/tokens/spacing.css`**

```css
:root {
  --space-xs: 2mm;
  --space-sm: 4mm;
  --space-md: 8mm;
  --space-lg: 12mm;
  --space-xl: 20mm;
  --space-2xl: 30mm;

  --margin-top: 20mm;
  --margin-bottom: 25mm;
  --margin-inner: 25mm;
  --margin-outer: 15mm;

  --bleed: 3mm;
  --gutter: 5mm;
}
```

- [ ] **Step 3: Create `templates/tokens/colors.css`**

```css
:root {
  --color-black: cmyk(0%, 0%, 0%, 100%);
  --color-rich-black: cmyk(60%, 40%, 40%, 100%);
  --color-gray-dark: cmyk(0%, 0%, 0%, 80%);
  --color-gray: cmyk(0%, 0%, 0%, 50%);
  --color-gray-light: cmyk(0%, 0%, 0%, 20%);
  --color-gray-lighter: cmyk(0%, 0%, 0%, 10%);
  --color-white: cmyk(0%, 0%, 0%, 0%);

  --color-text: var(--color-black);
  --color-heading: var(--color-rich-black);
  --color-caption: var(--color-gray-dark);
  --color-rule: var(--color-gray-light);
}
```

- [ ] **Step 4: Create `templates/tokens/grid.css`**

```css
:root {
  --columns-single: 1;
  --columns-double: 2;
  --columns-triple: 3;
  --column-gap: var(--gutter);
}

.columns-2 {
  column-count: 2;
  column-gap: var(--column-gap);
}

.columns-3 {
  column-count: 3;
  column-gap: var(--column-gap);
}

.full-bleed {
  margin-left: calc(-1 * var(--margin-outer));
  margin-right: calc(-1 * var(--margin-inner));
  width: calc(100% + var(--margin-outer) + var(--margin-inner));
}
```

- [ ] **Step 5: Create `templates/book-types/novel.css`**

```css
@import "../tokens/typography.css";
@import "../tokens/spacing.css";
@import "../tokens/colors.css";

@page {
  size: 129mm 198mm; /* US Trade / Royal */
  margin: var(--margin-top) var(--margin-outer) var(--margin-bottom) var(--margin-inner);
  marks: crop cross;
  bleed: var(--bleed);

  @bottom-center {
    content: counter(page);
    font-family: var(--font-serif);
    font-size: var(--text-sm);
    color: var(--color-gray);
  }
}

@page :left {
  margin-left: var(--margin-outer);
  margin-right: var(--margin-inner);

  @bottom-left {
    content: counter(page);
    font-family: var(--font-serif);
    font-size: var(--text-sm);
  }

  @bottom-center { content: none; }
}

@page :right {
  margin-left: var(--margin-inner);
  margin-right: var(--margin-outer);

  @bottom-right {
    content: counter(page);
    font-family: var(--font-serif);
    font-size: var(--text-sm);
  }

  @bottom-center { content: none; }
}

@page :first {
  @bottom-center { content: none; }
  @bottom-left { content: none; }
  @bottom-right { content: none; }
}

body {
  font-family: var(--font-serif);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text);
  widows: 2;
  orphans: 2;
}

.chapter {
  break-before: right;
}

.chapter h1 {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  color: var(--color-heading);
  text-align: center;
  margin-top: var(--space-2xl);
  margin-bottom: var(--space-xl);
  letter-spacing: var(--tracking-wide);
}

.section h2 {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  margin-top: var(--space-lg);
  margin-bottom: var(--space-md);
  color: var(--color-heading);
}

p {
  text-indent: 1.5em;
  margin: 0;
}

p:first-of-type {
  text-indent: 0;
}

blockquote {
  margin: var(--space-md) var(--space-lg);
  font-style: italic;
  color: var(--color-gray-dark);
  border-left: 2pt solid var(--color-rule);
  padding-left: var(--space-sm);
}

.page-break {
  break-after: page;
}
```

- [ ] **Step 6: Create remaining book type templates**

Create `templates/book-types/coffee-table.css`:

```css
@import "../tokens/typography.css";
@import "../tokens/spacing.css";
@import "../tokens/colors.css";
@import "../tokens/grid.css";

@page {
  size: 280mm 280mm; /* Square format */
  margin: 15mm;
  marks: crop cross;
  bleed: 5mm;
}

body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
}

.chapter {
  break-before: page;
}

.chapter h1 {
  font-size: var(--text-4xl);
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  margin-bottom: var(--space-xl);
}

figure {
  margin: 0;
  break-inside: avoid;
}

figure img {
  width: 100%;
  height: auto;
}

.full-bleed figure {
  margin: 0;
}

.full-bleed img {
  width: calc(100% + 30mm);
  margin-left: -15mm;
}
```

Create `templates/book-types/children-book.css`:

```css
@import "../tokens/typography.css";
@import "../tokens/spacing.css";
@import "../tokens/colors.css";

@page {
  size: 250mm 250mm; /* Square picture book */
  margin: 12mm;
  marks: crop cross;
  bleed: 3mm;
}

body {
  font-family: var(--font-sans);
  font-size: var(--text-xl);
  line-height: var(--leading-relaxed);
  color: var(--color-text);
}

.chapter {
  break-before: page;
}

.chapter h1 {
  font-size: var(--text-4xl);
  text-align: center;
  color: var(--color-heading);
  margin-top: var(--space-xl);
  margin-bottom: var(--space-lg);
}

p {
  text-align: center;
  margin-bottom: var(--space-md);
  text-indent: 0;
}

figure {
  text-align: center;
  margin: var(--space-lg) 0;
}

figure img {
  max-width: 90%;
  height: auto;
  border-radius: 4mm;
}
```

Create `templates/book-types/textbook.css`:

```css
@import "../tokens/typography.css";
@import "../tokens/spacing.css";
@import "../tokens/colors.css";
@import "../tokens/grid.css";

@page {
  size: A4;
  margin: 20mm 15mm 25mm 20mm;
  marks: crop cross;
  bleed: 3mm;

  @top-left {
    content: string(chapter-title);
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    color: var(--color-gray);
  }

  @bottom-center {
    content: counter(page);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
  }
}

body {
  font-family: var(--font-sans);
  font-size: 10pt;
  line-height: var(--leading-normal);
}

.chapter {
  break-before: page;
}

.chapter h1 {
  string-set: chapter-title content();
  font-size: var(--text-2xl);
  color: var(--color-heading);
  border-bottom: 1pt solid var(--color-rule);
  padding-bottom: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.section h2 {
  font-size: var(--text-lg);
  color: var(--color-heading);
  margin-top: var(--space-lg);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--space-md) 0;
  font-size: var(--text-sm);
}

th, td {
  border: 0.5pt solid var(--color-gray-light);
  padding: var(--space-xs) var(--space-sm);
  text-align: left;
}

th {
  background: var(--color-gray-lighter);
  font-weight: 600;
}

blockquote {
  background: var(--color-gray-lighter);
  padding: var(--space-sm) var(--space-md);
  border-left: 3pt solid var(--color-gray);
  margin: var(--space-md) 0;
}
```

Create `templates/book-types/catalog.css`:

```css
@import "../tokens/typography.css";
@import "../tokens/spacing.css";
@import "../tokens/colors.css";
@import "../tokens/grid.css";

@page {
  size: A4;
  margin: 12mm;
  marks: crop cross;
  bleed: 3mm;
}

body {
  font-family: var(--font-sans);
  font-size: 9pt;
  line-height: var(--leading-normal);
}

.chapter {
  break-before: page;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gutter);
}

.chapter h1 {
  grid-column: 1 / -1;
  font-size: var(--text-2xl);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  margin-bottom: var(--space-md);
}

figure {
  break-inside: avoid;
  margin: 0 0 var(--space-sm) 0;
}

figure img {
  width: 100%;
  height: auto;
}

table {
  width: 100%;
  font-size: var(--text-xs);
}
```

Create `templates/book-types/corporate-report.css`:

```css
@import "../tokens/typography.css";
@import "../tokens/spacing.css";
@import "../tokens/colors.css";
@import "../tokens/grid.css";

@page {
  size: A4;
  margin: 20mm 18mm 25mm 18mm;
  marks: crop cross;
  bleed: 3mm;

  @bottom-right {
    content: counter(page);
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    color: var(--color-gray);
  }
}

body {
  font-family: var(--font-sans);
  font-size: 10pt;
  line-height: var(--leading-normal);
  color: var(--color-text);
}

.chapter {
  break-before: page;
}

.chapter h1 {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: var(--space-lg);
  padding-bottom: var(--space-sm);
  border-bottom: 2pt solid var(--color-heading);
}

.section h2 {
  font-size: var(--text-lg);
  font-weight: 600;
  margin-top: var(--space-lg);
  margin-bottom: var(--space-sm);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--space-md) 0;
}

th {
  background: var(--color-gray-lighter);
  font-weight: 600;
  text-align: left;
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1pt solid var(--color-gray);
}

td {
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 0.5pt solid var(--color-gray-light);
}
```

Create `templates/book-types/magazine.css`:

```css
@import "../tokens/typography.css";
@import "../tokens/spacing.css";
@import "../tokens/colors.css";
@import "../tokens/grid.css";

@page {
  size: 210mm 275mm; /* US Letter-ish magazine */
  margin: 12mm 10mm 15mm 10mm;
  marks: crop cross;
  bleed: 3mm;
}

body {
  font-family: var(--font-sans);
  font-size: 9.5pt;
  line-height: var(--leading-normal);
  column-count: 2;
  column-gap: var(--gutter);
}

.chapter {
  break-before: page;
  column-count: 2;
  column-gap: var(--gutter);
}

.chapter h1 {
  column-span: all;
  font-size: var(--text-3xl);
  font-weight: 900;
  text-transform: uppercase;
  margin-bottom: var(--space-md);
}

.section h2 {
  font-size: var(--text-lg);
  font-weight: 700;
  margin-top: var(--space-md);
  color: var(--color-heading);
}

figure {
  break-inside: avoid;
  margin: var(--space-sm) 0;
}

figure img {
  width: 100%;
}

blockquote {
  font-size: var(--text-xl);
  font-style: italic;
  column-span: all;
  text-align: center;
  margin: var(--space-lg) var(--space-xl);
  color: var(--color-gray-dark);
}
```

- [ ] **Step 7: Create component templates**

Create `templates/components/chapter-opener.css`:

```css
.chapter-opener {
  break-before: right;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 60%;
  text-align: center;
}

.chapter-opener .chapter-number {
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: var(--color-gray);
  margin-bottom: var(--space-md);
}

.chapter-opener .chapter-title {
  font-size: var(--text-3xl);
  color: var(--color-heading);
  margin-bottom: var(--space-sm);
}

.chapter-opener .chapter-subtitle {
  font-size: var(--text-lg);
  color: var(--color-gray-dark);
  font-style: italic;
}
```

Create `templates/components/toc.css`:

```css
.toc {
  break-before: page;
}

.toc h1 {
  font-size: var(--text-2xl);
  margin-bottom: var(--space-xl);
}

.toc-entry {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  border-bottom: 0.5pt dotted var(--color-gray-light);
}

.toc-entry .toc-title {
  flex: 1;
}

.toc-entry .toc-page {
  flex-shrink: 0;
  margin-left: var(--space-sm);
  color: var(--color-gray);
}

.toc-entry.toc-chapter {
  font-weight: 600;
  margin-top: var(--space-sm);
}

.toc-entry.toc-section {
  padding-left: var(--space-md);
  font-size: var(--text-sm);
}
```

Create `templates/components/cover.css`:

```css
.cover {
  break-before: page;
  break-after: page;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  text-align: center;
}

.cover .book-title {
  font-size: var(--text-4xl);
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: var(--space-md);
}

.cover .book-subtitle {
  font-size: var(--text-xl);
  color: var(--color-gray-dark);
  margin-bottom: var(--space-2xl);
}

.cover .book-author {
  font-size: var(--text-lg);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--color-gray);
}
```

Create `templates/components/footnotes.css`:

```css
.footnote {
  font-size: var(--text-sm);
  color: var(--color-gray-dark);
  border-top: 0.5pt solid var(--color-rule);
  padding-top: var(--space-xs);
  margin-top: var(--space-md);
}

.footnote-ref {
  font-size: 0.7em;
  vertical-align: super;
  color: var(--color-gray-dark);
}
```

Create `templates/components/colophon.css`:

```css
.colophon {
  break-before: page;
  font-size: var(--text-sm);
  color: var(--color-gray-dark);
  text-align: center;
  padding-top: var(--space-2xl);
}

.colophon p {
  text-indent: 0;
  margin-bottom: var(--space-sm);
}

.colophon .typeface-info {
  font-style: italic;
  margin-top: var(--space-lg);
}
```

- [ ] **Step 8: Commit**

```bash
git add templates/
git commit -m "feat: add CSS template library with 7 book types, 5 components, and design tokens"
```

---

### Task 6: AI Layout Generator (Claude API)

**Files:**
- Create: `packages/core/src/ai-layout.ts`
- Create: `tests/core/ai-layout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/ai-layout.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { generateLayout } from "@typeset-ai/core";
import type { ContentTree, LayoutOptions } from "@typeset-ai/core";

// Mock the Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: `\`\`\`css
@page { size: 129mm 198mm; margin: 20mm; }
body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.6; }
.chapter h1 { font-size: 24pt; text-align: center; }
\`\`\``,
            },
          ],
        }),
      };
    },
  };
});

const MINIMAL_TREE: ContentTree = {
  metadata: {
    title: "Test Book",
    author: "Test Author",
    source: "markdown",
    pageCount: 0,
  },
  frontMatter: [],
  chapters: [
    {
      title: "Chapter 1",
      number: 1,
      sections: [
        {
          heading: "Intro",
          level: 2,
          blocks: [
            { type: "paragraph", content: "Sample text.", attributes: {} },
          ],
        },
      ],
    },
  ],
  backMatter: [],
  assets: [],
};

describe("generateLayout", () => {
  it("should return a CSS string", async () => {
    const options: LayoutOptions = {
      bookType: "novel",
      pageSize: "129mm 198mm",
    };

    const css = await generateLayout(MINIMAL_TREE, options);

    expect(typeof css).toBe("string");
    expect(css).toContain("@page");
    expect(css).toContain("font-family");
  });

  it("should include page size from options", async () => {
    const options: LayoutOptions = {
      bookType: "novel",
      pageSize: "129mm 198mm",
    };

    const css = await generateLayout(MINIMAL_TREE, options);

    expect(css).toContain("129mm 198mm");
  });

  it("should extract CSS from markdown code blocks in AI response", async () => {
    const options: LayoutOptions = {
      bookType: "novel",
      pageSize: "129mm 198mm",
    };

    const css = await generateLayout(MINIMAL_TREE, options);

    // Should not contain the markdown code fence markers
    expect(css).not.toContain("```");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/core/ai-layout.test.ts`
Expected: FAIL — `generateLayout` is not exported.

- [ ] **Step 3: Implement AI layout generator**

Create `packages/core/src/ai-layout.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ContentTree, LayoutOptions } from "./types.js";

function getTemplatesDir(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return resolve(currentDir, "../../..", "templates");
}

function loadBaseTemplate(bookType: string): string {
  const templatesDir = getTemplatesDir();
  const templatePath = resolve(templatesDir, "book-types", `${bookType}.css`);

  try {
    return readFileSync(templatePath, "utf-8");
  } catch {
    return "";
  }
}

function summarizeContent(content: ContentTree): string {
  const chapterCount = content.chapters.length;
  let totalParagraphs = 0;
  let totalImages = 0;
  let totalTables = 0;
  let hasList = false;
  let hasBlockquote = false;

  for (const chapter of content.chapters) {
    for (const section of chapter.sections) {
      for (const block of section.blocks) {
        if (block.type === "paragraph") totalParagraphs++;
        if (block.type === "image") totalImages++;
        if (block.type === "table") totalTables++;
        if (block.type === "list") hasList = true;
        if (block.type === "blockquote") hasBlockquote = true;
      }
    }
  }

  return [
    `Title: ${content.metadata.title}`,
    `Chapters: ${chapterCount}`,
    `Paragraphs: ${totalParagraphs}`,
    `Images: ${totalImages}`,
    `Tables: ${totalTables}`,
    `Has lists: ${hasList}`,
    `Has blockquotes: ${hasBlockquote}`,
  ].join("\n");
}

function extractCssFromResponse(response: string): string {
  // Extract CSS from markdown code block if present
  const codeBlockMatch = response.match(/```css\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try generic code block
  const genericMatch = response.match(/```\n([\s\S]*?)```/);
  if (genericMatch) {
    return genericMatch[1].trim();
  }

  // Return raw response if no code block found
  return response.trim();
}

export async function generateLayout(
  content: ContentTree,
  options: LayoutOptions,
): Promise<string> {
  const baseTemplate = loadBaseTemplate(options.bookType);
  const contentSummary = summarizeContent(content);

  const client = new Anthropic();

  const systemPrompt = `You are an expert book designer and CSS typesetter. You generate CSS layouts using the CSS Paged Media specification for print-ready book production.

Rules:
- Use @page rules for page dimensions, margins, bleeds, and crop marks
- Use CSS variables from the design token system when possible
- Ensure proper widow/orphan control
- Set appropriate running headers/footers
- Handle chapter breaks (break-before: right for recto starts)
- Use proper font stacks for print (serif for body, sans for headings where appropriate)
- All measurements in mm or pt (not px)
- Output ONLY the CSS code in a css code block, no explanation`;

  const userPrompt = `Generate a complete CSS layout for this book:

Book type: ${options.bookType}
Page size: ${options.pageSize}

Content summary:
${contentSummary}

${baseTemplate ? `Base template to build upon:\n\`\`\`css\n${baseTemplate}\n\`\`\`` : "No base template — generate from scratch."}

${options.customCss ? `Custom CSS to incorporate:\n\`\`\`css\n${options.customCss}\n\`\`\`` : ""}

Generate the complete CSS layout. Output only the CSS in a code block.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in AI response");
  }

  return extractCssFromResponse(textBlock.text);
}
```

- [ ] **Step 4: Update `packages/core/src/index.ts`**

Add export:
```typescript
export { generateLayout } from "./ai-layout.js";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- tests/core/ai-layout.test.ts`
Expected: All 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/ai-layout.ts packages/core/src/index.ts tests/core/ai-layout.test.ts
git commit -m "feat(core): add AI layout generator using Claude API for CSS generation"
```

---

### Task 7: Reference Scanner (Image/PDF → CSS)

**Files:**
- Create: `packages/core/src/reference-scanner.ts`
- Create: `tests/core/reference-scanner.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/reference-scanner.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { scanReference } from "@typeset-ai/core";

// Mock fs to return a fake image buffer
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    readFileSync: vi.fn((path: string) => {
      if (typeof path === "string" && path.endsWith(".jpg")) {
        // Return a tiny buffer that represents a fake image
        return Buffer.from("fake-image-data");
      }
      return actual.readFileSync(path);
    }),
  };
});

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: `\`\`\`css
@page { size: 210mm 297mm; margin: 20mm 15mm; }
body { font-family: "Helvetica Neue", sans-serif; font-size: 10pt; line-height: 1.5; }
.chapter h1 { font-size: 28pt; font-weight: 300; text-transform: uppercase; }
\`\`\`

**Analysis:**
- Grid: Single column with generous margins
- Typography: Sans-serif, light weight headings
- Color: Monochrome
- Spacing: Open, airy layout`,
            },
          ],
        }),
      };
    },
  };
});

describe("scanReference", () => {
  it("should return a CSS string from an image path", async () => {
    const result = await scanReference("test-reference.jpg");

    expect(typeof result.css).toBe("string");
    expect(result.css).toContain("@page");
  });

  it("should return an analysis description", async () => {
    const result = await scanReference("test-reference.jpg");

    expect(typeof result.analysis).toBe("string");
    expect(result.analysis.length).toBeGreaterThan(0);
  });

  it("should extract CSS from code blocks in response", async () => {
    const result = await scanReference("test-reference.jpg");

    expect(result.css).not.toContain("```");
    expect(result.css).toContain("font-family");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/core/reference-scanner.test.ts`
Expected: FAIL — `scanReference` is not exported.

- [ ] **Step 3: Implement reference scanner**

Create `packages/core/src/reference-scanner.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";

export interface ScanResult {
  css: string;
  analysis: string;
}

function getMediaType(
  filePath: string,
): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const mediaTypes: Record<
    string,
    "image/jpeg" | "image/png" | "image/gif" | "image/webp"
  > = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  return mediaTypes[ext] ?? "image/jpeg";
}

function extractCssFromResponse(response: string): string {
  const codeBlockMatch = response.match(/```css\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const genericMatch = response.match(/```\n([\s\S]*?)```/);
  if (genericMatch) {
    return genericMatch[1].trim();
  }

  return "";
}

function extractAnalysisFromResponse(response: string): string {
  // Everything after the code block
  const afterCodeBlock = response.replace(/```[\s\S]*?```/, "").trim();
  return afterCodeBlock;
}

export async function scanReference(imagePath: string): Promise<ScanResult> {
  const imageBuffer = readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const mediaType = getMediaType(imagePath);

  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `Analyze this book/publication design and generate CSS that recreates its layout style. Focus on:

1. Page dimensions and margins
2. Typography: font families (suggest similar widely-available fonts), sizes, line height, letter spacing
3. Grid structure: columns, gutters, alignment
4. Color palette: text color, heading color, accent colors
5. Spacing: paragraph spacing, section spacing, image margins
6. Special elements: headers, footers, page numbers, captions

Output:
1. A CSS code block using CSS Paged Media spec (@page rules, print measurements in mm/pt)
2. A brief analysis section describing the design characteristics

Use only widely-available fonts or suggest alternatives. All measurements in mm or pt.`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in AI response");
  }

  const css = extractCssFromResponse(textBlock.text);
  const analysis = extractAnalysisFromResponse(textBlock.text);

  return { css, analysis };
}
```

- [ ] **Step 4: Update `packages/core/src/index.ts`**

Add exports:
```typescript
export { scanReference } from "./reference-scanner.js";
export type { ScanResult } from "./reference-scanner.js";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- tests/core/reference-scanner.test.ts`
Expected: All 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/reference-scanner.ts packages/core/src/index.ts tests/core/reference-scanner.test.ts
git commit -m "feat(core): add reference scanner to analyze images and generate matching CSS via Claude Vision"
```

---

### Task 8: PDF Renderer (Paged.js + Puppeteer)

**Files:**
- Create: `packages/core/src/pdf-renderer.ts`
- Create: `tests/core/pdf-renderer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/pdf-renderer.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderPdf } from "@typeset-ai/core";

// Mock Puppeteer
const mockPage = {
  setContent: vi.fn().mockResolvedValue(undefined),
  waitForFunction: vi.fn().mockResolvedValue(undefined),
  pdf: vi.fn().mockResolvedValue(Buffer.from("fake-pdf")),
  evaluate: vi.fn().mockResolvedValue(undefined),
};

const mockBrowser = {
  newPage: vi.fn().mockResolvedValue(mockPage),
  close: vi.fn().mockResolvedValue(undefined),
};

vi.mock("puppeteer", () => ({
  default: {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}));

describe("renderPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a PDF buffer", async () => {
    const html = "<!DOCTYPE html><html><body>Hello</body></html>";
    const result = await renderPdf(html, {
      format: "pdf",
      outputPath: "test.pdf",
      colorProfile: "cmyk",
      includeBleed: true,
      includeCropMarks: true,
    });

    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("should set HTML content on the page", async () => {
    const html = "<!DOCTYPE html><html><body>Content</body></html>";
    await renderPdf(html, {
      format: "pdf",
      outputPath: "test.pdf",
      colorProfile: "cmyk",
      includeBleed: true,
      includeCropMarks: true,
    });

    expect(mockPage.setContent).toHaveBeenCalledWith(html, {
      waitUntil: "networkidle0",
    });
  });

  it("should wait for Paged.js to finish rendering", async () => {
    const html = "<!DOCTYPE html><html><body>Content</body></html>";
    await renderPdf(html, {
      format: "pdf",
      outputPath: "test.pdf",
      colorProfile: "cmyk",
      includeBleed: true,
      includeCropMarks: true,
    });

    expect(mockPage.waitForFunction).toHaveBeenCalled();
  });

  it("should close the browser after rendering", async () => {
    const html = "<!DOCTYPE html><html><body>Content</body></html>";
    await renderPdf(html, {
      format: "pdf",
      outputPath: "test.pdf",
      colorProfile: "cmyk",
      includeBleed: true,
      includeCropMarks: true,
    });

    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("should generate proof PDF with different settings", async () => {
    const html = "<!DOCTYPE html><html><body>Content</body></html>";
    await renderPdf(html, {
      format: "pdf-proof",
      outputPath: "proof.pdf",
      colorProfile: "rgb",
      includeBleed: false,
      includeCropMarks: false,
    });

    expect(mockPage.pdf).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/core/pdf-renderer.test.ts`
Expected: FAIL — `renderPdf` is not exported.

- [ ] **Step 3: Implement PDF renderer**

Create `packages/core/src/pdf-renderer.ts`:

```typescript
import puppeteer from "puppeteer";
import type { RenderOptions } from "./types.js";

const PAGED_JS_READY_CHECK = `
  () => {
    return typeof window.PagedPolyfill !== 'undefined'
      ? window.PagedPolyfill.ready
      : true;
  }
`;

export async function renderPdf(
  html: string,
  options: RenderOptions,
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    // Wait for Paged.js polyfill to finish paginating
    await page.waitForFunction(PAGED_JS_READY_CHECK, { timeout: 30000 });

    const isProof = options.format === "pdf-proof";

    if (isProof) {
      // Add watermark for proof PDFs
      await page.evaluate(() => {
        const watermark = document.createElement("div");
        watermark.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 72pt;
          color: rgba(200, 200, 200, 0.3);
          pointer-events: none;
          z-index: 9999;
          font-family: sans-serif;
          font-weight: bold;
        `;
        watermark.textContent = "PROOF";
        document.body.appendChild(watermark);
      });
    }

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 4: Update `packages/core/src/index.ts`**

Add export:
```typescript
export { renderPdf } from "./pdf-renderer.js";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- tests/core/pdf-renderer.test.ts`
Expected: All 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/pdf-renderer.ts packages/core/src/index.ts tests/core/pdf-renderer.test.ts
git commit -m "feat(core): add PDF renderer using Paged.js and Puppeteer with proof watermark support"
```

---

### Task 9: Preflight Checks

**Files:**
- Create: `packages/core/src/preflight.ts`
- Create: `tests/core/preflight.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/preflight.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { runPreflight } from "@typeset-ai/core";
import type { ContentTree } from "@typeset-ai/core";

function makeTree(overrides: Partial<ContentTree> = {}): ContentTree {
  return {
    metadata: { title: "Test", author: "Author", source: "markdown", pageCount: 0 },
    frontMatter: [],
    chapters: [],
    backMatter: [],
    assets: [],
    ...overrides,
  };
}

describe("runPreflight", () => {
  it("should pass with no assets and valid content", () => {
    const tree = makeTree({
      chapters: [
        {
          title: "Ch1",
          number: 1,
          sections: [
            {
              heading: "S1",
              level: 2,
              blocks: [
                { type: "paragraph", content: "Text.", attributes: {} },
              ],
            },
          ],
        },
      ],
    });

    const result = runPreflight(tree, "@page { size: A4; }");
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should warn about low DPI images", () => {
    const tree = makeTree({
      assets: [
        {
          id: "a1",
          originalName: "photo.jpg",
          localPath: "images/photo.jpg",
          mimeType: "image/jpeg",
          width: 800,
          height: 600,
          dpi: 150,
        },
      ],
    });

    const result = runPreflight(tree, "@page { size: A4; }");
    expect(result.warnings.some((w) => w.code === "LOW_DPI")).toBe(true);
  });

  it("should error on images below 72 DPI", () => {
    const tree = makeTree({
      assets: [
        {
          id: "a1",
          originalName: "tiny.jpg",
          localPath: "images/tiny.jpg",
          mimeType: "image/jpeg",
          width: 100,
          height: 100,
          dpi: 50,
        },
      ],
    });

    const result = runPreflight(tree, "@page { size: A4; }");
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === "VERY_LOW_DPI")).toBe(true);
  });

  it("should warn when CSS has no @page rule", () => {
    const tree = makeTree();
    const result = runPreflight(tree, "body { font-size: 12pt; }");

    expect(result.warnings.some((w) => w.code === "NO_PAGE_RULE")).toBe(true);
  });

  it("should warn when CSS uses px units", () => {
    const tree = makeTree();
    const result = runPreflight(
      tree,
      "@page { size: A4; } body { font-size: 16px; }",
    );

    expect(result.warnings.some((w) => w.code === "PX_UNITS")).toBe(true);
  });

  it("should warn about missing bleed on page rule", () => {
    const tree = makeTree();
    const result = runPreflight(
      tree,
      "@page { size: A4; margin: 20mm; }",
    );

    expect(result.warnings.some((w) => w.code === "NO_BLEED")).toBe(true);
  });

  it("should pass when all checks are satisfied", () => {
    const tree = makeTree({
      assets: [
        {
          id: "a1",
          originalName: "photo.jpg",
          localPath: "images/photo.jpg",
          mimeType: "image/jpeg",
          width: 3000,
          height: 2000,
          dpi: 300,
        },
      ],
    });

    const css = "@page { size: A4; margin: 20mm; bleed: 3mm; marks: crop; }";
    const result = runPreflight(tree, css);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/core/preflight.test.ts`
Expected: FAIL — `runPreflight` is not exported.

- [ ] **Step 3: Implement preflight checks**

Create `packages/core/src/preflight.ts`:

```typescript
import type {
  ContentTree,
  PreflightResult,
  PreflightIssue,
} from "./types.js";

const MIN_PRINT_DPI = 300;
const CRITICAL_MIN_DPI = 72;

function checkImageResolution(content: ContentTree): PreflightIssue[] {
  const issues: PreflightIssue[] = [];

  for (const asset of content.assets) {
    if (asset.dpi > 0 && asset.dpi < CRITICAL_MIN_DPI) {
      issues.push({
        severity: "error",
        code: "VERY_LOW_DPI",
        message: `Image "${asset.originalName}" is ${asset.dpi} DPI — minimum for print is ${CRITICAL_MIN_DPI} DPI. Image will appear pixelated.`,
        element: asset.localPath,
      });
    } else if (asset.dpi > 0 && asset.dpi < MIN_PRINT_DPI) {
      issues.push({
        severity: "warning",
        code: "LOW_DPI",
        message: `Image "${asset.originalName}" is ${asset.dpi} DPI — recommended minimum for print is ${MIN_PRINT_DPI} DPI.`,
        element: asset.localPath,
      });
    }
  }

  return issues;
}

function checkCssPageRules(css: string): PreflightIssue[] {
  const issues: PreflightIssue[] = [];

  if (!css.includes("@page")) {
    issues.push({
      severity: "warning",
      code: "NO_PAGE_RULE",
      message:
        "CSS has no @page rule. Page dimensions, margins, and print settings may use browser defaults.",
    });
  }

  if (/\d+px/.test(css)) {
    issues.push({
      severity: "warning",
      code: "PX_UNITS",
      message:
        "CSS uses pixel (px) units. For print, use mm, cm, in, or pt instead.",
    });
  }

  if (css.includes("@page") && !css.includes("bleed")) {
    issues.push({
      severity: "warning",
      code: "NO_BLEED",
      message:
        "No bleed defined in @page rule. Print shops typically require 3mm bleed for full-bleed elements.",
    });
  }

  return issues;
}

export function runPreflight(
  content: ContentTree,
  css: string,
): PreflightResult {
  const allIssues = [
    ...checkImageResolution(content),
    ...checkCssPageRules(css),
  ];

  const errors = allIssues.filter((i) => i.severity === "error");
  const warnings = allIssues.filter((i) => i.severity === "warning");

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
```

- [ ] **Step 4: Update `packages/core/src/index.ts`**

Add export:
```typescript
export { runPreflight } from "./preflight.js";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- tests/core/preflight.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/preflight.ts packages/core/src/index.ts tests/core/preflight.test.ts
git commit -m "feat(core): add print preflight checks for DPI, page rules, bleed, and units"
```

---

### Task 10: CLI Entry Point and Commands

**Files:**
- Create: `apps/cli/src/utils/config.ts`
- Create: `apps/cli/src/index.ts`
- Create: `apps/cli/src/commands/ingest.ts`
- Create: `apps/cli/src/commands/layout.ts`
- Create: `apps/cli/src/commands/render.ts`
- Create: `apps/cli/src/commands/preflight.ts`

- [ ] **Step 1: Create `apps/cli/src/utils/config.ts`**

```typescript
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });

export function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Add it to .env or set it as an environment variable.",
    );
  }
  return key;
}

export function getTemplatesDir(): string {
  return resolve(
    import.meta.dirname,
    "../../../..",
    "templates",
  );
}
```

- [ ] **Step 2: Create `apps/cli/src/commands/ingest.ts`**

```typescript
import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { parseMarkdown, scanReference } from "@typeset-ai/core";
import type { ScanResult } from "@typeset-ai/core";

export const ingestCommand = new Command("ingest")
  .description("Ingest content from various sources into a ContentTree")
  .requiredOption(
    "--source <type>",
    "Source type: markdown, reference",
  )
  .requiredOption("--path <filepath>", "Path to the source file")
  .option(
    "--output <filepath>",
    "Output path for the content tree JSON",
    "content.json",
  )
  .action(async (options) => {
    const { source, path: filePath, output } = options;
    const absolutePath = resolve(process.cwd(), filePath);
    const outputPath = resolve(process.cwd(), output);

    if (source === "markdown") {
      const spinner = ora("Parsing markdown...").start();

      try {
        const markdown = readFileSync(absolutePath, "utf-8");
        const contentTree = parseMarkdown(markdown);

        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, JSON.stringify(contentTree, null, 2));

        spinner.succeed(
          chalk.green(
            `Content tree saved to ${output} (${contentTree.chapters.length} chapters, ${contentTree.assets.length} assets)`,
          ),
        );
      } catch (err) {
        spinner.fail(chalk.red(`Failed to parse: ${err}`));
        process.exit(1);
      }
    } else if (source === "reference") {
      const spinner = ora("Analyzing reference design with AI...").start();

      try {
        const result: ScanResult = await scanReference(absolutePath);

        const cssOutput = outputPath.replace(/\.json$/, ".css");
        writeFileSync(cssOutput, result.css);

        spinner.succeed(chalk.green(`Reference CSS saved to ${cssOutput}`));
        console.log(chalk.cyan("\nDesign Analysis:"));
        console.log(result.analysis);
      } catch (err) {
        spinner.fail(chalk.red(`Failed to analyze: ${err}`));
        process.exit(1);
      }
    } else {
      console.error(
        chalk.red(`Unknown source type: ${source}. Use: markdown, reference`),
      );
      process.exit(1);
    }
  });
```

- [ ] **Step 3: Create `apps/cli/src/commands/layout.ts`**

```typescript
import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { generateLayout } from "@typeset-ai/core";
import type { ContentTree, BookType, LayoutOptions } from "@typeset-ai/core";

const VALID_BOOK_TYPES: BookType[] = [
  "novel",
  "coffee-table",
  "children-book",
  "textbook",
  "catalog",
  "corporate-report",
  "magazine",
];

export const layoutCommand = new Command("layout")
  .description("Generate AI-powered CSS layout for content")
  .requiredOption("--content <filepath>", "Path to content.json")
  .requiredOption("--type <booktype>", `Book type: ${VALID_BOOK_TYPES.join(", ")}`)
  .option("--page-size <size>", "Page size (e.g., 'A4', '129mm 198mm')", "A4")
  .option("--reference <filepath>", "Path to reference image for style matching")
  .option("--output <filepath>", "Output CSS file path", "layout.css")
  .action(async (options) => {
    const { content: contentPath, type: bookType, pageSize, reference, output } = options;

    if (!VALID_BOOK_TYPES.includes(bookType as BookType)) {
      console.error(
        chalk.red(`Invalid book type: ${bookType}. Valid types: ${VALID_BOOK_TYPES.join(", ")}`),
      );
      process.exit(1);
    }

    const spinner = ora("Generating layout with AI...").start();

    try {
      const contentJson = readFileSync(resolve(process.cwd(), contentPath), "utf-8");
      const contentTree: ContentTree = JSON.parse(contentJson);

      const layoutOptions: LayoutOptions = {
        bookType: bookType as BookType,
        pageSize,
        referenceImagePath: reference
          ? resolve(process.cwd(), reference)
          : undefined,
      };

      const css = await generateLayout(contentTree, layoutOptions);
      const outputPath = resolve(process.cwd(), output);
      writeFileSync(outputPath, css);

      spinner.succeed(
        chalk.green(`Layout CSS saved to ${output} (${bookType}, ${pageSize})`),
      );
    } catch (err) {
      spinner.fail(chalk.red(`Failed to generate layout: ${err}`));
      process.exit(1);
    }
  });
```

- [ ] **Step 4: Create `apps/cli/src/commands/render.ts`**

```typescript
import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { buildHtml, renderPdf } from "@typeset-ai/core";
import type { ContentTree, RenderOptions } from "@typeset-ai/core";

export const renderCommand = new Command("render")
  .description("Render content + layout into PDF")
  .requiredOption("--content <filepath>", "Path to content.json")
  .requiredOption("--css <filepath>", "Path to layout CSS file")
  .option("--format <format>", "Output format: pdf, pdf-proof", "pdf")
  .option("--output <filepath>", "Output file path", "output.pdf")
  .action(async (options) => {
    const { content: contentPath, css: cssPath, format, output } = options;

    const spinner = ora(`Rendering ${format}...`).start();

    try {
      const contentJson = readFileSync(resolve(process.cwd(), contentPath), "utf-8");
      const contentTree: ContentTree = JSON.parse(contentJson);
      const css = readFileSync(resolve(process.cwd(), cssPath), "utf-8");

      const html = buildHtml(contentTree, css);

      const renderOptions: RenderOptions = {
        format: format as "pdf" | "pdf-proof",
        outputPath: resolve(process.cwd(), output),
        colorProfile: format === "pdf-proof" ? "rgb" : "cmyk",
        includeBleed: format !== "pdf-proof",
        includeCropMarks: format !== "pdf-proof",
      };

      const pdfBuffer = await renderPdf(html, renderOptions);

      mkdirSync(dirname(renderOptions.outputPath), { recursive: true });
      writeFileSync(renderOptions.outputPath, pdfBuffer);

      const sizeMb = (pdfBuffer.length / 1024 / 1024).toFixed(2);
      spinner.succeed(
        chalk.green(`${format.toUpperCase()} saved to ${output} (${sizeMb} MB)`),
      );
    } catch (err) {
      spinner.fail(chalk.red(`Failed to render: ${err}`));
      process.exit(1);
    }
  });
```

- [ ] **Step 5: Create `apps/cli/src/commands/preflight.ts`**

```typescript
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import chalk from "chalk";
import { runPreflight } from "@typeset-ai/core";
import type { ContentTree } from "@typeset-ai/core";

export const preflightCommand = new Command("preflight")
  .description("Run print preflight checks on content and CSS")
  .requiredOption("--content <filepath>", "Path to content.json")
  .requiredOption("--css <filepath>", "Path to layout CSS file")
  .action((options) => {
    const { content: contentPath, css: cssPath } = options;

    try {
      const contentJson = readFileSync(resolve(process.cwd(), contentPath), "utf-8");
      const contentTree: ContentTree = JSON.parse(contentJson);
      const css = readFileSync(resolve(process.cwd(), cssPath), "utf-8");

      const result = runPreflight(contentTree, css);

      if (result.errors.length > 0) {
        console.log(chalk.red.bold(`\n  ${result.errors.length} Error(s):\n`));
        for (const error of result.errors) {
          console.log(chalk.red(`  [${error.code}] ${error.message}`));
          if (error.element) {
            console.log(chalk.gray(`    File: ${error.element}`));
          }
        }
      }

      if (result.warnings.length > 0) {
        console.log(
          chalk.yellow.bold(`\n  ${result.warnings.length} Warning(s):\n`),
        );
        for (const warning of result.warnings) {
          console.log(chalk.yellow(`  [${warning.code}] ${warning.message}`));
          if (warning.element) {
            console.log(chalk.gray(`    File: ${warning.element}`));
          }
        }
      }

      if (result.isValid && result.warnings.length === 0) {
        console.log(chalk.green.bold("\n  All preflight checks passed.\n"));
      } else if (result.isValid) {
        console.log(
          chalk.yellow.bold(
            "\n  Preflight passed with warnings. Review above.\n",
          ),
        );
      } else {
        console.log(
          chalk.red.bold(
            "\n  Preflight FAILED. Fix errors above before printing.\n",
          ),
        );
        process.exit(1);
      }
    } catch (err) {
      console.error(chalk.red(`Failed to run preflight: ${err}`));
      process.exit(1);
    }
  });
```

- [ ] **Step 6: Create CLI entry point `apps/cli/src/index.ts`**

```typescript
#!/usr/bin/env node

import { Command } from "commander";
import { ingestCommand } from "./commands/ingest.js";
import { layoutCommand } from "./commands/layout.js";
import { renderCommand } from "./commands/render.js";
import { preflightCommand } from "./commands/preflight.js";

const program = new Command();

program
  .name("typeset")
  .description("AI-powered typesetting CLI for book design and print production")
  .version("0.1.0");

program.addCommand(ingestCommand);
program.addCommand(layoutCommand);
program.addCommand(renderCommand);
program.addCommand(preflightCommand);

program.parse();
```

- [ ] **Step 7: Verify CLI builds and shows help**

Run: `cd apps/cli && pnpm build && node dist/index.js --help`
Expected:
```
Usage: typeset [options] [command]

AI-powered typesetting CLI for book design and print production

Options:
  -V, --version    output the version number
  -h, --help       display help for command

Commands:
  ingest           Ingest content from various sources into a ContentTree
  layout           Generate AI-powered CSS layout for content
  render           Render content + layout into PDF
  preflight        Run print preflight checks on content and CSS
```

- [ ] **Step 8: Commit**

```bash
git add apps/cli/src/
git commit -m "feat(cli): add CLI commands for ingest, layout, render, and preflight"
```

---

### Task 11: Integration Test — Full Pipeline

**Files:**
- Create: `tests/integration/pipeline.test.ts`

- [ ] **Step 1: Write integration test**

Create `tests/integration/pipeline.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseMarkdown,
  buildHtml,
  runPreflight,
} from "@typeset-ai/core";

const FIXTURES_DIR = resolve(import.meta.dirname, "../fixtures");

describe("Full pipeline integration", () => {
  it("should parse markdown → build HTML → pass preflight", () => {
    const markdown = readFileSync(
      resolve(FIXTURES_DIR, "sample-manuscript.md"),
      "utf-8",
    );

    // Step 1: Parse markdown into ContentTree
    const contentTree = parseMarkdown(markdown);
    expect(contentTree.chapters.length).toBeGreaterThan(0);
    expect(contentTree.metadata.title).toBe("The Great Adventure");

    // Step 2: Build HTML with a basic CSS template
    const css = `
      @page { size: 129mm 198mm; margin: 20mm; bleed: 3mm; marks: crop; }
      body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.6; }
      .chapter h1 { font-size: 24pt; text-align: center; }
    `;
    const html = buildHtml(contentTree, css);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("The Great Adventure");
    expect(html).toContain("Chapter 1: The Beginning");
    expect(html).toContain("Chapter 2: The Journey");
    expect(html).toContain("<style>");

    // Step 3: Run preflight
    const preflight = runPreflight(contentTree, css);
    expect(preflight.isValid).toBe(true);
  });

  it("should handle content with no chapters gracefully", () => {
    const markdown = "Just a paragraph with no headings.";
    const contentTree = parseMarkdown(markdown);

    expect(contentTree.chapters).toHaveLength(0);
    expect(contentTree.metadata.title).toBe("Untitled");

    const html = buildHtml(contentTree, "body { font-size: 12pt; }");
    expect(html).toContain("<!DOCTYPE html>");
  });
});
```

- [ ] **Step 2: Run integration tests**

Run: `pnpm test -- tests/integration/pipeline.test.ts`
Expected: All 2 tests PASS.

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`
Expected: All tests across all test files PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/
git commit -m "test: add full pipeline integration test (parse → build → preflight)"
```

---

### Task 12: Vitest Configuration and Final Wiring

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (verify test script)

- [ ] **Step 1: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    globals: false,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/index.ts", "**/*.d.ts"],
      thresholds: {
        lines: 80,
        branches: 75,
      },
    },
  },
  resolve: {
    alias: {
      "@typeset-ai/core": resolve(__dirname, "packages/core/src"),
    },
  },
});
```

- [ ] **Step 2: Run all tests to verify everything works**

Run: `pnpm test`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: add vitest config with path aliases and coverage thresholds"
```

---

## Summary

| Task | Component | Tests |
|---|---|---|
| 1 | Project scaffolding | - |
| 2 | Core types | Compile check |
| 3 | Content parser (Markdown → ContentTree) | 9 tests |
| 4 | HTML builder (ContentTree → HTML) | 9 tests |
| 5 | CSS template library (7 book types) | - |
| 6 | AI layout generator (Claude API) | 3 tests |
| 7 | Reference scanner (Image → CSS) | 3 tests |
| 8 | PDF renderer (Paged.js + Puppeteer) | 5 tests |
| 9 | Preflight checks | 7 tests |
| 10 | CLI commands (ingest, layout, render, preflight) | CLI help check |
| 11 | Integration test (full pipeline) | 2 tests |
| 12 | Vitest config | All tests pass |

**Total: 12 tasks, ~38 tests**
