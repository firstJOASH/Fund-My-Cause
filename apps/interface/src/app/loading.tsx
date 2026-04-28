export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col gap-6 p-8 max-w-4xl mx-auto animate-pulse"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div
        className="h-8 w-48 rounded"
        style={{ background: "var(--color-surface-elevated)" }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-2xl)] h-52"
            style={{ background: "var(--color-surface-elevated)" }}
          />
        ))}
      </div>
    </div>
  );
}
