/** Shown instantly while a page loads, so clicks feel responsive. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-12 w-2/3 rounded-xl bg-tint" />
      <div className="card space-y-3">
        <div className="h-5 w-1/3 rounded-lg bg-tint" />
        <div className="h-4 w-full rounded-lg bg-tint" />
        <div className="h-4 w-5/6 rounded-lg bg-tint" />
      </div>
      <div className="card space-y-3">
        <div className="h-5 w-1/4 rounded-lg bg-tint" />
        <div className="h-4 w-2/3 rounded-lg bg-tint" />
      </div>
    </div>
  );
}
