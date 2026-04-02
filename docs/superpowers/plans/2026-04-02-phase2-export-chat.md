# Phase 2: Export & AI Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add IDML export (InDesign), SVG export (Illustrator), and an AI chat engine for conversational layout refinement to the TypeSet AI platform.

**Architecture:** Three new core modules (`idml-exporter.ts`, `svg-exporter.ts`, `chat-engine.ts`) added to `packages/core/src/`, with corresponding CLI commands in `apps/cli/src/commands/`. IDML export parses HTML DOM into IDML XML files packaged as a ZIP. SVG export uses Puppeteer to serialize each Paged.js page as an SVG. The AI chat engine wraps the Claude API with conversation history, CSS diff generation, and undo/redo state management.

**Tech Stack:** JSZip 3.10.1 (IDML ZIP packaging), xmlbuilder2 3.1.1 (IDML XML generation), Puppeteer (SVG page capture, already installed), @anthropic-ai/sdk (chat engine, already installed), diff 7.0.0 (CSS diff display)

---

## File Structure

```
typeset-ai/
├── packages/
│   └── core/
│       └── src/
│           ├── types.ts                    # MODIFY — add export + chat types
│           ├── index.ts                    # MODIFY — re-export new modules
│           ├── idml-exporter.ts            # NEW — HTML → IDML package
│           ├── idml/
│           │   ├── designmap-builder.ts    # NEW — designmap.xml generator
│           │   ├── spread-builder.ts       # NEW — Spreads XML generator
│           │   ├── story-builder.ts        # NEW — Stories XML generator
│           │   ├── styles-builder.ts       # NEW — paragraph/character/object styles
│           │   ├── constants.ts            # NEW — IDML namespace URIs, defaults
│           │   └── index.ts               # NEW — re-exports for idml/
│           ├── svg-exporter.ts             # NEW — HTML → per-page SVG files
│           └── chat-engine.ts              # NEW — conversational layout AI
├── apps/
│   └── cli/
│       └── src/
│           └── commands/
│               ├── export-idml.ts          # NEW — `typeset export-idml` command
│               ├── export-svg.ts           # NEW — `typeset export-svg` command
│               └── chat.ts                 # NEW — `typeset chat` command
└── tests/
    └── core/
        ├── idml-exporter.test.ts           # NEW
        ├── idml/
        │   ├── designmap-builder.test.ts   # NEW
        │   ├── spread-builder.test.ts      # NEW
        │   ├── story-builder.test.ts       # NEW
        │   └── styles-builder.test.ts      # NEW
        ├── svg-exporter.test.ts            # NEW
        └── chat-engine.test.ts             # NEW
```

---

## Part 1: IDML Export

### Task 1: Add Phase 2 types to types.ts

**Files:**
- Modify: `packages/core/src/types.ts`
- Test: `tests/core/idml/styles-builder.test.ts` (validates types exist)

- [ ] **Step 1: Write failing test that imports new types**

Create `tests/core/type-check-phase2.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type {
  IdmlExportOptions,
  SvgExportOptions,
  ChatMessage,
  ChatSession,
  ChatResponse,
  CssDiff,
} from "@typeset-ai/core/types.js";

describe("Phase 2 types", () => {
  it("should define IdmlExportOptions with required fields", () => {
    const options: IdmlExportOptions = {
      outputPath: "/tmp/output.idml",
      preserveStyles: true,
      embedImages: false,
    };

    expect(options.outputPath).toBe("/tmp/output.idml");
    expect(options.preserveStyles).toBe(true);
    expect(options.embedImages).toBe(false);
  });

  it("should define SvgExportOptions with required fields", () => {
    const options: SvgExportOptions = {
      outputDir: "/tmp/svg-output",
      embedImages: true,
      preserveText: true,
    };

    expect(options.outputDir).toBe("/tmp/svg-output");
    expect(options.embedImages).toBe(true);
    expect(options.preserveText).toBe(true);
  });

  it("should define ChatMessage with role and content", () => {
    const message: ChatMessage = {
      role: "user",
      content: "Make the headings bigger",
      timestamp: "2026-04-02T10:00:00Z",
    };

    expect(message.role).toBe("user");
    expect(message.content).toBe("Make the headings bigger");
  });

  it("should define ChatResponse with css and diff", () => {
    const response: ChatResponse = {
      message: "I increased the heading size from 24pt to 32pt.",
      css: ".chapter h1 { font-size: 32pt; }",
      diff: {
        before: ".chapter h1 { font-size: 24pt; }",
        after: ".chapter h1 { font-size: 32pt; }",
        patch: "- .chapter h1 { font-size: 24pt; }\n+ .chapter h1 { font-size: 32pt; }",
      },
      isApplied: false,
    };

    expect(response.css).toContain("32pt");
    expect(response.diff.patch).toContain("+");
  });

  it("should define ChatSession with history and undo stack", () => {
    const session: ChatSession = {
      id: "session-1",
      contentTree: {
        metadata: { title: "Test", author: "A", source: "markdown", pageCount: 0 },
        frontMatter: [],
        chapters: [],
        backMatter: [],
        assets: [],
      },
      currentCss: "body { font-size: 12pt; }",
      history: [],
      undoStack: [],
      redoStack: [],
    };

    expect(session.id).toBe("session-1");
    expect(session.undoStack).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/type-check-phase2.test.ts`

Expected: FAIL — types `IdmlExportOptions`, `SvgExportOptions`, `ChatMessage`, `ChatSession`, `ChatResponse`, `CssDiff` do not exist in `types.ts`

- [ ] **Step 3: Implement — add types to types.ts**

Append to `packages/core/src/types.ts`:

```typescript
// --- Phase 2: Export Types ---

export interface IdmlExportOptions {
  outputPath: string;
  preserveStyles: boolean;
  embedImages: boolean;
}

export interface SvgExportOptions {
  outputDir: string;
  embedImages: boolean;
  preserveText: boolean;
}

// --- Phase 2: Chat Engine Types ---

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  referenceImagePath?: string;
}

export interface CssDiff {
  before: string;
  after: string;
  patch: string;
}

export interface ChatResponse {
  message: string;
  css: string;
  diff: CssDiff;
  isApplied: boolean;
}

export interface ChatSession {
  id: string;
  contentTree: ContentTree;
  currentCss: string;
  history: ChatMessage[];
  undoStack: string[];
  redoStack: string[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/type-check-phase2.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```
feat(core): add Phase 2 types for IDML export, SVG export, and chat engine
```

---

### Task 2: IDML constants and namespace definitions

**Files:**
- Create: `packages/core/src/idml/constants.ts`
- Test: `tests/core/idml/constants.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/core/idml/constants.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  IDML_NAMESPACE,
  IDPKG_NAMESPACE,
  DEFAULT_PAGE_WIDTH,
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_MARGIN,
  POINTS_PER_MM,
  MIMETYPE_CONTENT,
} from "@typeset-ai/core/idml/constants.js";

