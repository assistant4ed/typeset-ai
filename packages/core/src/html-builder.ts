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
  const chapters = (content.chapters ?? []).map(renderChapter).join("\n");
  const title = content.metadata?.title ?? "Untitled";

  // If no chapters but raw content exists, render raw text as paragraphs
  const raw = (content as unknown as Record<string, unknown>).raw;
  let body = chapters;
  if (!body && typeof raw === "string" && raw.length > 0) {
    body = raw
      .split("\n\n")
      .map((p) => {
        const trimmed = p.trim();
        if (!trimmed) return "";
        if (trimmed.startsWith("# ")) return `<h1>${trimmed.slice(2)}</h1>`;
        if (trimmed.startsWith("## ")) return `<h2>${trimmed.slice(3)}</h2>`;
        if (trimmed.startsWith("### ")) return `<h3>${trimmed.slice(4)}</h3>`;
        if (trimmed.startsWith("> ")) return `<blockquote><p>${trimmed.slice(2)}</p></blockquote>`;
        return `<p>${trimmed}</p>`;
      })
      .join("\n");
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>${css}</style>
<script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
</head>
<body>
${body}
</body>
</html>`;
}
