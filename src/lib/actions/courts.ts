"use server";

import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ensureProfile, getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createCourtSchema, createReviewSchema } from "@/lib/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const COURT_PHOTO_BUCKET = "court-photos";

type ActionError = { success: false; error: string };
type CreateCourtActionResult = { success: true; courtId: string } | ActionError;
type CreateReviewActionResult = { success: true } | ActionError;

function toActionError(message: string): ActionError {
  return { success: false, error: message };
}

function getImageExtension(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

function matchesImageSignature(bytes: Buffer, contentType: string) {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  return contentType === "image/webp"
    && bytes.length >= 12
    && bytes.toString("ascii", 0, 4) === "RIFF"
    && bytes.toString("ascii", 8, 12) === "WEBP";
}

export async function createCourtAction(formData: FormData): Promise<CreateCourtActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = createCourtSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    isFree: formData.get("isFree"),
    hoopCount: formData.get("hoopCount"),
    surface: formData.get("surface"),
    openingHours: formData.get("openingHours"),
    notes: formData.get("notes"),
    facilityTags: (() => {
      const raw = formData.get("facilityTags");
      if (typeof raw === "string" && raw.length > 0) {
        try {
          const parsedTags: unknown = JSON.parse(raw);
          return Array.isArray(parsedTags) ? parsedTags : [];
        } catch {
          return null;
        }
      }
      return [];
    })(),
    photo: formData.get("photo"),
  });

  if (!parsed.success) {
    return toActionError(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  const input = parsed.data;
  const extension = input.photo ? getImageExtension(input.photo.type) : null;
  if (input.photo && !extension) {
    return toActionError("対応形式は JPEG / PNG / WebP です");
  }

  const courtId = randomUUID();
  const storagePath = input.photo
    ? `${user.id}/${courtId}/${randomUUID()}.${extension}`
    : null;
  const supabase = createSupabaseServerClient();

  try {
    await ensureProfile(user);

    if (input.photo && storagePath) {
      const bytes = Buffer.from(await input.photo.arrayBuffer());
      if (!matchesImageSignature(bytes, input.photo.type)) {
        return toActionError("画像ファイルの内容を読み取れませんでした");
      }
      const { error } = await supabase.storage.from(COURT_PHOTO_BUCKET).upload(storagePath, bytes, {
        cacheControl: "3600",
        contentType: input.photo.type,
        upsert: false,
      });

      if (error) {
        console.error("Failed to upload court photo", error);
        try {
          await supabase.storage.from(COURT_PHOTO_BUCKET).remove([storagePath]);
        } catch (cleanupError) {
          console.error("Failed to clean up court photo upload", cleanupError);
        }
        return toActionError("写真のアップロードに失敗しました");
      }
    }

    const sql = getDb();
    await sql.begin(async (transaction) => {
      await transaction`
        INSERT INTO public.courts (
          id, name, address, latitude, longitude, is_free, hoop_count, surface,
          facility_tags, opening_hours, notes, created_by
        ) VALUES (
          ${courtId}::uuid, ${input.name}, ${input.address}, ${input.latitude},
          ${input.longitude}, ${input.isFree}, ${input.hoopCount ?? null},
          ${input.surface}, ${transaction.array(input.facilityTags ?? [])},
          ${input.openingHours}, ${input.notes}, ${user.id}::uuid
        )
      `;

      if (storagePath) {
        await transaction`
          INSERT INTO public.court_photos (id, court_id, storage_path, uploaded_by)
          VALUES (${randomUUID()}::uuid, ${courtId}::uuid, ${storagePath}, ${user.id}::uuid)
        `;
      }
    });
  } catch (error) {
    console.error("Failed to create court", error);
    if (storagePath) {
      const { error: cleanupError } = await supabase.storage
        .from(COURT_PHOTO_BUCKET)
        .remove([storagePath]);
      if (cleanupError) console.error("Failed to clean up uploaded court photo", cleanupError);
    }
    return toActionError("コートの登録に失敗しました");
  }

  revalidatePath("/");
  return { success: true, courtId };
}

export async function createReviewAction(formData: FormData): Promise<CreateReviewActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = createReviewSchema.safeParse({
    courtId: formData.get("courtId"),
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });

  if (!parsed.success) {
    return toActionError(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  try {
    await ensureProfile(user);
    const sql = getDb();
    const inserted = await sql<{ id: string }[]>`
      INSERT INTO public.reviews (id, court_id, author_id, rating, comment)
      VALUES (
        ${randomUUID()}::uuid, ${parsed.data.courtId}::uuid, ${user.id}::uuid,
        ${parsed.data.rating}, ${parsed.data.comment}
      )
      ON CONFLICT (court_id, author_id) DO NOTHING
      RETURNING id
    `;

    if (inserted.length === 0) {
      return toActionError("このコートにはすでにレビューを投稿しています");
    }
  } catch (error) {
    console.error("Failed to create review", error);
    return toActionError("レビューの投稿に失敗しました");
  }

  revalidatePath(`/courts/${parsed.data.courtId}`);
  revalidatePath("/ranking");
  revalidatePath("/");
  return { success: true };
}