describe("IDML constants", () => {
  it("should define the IDML namespace URI", () => {
    expect(IDML_NAMESPACE).toBe("http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging");
  });

  it("should define the IDPKG namespace URI", () => {
    expect(IDPKG_NAMESPACE).toBe("http://ns.adobe.com/AdobeInDesign/idpkg/1.0");
  });

  it("should define default page dimensions in points", () => {
    expect(typeof DEFAULT_PAGE_WIDTH).toBe("number");
    expect(typeof DEFAULT_PAGE_HEIGHT).toBe("number");
    expect(DEFAULT_PAGE_WIDTH).toBeGreaterThan(0);
    expect(DEFAULT_PAGE_HEIGHT).toBeGreaterThan(0);
  });

  it("should define points-per-mm conversion factor", () => {
    expect(POINTS_PER_MM).toBeCloseTo(2.834645669, 3);
  });

  it("should define the IDML mimetype content", () => {
    expect(MIMETYPE_CONTENT).toBe("application/vnd.adobe.indesign-idml-package");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/idml/constants.test.ts`

Expected: FAIL — module `@typeset-ai/core/idml/constants.js` does not exist

- [ ] **Step 3: Implement**

Create `packages/core/src/idml/constants.ts`:

```typescript
export const IDML_NAMESPACE = "http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging";
export const IDPKG_NAMESPACE = "http://ns.adobe.com/AdobeInDesign/idpkg/1.0";

export const POINTS_PER_MM = 2.834645669;
export const POINTS_PER_INCH = 72;

// A4 dimensions in points (210mm x 297mm)
export const DEFAULT_PAGE_WIDTH = 210 * POINTS_PER_MM;
export const DEFAULT_PAGE_HEIGHT = 297 * POINTS_PER_MM;
export const DEFAULT_MARGIN = 20 * POINTS_PER_MM;

export const MIMETYPE_CONTENT = "application/vnd.adobe.indesign-idml-package";

export const DEFAULT_FONT_FAMILY = "Minion Pro";
export const DEFAULT_FONT_SIZE = 11;
export const DEFAULT_LINE_HEIGHT = 13.2;

export const HEADING_FONT_SIZES: Record<string, number> = {
  h1: 24,
  h2: 18,
  h3: 14,
  h4: 12,
  h5: 11,
  h6: 10,
};

export const PARAGRAPH_STYLE_PREFIX = "ParagraphStyle/";
export const CHARACTER_STYLE_PREFIX = "CharacterStyle/";
export const OBJECT_STYLE_PREFIX = "ObjectStyle/";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/idml/constants.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```
feat(core): add IDML constants and namespace definitions
```

---

### Task 3: IDML styles builder — paragraph, character, and object styles

**Files:**
- Create: `packages/core/src/idml/styles-builder.ts`
- Test: `tests/core/idml/styles-builder.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/core/idml/styles-builder.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  buildParagraphStyle,
  buildCharacterStyle,
  buildObjectStyle,
  buildStylesXml,
} from "@typeset-ai/core/idml/styles-builder.js";

describe("buildParagraphStyle", () => {
  it("should create XML for a paragraph style with font and size", () => {
    const xml = buildParagraphStyle("Body", {
      fontFamily: "Minion Pro",
      fontSize: 11,
      lineHeight: 13.2,
      alignment: "left",
    });

    expect(xml).toContain('Self="ParagraphStyle/Body"');
    expect(xml).toContain('Name="Body"');
    expect(xml).toContain('PointSize="11"');
    expect(xml).toContain('Leading="13.2"');
    expect(xml).toContain('Justification="LeftAlign"');
  });

  it("should create a heading style with larger font size", () => {
    const xml = buildParagraphStyle("Heading1", {
      fontFamily: "Minion Pro",
      fontSize: 24,
      lineHeight: 28.8,
      alignment: "center",
    });

    expect(xml).toContain('Self="ParagraphStyle/Heading1"');
    expect(xml).toContain('PointSize="24"');
    expect(xml).toContain('Justification="CenterAlign"');
  });
});

describe("buildCharacterStyle", () => {
  it("should create XML for a character style", () => {
    const xml = buildCharacterStyle("Bold", {
      fontStyle: "Bold",
    });

    expect(xml).toContain('Self="CharacterStyle/Bold"');
    expect(xml).toContain('Name="Bold"');
    expect(xml).toContain('FontStyle="Bold"');
  });

  it("should create an italic character style", () => {
    const xml = buildCharacterStyle("Italic", {
      fontStyle: "Italic",
    });

    expect(xml).toContain('FontStyle="Italic"');
  });
});

describe("buildObjectStyle", () => {
  it("should create XML for an object style with dimensions", () => {
    const xml = buildObjectStyle("ImageFrame", {
      fillColor: "None",
      strokeColor: "None",
      strokeWeight: 0,
    });

    expect(xml).toContain('Self="ObjectStyle/ImageFrame"');
    expect(xml).toContain('Name="ImageFrame"');
  });
});

describe("buildStylesXml", () => {
  it("should produce a complete Styles.xml document", () => {
    const xml = buildStylesXml({
      paragraphStyles: [
        { name: "Body", fontFamily: "Minion Pro", fontSize: 11, lineHeight: 13.2, alignment: "left" },
        { name: "Heading1", fontFamily: "Minion Pro", fontSize: 24, lineHeight: 28.8, alignment: "center" },
      ],
      characterStyles: [
        { name: "Bold", fontStyle: "Bold" },
      ],
      objectStyles: [
        { name: "ImageFrame", fillColor: "None", strokeColor: "None", strokeWeight: 0 },
      ],
    });

    expect(xml).toContain("<?xml");
    expect(xml).toContain("idPkg:Styles");
    expect(xml).toContain("RootParagraphStyleGroup");
    expect(xml).toContain("RootCharacterStyleGroup");
    expect(xml).toContain("RootObjectStyleGroup");
    expect(xml).toContain('Self="ParagraphStyle/Body"');
    expect(xml).toContain('Self="ParagraphStyle/Heading1"');
    expect(xml).toContain('Self="CharacterStyle/Bold"');
    expect(xml).toContain('Self="ObjectStyle/ImageFrame"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/idml/styles-builder.test.ts`

Expected: FAIL — module does not exist

- [ ] **Step 3: Implement**

Create `packages/core/src/idml/styles-builder.ts`:

```typescript
import { PARAGRAPH_STYLE_PREFIX, CHARACTER_STYLE_PREFIX, OBJECT_STYLE_PREFIX, IDPKG_NAMESPACE } from "./constants.js";

export interface ParagraphStyleDef {
  name: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  alignment: "left" | "center" | "right" | "justify";
}

export interface CharacterStyleDef {
  name: string;
  fontStyle: string;
}

export interface ObjectStyleDef {
  name: string;
  fillColor: string;
  strokeColor: string;
  strokeWeight: number;
}

export interface StylesInput {
  paragraphStyles: ParagraphStyleDef[];
  characterStyles: CharacterStyleDef[];
  objectStyles: ObjectStyleDef[];
}

const ALIGNMENT_MAP: Record<string, string> = {
  left: "LeftAlign",
  center: "CenterAlign",
  right: "RightAlign",
  justify: "LeftJustified",
};

export function buildParagraphStyle(
  name: string,
  options: Omit<ParagraphStyleDef, "name">,
): string {
  const selfId = `${PARAGRAPH_STYLE_PREFIX}${name}`;
  const justification = ALIGNMENT_MAP[options.alignment] ?? "LeftAlign";

  return [
    `<ParagraphStyle Self="${selfId}" Name="${name}"`,
    ` Justification="${justification}">`,
    `  <Properties>`,
    `    <AppliedFont type="string">${options.fontFamily}</AppliedFont>`,
    `    <Leading type="unit">${options.lineHeight}</Leading>`,
    `  </Properties>`,
    `  <CharacterStyleRange PointSize="${options.fontSize}">`,
    `    <Properties>`,
    `      <AppliedFont type="string">${options.fontFamily}</AppliedFont>`,
    `    </Properties>`,
    `  </CharacterStyleRange>`,
    `</ParagraphStyle>`,
  ].join("\n");
}

export function buildCharacterStyle(
  name: string,
  options: Omit<CharacterStyleDef, "name">,
): string {
  const selfId = `${CHARACTER_STYLE_PREFIX}${name}`;

  return [
    `<CharacterStyle Self="${selfId}" Name="${name}"`,
    ` FontStyle="${options.fontStyle}">`,
    `</CharacterStyle>`,
  ].join("\n");
}

export function buildObjectStyle(
  name: string,
  options: Omit<ObjectStyleDef, "name">,
): string {
  const selfId = `${OBJECT_STYLE_PREFIX}${name}`;

  return [
    `<ObjectStyle Self="${selfId}" Name="${name}"`,
    ` FillColor="${options.fillColor}"`,
    ` StrokeColor="${options.strokeColor}"`,
    ` StrokeWeight="${options.strokeWeight}">`,
    `</ObjectStyle>`,
  ].join("\n");
}

export function buildStylesXml(input: StylesInput): string {
  const paragraphStylesXml = input.paragraphStyles
    .map((s) => buildParagraphStyle(s.name, s))
    .join("\n    ");

  const characterStylesXml = input.characterStyles
    .map((s) => buildCharacterStyle(s.name, s))
    .join("\n    ");

  const objectStylesXml = input.objectStyles
    .map((s) => buildObjectStyle(s.name, s))
    .join("\n    ");

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Styles xmlns:idPkg="${IDPKG_NAMESPACE}"`,
    `  DOMVersion="19.1">`,
    `  <RootParagraphStyleGroup Self="dParagraphStyleGroupn0">`,
    `    ${paragraphStylesXml}`,
    `  </RootParagraphStyleGroup>`,
    `  <RootCharacterStyleGroup Self="dCharacterStyleGroupn0">`,
    `    ${characterStylesXml}`,
    `  </RootCharacterStyleGroup>`,
    `  <RootObjectStyleGroup Self="dObjectStyleGroupn0">`,
    `    ${objectStylesXml}`,
    `  </RootObjectStyleGroup>`,
    `</idPkg:Styles>`,
  ].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/idml/styles-builder.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```
feat(core): add IDML styles builder for paragraph, character, and object styles
```

---

### Task 4: IDML story builder — text content to Story XML

**Files:**
- Create: `packages/core/src/idml/story-builder.ts`
- Test: `tests/core/idml/story-builder.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/core/idml/story-builder.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  buildStoryXml,
  contentBlockToStoryFragment,
} from "@typeset-ai/core/idml/story-builder.js";
import type { ContentBlock, Chapter } from "@typeset-ai/core/types.js";

describe("contentBlockToStoryFragment", () => {
  it("should convert a paragraph block to ParagraphStyleRange XML", () => {
    const block: ContentBlock = {
      type: "paragraph",
      content: "Hello world.",
      attributes: {},
    };

    const xml = contentBlockToStoryFragment(block);

    expect(xml).toContain('AppliedParagraphStyle="ParagraphStyle/Body"');
    expect(xml).toContain("<Content>Hello world.</Content>");
  });

  it("should convert a heading block to a Heading style", () => {
    const block: ContentBlock = {
      type: "heading",
      content: "Chapter Title",
      attributes: { level: "1" },
    };

    const xml = contentBlockToStoryFragment(block);

    expect(xml).toContain('AppliedParagraphStyle="ParagraphStyle/Heading1"');
    expect(xml).toContain("<Content>Chapter Title</Content>");
  });

  it("should convert a blockquote to BlockQuote style", () => {
    const block: ContentBlock = {
      type: "blockquote",
      content: "A wise saying.",
      attributes: {},
    };

    const xml = contentBlockToStoryFragment(block);

    expect(xml).toContain('AppliedParagraphStyle="ParagraphStyle/BlockQuote"');
    expect(xml).toContain("<Content>A wise saying.</Content>");
  });

  it("should escape XML special characters in content", () => {
    const block: ContentBlock = {
      type: "paragraph",
      content: 'She said "hello" & waved.',
      attributes: {},
    };

    const xml = contentBlockToStoryFragment(block);

    expect(xml).toContain("&amp;");
    expect(xml).toContain("&quot;");
  });
});

describe("buildStoryXml", () => {
  it("should wrap content in a Story element with a unique self ID", () => {
    const chapter: Chapter = {
      title: "Chapter One",
      number: 1,
      sections: [
        {
          heading: "Intro",
          level: 2,
          blocks: [
            { type: "paragraph", content: "Some text.", attributes: {} },
          ],
        },
      ],
    };

    const xml = buildStoryXml("story-1", chapter);

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('Self="story-1"');
    expect(xml).toContain("idPkg:Story");
    expect(xml).toContain("<Content>Chapter One</Content>");
    expect(xml).toContain("<Content>Intro</Content>");
    expect(xml).toContain("<Content>Some text.</Content>");
  });

  it("should include the chapter title as an h1 paragraph style", () => {
    const chapter: Chapter = {
      title: "Test Chapter",
      number: 1,
      sections: [],
    };

    const xml = buildStoryXml("story-2", chapter);

    expect(xml).toContain('AppliedParagraphStyle="ParagraphStyle/Heading1"');
    expect(xml).toContain("<Content>Test Chapter</Content>");
  });

  it("should include section headings as h2 paragraph style", () => {
    const chapter: Chapter = {
      title: "Ch",
      number: 1,
      sections: [
        {
          heading: "My Section",
          level: 2,
          blocks: [],
        },
      ],
    };

    const xml = buildStoryXml("story-3", chapter);

    expect(xml).toContain('AppliedParagraphStyle="ParagraphStyle/Heading2"');
    expect(xml).toContain("<Content>My Section</Content>");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/idml/story-builder.test.ts`

Expected: FAIL — module does not exist

- [ ] **Step 3: Implement**

Create `packages/core/src/idml/story-builder.ts`:

```typescript
import { IDPKG_NAMESPACE, PARAGRAPH_STYLE_PREFIX } from "./constants.js";

import type { ContentBlock, Chapter } from "../types.js";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getStyleNameForBlock(block: ContentBlock): string {
  switch (block.type) {
    case "paragraph":
      return "Body";
    case "heading": {
      const level = block.attributes["level"] ?? "3";
      return `Heading${level}`;
    }
    case "blockquote":
      return "BlockQuote";
    case "footnote":
      return "Footnote";
    case "list":
      return "ListItem";
    default:
      return "Body";
  }
}

export function contentBlockToStoryFragment(block: ContentBlock): string {
  if (block.type === "image") {
    return "";
  }

  const styleName = getStyleNameForBlock(block);
  const escapedContent = escapeXml(block.content);
  const styleRef = `${PARAGRAPH_STYLE_PREFIX}${styleName}`;

  return [
    `<ParagraphStyleRange AppliedParagraphStyle="${styleRef}">`,
    `  <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">`,
    `    <Content>${escapedContent}</Content>`,
    `  </CharacterStyleRange>`,
    `</ParagraphStyleRange>`,
  ].join("\n");
}

export function buildStoryXml(storyId: string, chapter: Chapter): string {
  const fragments: string[] = [];

  const titleFragment = [
    `<ParagraphStyleRange AppliedParagraphStyle="${PARAGRAPH_STYLE_PREFIX}Heading1">`,
    `  <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">`,
    `    <Content>${escapeXml(chapter.title)}</Content>`,
    `  </CharacterStyleRange>`,
    `</ParagraphStyleRange>`,
  ].join("\n");
  fragments.push(titleFragment);

  for (const section of chapter.sections) {
    if (section.heading) {
      const headingFragment = [
        `<ParagraphStyleRange AppliedParagraphStyle="${PARAGRAPH_STYLE_PREFIX}Heading2">`,
        `  <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">`,
        `    <Content>${escapeXml(section.heading)}</Content>`,
        `  </CharacterStyleRange>`,
        `</ParagraphStyleRange>`,
      ].join("\n");
      fragments.push(headingFragment);
    }

    for (const block of section.blocks) {
      const fragment = contentBlockToStoryFragment(block);
      if (fragment) {
        fragments.push(fragment);
      }
    }
  }

  const body = fragments.map((f) => `    ${f.replace(/\n/g, "\n    ")}`).join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Story xmlns:idPkg="${IDPKG_NAMESPACE}"`,
    `  DOMVersion="19.1">`,
    `  <Story Self="${storyId}" AppliedTOCStyle="n"`,
    `    TrackChanges="false" StoryTitle="">`,
    body,
    `  </Story>`,
    `</idPkg:Story>`,
  ].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/idml/story-builder.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```
feat(core): add IDML story builder for chapter content serialization
```

---

### Task 5: IDML spread builder — pages to Spread XML

**Files:**
- Create: `packages/core/src/idml/spread-builder.ts`
- Test: `tests/core/idml/spread-builder.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/core/idml/spread-builder.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  buildSpreadXml,
  buildTextFrame,
  buildImageFrame,
} from "@typeset-ai/core/idml/spread-builder.js";

describe("buildTextFrame", () => {
  it("should create a TextFrame element with coordinates", () => {
    const xml = buildTextFrame({
      selfId: "tf-1",
      storyRef: "story-1",
      x: 56.69,
      y: 56.69,
      width: 496.06,
      height: 728.5,
    });

    expect(xml).toContain('Self="tf-1"');
    expect(xml).toContain('ParentStory="story-1"');
    expect(xml).toContain("PathPointType");
    expect(xml).toContain("56.69");
  });

  it("should include content type attribute", () => {
    const xml = buildTextFrame({
      selfId: "tf-2",
      storyRef: "story-2",
      x: 0,
      y: 0,
      width: 100,
      height: 200,
    });

    expect(xml).toContain('ContentType="TextType"');
  });
});

describe("buildImageFrame", () => {
  it("should create a Rectangle element for an image", () => {
    const xml = buildImageFrame({
      selfId: "img-1",
      imagePath: "images/photo.jpg",
      x: 56.69,
      y: 400,
      width: 200,
      height: 150,
    });

    expect(xml).toContain('Self="img-1"');
    expect(xml).toContain('ContentType="GraphicType"');
    expect(xml).toContain("images/photo.jpg");
  });
});

describe("buildSpreadXml", () => {
  it("should produce a valid Spread XML document", () => {
    const xml = buildSpreadXml({
      spreadId: "spread-1",
      pageWidth: 595.28,
      pageHeight: 841.89,
      frames: [
        {
          type: "text",
          selfId: "tf-1",
          storyRef: "story-1",
          x: 56.69,
          y: 56.69,
          width: 481.89,
          height: 728.5,
        },
      ],
    });

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("idPkg:Spread");
    expect(xml).toContain('Self="spread-1"');
    expect(xml).toContain("Page");
    expect(xml).toContain("TextFrame");
  });

  it("should include both text and image frames", () => {
    const xml = buildSpreadXml({
      spreadId: "spread-2",
      pageWidth: 595.28,
      pageHeight: 841.89,
      frames: [
        {
          type: "text",
          selfId: "tf-1",
          storyRef: "story-1",
          x: 56.69,
          y: 56.69,
          width: 481.89,
          height: 400,
        },
        {
          type: "image",
          selfId: "img-1",
          imagePath: "cover.jpg",
          x: 56.69,
          y: 460,
          width: 481.89,
          height: 300,
        },
      ],
    });

    expect(xml).toContain("TextFrame");
    expect(xml).toContain("Rectangle");
    expect(xml).toContain("cover.jpg");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/idml/spread-builder.test.ts`

Expected: FAIL — module does not exist

- [ ] **Step 3: Implement**

Create `packages/core/src/idml/spread-builder.ts`:

```typescript
import { IDPKG_NAMESPACE } from "./constants.js";

export interface TextFrameOptions {
  selfId: string;
  storyRef: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageFrameOptions {
  selfId: string;
  imagePath: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameDef {
  type: "text" | "image";
  selfId: string;
  storyRef?: string;
  imagePath?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpreadOptions {
  spreadId: string;
  pageWidth: number;
  pageHeight: number;
  frames: FrameDef[];
}

function buildPathGeometry(x: number, y: number, width: number, height: number): string {
  const x2 = x + width;
  const y2 = y + height;

  return [
    `<Properties>`,
    `  <PathGeometry>`,
    `    <GeometryPathType PathOpen="false">`,
    `      <PathPointArray>`,
    `        <PathPointType Anchor="${x} ${y}" LeftDirection="${x} ${y}" RightDirection="${x} ${y}" />`,
    `        <PathPointType Anchor="${x2} ${y}" LeftDirection="${x2} ${y}" RightDirection="${x2} ${y}" />`,
    `        <PathPointType Anchor="${x2} ${y2}" LeftDirection="${x2} ${y2}" RightDirection="${x2} ${y2}" />`,
    `        <PathPointType Anchor="${x} ${y2}" LeftDirection="${x} ${y2}" RightDirection="${x} ${y2}" />`,
    `      </PathPointArray>`,
    `    </GeometryPathType>`,
    `  </PathGeometry>`,
    `</Properties>`,
  ].join("\n");
}

export function buildTextFrame(options: TextFrameOptions): string {
  const geometry = buildPathGeometry(options.x, options.y, options.width, options.height);

  return [
    `<TextFrame Self="${options.selfId}"`,
    ` ParentStory="${options.storyRef}"`,
    ` ContentType="TextType">`,
    `  ${geometry.replace(/\n/g, "\n  ")}`,
    `</TextFrame>`,
  ].join("\n");
}

export function buildImageFrame(options: ImageFrameOptions): string {
  const geometry = buildPathGeometry(options.x, options.y, options.width, options.height);

  return [
    `<Rectangle Self="${options.selfId}"`,
    ` ContentType="GraphicType">`,
    `  ${geometry.replace(/\n/g, "\n  ")}`,
    `  <Image Self="${options.selfId}-image"`,
    `    ActualPpi="300 300">`,
    `    <Link Self="${options.selfId}-link"`,
    `      LinkResourceURI="${options.imagePath}" />`,
    `  </Image>`,
    `</Rectangle>`,
  ].join("\n");
}

export function buildSpreadXml(options: SpreadOptions): string {
  const framesXml = options.frames
    .map((frame) => {
      if (frame.type === "text") {
        return buildTextFrame({
          selfId: frame.selfId,
          storyRef: frame.storyRef ?? "",
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
        });
      }
      return buildImageFrame({
        selfId: frame.selfId,
        imagePath: frame.imagePath ?? "",
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
      });
    })
    .map((xml) => `      ${xml.replace(/\n/g, "\n      ")}`)
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Spread xmlns:idPkg="${IDPKG_NAMESPACE}"`,
    `  DOMVersion="19.1">`,
    `  <Spread Self="${options.spreadId}"`,
    `    PageCount="1"`,
    `    BindingLocation="0">`,
    `    <Page Self="${options.spreadId}-page"`,
    `      GeometricBounds="0 0 ${options.pageHeight} ${options.pageWidth}"`,
    `      Name="1"`,
    `      AppliedMaster="n" />`,
    framesXml,
    `  </Spread>`,
    `</idPkg:Spread>`,
  ].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/idml/spread-builder.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```
feat(core): add IDML spread builder for page layout and frames
```

---

### Task 6: IDML designmap builder — root manifest XML

**Files:**
- Create: `packages/core/src/idml/designmap-builder.ts`
- Test: `tests/core/idml/designmap-builder.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/core/idml/designmap-builder.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildDesignMapXml } from "@typeset-ai/core/idml/designmap-builder.js";

describe("buildDesignMapXml", () => {
  it("should produce a valid designmap.xml with spreads and stories", () => {
    const xml = buildDesignMapXml({
      spreadIds: ["spread-1", "spread-2"],
      storyIds: ["story-1", "story-2"],
    });

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("Document");
    expect(xml).toContain("idPkg:Spread");
    expect(xml).toContain("idPkg:Story");
    expect(xml).toContain('src="Spreads/spread-1.xml"');
    expect(xml).toContain('src="Spreads/spread-2.xml"');
    expect(xml).toContain('src="Stories/story-1.xml"');
    expect(xml).toContain('src="Stories/story-2.xml"');
  });

  it("should reference Styles.xml and Graphic.xml", () => {
    const xml = buildDesignMapXml({
      spreadIds: ["spread-1"],
      storyIds: ["story-1"],
    });

    expect(xml).toContain('src="Resources/Styles.xml"');
    expect(xml).toContain('src="Resources/Graphic.xml"');
  });

  it("should include Preferences and BackingStory elements", () => {
    const xml = buildDesignMapXml({
      spreadIds: [],
      storyIds: [],
    });

    expect(xml).toContain("idPkg:Preferences");
    expect(xml).toContain("idPkg:BackingStory");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/idml/designmap-builder.test.ts`

Expected: FAIL — module does not exist

- [ ] **Step 3: Implement**

Create `packages/core/src/idml/designmap-builder.ts`:

```typescript
import { IDML_NAMESPACE, IDPKG_NAMESPACE } from "./constants.js";

export interface DesignMapOptions {
  spreadIds: string[];
  storyIds: string[];
}

export function buildDesignMapXml(options: DesignMapOptions): string {
  const spreadRefs = options.spreadIds
    .map((id) => `  <idPkg:Spread src="Spreads/${id}.xml" />`)
    .join("\n");

  const storyRefs = options.storyIds
    .map((id) => `  <idPkg:Story src="Stories/${id}.xml" />`)
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Document xmlns:idPkg="${IDPKG_NAMESPACE}"`,
    ` DOMVersion="19.1"`,
    ` Self="d">`,
    `  <idPkg:Preferences src="Resources/Preferences.xml" />`,
    `  <idPkg:Styles src="Resources/Styles.xml" />`,
    `  <idPkg:Graphic src="Resources/Graphic.xml" />`,
    `  <idPkg:BackingStory src="Resources/BackingStory.xml" />`,
    spreadRefs,
    storyRefs,
    `</Document>`,
  ].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/idml/designmap-builder.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```
feat(core): add IDML designmap builder for package manifest
```

---

### Task 7: IDML sub-module index re-exports

**Files:**
- Create: `packages/core/src/idml/index.ts`

- [ ] **Step 1: Create the index file**

Create `packages/core/src/idml/index.ts`:

```typescript
export {
  IDML_NAMESPACE,
  IDPKG_NAMESPACE,
  DEFAULT_PAGE_WIDTH,
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_MARGIN,
  POINTS_PER_MM,
  POINTS_PER_INCH,
  MIMETYPE_CONTENT,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  HEADING_FONT_SIZES,
  PARAGRAPH_STYLE_PREFIX,
  CHARACTER_STYLE_PREFIX,
  OBJECT_STYLE_PREFIX,
} from "./constants.js";

export {
  buildParagraphStyle,
  buildCharacterStyle,
  buildObjectStyle,
  buildStylesXml,
} from "./styles-builder.js";
export type {
  ParagraphStyleDef,
  CharacterStyleDef,
  ObjectStyleDef,
  StylesInput,
} from "./styles-builder.js";

export {
  buildStoryXml,
  contentBlockToStoryFragment,
} from "./story-builder.js";

export {
  buildTextFrame,
  buildImageFrame,
  buildSpreadXml,
} from "./spread-builder.js";
export type {
  TextFrameOptions,
  ImageFrameOptions,
  FrameDef,
  SpreadOptions,
} from "./spread-builder.js";

export { buildDesignMapXml } from "./designmap-builder.js";
export type { DesignMapOptions } from "./designmap-builder.js";
```

- [ ] **Step 2: Verify all IDML tests still pass**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/idml/`

Expected: PASS (all IDML sub-module tests)

- [ ] **Step 3: Commit**

```
chore(core): add IDML sub-module index re-exports
```

---

### Task 8: IDML exporter — full HTML-to-IDML package

**Files:**
- Create: `packages/core/src/idml-exporter.ts`
- Test: `tests/core/idml-exporter.test.ts`

- [ ] **Step 1: Install JSZip dependency**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm --filter @typeset-ai/core add jszip@3.10.1`

Verify by checking `packages/core/package.json` includes `"jszip": "3.10.1"`.

- [ ] **Step 2: Write failing test**

Create `tests/core/idml-exporter.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { exportIdml } from "@typeset-ai/core/idml-exporter.js";
import type { ContentTree, IdmlExportOptions } from "@typeset-ai/core/types.js";

const SAMPLE_TREE: ContentTree = {
  metadata: {
    title: "Test Book",
    author: "Test Author",
    source: "markdown",
    pageCount: 0,
  },
  frontMatter: [],
  chapters: [
    {
      title: "Chapter One",
      number: 1,
      sections: [
        {
          heading: "First Section",
          level: 2,
          blocks: [
            { type: "paragraph", content: "Hello world.", attributes: {} },
            { type: "paragraph", content: "Second paragraph.", attributes: {} },
          ],
        },
      ],
    },
    {
      title: "Chapter Two",
      number: 2,
      sections: [
        {
          heading: "Images",
          level: 2,
          blocks: [
            {
              type: "image",
              content: "images/photo.jpg",
              attributes: { alt: "A photo", assetId: "asset-0" },
            },
          ],
        },
      ],
    },
  ],
  backMatter: [],
  assets: [
    {
      id: "asset-0",
      originalName: "photo.jpg",
      localPath: "images/photo.jpg",
      mimeType: "image/jpeg",
      width: 800,
      height: 600,
      dpi: 300,
    },
  ],
};

const SAMPLE_CSS = `
@page { size: 210mm 297mm; margin: 20mm; }
body { font-family: "Minion Pro", serif; font-size: 11pt; line-height: 1.2; }
.chapter h1 { font-size: 24pt; text-align: center; }
h2 { font-size: 18pt; }
`;

describe("exportIdml", () => {
  it("should return a Buffer containing a valid ZIP", async () => {
    const buffer = await exportIdml(SAMPLE_TREE, SAMPLE_CSS);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    const zip = await JSZip.loadAsync(buffer);
    expect(zip).toBeDefined();
  });

  it("should include mimetype file as first entry", async () => {
    const buffer = await exportIdml(SAMPLE_TREE, SAMPLE_CSS);
    const zip = await JSZip.loadAsync(buffer);

    const mimetype = zip.file("mimetype");
    expect(mimetype).not.toBeNull();

    const content = await mimetype!.async("text");
    expect(content).toBe("application/vnd.adobe.indesign-idml-package");
  });

  it("should include designmap.xml", async () => {
    const buffer = await exportIdml(SAMPLE_TREE, SAMPLE_CSS);
    const zip = await JSZip.loadAsync(buffer);

    const designmap = zip.file("designmap.xml");
    expect(designmap).not.toBeNull();

    const content = await designmap!.async("text");
    expect(content).toContain("Document");
    expect(content).toContain("idPkg:Spread");
    expect(content).toContain("idPkg:Story");
  });

  it("should include story XML files for each chapter", async () => {
    const buffer = await exportIdml(SAMPLE_TREE, SAMPLE_CSS);
    const zip = await JSZip.loadAsync(buffer);

    const storyFiles = Object.keys(zip.files).filter((f) =>
      f.startsWith("Stories/"),
    );
    expect(storyFiles.length).toBe(2);

    const story1 = zip.file(storyFiles[0]);
    const content = await story1!.async("text");
    expect(content).toContain("Chapter One");
  });

  it("should include spread XML files", async () => {
    const buffer = await exportIdml(SAMPLE_TREE, SAMPLE_CSS);
    const zip = await JSZip.loadAsync(buffer);

    const spreadFiles = Object.keys(zip.files).filter((f) =>
      f.startsWith("Spreads/"),
    );
    expect(spreadFiles.length).toBeGreaterThan(0);

    const spread1 = zip.file(spreadFiles[0]);
    const content = await spread1!.async("text");
    expect(content).toContain("idPkg:Spread");
  });

  it("should include Resources/Styles.xml with paragraph styles", async () => {
    const buffer = await exportIdml(SAMPLE_TREE, SAMPLE_CSS);
    const zip = await JSZip.loadAsync(buffer);

    const styles = zip.file("Resources/Styles.xml");
    expect(styles).not.toBeNull();

    const content = await styles!.async("text");
    expect(content).toContain("ParagraphStyle/Body");
    expect(content).toContain("ParagraphStyle/Heading1");
    expect(content).toContain("ParagraphStyle/Heading2");
  });

  it("should include Resources/Graphic.xml", async () => {
    const buffer = await exportIdml(SAMPLE_TREE, SAMPLE_CSS);
    const zip = await JSZip.loadAsync(buffer);

    const graphic = zip.file("Resources/Graphic.xml");
    expect(graphic).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/idml-exporter.test.ts`

Expected: FAIL — module does not exist

- [ ] **Step 4: Implement**

Create `packages/core/src/idml-exporter.ts`:

```typescript
import JSZip from "jszip";

import { buildDesignMapXml } from "./idml/designmap-builder.js";
import { buildStoryXml } from "./idml/story-builder.js";
import { buildSpreadXml } from "./idml/spread-builder.js";
import { buildStylesXml } from "./idml/styles-builder.js";
import {
  MIMETYPE_CONTENT,
  DEFAULT_PAGE_WIDTH,
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_MARGIN,
  POINTS_PER_MM,
  IDPKG_NAMESPACE,
} from "./idml/constants.js";

import type { ContentTree } from "./types.js";
import type { FrameDef } from "./idml/spread-builder.js";
import type { ParagraphStyleDef, CharacterStyleDef, ObjectStyleDef } from "./idml/styles-builder.js";

interface ParsedPageSize {
  width: number;
  height: number;
}

function parsePageSizeFromCss(css: string): ParsedPageSize {
  const sizeMatch = css.match(/@page\s*\{[^}]*size:\s*([^;]+);/);
  if (!sizeMatch) {
    return { width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT };
  }

  const sizeValue = sizeMatch[1].trim();

  const namedSizes: Record<string, ParsedPageSize> = {
    A4: { width: 210 * POINTS_PER_MM, height: 297 * POINTS_PER_MM },
    A5: { width: 148 * POINTS_PER_MM, height: 210 * POINTS_PER_MM },
    letter: { width: 612, height: 792 },
  };

  if (namedSizes[sizeValue]) {
    return namedSizes[sizeValue];
  }

  const mmMatch = sizeValue.match(/(\d+(?:\.\d+)?)\s*mm\s+(\d+(?:\.\d+)?)\s*mm/);
  if (mmMatch) {
    return {
      width: parseFloat(mmMatch[1]) * POINTS_PER_MM,
      height: parseFloat(mmMatch[2]) * POINTS_PER_MM,
    };
  }

  return { width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT };
}

function parseMarginFromCss(css: string): number {
  const marginMatch = css.match(/@page\s*\{[^}]*margin:\s*(\d+(?:\.\d+)?)\s*mm/);
  if (marginMatch) {
    return parseFloat(marginMatch[1]) * POINTS_PER_MM;
  }
  return DEFAULT_MARGIN;
}

function buildDefaultStyles(): {
  paragraphStyles: ParagraphStyleDef[];
  characterStyles: CharacterStyleDef[];
  objectStyles: ObjectStyleDef[];
} {
  return {
    paragraphStyles: [
      { name: "Body", fontFamily: "Minion Pro", fontSize: 11, lineHeight: 13.2, alignment: "left" },
      { name: "Heading1", fontFamily: "Minion Pro", fontSize: 24, lineHeight: 28.8, alignment: "center" },
      { name: "Heading2", fontFamily: "Minion Pro", fontSize: 18, lineHeight: 21.6, alignment: "left" },
      { name: "Heading3", fontFamily: "Minion Pro", fontSize: 14, lineHeight: 16.8, alignment: "left" },
      { name: "BlockQuote", fontFamily: "Minion Pro", fontSize: 11, lineHeight: 13.2, alignment: "left" },
      { name: "Footnote", fontFamily: "Minion Pro", fontSize: 9, lineHeight: 10.8, alignment: "left" },
      { name: "ListItem", fontFamily: "Minion Pro", fontSize: 11, lineHeight: 13.2, alignment: "left" },
    ],
    characterStyles: [
      { name: "Bold", fontStyle: "Bold" },
      { name: "Italic", fontStyle: "Italic" },
      { name: "BoldItalic", fontStyle: "Bold Italic" },
    ],
    objectStyles: [
      { name: "TextFrame", fillColor: "None", strokeColor: "None", strokeWeight: 0 },
      { name: "ImageFrame", fillColor: "None", strokeColor: "None", strokeWeight: 0 },
    ],
  };
}

function buildGraphicXml(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Graphic xmlns:idPkg="${IDPKG_NAMESPACE}"`,
    `  DOMVersion="19.1">`,
    `  <Color Self="Color/Black" Model="Process"`,
    `    Space="CMYK" ColorValue="0 0 0 100" />`,
    `  <Color Self="Color/Registration" Model="Registration"`,
    `    Space="CMYK" ColorValue="100 100 100 100" />`,
    `  <Ink Self="Ink/Process Cyan" Name="Process Cyan"`,
    `    InkType="Normal" />`,
    `  <Ink Self="Ink/Process Magenta" Name="Process Magenta"`,
    `    InkType="Normal" />`,
    `  <Ink Self="Ink/Process Yellow" Name="Process Yellow"`,
    `    InkType="Normal" />`,
    `  <Ink Self="Ink/Process Black" Name="Process Black"`,
    `    InkType="Normal" />`,
    `</idPkg:Graphic>`,
  ].join("\n");
}

function buildPreferencesXml(pageWidth: number, pageHeight: number): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Preferences xmlns:idPkg="${IDPKG_NAMESPACE}"`,
    `  DOMVersion="19.1">`,
    `  <DocumentPreference PageWidth="${pageWidth}"`,
    `    PageHeight="${pageHeight}"`,
    `    PagesPerDocument="1"`,
    `    FacingPages="true" />`,
    `</idPkg:Preferences>`,
  ].join("\n");
}

function buildBackingStoryXml(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:BackingStory xmlns:idPkg="${IDPKG_NAMESPACE}"`,
    `  DOMVersion="19.1">`,
    `</idPkg:BackingStory>`,
  ].join("\n");
}

export async function exportIdml(
  content: ContentTree,
  css: string,
): Promise<Buffer> {
  const zip = new JSZip();
  const pageSize = parsePageSizeFromCss(css);
  const margin = parseMarginFromCss(css);

  // 1. mimetype (must be first, uncompressed)
  zip.file("mimetype", MIMETYPE_CONTENT, { compression: "STORE" });

  // 2. Build stories — one per chapter
  const storyIds: string[] = [];
  for (const chapter of content.chapters) {
    const storyId = `story-${chapter.number}`;
    storyIds.push(storyId);
    const storyXml = buildStoryXml(storyId, chapter);
    zip.file(`Stories/${storyId}.xml`, storyXml);
  }

  // 3. Build spreads — one per chapter (simplified: one spread = one page = one chapter)
  const spreadIds: string[] = [];
  const contentWidth = pageSize.width - margin * 2;
  const contentHeight = pageSize.height - margin * 2;

  for (let i = 0; i < content.chapters.length; i++) {
    const spreadId = `spread-${i + 1}`;
    spreadIds.push(spreadId);

    const frames: FrameDef[] = [];
    const chapter = content.chapters[i];
    const hasImages = chapter.sections.some((s) =>
      s.blocks.some((b) => b.type === "image"),
    );

    if (hasImages) {
      const textHeight = contentHeight * 0.6;
      const imageHeight = contentHeight * 0.35;
      const gap = contentHeight * 0.05;

      frames.push({
        type: "text",
        selfId: `tf-${spreadId}`,
        storyRef: `story-${chapter.number}`,
        x: margin,
        y: margin,
        width: contentWidth,
        height: textHeight,
      });

      const imageBlock = chapter.sections
        .flatMap((s) => s.blocks)
        .find((b) => b.type === "image");

      if (imageBlock) {
        frames.push({
          type: "image",
          selfId: `img-${spreadId}`,
          imagePath: imageBlock.content,
          x: margin,
          y: margin + textHeight + gap,
          width: contentWidth,
          height: imageHeight,
        });
      }
    } else {
      frames.push({
        type: "text",
        selfId: `tf-${spreadId}`,
        storyRef: `story-${chapter.number}`,
        x: margin,
        y: margin,
        width: contentWidth,
        height: contentHeight,
      });
    }

    const spreadXml = buildSpreadXml({
      spreadId,
      pageWidth: pageSize.width,
      pageHeight: pageSize.height,
      frames,
    });
    zip.file(`Spreads/${spreadId}.xml`, spreadXml);
  }

  // 4. Styles
  const styles = buildDefaultStyles();
  const stylesXml = buildStylesXml(styles);
  zip.file("Resources/Styles.xml", stylesXml);

  // 5. Graphic
  const graphicXml = buildGraphicXml();
  zip.file("Resources/Graphic.xml", graphicXml);

  // 6. Preferences
  const preferencesXml = buildPreferencesXml(pageSize.width, pageSize.height);
  zip.file("Resources/Preferences.xml", preferencesXml);

  // 7. BackingStory
  const backingStoryXml = buildBackingStoryXml();
  zip.file("Resources/BackingStory.xml", backingStoryXml);

  // 8. designmap.xml
  const designMapXml = buildDesignMapXml({ spreadIds, storyIds });
  zip.file("designmap.xml", designMapXml);

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return buffer;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/idml-exporter.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```
feat(core): add IDML exporter that packages ContentTree into InDesign IDML format

Adds jszip@3.10.1 for ZIP packaging of the IDML XML structure.
```

---

### Task 9: Export IDML from index.ts and add CLI command

**Files:**
- Modify: `packages/core/src/index.ts`
- Create: `apps/cli/src/commands/export-idml.ts`
- Modify: `apps/cli/src/index.ts`

- [ ] **Step 1: Update core index.ts to export IDML**

Add to `packages/core/src/index.ts`:

```typescript
export { exportIdml } from "./idml-exporter.js";
```

Also add to the type exports block:

```typescript
export type {
  IdmlExportOptions,
  SvgExportOptions,
  ChatMessage,
  ChatSession,
  ChatResponse,
  CssDiff,
} from "./types.js";
```

- [ ] **Step 2: Create CLI command**

Create `apps/cli/src/commands/export-idml.ts`:

```typescript
import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { buildHtml, exportIdml } from "@typeset-ai/core";
import type { ContentTree } from "@typeset-ai/core";

export const exportIdmlCommand = new Command("export-idml")
  .description("Export content + layout as an InDesign IDML package")
  .requiredOption("--content <filepath>", "Path to content.json")
  .requiredOption("--css <filepath>", "Path to layout CSS file")
  .option("--output <filepath>", "Output IDML file path", "output.idml")
  .action(async (options) => {
    const { content: contentPath, css: cssPath, output } = options;
    const spinner = ora("Generating IDML package...").start();

    try {
      const contentJson = readFileSync(resolve(process.cwd(), contentPath), "utf-8");
      const contentTree: ContentTree = JSON.parse(contentJson);
      const css = readFileSync(resolve(process.cwd(), cssPath), "utf-8");

      const idmlBuffer = await exportIdml(contentTree, css);

      const outputPath = resolve(process.cwd(), output);
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, idmlBuffer);

      const sizeMb = (idmlBuffer.length / 1024 / 1024).toFixed(2);
      spinner.succeed(
        chalk.green(`IDML package saved to ${output} (${sizeMb} MB, ${contentTree.chapters.length} chapters)`),
      );
    } catch (err) {
      spinner.fail(chalk.red(`Failed to export IDML: ${err}`));
      process.exit(1);
    }
  });
```

- [ ] **Step 3: Register command in CLI index.ts**

Add to `apps/cli/src/index.ts`:

```typescript
import { exportIdmlCommand } from "./commands/export-idml.js";
```

And add before `program.parse()`:

```typescript
program.addCommand(exportIdmlCommand);
```

- [ ] **Step 4: Verify existing tests still pass**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```
feat(cli): add export-idml command for InDesign IDML export
```

---

## Part 2: SVG Export

### Task 10: SVG exporter — per-page SVG generation via Puppeteer

**Files:**
- Create: `packages/core/src/svg-exporter.ts`
- Test: `tests/core/svg-exporter.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/core/svg-exporter.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("puppeteer", () => ({
  default: {
    launch: vi.fn(),
  },
}));

import puppeteer from "puppeteer";
import { exportSvg } from "@typeset-ai/core/svg-exporter.js";

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head><style>@page { size: 210mm 297mm; }</style></head>
<body>
<section class="chapter" data-chapter="1">
<h1>Chapter One</h1>
<section class="section"><h2>Intro</h2><p>Hello world.</p></section>
</section>
<section class="chapter" data-chapter="2">
<h1>Chapter Two</h1>
<section class="section"><h2>More</h2><p>Goodbye world.</p></section>
</section>
</body>
</html>`;

const mockPage = {
  setContent: vi.fn(),
  waitForFunction: vi.fn(),
  evaluate: vi.fn(),
  $$eval: vi.fn(),
  $eval: vi.fn(),
  setViewport: vi.fn(),
};

const mockBrowser = {
  newPage: vi.fn(),
  close: vi.fn(),
};

describe("exportSvg", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPage.setContent.mockResolvedValue(undefined);
    mockPage.waitForFunction.mockResolvedValue(undefined);
    mockPage.setViewport.mockResolvedValue(undefined);

    mockPage.evaluate.mockImplementation(async (fn: Function) => {
      if (typeof fn === "function") {
        return [
          '<svg xmlns="http://www.w3.org/2000/svg" width="595" height="842"><text x="10" y="30">Chapter One</text></svg>',
          '<svg xmlns="http://www.w3.org/2000/svg" width="595" height="842"><text x="10" y="30">Chapter Two</text></svg>',
        ];
      }
      return [];
    });

    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockBrowser.close.mockResolvedValue(undefined);

    vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as never);
  });

  it("should return an array of SVG strings", async () => {
    const result = await exportSvg(SAMPLE_HTML, { embedImages: true, preserveText: true });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return valid SVG content for each page", async () => {
    const result = await exportSvg(SAMPLE_HTML, { embedImages: true, preserveText: true });

    for (const svg of result) {
      expect(svg).toContain("<svg");
      expect(svg).toContain("xmlns");
    }
  });

  it("should launch and close the browser", async () => {
    await exportSvg(SAMPLE_HTML, { embedImages: true, preserveText: true });

    expect(puppeteer.launch).toHaveBeenCalledWith(
      expect.objectContaining({ headless: true }),
    );
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("should set the HTML content and wait for Paged.js", async () => {
    await exportSvg(SAMPLE_HTML, { embedImages: true, preserveText: true });

    expect(mockPage.setContent).toHaveBeenCalledWith(SAMPLE_HTML, {
      waitUntil: "networkidle0",
    });
    expect(mockPage.waitForFunction).toHaveBeenCalled();
  });

  it("should close browser even if an error occurs", async () => {
    mockPage.evaluate.mockRejectedValue(new Error("render failed"));

    await expect(
      exportSvg(SAMPLE_HTML, { embedImages: true, preserveText: true }),
    ).rejects.toThrow("render failed");

    expect(mockBrowser.close).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/svg-exporter.test.ts`

Expected: FAIL — module does not exist

- [ ] **Step 3: Implement**

Create `packages/core/src/svg-exporter.ts`:

```typescript
import puppeteer from "puppeteer";

export interface SvgExportConfig {
  embedImages: boolean;
  preserveText: boolean;
}

const PAGED_JS_READY_CHECK = `
  () => {
    return typeof window.PagedPolyfill !== 'undefined'
      ? window.PagedPolyfill.ready
      : true;
  }
`;

const EXTRACT_SVG_PAGES = `
  () => {
    const pages = document.querySelectorAll('.pagedjs_page');

    if (pages.length === 0) {
      // Fallback: if Paged.js didn't create paginated pages,
      // serialize the entire body as one SVG
      const body = document.body;
      const rect = body.getBoundingClientRect();
      const serializer = new XMLSerializer();
      const svgNS = 'http://www.w3.org/2000/svg';
      const xlinkNS = 'http://www.w3.org/1999/xlink';

      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('xmlns', svgNS);
      svg.setAttribute('xmlns:xlink', xlinkNS);
      svg.setAttribute('width', String(Math.ceil(rect.width)));
      svg.setAttribute('height', String(Math.ceil(rect.height)));
      svg.setAttribute('viewBox', '0 0 ' + Math.ceil(rect.width) + ' ' + Math.ceil(rect.height));

      const foreignObject = document.createElementNS(svgNS, 'foreignObject');
      foreignObject.setAttribute('width', '100%');
      foreignObject.setAttribute('height', '100%');
      foreignObject.innerHTML = body.outerHTML;
      svg.appendChild(foreignObject);

      return [serializer.serializeToString(svg)];
    }

    return Array.from(pages).map((page) => {
      const rect = page.getBoundingClientRect();
      const serializer = new XMLSerializer();
      const svgNS = 'http://www.w3.org/2000/svg';
      const xlinkNS = 'http://www.w3.org/1999/xlink';

      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('xmlns', svgNS);
      svg.setAttribute('xmlns:xlink', xlinkNS);
      svg.setAttribute('width', String(Math.ceil(rect.width)));
      svg.setAttribute('height', String(Math.ceil(rect.height)));
      svg.setAttribute('viewBox', '0 0 ' + Math.ceil(rect.width) + ' ' + Math.ceil(rect.height));

      const foreignObject = document.createElementNS(svgNS, 'foreignObject');
      foreignObject.setAttribute('width', '100%');
      foreignObject.setAttribute('height', '100%');
      foreignObject.innerHTML = page.outerHTML;
      svg.appendChild(foreignObject);

      return serializer.serializeToString(svg);
    });
  }
`;

export async function exportSvg(
  html: string,
  config: SvgExportConfig,
): Promise<string[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.waitForFunction(PAGED_JS_READY_CHECK, { timeout: 30000 });

    const svgPages: string[] = await page.evaluate(EXTRACT_SVG_PAGES);

    return svgPages;
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/svg-exporter.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```
feat(core): add SVG exporter for per-page Illustrator-compatible SVG output
```

---

### Task 11: SVG export CLI command and core re-export

**Files:**
- Modify: `packages/core/src/index.ts`
- Create: `apps/cli/src/commands/export-svg.ts`
- Modify: `apps/cli/src/index.ts`

- [ ] **Step 1: Update core index.ts to export SVG module**

Add to `packages/core/src/index.ts`:

```typescript
export { exportSvg } from "./svg-exporter.js";
export type { SvgExportConfig } from "./svg-exporter.js";
```

- [ ] **Step 2: Create CLI command**

Create `apps/cli/src/commands/export-svg.ts`:

```typescript
import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { buildHtml, exportSvg } from "@typeset-ai/core";
import type { ContentTree } from "@typeset-ai/core";

export const exportSvgCommand = new Command("export-svg")
  .description("Export content + layout as per-page SVG files for Illustrator")
  .requiredOption("--content <filepath>", "Path to content.json")
  .requiredOption("--css <filepath>", "Path to layout CSS file")
  .option("--output-dir <dirpath>", "Output directory for SVG files", "svg-output")
  .option("--embed-images", "Embed images as base64 instead of linking", false)
  .action(async (options) => {
    const {
      content: contentPath,
      css: cssPath,
      outputDir,
      embedImages,
    } = options;
    const spinner = ora("Generating SVG pages...").start();

    try {
      const contentJson = readFileSync(resolve(process.cwd(), contentPath), "utf-8");
      const contentTree: ContentTree = JSON.parse(contentJson);
      const css = readFileSync(resolve(process.cwd(), cssPath), "utf-8");

      const html = buildHtml(contentTree, css);
      const svgPages = await exportSvg(html, {
        embedImages: Boolean(embedImages),
        preserveText: true,
      });

      const outputPath = resolve(process.cwd(), outputDir);
      mkdirSync(outputPath, { recursive: true });

      for (let i = 0; i < svgPages.length; i++) {
        const pageNumber = String(i + 1).padStart(3, "0");
        const filename = `page-${pageNumber}.svg`;
        writeFileSync(join(outputPath, filename), svgPages[i]);
      }

      spinner.succeed(
        chalk.green(`${svgPages.length} SVG page(s) saved to ${outputDir}/`),
      );
    } catch (err) {
      spinner.fail(chalk.red(`Failed to export SVG: ${err}`));
      process.exit(1);
    }
  });
```

- [ ] **Step 3: Register command in CLI index.ts**

Add to `apps/cli/src/index.ts`:

```typescript
import { exportSvgCommand } from "./commands/export-svg.js";
```

And add before `program.parse()`:

```typescript
program.addCommand(exportSvgCommand);
```

- [ ] **Step 4: Verify all tests pass**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```
feat(cli): add export-svg command for per-page SVG output
```

---

## Part 3: AI Chat Engine

### Task 12: Install diff dependency

**Files:**
- Modify: `packages/core/package.json`

- [ ] **Step 1: Install diff package**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm --filter @typeset-ai/core add diff@7.0.0`

- [ ] **Step 2: Install type definitions**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm --filter @typeset-ai/core add -D @types/diff@7.0.0`

- [ ] **Step 3: Verify installation**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && cat packages/core/package.json | grep diff`

Expected: `"diff": "7.0.0"` in dependencies, `"@types/diff"` in devDependencies

- [ ] **Step 4: Commit**

```
chore(core): add diff@7.0.0 for CSS diff generation in chat engine
```

---

### Task 13: AI Chat Engine — core implementation

**Files:**
- Create: `packages/core/src/chat-engine.ts`
- Test: `tests/core/chat-engine.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/core/chat-engine.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@anthropic-ai/sdk", () => {
  const createMock = vi.fn();
  return {
    default: class MockAnthropic {
      messages = {
        create: createMock,
      };
    },
    __mockCreate: createMock,
  };
});

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    readFileSync: vi.fn((path: string) => {
      if (typeof path === "string" && path.endsWith(".jpg")) {
        return Buffer.from("fake-image-data");
      }
      return actual.readFileSync(path);
    }),
  };
});

import {
  createChatSession,
  sendChatMessage,
  undoLastChange,
  redoLastChange,
  getChatHistory,
} from "@typeset-ai/core/chat-engine.js";
import type { ContentTree, ChatSession } from "@typeset-ai/core/types.js";

const { __mockCreate } = await import("@anthropic-ai/sdk") as { __mockCreate: ReturnType<typeof vi.fn> };

const SAMPLE_TREE: ContentTree = {
  metadata: {
    title: "Test Book",
    author: "Author",
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
            { type: "paragraph", content: "Hello world.", attributes: {} },
          ],
        },
      ],
    },
  ],
  backMatter: [],
  assets: [],
};

const INITIAL_CSS = `
@page { size: A4; margin: 20mm; }
body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.6; }
.chapter h1 { font-size: 24pt; text-align: center; }
`;

describe("createChatSession", () => {
  it("should create a session with an ID, content, and CSS", () => {
    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);

    expect(session.id).toBeDefined();
    expect(session.id.length).toBeGreaterThan(0);
    expect(session.contentTree).toEqual(SAMPLE_TREE);
    expect(session.currentCss).toBe(INITIAL_CSS);
    expect(session.history).toHaveLength(0);
    expect(session.undoStack).toHaveLength(0);
    expect(session.redoStack).toHaveLength(0);
  });
});

describe("sendChatMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send a message and receive updated CSS", async () => {
    const newCss = `
@page { size: A4; margin: 20mm; }
body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.6; }
.chapter h1 { font-size: 32pt; text-align: center; }
`;
    __mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: `I've increased the chapter title size from 24pt to 32pt.\n\n\`\`\`css\n${newCss}\n\`\`\``,
        },
      ],
    });

    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    const response = await sendChatMessage(session, "Make chapter titles bigger");

    expect(response.message).toContain("increased");
    expect(response.css).toContain("32pt");
    expect(response.diff.patch).toBeDefined();
    expect(response.diff.patch.length).toBeGreaterThan(0);
  });

  it("should add messages to session history", async () => {
    __mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "Done.\n\n```css\nbody { font-size: 12pt; }\n```",
        },
      ],
    });

    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    await sendChatMessage(session, "Change font size");

    expect(session.history).toHaveLength(2);
    expect(session.history[0].role).toBe("user");
    expect(session.history[0].content).toBe("Change font size");
    expect(session.history[1].role).toBe("assistant");
  });

  it("should push previous CSS to undo stack on successful change", async () => {
    __mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "Updated.\n\n```css\nbody { font-size: 14pt; }\n```",
        },
      ],
    });

    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    await sendChatMessage(session, "Bigger font");

    expect(session.undoStack).toHaveLength(1);
    expect(session.undoStack[0]).toBe(INITIAL_CSS);
    expect(session.currentCss).toContain("14pt");
  });

  it("should clear redo stack on new change", async () => {
    __mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "Changed.\n\n```css\nbody { color: red; }\n```",
        },
      ],
    });

    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    session.redoStack.push("some old css");

    await sendChatMessage(session, "Make text red");

    expect(session.redoStack).toHaveLength(0);
  });
});

