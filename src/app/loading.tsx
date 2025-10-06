export default function Loading() {
  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="h-4 w-56 rounded-full bg-muted animate-pulse" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-4">
            <div className="h-10 w-3/4 rounded-lg bg-muted animate-pulse" />
            <div className="h-20 w-full rounded-lg bg-muted animate-pulse" />
            <div className="flex gap-3">
              <div className="h-10 w-32 rounded-full bg-muted animate-pulse" />
              <div className="h-10 w-32 rounded-full bg-muted animate-pulse" />
            </div>
          </div>
          <div className="h-48 rounded-xl border bg-card p-6">
            <div className="h-full w-full rounded-lg bg-muted animate-pulse" />
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="h-6 w-48 rounded-full bg-muted animate-pulse" />
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <li key={index} className="h-24 rounded-xl border bg-card p-5">
                <div className="h-full w-full rounded-lg bg-muted animate-pulse" />
              </li>
            ))}
          </ul>
        </div>
        <aside className="space-y-4 rounded-xl border bg-card p-6">
          <div className="h-5 w-40 rounded-full bg-muted animate-pulse" />
          <div className="h-32 rounded-lg bg-muted animate-pulse" />
        </aside>
      </section>
    </div>
  );
}
