"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createCourtAction } from "@/lib/actions/courts";
import {
  createCourtSchema,
  type CreateCourtInput,
} from "@/lib/validation";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { LocationPickerMap } from "@/components/courts/location-picker-map";

const FACILITY_TAG_OPTIONS = [
  "駐車場",
  "照明",
  "トイレ",
  "ベンチ",
  "更衣室",
  "自販機",
] as const;

type CourtSubmitFormProps = {
  className?: string;
};

type FormValues = CreateCourtInput;

type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  courtId?: string;
};

export function CourtSubmitForm({ className }: CourtSubmitFormProps) {
  const [formState, setFormState] = useState<FormState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const [isGeolocating, setIsGeolocating] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(createCourtSchema) as Resolver<FormValues>,
    defaultValues: {
      name: "",
      address: "",
      latitude: 35.0,
      longitude: 135.0,
      isFree: true,
      hoopCount: null,
      surface: "",
      openingHours: "",
      notes: "",
      facilityTags: [],
      photo: null,
    },
  });

  const latitudeValue = form.watch("latitude");
  const longitudeValue = form.watch("longitude");
  const selectedFacilityTags = form.watch("facilityTags") ?? [];

  const selectedLocation =
    typeof latitudeValue === "number" && typeof longitudeValue === "number"
      ? { lat: latitudeValue, lng: longitudeValue }
      : null;

  const photoField = form.register("photo", {
    setValueAs: (value: FileList | null) => {
      if (!value || value.length === 0) {
        return null;
      }
      return value.item(0) ?? null;
    },
  });

  const handleToggleFacilityTag = (tag: string, checked: boolean) => {
    const current = form.getValues("facilityTags") ?? [];
    if (checked) {
      if (!current.includes(tag)) {
        form.setValue("facilityTags", [...current, tag], { shouldDirty: true });
      }
    } else {
      form.setValue(
        "facilityTags",
        current.filter((item) => item !== tag),
        { shouldDirty: true },
      );
    }
  };

  const onSubmit = (values: FormValues) => {
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("address", values.address);
    formData.append("latitude", String(values.latitude));
    formData.append("longitude", String(values.longitude));
    formData.append("isFree", values.isFree ? "true" : "false");

    if (values.hoopCount !== null && values.hoopCount !== undefined) {
      formData.append("hoopCount", String(values.hoopCount));
    }
    if (values.surface) {
      formData.append("surface", values.surface);
    }
    if (values.openingHours) {
      formData.append("openingHours", values.openingHours);
    }
    if (values.notes) {
      formData.append("notes", values.notes);
    }
    formData.append("facilityTags", JSON.stringify(values.facilityTags ?? []));
    if (values.photo) {
      formData.append("photo", values.photo);
    }

    setFormState({ status: "idle" });

    startTransition(async () => {
      const result = await createCourtAction(formData);

      if (!result?.success) {
        setFormState({ status: "error", message: result?.error ?? "投稿に失敗しました" });
        return;
      }

      form.reset({
        name: "",
        address: "",
        latitude: 35.0,
        longitude: 135.0,
        isFree: true,
        hoopCount: null,
        surface: "",
        openingHours: "",
        notes: "",
        facilityTags: [],
        photo: null,
      });
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }

      setFormState({
        status: "success",
        message: "コートを登録しました",
        courtId: result.courtId,
      });
    });
  };

  const handleMapSelection = (value: { lat: number; lng: number } | null) => {
    if (!value) {
      return;
    }
    form.setValue("latitude", Number(value.lat.toFixed(6)), { shouldDirty: true });
    form.setValue("longitude", Number(value.lng.toFixed(6)), { shouldDirty: true });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("このブラウザでは位置情報を取得できません");
      return;
    }

    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsGeolocating(false);
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        form.setValue("latitude", lat, { shouldDirty: true });
        form.setValue("longitude", lng, { shouldDirty: true });
      },
      () => {
        setIsGeolocating(false);
        alert("位置情報を取得できませんでした");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 15_000,
      },
    );
  };

  return (
    <form
      className={cn("grid gap-6", className)}
      onSubmit={form.handleSubmit(onSubmit)}
      encType="multipart/form-data"
      noValidate
    >
      <Field>
        <Label htmlFor="name">コート名</Label>
        <Input
          id="name"
          placeholder="例：渋谷区○○公園バスケットコート"
          {...form.register("name")}
        />
        <FieldError message={form.formState.errors.name?.message} />
      </Field>

      <Field>
        <Label htmlFor="address">住所</Label>
        <Input
          id="address"
          placeholder="例：東京都渋谷区1-2-3"
          {...form.register("address")}
        />
        <span className="text-xs text-muted-foreground">
          地図でピンを置いた後に正確な住所を入力してください
        </span>
        <FieldError message={form.formState.errors.address?.message} />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field>
          <Label htmlFor="latitude">緯度</Label>
          <Input
            id="latitude"
            type="number"
            step="0.000001"
            {...form.register("latitude", {
              setValueAs: (value) => {
                if (value === "" || value === undefined) {
                  return undefined;
                }
                const parsed = Number(value);
                return Number.isNaN(parsed) ? undefined : parsed;
              },
            })}
          />
          <FieldError message={form.formState.errors.latitude?.message} />
        </Field>
        <Field>
          <Label htmlFor="longitude">経度</Label>
          <Input
            id="longitude"
            type="number"
            step="0.000001"
            {...form.register("longitude", {
              setValueAs: (value) => {
                if (value === "" || value === undefined) {
                  return undefined;
                }
                const parsed = Number(value);
                return Number.isNaN(parsed) ? undefined : parsed;
              },
            })}
          />
          <FieldError message={form.formState.errors.longitude?.message} />
        </Field>
        <Field>
          <Label htmlFor="isFree">料金区分</Label>
          <select
            id="isFree"
            className="h-11 rounded-md border border-input px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            {...form.register("isFree", {
              setValueAs: (value) => value === "true",
            })}
          >
            <option value="true">無料</option>
            <option value="false">有料</option>
          </select>
          <FieldError message={form.formState.errors.isFree?.message} />
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">地図で位置を指定</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleUseCurrentLocation}
            disabled={isGeolocating}
          >
            {isGeolocating ? "取得中..." : "現在地を設定"}
          </Button>
        </div>
        <LocationPickerMap value={selectedLocation} onChange={handleMapSelection} />
        <p className="text-xs text-muted-foreground">
          ピンをクリックすると緯度・経度が自動で入力されます。位置情報がうまく取得できない場合は、地図をドラッグして目的地を指定してください。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field>
          <Label htmlFor="hoopCount">リング数</Label>
          <Input
            id="hoopCount"
            type="number"
            min={0}
            {...form.register("hoopCount", {
              setValueAs: (value) => {
                if (value === "" || value === undefined) {
                  return null;
                }
                const parsed = Number(value);
                return Number.isNaN(parsed) ? null : parsed;
              },
            })}
          />
          <FieldError message={form.formState.errors.hoopCount?.message} />
        </Field>
        <Field>
          <Label htmlFor="surface">地面</Label>
          <Input
            id="surface"
            placeholder="例：アスファルト / ウレタン"
            {...form.register("surface")}
          />
          <FieldError message={form.formState.errors.surface?.message} />
        </Field>
        <Field>
          <Label htmlFor="openingHours">営業時間</Label>
          <Input
            id="openingHours"
            placeholder="例：24時間 / 9:00-21:00"
            {...form.register("openingHours")}
          />
          <FieldError message={form.formState.errors.openingHours?.message} />
        </Field>
      </div>

      <Field>
        <Label htmlFor="notes">備考</Label>
        <Textarea
          id="notes"
          placeholder="設備や注意事項などを記入します"
          rows={6}
          {...form.register("notes")}
        />
        <FieldError message={form.formState.errors.notes?.message} />
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium">設備タグ（複数選択可）</p>
        <div className="flex flex-wrap gap-2 text-sm">
          {FACILITY_TAG_OPTIONS.map((tag) => {
            const checked = selectedFacilityTags.includes(tag);
            return (
              <label
                key={tag}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1 transition",
                  checked ? "border-primary bg-primary/10" : "border-input",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => handleToggleFacilityTag(tag, event.target.checked)}
                />
                <span>{tag}</span>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          該当する設備を選ぶと、トップページのタグフィルタから検索しやすくなります。
        </p>
        <FieldError message={form.formState.errors.facilityTags?.message} />
      </div>

      <Field>
        <Label htmlFor="photo">写真（1枚まで）</Label>
        <input
          id="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          {...photoField}
          ref={(element) => {
            photoField.ref(element);
            photoInputRef.current = element;
          }}
        />
        <span className="text-xs text-muted-foreground">
          JPEG / PNG / WebP、5MB以下のファイルに対応しています。
        </span>
        <FieldError message={form.formState.errors.photo?.message} />
      </Field>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "送信中..." : "コートを登録"}
        </Button>
        {formState.status !== "idle" ? (
          <p
            className={cn(
              "text-sm",
              formState.status === "success" ? "text-primary" : "text-destructive",
            )}
          >
            {formState.message}{" "}
            {formState.status === "success" && formState.courtId ? (
              <Link
                href={`/courts/${formState.courtId}`}
                className="underline"
              >
                登録したコートを見る
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2">{children}</div>;
}

function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className="text-sm font-medium" {...props} />;
}

const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      "h-11 rounded-md border border-input px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring",
      className,
    )}
    {...props}
  />
);

const Textarea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      "rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring",
      className,
    )}
    {...props}
  />
);

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}