describe("undoLastChange", () => {
  it("should restore previous CSS from undo stack", () => {
    const session = createChatSession(SAMPLE_TREE, "body { color: blue; }");
    session.undoStack.push(INITIAL_CSS);

    const result = undoLastChange(session);

    expect(result).toBe(true);
    expect(session.currentCss).toBe(INITIAL_CSS);
    expect(session.undoStack).toHaveLength(0);
    expect(session.redoStack).toHaveLength(1);
    expect(session.redoStack[0]).toBe("body { color: blue; }");
  });

  it("should return false when undo stack is empty", () => {
    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    const result = undoLastChange(session);

    expect(result).toBe(false);
    expect(session.currentCss).toBe(INITIAL_CSS);
  });
});

describe("redoLastChange", () => {
  it("should restore CSS from redo stack", () => {
    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    session.redoStack.push("body { color: green; }");

    const result = redoLastChange(session);

    expect(result).toBe(true);
    expect(session.currentCss).toBe("body { color: green; }");
    expect(session.redoStack).toHaveLength(0);
    expect(session.undoStack).toHaveLength(1);
    expect(session.undoStack[0]).toBe(INITIAL_CSS);
  });

  it("should return false when redo stack is empty", () => {
    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    const result = redoLastChange(session);

    expect(result).toBe(false);
  });
});

