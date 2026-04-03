import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";

interface RouteParams {
  params: { id: string };
}

const VALID_BOOK_TYPES = new Set([
  "novel",
  "coffee-table",
  "children-book",
  "textbook",
  "catalog",
  "corporate-report",
  "magazine",
]);

const TYPST_TEMPLATES: Record<string, string> = {
  novel: `#set page(paper: "us-trade", margin: (top: 25mm, bottom: 30mm, inside: 22mm, outside: 15mm))
#set text(font: "New Computer Modern", size: 11pt, lang: "en")
#set par(justify: true, leading: 0.8em, first-line-indent: 1.5em)
#set heading(numbering: none)

#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  v(40mm)
  align(center)[
    #text(size: 28pt, weight: "bold", tracking: 0.05em)[#it.body]
  ]
  v(20mm)
}

#show heading.where(level: 2): it => {
  v(10mm)
  text(size: 16pt, weight: "semibold")[#it.body]
  v(5mm)
}

// Running headers
#set page(header: context {
  if counter(page).get().first() > 1 {
    align(center, text(size: 8pt, fill: gray)[#smallcaps[Chapter]])
  }
})

// Page numbers
#set page(footer: context {
  align(center, text(size: 9pt, fill: gray)[#counter(page).display()])
})`,

  magazine: `#set page(width: 210mm, height: 275mm, margin: (top: 12mm, bottom: 15mm, left: 10mm, right: 10mm))
#set text(font: "New Computer Modern Sans", size: 9.5pt, lang: "en")
#set par(justify: true, leading: 0.65em)
#set heading(numbering: none)
#set columns(2, gutter: 5mm)

#show heading.where(level: 1): it => {
  place(top, scope: "parent", float: true)[
    #text(size: 32pt, weight: "black", tracking: -0.02em)[#upper(it.body)]
    #v(5mm)
  ]
}

#show heading.where(level: 2): it => {
  v(5mm)
  text(size: 14pt, weight: "bold")[#it.body]
  v(3mm)
}

#set page(footer: context {
  align(center, text(size: 8pt, fill: gray.darken(20%))[#counter(page).display()])
})`,

  textbook: `#set page(paper: "a4", margin: (top: 20mm, bottom: 25mm, left: 20mm, right: 15mm))
#set text(font: "New Computer Modern Sans", size: 10pt, lang: "en")
#set par(justify: true, leading: 0.7em)
#set heading(numbering: "1.1")

#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  v(15mm)
  text(size: 22pt, weight: "bold")[#it]
  v(8mm)
  line(length: 100%, stroke: 0.5pt + gray)
  v(5mm)
}

#show heading.where(level: 2): it => {
  v(8mm)
  text(size: 15pt, weight: "semibold")[#it]
  v(4mm)
}

// Running header with chapter title
#set page(header: context {
  if counter(page).get().first() > 1 {
    text(size: 8pt, fill: gray)[TypeSet AI Textbook]
    h(1fr)
    text(size: 8pt, fill: gray)[#counter(page).display()]
  }
})`,

  "coffee-table": `#set page(width: 280mm, height: 280mm, margin: 15mm)
#set text(font: "New Computer Modern Sans", size: 11pt, lang: "en")
#set par(leading: 0.7em)
#set heading(numbering: none)

#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  v(20mm)
  text(size: 36pt, weight: "thin", tracking: 0.1em)[#upper(it.body)]
  v(10mm)
}

#show heading.where(level: 2): it => {
  v(8mm)
  text(size: 18pt, weight: "regular")[#it.body]
  v(5mm)
}

#set page(footer: context {
  align(center, text(size: 8pt, fill: gray)[#counter(page).display()])
})`,

  "children-book": `#set page(width: 250mm, height: 250mm, margin: 12mm)
#set text(font: "New Computer Modern Sans", size: 18pt, lang: "en")
#set par(leading: 1em, justify: false)
#set heading(numbering: none)
#set align(center)

#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  v(20mm)
  text(size: 36pt, weight: "bold", fill: blue.darken(20%))[#it.body]
  v(15mm)
}

#show heading.where(level: 2): it => {
  v(10mm)
  text(size: 24pt, weight: "semibold")[#it.body]
  v(8mm)
}`,

  catalog: `#set page(paper: "a4", margin: 12mm)
#set text(font: "New Computer Modern Sans", size: 9pt, lang: "en")
#set par(leading: 0.6em)
#set columns(2, gutter: 5mm)
#set heading(numbering: none)

#show heading.where(level: 1): it => {
  place(top, scope: "parent", float: true)[
    #text(size: 20pt, weight: "bold", tracking: 0.05em)[#upper(it.body)]
    #v(4mm)
  ]
}

#show heading.where(level: 2): it => {
  v(5mm)
  text(size: 13pt, weight: "semibold")[#it.body]
  v(3mm)
}

#set page(footer: context {
  align(center, text(size: 7pt, fill: gray)[#counter(page).display()])
})`,

  "corporate-report": `#set page(paper: "a4", margin: (top: 20mm, bottom: 25mm, left: 18mm, right: 18mm))
#set text(font: "New Computer Modern Sans", size: 10pt, lang: "en")
#set par(justify: true, leading: 0.7em)
#set heading(numbering: "1.")

#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  v(10mm)
  text(size: 22pt, weight: "bold")[#it]
  v(3mm)
  line(length: 100%, stroke: 2pt + black)
  v(8mm)
}

#show heading.where(level: 2): it => {
  v(6mm)
  text(size: 15pt, weight: "semibold")[#it]
  v(3mm)
}

#set page(footer: context {
  line(length: 100%, stroke: 0.5pt + gray)
  v(2mm)
  align(right, text(size: 8pt, fill: gray)[#counter(page).display()])
})`,
};

