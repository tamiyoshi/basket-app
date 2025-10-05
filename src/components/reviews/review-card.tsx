import { Star } from "lucide-react";

import type { ReviewWithAuthor } from "@/lib/courts";
import { cn } from "@/lib/utils";
import { formatJapaneseDate } from "@/lib/format";

type ReviewCardProps = {
  review: ReviewWithAuthor;
  className?: string;
};

export function ReviewCard({ review, className }: ReviewCardProps) {
  return (
    <li className={cn("rounded-xl border bg-card p-5 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            {review.author?.display_name ?? "匿名ユーザー"}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatJapaneseDate(review.created_at)} に投稿
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm font-semibold text-primary">
          <Star className="h-4 w-4" />
          {review.rating}
        </div>
      </div>
      {review.comment ? (
        <p className="mt-3 text-sm text-muted-foreground">{review.comment}</p>
      ) : null}
    </li>
  );
}
