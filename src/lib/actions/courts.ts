"use server";

import { randomUUID } from "crypto";
import { Buffer } from "node:buffer";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCourtSchema, createReviewSchema } from "@/lib/validation";

const COURT_PHOTO_BUCKET = "court-photos";

type ActionError = { success: false; error: string };
type CreateCourtActionResult = { success: true; courtId: string } | ActionError;
type CreateReviewActionResult = { success: true } | ActionError;

function toActionError(message: string): ActionError {
  return {
    success: false,
    error: message,
  };
}

export async function createCourtAction(formData: FormData): Promise<CreateCourtActionResult> {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

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
    photo: formData.get("photo"),
  });

  if (!parsed.success) {
    return toActionError(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  const input = parsed.data;
  const courtId = randomUUID();

  const { error } = await supabase.from("courts").insert({
    id: courtId,
    name: input.name,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    is_free: input.isFree,
    hoop_count: input.hoopCount ?? null,
    surface: input.surface,
    opening_hours: input.openingHours,
    notes: input.notes,
    created_by: session.user.id,
  });

  if (error) {
    console.error("Failed to create court", error);
    return toActionError("コートの登録に失敗しました");
  }

  if (input.photo) {
    const fileExtension = input.photo.name?.split(".").pop()?.toLowerCase() ?? "jpg";
    const storagePath = `${courtId}/${Date.now()}-${randomUUID()}.${fileExtension}`;

    try {
      const arrayBuffer = await input.photo.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from(COURT_PHOTO_BUCKET)
        .upload(storagePath, Buffer.from(arrayBuffer), {
          cacheControl: "3600",
          contentType: input.photo.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Failed to upload court photo", uploadError);
        await supabase.from("courts").delete().eq("id", courtId);
        return toActionError("写真のアップロードに失敗しました");
      }

      const { error: photoInsertError } = await supabase.from("court_photos").insert({
        id: randomUUID(),
        court_id: courtId,
        storage_path: storagePath,
        uploaded_by: session.user.id,
      });

      if (photoInsertError) {
        console.error("Failed to register court photo", photoInsertError);
        await supabase.storage.from(COURT_PHOTO_BUCKET).remove([storagePath]);
        await supabase.from("courts").delete().eq("id", courtId);
        return toActionError("写真の保存に失敗しました");
      }
    } catch (uploadUnexpectedError) {
      console.error("Unexpected error while uploading court photo", uploadUnexpectedError);
      await supabase.from("courts").delete().eq("id", courtId);
      return toActionError("写真のアップロードに失敗しました");
    }
  }

  revalidatePath("/");
  return {
    success: true,
    courtId,
  };
}

export async function createReviewAction(formData: FormData): Promise<CreateReviewActionResult> {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const parsed = createReviewSchema.safeParse({
    courtId: formData.get("courtId"),
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });

  if (!parsed.success) {
    return toActionError(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  const input = parsed.data;

  const { error } = await supabase.from("reviews").insert({
    id: randomUUID(),
    court_id: input.courtId,
    rating: input.rating,
    comment: input.comment,
    author_id: session.user.id,
  });

  if (error) {
    console.error("Failed to create review", error);
    return toActionError("レビューの投稿に失敗しました");
  }

  revalidatePath(`/courts/${input.courtId}`);

  return {
    success: true,
  };
}