describe("getChatHistory", () => {
  it("should return session history as an array of messages", () => {
    const session = createChatSession(SAMPLE_TREE, INITIAL_CSS);
    session.history.push(
      { role: "user", content: "hello", timestamp: "2026-04-02T10:00:00Z" },
      { role: "assistant", content: "hi there", timestamp: "2026-04-02T10:00:01Z" },
    );

    const history = getChatHistory(session);

    expect(history).toHaveLength(2);
    expect(history[0].role).toBe("user");
    expect(history[1].role).toBe("assistant");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/chat-engine.test.ts`

Expected: FAIL — module does not exist

- [ ] **Step 3: Implement**

Create `packages/core/src/chat-engine.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { createPatch } from "diff";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

import type {
  ContentTree,
  ChatSession,
  ChatMessage,
  ChatResponse,
  CssDiff,
} from "./types.js";

const MODEL_ID = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const EXTENSION_TO_MEDIA_TYPE: Record<string, ImageMediaType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function summarizeContent(content: ContentTree): string {
  const chapterTitles = content.chapters.map((c) => `  - ${c.title}`).join("\n");
  return [
    `Title: ${content.metadata.title}`,
    `Author: ${content.metadata.author}`,
    `Chapters (${content.chapters.length}):`,
    chapterTitles,
    `Assets: ${content.assets.length}`,
  ].join("\n");
}

function extractCssFromResponse(response: string): string {
  const match = response.match(/```css\s*([\s\S]*?)```/);
  if (match) {
    return match[1].trim();
  }
  return "";
}

function extractMessageFromResponse(response: string): string {
  const withoutCss = response.replace(/```css[\s\S]*?```/, "").trim();
  return withoutCss || response;
}

function generateCssDiff(before: string, after: string): CssDiff {
  const patch = createPatch("layout.css", before, after, "previous", "updated");
  return { before, after, patch };
}

function getMediaType(imagePath: string): ImageMediaType {
  const ext = imagePath.split(".").pop()?.toLowerCase() ?? "";
  const mediaType = EXTENSION_TO_MEDIA_TYPE[ext];
  if (!mediaType) {
    throw new Error(`Unsupported image format: .${ext}`);
  }
  return mediaType;
}

function buildSystemPrompt(content: ContentTree, currentCss: string): string {
  const contentSummary = summarizeContent(content);

  return [
    "You are an expert book designer helping a designer refine a CSS layout for print.",
    "The designer will describe changes they want. You must:",
    "1. Understand their request in the context of the current layout.",
    "2. Modify the CSS accordingly.",
    "3. Explain what you changed and why.",
    "4. Return the COMPLETE updated CSS in a ```css code block.",
    "",
    "Important rules:",
    "- Always return the FULL CSS, not just the changed parts.",
    "- Use CSS Paged Media specification (@page, @top-center, etc.).",
    "- Use print-appropriate units: mm, cm, in, pt — avoid px.",
    "- Preserve existing styles unless the user explicitly asks to change them.",
    "",
    `Book content summary:\n${contentSummary}`,
    "",
    `Current CSS:\n\`\`\`css\n${currentCss}\n\`\`\``,
  ].join("\n");
}

export function createChatSession(
  contentTree: ContentTree,
  initialCss: string,
): ChatSession {
  return {
    id: randomUUID(),
    contentTree,
    currentCss: initialCss,
    history: [],
    undoStack: [],
    redoStack: [],
  };
}

export async function sendChatMessage(
  session: ChatSession,
  userMessage: string,
  referenceImagePath?: string,
): Promise<ChatResponse> {
  const client = new Anthropic({
    apiKey: process.env["ANTHROPIC_API_KEY"] ?? "test-key",
  });

  const now = new Date().toISOString();

  const userChatMessage: ChatMessage = {
    role: "user",
    content: userMessage,
    timestamp: now,
    referenceImagePath,
  };

  session.history.push(userChatMessage);

  const systemPrompt = buildSystemPrompt(session.contentTree, session.currentCss);

  const conversationMessages: Anthropic.MessageParam[] = session.history.map(
    (msg) => {
      if (msg.role === "user" && msg.referenceImagePath) {
        const imageBuffer = readFileSync(msg.referenceImagePath);
        const base64Data = imageBuffer.toString("base64");
        const mediaType = getMediaType(msg.referenceImagePath);

        return {
          role: "user" as const,
          content: [
            {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text" as const,
              text: msg.content,
            },
          ],
        };
      }

      return {
        role: msg.role as "user" | "assistant",
        content: msg.content,
      };
    },
  );

  const response = await client.messages.create({
    model: MODEL_ID,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: conversationMessages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const rawText = textBlock && textBlock.type === "text" ? textBlock.text : "";

  const newCss = extractCssFromResponse(rawText);
  const message = extractMessageFromResponse(rawText);

  const assistantMessage: ChatMessage = {
    role: "assistant",
    content: rawText,
    timestamp: new Date().toISOString(),
  };
  session.history.push(assistantMessage);

  if (newCss) {
    const diff = generateCssDiff(session.currentCss, newCss);
    session.undoStack.push(session.currentCss);
    session.redoStack = [];
    session.currentCss = newCss;

    return {
      message,
      css: newCss,
      diff,
      isApplied: true,
    };
  }

  return {
    message,
    css: session.currentCss,
    diff: { before: session.currentCss, after: session.currentCss, patch: "" },
    isApplied: false,
  };
}

export function undoLastChange(session: ChatSession): boolean {
  if (session.undoStack.length === 0) {
    return false;
  }

  const previousCss = session.undoStack.pop()!;
  session.redoStack.push(session.currentCss);
  session.currentCss = previousCss;
  return true;
}

export function redoLastChange(session: ChatSession): boolean {
  if (session.redoStack.length === 0) {
    return false;
  }

  const nextCss = session.redoStack.pop()!;
  session.undoStack.push(session.currentCss);
  session.currentCss = nextCss;
  return true;
}

export function getChatHistory(session: ChatSession): ChatMessage[] {
  return [...session.history];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/core/chat-engine.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```
feat(core): add AI chat engine with conversation history, CSS diffs, and undo/redo
```

---

### Task 14: Chat engine core re-export and CLI command

**Files:**
- Modify: `packages/core/src/index.ts`
- Create: `apps/cli/src/commands/chat.ts`
- Modify: `apps/cli/src/index.ts`

- [ ] **Step 1: Update core index.ts**

Add to `packages/core/src/index.ts`:

```typescript
export {
  createChatSession,
  sendChatMessage,
  undoLastChange,
  redoLastChange,
  getChatHistory,
} from "./chat-engine.js";
```

- [ ] **Step 2: Create CLI chat command**

Create `apps/cli/src/commands/chat.ts`:

```typescript
import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import chalk from "chalk";
import ora from "ora";
import {
  createChatSession,
  sendChatMessage,
  undoLastChange,
  redoLastChange,
} from "@typeset-ai/core";
import type { ContentTree, ChatSession } from "@typeset-ai/core";

const CHAT_HELP = `
${chalk.bold("Chat Commands:")}
  ${chalk.cyan("/undo")}        Undo the last CSS change
  ${chalk.cyan("/redo")}        Redo the last undone change
  ${chalk.cyan("/diff")}        Show the last CSS diff
  ${chalk.cyan("/css")}         Print the current CSS
  ${chalk.cyan("/save <path>")} Save current CSS to file
  ${chalk.cyan("/ref <path>")}  Attach a reference image to your next message
  ${chalk.cyan("/help")}        Show this help
  ${chalk.cyan("/quit")}        Exit the chat
`;

function printDiff(patch: string): void {
  for (const line of patch.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      console.log(chalk.green(line));
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      console.log(chalk.red(line));
    } else if (line.startsWith("@@")) {
      console.log(chalk.cyan(line));
    } else {
      console.log(chalk.gray(line));
    }
  }
}

export const chatCommand = new Command("chat")
  .description("Start an interactive AI chat session for layout refinement")
  .requiredOption("--content <filepath>", "Path to content.json")
  .requiredOption("--css <filepath>", "Path to initial layout CSS file")
  .action(async (options) => {
    const { content: contentPath, css: cssPath } = options;

    let contentTree: ContentTree;
    let initialCss: string;

    try {
      const contentJson = readFileSync(resolve(process.cwd(), contentPath), "utf-8");
      contentTree = JSON.parse(contentJson);
      initialCss = readFileSync(resolve(process.cwd(), cssPath), "utf-8");
    } catch (err) {
      console.error(chalk.red(`Failed to load files: ${err}`));
      process.exit(1);
    }

    const session: ChatSession = createChatSession(contentTree, initialCss);
    let pendingImagePath: string | undefined;

    console.log(chalk.bold.blue("\n  TypeSet AI Chat\n"));
    console.log(chalk.gray("  Refine your layout with natural language."));
    console.log(chalk.gray(`  Book: "${contentTree.metadata.title}" by ${contentTree.metadata.author}`));
    console.log(chalk.gray(`  Type /help for commands.\n`));

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan("you > "),
    });

    rl.prompt();

    rl.on("line", async (line) => {
      const input = line.trim();

      if (!input) {
        rl.prompt();
        return;
      }

      if (input === "/quit" || input === "/exit") {
        console.log(chalk.gray("\n  Goodbye.\n"));
        rl.close();
        return;
      }

      if (input === "/help") {
        console.log(CHAT_HELP);
        rl.prompt();
        return;
      }

      if (input === "/css") {
        console.log(chalk.gray("\n--- Current CSS ---"));
        console.log(session.currentCss);
        console.log(chalk.gray("--- End CSS ---\n"));
        rl.prompt();
        return;
      }

      if (input === "/undo") {
        const didUndo = undoLastChange(session);
        if (didUndo) {
          console.log(chalk.yellow("  Undone. CSS reverted to previous state."));
        } else {
          console.log(chalk.gray("  Nothing to undo."));
        }
        rl.prompt();
        return;
      }

      if (input === "/redo") {
        const didRedo = redoLastChange(session);
        if (didRedo) {
          console.log(chalk.yellow("  Redone. CSS restored."));
        } else {
          console.log(chalk.gray("  Nothing to redo."));
        }
        rl.prompt();
        return;
      }

      if (input.startsWith("/save ")) {
        const savePath = input.slice(6).trim();
        if (!savePath) {
          console.log(chalk.red("  Usage: /save <filepath>"));
        } else {
          try {
            writeFileSync(resolve(process.cwd(), savePath), session.currentCss);
            console.log(chalk.green(`  CSS saved to ${savePath}`));
          } catch (err) {
            console.log(chalk.red(`  Failed to save: ${err}`));
          }
        }
        rl.prompt();
        return;
      }

      if (input.startsWith("/ref ")) {
        const refPath = input.slice(5).trim();
        pendingImagePath = resolve(process.cwd(), refPath);
        console.log(chalk.gray(`  Reference image attached: ${refPath}`));
        console.log(chalk.gray("  It will be included with your next message."));
        rl.prompt();
        return;
      }

      if (input === "/diff") {
        if (session.history.length === 0) {
          console.log(chalk.gray("  No changes yet."));
        } else {
          console.log(chalk.gray("\n  (Last change diff not stored in session — send a message to see diffs)\n"));
        }
        rl.prompt();
        return;
      }

      const spinner = ora("  AI is thinking...").start();

      try {
        const response = await sendChatMessage(session, input, pendingImagePath);
        pendingImagePath = undefined;
        spinner.stop();

        console.log(chalk.bold.magenta("\n  AI > ") + response.message + "\n");

        if (response.isApplied && response.diff.patch) {
          console.log(chalk.gray("  --- CSS Diff ---"));
          printDiff(response.diff.patch);
          console.log(chalk.gray("  --- End Diff ---\n"));
          console.log(chalk.green("  CSS updated. Use /undo to revert, /save <path> to export.\n"));
        }
      } catch (err) {
        spinner.fail(chalk.red(`  Error: ${err}`));
      }

      rl.prompt();
    });

    rl.on("close", () => {
      process.exit(0);
    });
  });
```

- [ ] **Step 3: Register command in CLI index.ts**

Add to `apps/cli/src/index.ts`:

```typescript
import { chatCommand } from "./commands/chat.js";
```

And add before `program.parse()`:

```typescript
program.addCommand(chatCommand);
```

- [ ] **Step 4: Verify all tests pass**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```
feat(cli): add interactive chat command for AI-powered layout refinement
```

---

## Part 4: Integration and Final Wiring

### Task 15: Integration test — full export pipeline

**Files:**
- Modify: `tests/integration/pipeline.test.ts`

- [ ] **Step 1: Add IDML and SVG integration tests**

Append to `tests/integration/pipeline.test.ts`:

```typescript
import { exportIdml } from "@typeset-ai/core";
import JSZip from "jszip";

describe("IDML export integration", () => {
  it("should parse markdown → build IDML package with correct structure", async () => {
    const markdown = readFileSync(
      resolve(FIXTURES_DIR, "sample-manuscript.md"),
      "utf-8",
    );

    const contentTree = parseMarkdown(markdown);
    const css = `
      @page { size: 129mm 198mm; margin: 20mm; bleed: 3mm; }
      body { font-family: Georgia, serif; font-size: 11pt; }
    `;

    const idmlBuffer = await exportIdml(contentTree, css);
    expect(Buffer.isBuffer(idmlBuffer)).toBe(true);

    const zip = await JSZip.loadAsync(idmlBuffer);

    // Verify IDML structure
    expect(zip.file("mimetype")).not.toBeNull();
    expect(zip.file("designmap.xml")).not.toBeNull();
    expect(zip.file("Resources/Styles.xml")).not.toBeNull();
    expect(zip.file("Resources/Graphic.xml")).not.toBeNull();

    // Verify chapters are represented as stories
    const storyFiles = Object.keys(zip.files).filter((f) => f.startsWith("Stories/"));
    expect(storyFiles.length).toBe(contentTree.chapters.length);

    // Verify spreads exist
    const spreadFiles = Object.keys(zip.files).filter((f) => f.startsWith("Spreads/"));
    expect(spreadFiles.length).toBe(contentTree.chapters.length);

    // Verify content in stories
    const story1 = await zip.file(storyFiles[0])!.async("text");
    expect(story1).toContain("Chapter 1: The Beginning");
    expect(story1).toContain("The Morning");
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/integration/pipeline.test.ts`

Expected: PASS

- [ ] **Step 3: Commit**

```
test(integration): add IDML export integration test for full pipeline
```

---

### Task 16: Chat engine integration test

**Files:**
- Create: `tests/integration/chat-engine.test.ts`

- [ ] **Step 1: Write integration test**

Create `tests/integration/chat-engine.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@anthropic-ai/sdk", () => {
  const createMock = vi.fn();
  return {
    default: class MockAnthropic {
      messages = {
        create: createMock,
      };
    },
    __mockCreate: createMock,
  };
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseMarkdown } from "@typeset-ai/core";
import {
  createChatSession,
  sendChatMessage,
  undoLastChange,
  redoLastChange,
} from "@typeset-ai/core/chat-engine.js";

const { __mockCreate } = await import("@anthropic-ai/sdk") as { __mockCreate: ReturnType<typeof vi.fn> };

const FIXTURES_DIR = resolve(import.meta.dirname, "../fixtures");

describe("Chat engine integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should perform a multi-turn conversation with undo/redo", async () => {
    const markdown = readFileSync(
      resolve(FIXTURES_DIR, "sample-manuscript.md"),
      "utf-8",
    );
    const contentTree = parseMarkdown(markdown);

    const initialCss = `
      @page { size: A4; margin: 20mm; }
      body { font-size: 11pt; }
      .chapter h1 { font-size: 24pt; }
    `;

    const session = createChatSession(contentTree, initialCss);
    expect(session.history).toHaveLength(0);

    // Turn 1: Make headings bigger
    __mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: `Headings are now 32pt.\n\n\`\`\`css\n@page { size: A4; margin: 20mm; }\nbody { font-size: 11pt; }\n.chapter h1 { font-size: 32pt; }\n\`\`\``,
        },
      ],
    });

    const response1 = await sendChatMessage(session, "Make headings bigger");
    expect(response1.isApplied).toBe(true);
    expect(session.currentCss).toContain("32pt");
    expect(session.undoStack).toHaveLength(1);
    expect(session.history).toHaveLength(2);

    // Turn 2: Add more whitespace
    __mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: `Added more margin.\n\n\`\`\`css\n@page { size: A4; margin: 30mm; }\nbody { font-size: 11pt; }\n.chapter h1 { font-size: 32pt; }\n\`\`\``,
        },
      ],
    });

    const response2 = await sendChatMessage(session, "Add more whitespace");
    expect(response2.isApplied).toBe(true);
    expect(session.currentCss).toContain("30mm");
    expect(session.undoStack).toHaveLength(2);

    // Undo back to turn 1
    const didUndo = undoLastChange(session);
    expect(didUndo).toBe(true);
    expect(session.currentCss).toContain("20mm");
    expect(session.currentCss).toContain("32pt");
    expect(session.redoStack).toHaveLength(1);

    // Redo back to turn 2
    const didRedo = redoLastChange(session);
    expect(didRedo).toBe(true);
    expect(session.currentCss).toContain("30mm");

    // Undo all the way back to initial
    undoLastChange(session);
    undoLastChange(session);
    expect(session.currentCss).toBe(initialCss);
    expect(session.undoStack).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test -- tests/integration/chat-engine.test.ts`

Expected: PASS

- [ ] **Step 3: Commit**

```
test(integration): add chat engine multi-turn conversation integration test
```

---

### Task 17: Update vitest config for new module aliases

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Add alias for IDML sub-module**

Update the `resolve.alias` section in `vitest.config.ts` to include the IDML sub-modules:

```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    globals: false,
    include: ["tests/**/*.test.ts"],
    server: {
      deps: {
        inline: ["puppeteer"],
      },
    },
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
      "@typeset-ai/core/idml": resolve(__dirname, "packages/core/src/idml"),
      "@typeset-ai/core": resolve(__dirname, "packages/core/src"),
      "@anthropic-ai/sdk": resolve(
        __dirname,
        "node_modules/.pnpm/@anthropic-ai+sdk@0.39.0/node_modules/@anthropic-ai/sdk/index.mjs",
      ),
      "puppeteer": resolve(
        __dirname,
        "node_modules/.pnpm/puppeteer@21.7.0_typescript@5.3.3/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js",
      ),
    },
  },
});
```

Note: The `@typeset-ai/core/idml` alias must come BEFORE the `@typeset-ai/core` alias so that the more specific path matches first.

- [ ] **Step 2: Run full test suite to verify**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test`

