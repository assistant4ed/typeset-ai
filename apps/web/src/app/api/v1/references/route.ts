import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession, requireRole, handleAuthError } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";

const STORAGE_BUCKET = "references";
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export async function GET(_request: Request) {
  try {
    await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const { data: rawData, error } = await db
    .from("templates")
    .select("id, name, description, thumbnail_url, created_at")
    .eq("is_system", true)
    .not("thumbnail_url", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch shared references", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch reference library" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: (rawData ?? []) as any[],
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Expected multipart/form-data" } },
      { status: 400 }
    );
  }

  const nameRaw = formData.get("name");
  const descriptionRaw = formData.get("description");
  const imageFile = formData.get("image");

  const validationErrors: Array<{ field: string; issue: string }> = [];

  if (!nameRaw || typeof nameRaw !== "string" || nameRaw.trim().length === 0) {
    validationErrors.push({ field: "name", issue: "Must be a non-empty string" });
  }

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    validationErrors.push({ field: "image", issue: "An image file is required" });
  } else {
    if (!ALLOWED_MIME_TYPES.has(imageFile.type)) {
      validationErrors.push({
        field: "image",
        issue: "Must be PNG, JPEG, WebP, or PDF",
      });
    }

    if (imageFile.size > MAX_UPLOAD_BYTES) {
      validationErrors.push({ field: "image", issue: "Must be under 10 MB" });
    }
  }

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Validation failed", details: validationErrors } },
      { status: 422 }
    );
  }

  const file = imageFile as File;
  const name = (nameRaw as string).trim();
  const description = typeof descriptionRaw === "string" ? descriptionRaw.trim() : null;

  const db = createServerClient();

  const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
  const storagePath = `${crypto.randomUUID()}.${ext}`;

  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await db.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload reference image to storage", { cause: uploadError });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to upload reference image" } },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = db.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  const thumbnailUrl = publicUrlData?.publicUrl ?? null;

  const { data: templateRaw, error: insertError } = await (db.from("templates") as any)
    .insert({
      name,
      description,
      book_type: "other",
      css_content: "",
      thumbnail_url: thumbnailUrl,
      is_system: true,
      created_by: session!.user.id,
    })
    .select()
    .single();

  const template = templateRaw as any;

  if (insertError || !template) {
    console.error("Failed to create reference template record", { cause: insertError });

    // Best-effort cleanup of the uploaded file
    await db.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save reference" } },
      { status: 500 }
    );
  }

  await logActivity(null, session!.user.id, "template_created", {
    template_id: template.id,
    template_name: template.name,
    is_reference: true,
  });

  return NextResponse.json(
    {
      data: {
        id: template.id,
        name: template.name,
        thumbnail_url: template.thumbnail_url,
      },
      requestId: crypto.randomUUID(),
    },
    { status: 201 }
  );
}