async function getNextStyleVersion(
  db: ReturnType<typeof createServerClient>,
  projectId: string,
): Promise<number> {
  const { data: latestRaw } = await db
    .from("project_styles")
    .select("version")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latest = latestRaw as any;
  return (latest?.version ?? 0) + 1;
}

export async function GET(_request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  void session;

  const db = createServerClient();

  const { data: styleRaw, error } = await db
    .from("project_styles")
    .select("id, project_id, css_content, version, created_by, created_at")
    .eq("project_id", params.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch project style", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch project style" } },
      { status: 500 },
    );
  }

  const style = styleRaw as any;

  return NextResponse.json({
    data: style ?? null,
    requestId: crypto.randomUUID(),
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  let body: {
    bookType?: string;
    referenceImageBase64?: string;
    referenceTemplateId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const { bookType, referenceImageBase64, referenceTemplateId } = body;

  if (!bookType && !referenceImageBase64 && !referenceTemplateId) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "At least one of bookType, referenceImageBase64, or referenceTemplateId is required",
          details: [
            {
              field: "bookType",
              issue: "Provide a bookType, referenceImageBase64, or referenceTemplateId",
            },
          ],
        },
      },
      { status: 422 },
    );
  }

  const db = createServerClient();

  // Verify the project exists
  const { data: projectRaw } = await db
    .from("projects")
    .select("id, book_type")
    .eq("id", params.id)
    .single();

  const project = projectRaw as any;
  if (!project) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 },
    );
  }

  let designContent: string;

  if (bookType) {
    if (!VALID_BOOK_TYPES.has(bookType)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: `Invalid bookType. Must be one of: ${[...VALID_BOOK_TYPES].join(", ")}`,
            details: [{ field: "bookType", issue: "Unknown book type" }],
          },
        },
        { status: 422 },
      );
    }

    const template = TYPST_TEMPLATES[bookType];
    if (!template) {
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Typst template not found for the selected book type" } },
        { status: 500 },
      );
    }

    designContent = template;
  } else if (referenceTemplateId) {
    const { data: templateRaw } = await db
      .from("templates")
      .select("css_content")
      .eq("id", referenceTemplateId)
      .eq("is_system", true)
      .single();

    const template = templateRaw as any;
    if (!template) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Reference template not found" } },
        { status: 404 },
      );
    }

    designContent = template.css_content;
  } else {
    designContent = `/* Style generated from reference image -- AI analysis pending */`;
  }

  const nextVersion = await getNextStyleVersion(db, params.id);

  const { data: savedStyleRaw, error: saveError } = await (db.from("project_styles") as any)
    .insert({
      project_id: params.id,
      css_content: designContent,
      version: nextVersion,
      created_by: session!.user.id,
    })
    .select()
    .single();

  const savedStyle = savedStyleRaw as any;

  if (saveError || !savedStyle) {
    console.error("Failed to save project style", { cause: saveError });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save project style" } },
      { status: 500 },
    );
  }

  if (bookType) {
    await (db.from("projects") as any)
      .update({ book_type: bookType })
      .eq("id", params.id);
  }

  await logActivity(params.id, session!.user.id, "style_applied", {
    book_type: bookType ?? null,
    version: nextVersion,
    source: bookType ? "template" : referenceTemplateId ? "shared_reference" : "reference_image",
  });

  // Invalidate chat session so it picks up the new design on next message
  const { chatSessionStore } = await import("@/lib/chat-session-store");
  chatSessionStore.delete(params.id);

  return NextResponse.json({
    data: {
      id: savedStyle.id,
      css: savedStyle.css_content,
      version: savedStyle.version,
    },
    requestId: crypto.randomUUID(),
  });
}