Expected: All tests PASS

- [ ] **Step 3: Commit**

```
chore: update vitest config with IDML sub-module path alias
```

---

### Task 18: Final index.ts with complete Phase 2 exports

**Files:**
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the complete updated index.ts**

Replace `packages/core/src/index.ts` with:

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
  IdmlExportOptions,
  SvgExportOptions,
  ChatMessage,
  ChatSession,
  ChatResponse,
  CssDiff,
} from "./types.js";

export { parseMarkdown } from "./content-parser.js";
export { buildHtml } from "./html-builder.js";
export { runPreflight } from "./preflight.js";
export { generateLayout } from "./ai-layout.js";
export { scanReference } from "./reference-scanner.js";
export type { ScanResult } from "./reference-scanner.js";
export { renderPdf } from "./pdf-renderer.js";
export { exportIdml } from "./idml-exporter.js";
export { exportSvg } from "./svg-exporter.js";
export type { SvgExportConfig } from "./svg-exporter.js";
export {
  createChatSession,
  sendChatMessage,
  undoLastChange,
  redoLastChange,
  getChatHistory,
} from "./chat-engine.js";
```

- [ ] **Step 2: Write the complete updated CLI index.ts**

Replace `apps/cli/src/index.ts` with:

```typescript
#!/usr/bin/env node

