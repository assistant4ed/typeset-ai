import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";

import type {
  ContentTree,
  BookMetadata,
  Chapter,
  Section,
  ContentBlock,
  Asset,
} from "./types.js";

import type { Root, Node, Parent, Heading, Image, Table, List } from "mdast";

// Regex-based YAML front matter extractor (avoids js-yaml dependency)
function extractFrontMatter(markdown: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, string> = {};

  for (const line of yaml.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key) result[key] = value;
  }

  return result;
}

function nodeToText(node: Node): string {
  if ("value" in node && typeof (node as { value: unknown }).value === "string") {
    return (node as { value: string }).value;
  }
  if ("children" in node) {
    return (node as Parent).children.map(nodeToText).join("");
  }
  return "";
}

function imageToAsset(node: Image, index: number): Asset {
  const url = node.url ?? "";
  const parts = url.split("/");
  const originalName = parts[parts.length - 1] ?? url;

  return {
    id: `asset-${index}`,
    originalName,
    localPath: url,
    mimeType: guessMimeType(originalName),
    width: 0,
    height: 0,
    dpi: 72,
  };
}

function guessMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const MIME_TYPES: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

function tableToHtml(node: Table): string {
  const rows = node.children;
  if (rows.length === 0) return "";

  const [headerRow, ...bodyRows] = rows;
  const headerHtml = headerRow.children
    .map((cell) => `<th>${nodeToText(cell)}</th>`)
    .join("");

  const bodyHtml = bodyRows
    .map(
      (row) =>
        `<tr>${row.children.map((cell) => `<td>${nodeToText(cell)}</td>`).join("")}</tr>`
    )
    .join("");

  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function listToHtml(node: List): string {
  const tag = node.ordered ? "ol" : "ul";
  const items = node.children
    .map((item) => {
      const text = item.children.map(nodeToText).join("");
      return `<li>${text}</li>`;
    })
    .join("");
  return `<${tag}>${items}</${tag}>`;
}

function nodeToBlock(
  node: Node,
  assets: Asset[],
  assetCounter: { count: number }
): ContentBlock | null {
  switch (node.type) {
    case "paragraph": {
      const para = node as Parent;
      // Check if it's a paragraph containing only an image
      if (para.children.length === 1 && para.children[0].type === "image") {
        const img = para.children[0] as Image;
        const asset = imageToAsset(img, assetCounter.count++);
        assets.push(asset);
        return {
          type: "image",
          content: img.url ?? "",
          attributes: {
            alt: img.alt ?? "",
            assetId: asset.id,
          },
        };
      }
      return {
        type: "paragraph",
        content: nodeToText(node),
        attributes: {},
      };
    }

    case "image": {
      const img = node as Image;
      const asset = imageToAsset(img, assetCounter.count++);
      assets.push(asset);
      return {
        type: "image",
        content: img.url ?? "",
        attributes: {
          alt: img.alt ?? "",
          assetId: asset.id,
        },
      };
    }

    case "blockquote": {
      return {
        type: "blockquote",
        content: nodeToText(node),
        attributes: {},
      };
    }

    case "list": {
      return {
        type: "list",
        content: listToHtml(node as List),
        attributes: {
          ordered: String((node as List).ordered ?? false),
        },
      };
    }

    case "table": {
      return {
        type: "table",
        content: tableToHtml(node as Table),
        attributes: {},
      };
    }

    default:
      return null;
  }
}

function collectBlocks(
  nodes: Node[],
  assets: Asset[],
  assetCounter: { count: number }
): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  for (const node of nodes) {
    const block = nodeToBlock(node, assets, assetCounter);
    if (block !== null) {
      blocks.push(block);
    }
  }
  return blocks;
}

export function parseMarkdown(markdown: string): ContentTree {
  const frontMatterData = extractFrontMatter(markdown);

  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm);

  const ast = processor.parse(markdown) as Root;

  const assets: Asset[] = [];
  const assetCounter = { count: 0 };
  const chapters: Chapter[] = [];

  let currentChapter: Chapter | null = null;
  let currentSection: Section | null = null;
  let chapterNumber = 0;

  const flushSection = () => {
    if (currentSection && currentChapter) {
      currentChapter.sections.push(currentSection);
      currentSection = null;
    }
  };

  const flushChapter = () => {
    flushSection();
    if (currentChapter) {
      chapters.push(currentChapter);
      currentChapter = null;
    }
  };

  for (const node of ast.children) {
    if (node.type === "yaml") {
      // Front matter node — already extracted via regex
      continue;
    }

    if (node.type === "heading") {
      const heading = node as Heading;

      if (heading.depth === 1) {
        flushChapter();
        chapterNumber++;
        currentChapter = {
          title: nodeToText(heading),
          number: chapterNumber,
          sections: [],
        };
        currentSection = null;
        continue;
      }

      if (heading.depth === 2) {
        if (currentChapter) {
          flushSection();
          currentSection = {
            heading: nodeToText(heading),
            level: heading.depth,
            blocks: [],
          };
        }
        continue;
      }
    }

    // Content node — add to current section or chapter's first section
    if (currentSection) {
      const block = nodeToBlock(node, assets, assetCounter);
      if (block !== null) {
        currentSection.blocks.push(block);
      }
    } else if (currentChapter) {
      // Content before any h2 in this chapter — create an implicit section
      currentSection = {
        heading: "",
        level: 2,
        blocks: [],
      };
      const block = nodeToBlock(node, assets, assetCounter);
      if (block !== null) {
        currentSection.blocks.push(block);
      }
    }
  }

  flushChapter();

  const metadata: BookMetadata = {
    title: frontMatterData["title"] ?? "",
    author: frontMatterData["author"] ?? "",
    source: "markdown",
    pageCount: 0,
  };

  return {
    metadata,
    frontMatter: [],
    chapters,
    backMatter: [],
    assets,
  };
}
