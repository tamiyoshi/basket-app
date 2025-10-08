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
        "group relative overflow-hidden rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/10" />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link
            href={`/courts/${court.id}`}
            className="text-lg font-semibold tracking-tight hover:text-primary hover:underline"
          >
            {court.name}
          </Link>
          <p className="text-sm text-muted-foreground">{court.address}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
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
          {court.facilityTags && court.facilityTags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              {court.facilityTags.map((tag) => (
                <span key={tag} className="rounded-full border border-border/70 px-2 py-0.5">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-foreground shadow-sm">
            <Star className="h-4 w-4 text-primary" />
            {court.averageRating !== null ? court.averageRating.toFixed(1) : "-"}
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 text-right text-[11px] text-muted-foreground">
            <p>レビュー {court.reviewCount} 件</p>
            {typeof court.distanceMeters === "number" ? (
              <p className="mt-1 font-medium text-foreground">
                {(court.distanceMeters / 1000).toFixed(1)} km
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
