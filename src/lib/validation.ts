import { z } from "zod";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const imageFileSchema = z
  .custom<File | null>((val) => {
    if (val === null || val === undefined) {
      return true;
    }

    if (typeof File === "undefined") {
      return false;
    }

    return val instanceof File && val.size > 0;
  }, {
    message: "画像ファイルを選択してください",
  })
  .transform((file) => {
    if (!file) {
      return null;
    }

    return file;
  })
  .refine((file) => {
    if (!file) {
      return true;
    }

    return file.size <= MAX_IMAGE_SIZE;
  }, `画像は5MB以下にしてください`)
  .refine((file) => {
    if (!file) {
      return true;
    }

    return ACCEPTED_IMAGE_TYPES.includes(file.type);
  }, "対応形式は JPEG / PNG / WebP です");

export const createCourtSchema = z.object({
  name: z
    .string({ message: "コート名は必須です" })
    .min(2, "コート名は2文字以上で入力してください"),
  address: z
    .string({ message: "住所は必須です" })
    .min(5, "住所は5文字以上で入力してください"),
  latitude: z
    .coerce.number({ message: "緯度は数値で入力してください" })
    .gte(-90, "緯度が不正です")
    .lte(90, "緯度が不正です"),
  longitude: z
    .coerce.number({ message: "経度は数値で入力してください" })
    .gte(-180, "経度が不正です")
    .lte(180, "経度が不正です"),
  isFree: z.coerce.boolean({ message: "料金区分を選択してください" }),
  hoopCount: z
    .coerce
    .number({ message: "リング数は数値で入力してください" })
    .int("整数を入力してください")
    .min(0, "0以上を入力してください")
    .nullish()
    .transform((value) => (value === null ? null : value)),
  surface: z
    .string()
    .max(64, "地面の種類は64文字以内で入力してください")
    .nullish()
    .transform((value) => (value ? value : null)),
  openingHours: z
    .string()
    .max(120, "営業時間は120文字以内で入力してください")
    .nullish()
    .transform((value) => (value ? value : null)),
  notes: z
    .string()
    .max(2000, "備考は2000文字以内で入力してください")
    .nullish()
    .transform((value) => (value ? value : null)),
  photo: imageFileSchema,
});

export const createReviewSchema = z.object({
  courtId: z.string({ message: "コートIDが不正です" }),
  rating: z
    .coerce
    .number({ message: "評価は必須です" })
    .int("1〜5の整数で入力してください")
    .min(1, "最低評価は1です")
    .max(5, "最高評価は5です"),
  comment: z
    .string()
    .max(1000, "コメントは1000文字以内で入力してください")
    .nullish()
    .transform((value) => (value ? value : null)),
});

export type CreateCourtInput = z.infer<typeof createCourtSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
