export function formatJapaneseDate(date: string | Date) {
  const safeDate = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(safeDate);
}
