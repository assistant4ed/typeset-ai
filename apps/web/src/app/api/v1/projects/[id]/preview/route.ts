import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession, handleAuthError } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteParams {
  params: { id: string };
}

const PLACEHOLDER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body {
    font-family: system-ui, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    color: #9ca3af;
    margin: 0;
  }
</style>
</head>
<body>
  <div style="text-align:center">
    <p style="font-size:48px;margin:0">📄</p>
    <p>Upload content to see preview</p>
  </div>
</body>
</html>`;

const DEFAULT_CSS = `
body {
  font-family: Georgia, serif;
  font-size: 12pt;
  line-height: 1.6;
  max-width: 210mm;
  margin: 20mm auto;
  padding: 0 15mm;
  color: #1a1a1a;
}
h1 {
  font-size: 24pt;
  text-align: center;
  margin-top: 40mm;
  margin-bottom: 20mm;
}
h2 {
  font-size: 18pt;
  margin-top: 15mm;
  margin-bottom: 8mm;
}
h3 {
  font-size: 14pt;
  margin-top: 10mm;
  margin-bottom: 5mm;
}
p {
  text-indent: 1.5em;
  margin: 0 0 0.5em 0;
}
p:first-of-type {
  text-indent: 0;
}
blockquote {
  margin: 8mm 15mm;
  font-style: italic;
  color: #555;
  border-left: 2pt solid #ddd;
  padding-left: 5mm;
}
`;

function buildStyledHtml(raw: string): string {
  const lines = raw.split("\n");
  const chapters: string[] = [];
  let currentChapter = "";
  let currentSection = "";
  let chapterNum = 0;
  let inChapter = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("# ") || (!inChapter && trimmed.length > 0)) {
      // Close previous section and chapter
      if (currentSection) {
        currentChapter += `${currentSection}</section>\n`;
        currentSection = "";
      }
      if (inChapter) {
        chapters.push(`${currentChapter}</section>\n`);
        currentChapter = "";
      }

      chapterNum++;
      const title = trimmed.startsWith("# ") ? trimmed.slice(2) : `Section ${chapterNum}`;
      currentChapter = `<section class="chapter" data-chapter="${chapterNum}">\n<h1>${title}</h1>\n`;
      inChapter = true;

      if (!trimmed.startsWith("# ")) {
        currentSection = `<section class="section">\n<p>${trimmed}</p>\n`;
      }
      continue;
    }

    if (trimmed.startsWith("## ")) {
      if (currentSection) {
        currentChapter += `${currentSection}</section>\n`;
      }
      currentSection = `<section class="section">\n<h2>${trimmed.slice(3)}</h2>\n`;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      if (!currentSection) currentSection = `<section class="section">\n`;
      currentSection += `<h3>${trimmed.slice(4)}</h3>\n`;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      if (!currentSection) currentSection = `<section class="section">\n`;
      currentSection += `<blockquote><p>${trimmed.slice(2)}</p></blockquote>\n`;
      continue;
    }

    // Regular paragraph
    if (!inChapter) {
      chapterNum++;
      currentChapter = `<section class="chapter" data-chapter="${chapterNum}">\n`;
      inChapter = true;
    }
    if (!currentSection) currentSection = `<section class="section">\n`;
    currentSection += `<p>${trimmed}</p>\n`;
  }

  // Close remaining
  if (currentSection) currentChapter += `${currentSection}</section>\n`;
  if (inChapter) chapters.push(`${currentChapter}</section>\n`);

  // If no structure was built, wrap everything as one chapter
  if (chapters.length === 0) {
    const paragraphs = raw.split("\n").filter(l => l.trim()).map(l => `<p>${l.trim()}</p>`).join("\n");
    return `<section class="chapter" data-chapter="1">\n<section class="section">\n${paragraphs}\n</section>\n</section>`;
  }

  return chapters.join("\n");
}

const HTML_CONTENT_TYPE = "text/html; charset=utf-8";

export async function GET(_request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const db = createServerClient();

  const [contentRes, stylesRes] = await Promise.all([
    db
      .from("project_content")
      .select("content_tree")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("project_styles")
      .select("css_content")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentTree = (contentRes.data as any)?.content_tree;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const css = (stylesRes.data as any)?.css_content as string | undefined;

  const rawContent = contentTree?.raw;
  if (!rawContent) {
    return new NextResponse(PLACEHOLDER_HTML, {
      headers: {
        "Content-Type": HTML_CONTENT_TYPE,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  const rawString =
    typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
  const body = buildStyledHtml(rawString);
  const finalCss = css ?? DEFAULT_CSS;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${finalCss}</style>
</head>
<body>
${body}
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": HTML_CONTENT_TYPE,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
    },
  });
}
