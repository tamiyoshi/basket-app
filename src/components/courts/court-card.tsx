import Link from "next/link";
import { Star } from "lucide-react";

import type { CourtSummary } from "@/lib/courts";
import { cn } from "@/lib/utils";

type CourtCardProps = {
  court: CourtSummary;
  className?: string;
};

export function CourtCard({ court, className }: CourtCardProps) {
  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm transition hover:border-primary/40",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link href={`/courts/${court.id}`} className="text-lg font-semibold hover:underline">
            {court.name}
          </Link>
          <p className="text-sm text-muted-foreground">{court.address}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-secondary px-2.5 py-1">
              {court.is_free ? "無料" : "有料"}
            </span>
            {court.hoop_count ? (
              <span className="rounded-full bg-secondary px-2.5 py-1">
                リング {court.hoop_count} 基
              </span>
            ) : null}
            {court.surface ? (
              <span className="rounded-full bg-secondary px-2.5 py-1">{court.surface}</span>
            ) : null}
            {court.opening_hours ? (
              <span className="rounded-full bg-secondary px-2.5 py-1">
                {court.opening_hours}
              </span>
            ) : null}
          </div>
        </div>
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-right text-xs text-muted-foreground">
          <div className="flex items-center justify-end gap-1 text-sm font-semibold text-foreground">
            <Star className="h-4 w-4 text-primary" />
            {court.averageRating !== null ? court.averageRating.toFixed(1) : "-"}
          </div>
          <p>レビュー {court.reviewCount} 件</p>
          {typeof court.distanceMeters === "number" ? (
            <p>{(court.distanceMeters / 1000).toFixed(1)} km</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