import { Command } from "commander";
import { ingestCommand } from "./commands/ingest.js";
import { layoutCommand } from "./commands/layout.js";
import { renderCommand } from "./commands/render.js";
import { preflightCommand } from "./commands/preflight.js";
import { exportIdmlCommand } from "./commands/export-idml.js";
import { exportSvgCommand } from "./commands/export-svg.js";
import { chatCommand } from "./commands/chat.js";

const program = new Command();

program
  .name("typeset")
  .description("AI-powered typesetting CLI for book design and print production")
  .version("0.2.0");

program.addCommand(ingestCommand);
program.addCommand(layoutCommand);
program.addCommand(renderCommand);
program.addCommand(preflightCommand);
program.addCommand(exportIdmlCommand);
program.addCommand(exportSvgCommand);
program.addCommand(chatCommand);

program.parse();
```

- [ ] **Step 3: Run full test suite**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm test`

Expected: All tests PASS (40 original + ~35 new tests)

- [ ] **Step 4: Build the project**

Run: `cd /Users/Ed/Library/Mobile\ Documents/com~apple~CloudDocs/typeset-ai && pnpm build`

Expected: Successful build with no TypeScript errors

- [ ] **Step 5: Commit**

```
feat(core): complete Phase 2 exports — IDML, SVG, and chat engine in core index

Bumps CLI version to 0.2.0 and registers all Phase 2 commands.
```

