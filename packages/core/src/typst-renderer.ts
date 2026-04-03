import { NodeCompiler } from "@myriaddreamin/typst-ts-node-compiler";

export interface TypstRenderOptions {
  pageWidth: number;
  pageHeight: number;
  bleed: number;
  margin: { top: number; bottom: number; left: number; right: number };
}

export interface TypstRenderResult {
  pdf: Buffer;
  html: string;
  svg: string;
  pageCount: number;
}

const DEFAULT_OPTIONS: TypstRenderOptions = {
  pageWidth: 210,
  pageHeight: 297,
  bleed: 0,
  margin: { top: 25, bottom: 30, left: 20, right: 15 },
};

export function contentToTypst(
  rawContent: string,
  designMarkup: string,
  options: TypstRenderOptions = DEFAULT_OPTIONS,
): string {
  const { pageWidth, pageHeight, margin, bleed } = options;

  const pageSetup = `#set page(
  width: ${pageWidth}mm,
  height: ${pageHeight}mm,
  margin: (top: ${margin.top}mm, bottom: ${margin.bottom}mm, left: ${margin.left}mm, right: ${margin.right}mm),
  ${bleed > 0 ? `bleed: ${bleed}mm,` : ""}
)`;

  if (designMarkup && designMarkup.trim().length > 0) {
    return `${designMarkup}\n\n// === Content ===\n${escapeForTypst(rawContent)}`;
  }

  return `${pageSetup}
#set text(size: 11pt, lang: "en")
#set par(justify: true, leading: 0.8em, first-line-indent: 1.5em)
#set heading(numbering: none)
#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  v(30mm)
  align(center)[
    #text(size: 24pt, weight: "bold")[#it.body]
  ]
  v(15mm)
}
#show heading.where(level: 2): it => {
  v(8mm)
  text(size: 16pt, weight: "semibold")[#it.body]
  v(4mm)
}
#show heading.where(level: 3): it => {
  v(5mm)
  text(size: 13pt, weight: "semibold")[#it.body]
  v(3mm)
}

// === Content ===
${escapeForTypst(rawContent)}
`;
}

function escapeForTypst(raw: string): string {
  const lines = raw.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push("");
      continue;
    }

    if (trimmed.startsWith("### ")) {
      result.push(`=== ${trimmed.slice(4)}`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      result.push(`== ${trimmed.slice(3)}`);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      result.push(`= ${trimmed.slice(2)}`);
      continue;
    }

    if (trimmed.startsWith("> ")) {
      result.push(`#quote(block: true)[${trimmed.slice(2)}]`);
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      result.push(`- ${trimmed.slice(2)}`);
      continue;
    }

    const escaped = trimmed
      .replace(/\\/g, "\\\\")
      .replace(/#/g, "\\#")
      .replace(/\$/g, "\\$")
      .replace(/@/g, "\\@")
      .replace(/</g, "\\<")
      .replace(/>/g, "\\>");

    result.push(escaped);
  }

  return result.join("\n");
}

export function renderToPdf(typstCode: string): Buffer {
  const compiler = NodeCompiler.create();
  const result = compiler.pdf({ mainFileContent: typstCode });
  if (!result) {
    throw new Error("Typst PDF compilation failed");
  }
  return result;
}

export function renderToHtml(typstCode: string): string {
  const compiler = NodeCompiler.create();
  const result = compiler.html({ mainFileContent: typstCode });
  if (!result) {
    throw new Error("Typst HTML compilation failed");
  }
  return result;
}

export function renderToSvg(typstCode: string): string {
  const compiler = NodeCompiler.create();
  const result = compiler.svg({ mainFileContent: typstCode });
  if (!result) {
    throw new Error("Typst SVG compilation failed");
  }
  return result;
}

export function getPageCount(typstCode: string): number {
  const compiler = NodeCompiler.create();
  const svg = compiler.svg({ mainFileContent: typstCode });
  if (!svg) return 0;
  const pageMatches = svg.match(/<svg[^>]*class="typst-page"/g);
  return pageMatches?.length ?? 1;
}
