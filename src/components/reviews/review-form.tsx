"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createReviewAction } from "@/lib/actions/courts";
import { createReviewSchema, type CreateReviewInput } from "@/lib/validation";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

const ratingOptions = [1, 2, 3, 4, 5];

type ReviewFormProps = {
  courtId: string;
  className?: string;
};

type FormValues = CreateReviewInput;

type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export function ReviewForm({ courtId, className }: ReviewFormProps) {
  const [formState, setFormState] = useState<FormState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(createReviewSchema),
    defaultValues: {
      courtId,
      rating: 5,
      comment: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    const formData = new FormData();
    formData.append("courtId", courtId);
    formData.append("rating", String(values.rating));
    if (values.comment) {
      formData.append("comment", values.comment);
    }

    setFormState({ status: "idle" });

    startTransition(async () => {
      const result = await createReviewAction(formData);

      if (!result?.success) {
        setFormState({ status: "error", message: result?.error ?? "レビュー投稿に失敗しました" });
        return;
      }

      form.reset({ courtId, rating: 5, comment: "" });
      setFormState({ status: "success", message: "レビューを投稿しました" });
    });
  };

  return (
    <form
      className={cn("grid gap-4", className)}
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <input type="hidden" {...form.register("courtId")} />
      <div className="grid gap-2">
        <label className="text-sm font-medium">評価</label>
        <div className="flex items-center gap-2">
          {ratingOptions.map((rating) => (
            <label key={rating} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                value={rating}
                {...form.register("rating", {
                  setValueAs: (value) => Number(value),
                })}
                className="accent-primary"
              />
              <span>{rating}</span>
            </label>
          ))}
        </div>
        <FieldError message={form.formState.errors.rating?.message} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="comment" className="text-sm font-medium">
          コメント
        </label>
        <textarea
          id="comment"
          rows={4}
          placeholder="プレー環境や混雑具合などの情報を共有してください"
          className="rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          {...form.register("comment")}
        />
        <FieldError message={form.formState.errors.comment?.message} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "送信中..." : "レビューを投稿"}
        </Button>
        {formState.status !== "idle" ? (
          <p
            className={cn(
              "text-xs",
              formState.status === "success" ? "text-primary" : "text-destructive",
            )}
          >
            {formState.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}