---

## Summary of Changes

### New Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `jszip` | `3.10.1` | IDML ZIP packaging |
| `diff` | `7.0.0` | CSS diff generation for chat engine |
| `@types/diff` | `7.0.0` | TypeScript definitions for diff |

### New Core Modules (7 files)
| File | Exports |
|------|---------|
| `idml/constants.ts` | IDML namespaces, page defaults, font sizes |
| `idml/styles-builder.ts` | `buildParagraphStyle`, `buildCharacterStyle`, `buildObjectStyle`, `buildStylesXml` |
| `idml/story-builder.ts` | `buildStoryXml`, `contentBlockToStoryFragment` |
| `idml/spread-builder.ts` | `buildTextFrame`, `buildImageFrame`, `buildSpreadXml` |
| `idml/designmap-builder.ts` | `buildDesignMapXml` |
| `idml-exporter.ts` | `exportIdml(content, css) → Buffer` |
| `svg-exporter.ts` | `exportSvg(html, config) → string[]` |
| `chat-engine.ts` | `createChatSession`, `sendChatMessage`, `undoLastChange`, `redoLastChange`, `getChatHistory` |

### New CLI Commands (3 files)
| Command | Description |
|---------|-------------|
| `typeset export-idml` | Export content + CSS as InDesign IDML package |
| `typeset export-svg` | Export content + CSS as per-page SVG files |
| `typeset chat` | Interactive AI chat for layout refinement |

### New Types (6 types)
`IdmlExportOptions`, `SvgExportOptions`, `ChatMessage`, `ChatSession`, `ChatResponse`, `CssDiff`

### New Tests (~35 test cases across 9 test files)
- `tests/core/type-check-phase2.test.ts` — Phase 2 type validation
- `tests/core/idml/constants.test.ts` — IDML constants
- `tests/core/idml/styles-builder.test.ts` — Paragraph/character/object style XML
- `tests/core/idml/story-builder.test.ts` — Chapter-to-Story XML conversion
- `tests/core/idml/spread-builder.test.ts` — Page layout frames
- `tests/core/idml/designmap-builder.test.ts` — IDML manifest
- `tests/core/idml-exporter.test.ts` — Full IDML ZIP package
- `tests/core/svg-exporter.test.ts` — SVG page extraction
- `tests/core/chat-engine.test.ts` — Chat session, messages, undo/redo
- `tests/integration/pipeline.test.ts` — IDML export integration (appended)
- `tests/integration/chat-engine.test.ts` — Multi-turn chat integration
