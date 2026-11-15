"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card space-y-3">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted">{error.message}</p>
      <button type="button" className="btn btn-secondary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
