// Every dashboard route is force-dynamic and reads Firestore, so navigation
// otherwise sits on the previous screen with no feedback. Shared skeleton for
// the whole (dash) segment.
export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse" role="status" aria-label="Loading">
      <div className="h-3 w-24 rounded-full bg-emerald/10" />
      <div className="mt-3 h-8 w-52 rounded-lg bg-emerald/10" />
      <div className="mt-3 h-3 w-80 max-w-full rounded-full bg-emerald/5" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white shadow-soft ring-1 ring-emerald/10" />
        ))}
      </div>

      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-white shadow-soft ring-1 ring-emerald/10" />
        ))}
      </div>
    </div>
  );
}
