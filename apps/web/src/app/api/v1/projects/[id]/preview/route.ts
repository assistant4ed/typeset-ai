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

function buildParagraphs(raw: string): string {
  return raw
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("### ")) return `<h3>${trimmed.slice(4)}</h3>`;
      if (trimmed.startsWith("## ")) return `<h2>${trimmed.slice(3)}</h2>`;
      if (trimmed.startsWith("# ")) return `<h1>${trimmed.slice(2)}</h1>`;
      if (trimmed.startsWith("> ")) return `<blockquote><p>${trimmed.slice(2)}</p></blockquote>`;
      return `<p>${trimmed}</p>`;
    })
    .join("\n");
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
  const paragraphs = buildParagraphs(rawString);
  const finalCss = css ?? DEFAULT_CSS;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${finalCss}</style>
</head>
<body>
${paragraphs}
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
