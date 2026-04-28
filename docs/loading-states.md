# Loading State Guidelines

## Components

| Component | Use case |
|---|---|
| `<LoadingSkeleton />` | Campaign card placeholder while data loads |
| `<LoadingSkeletonGrid count={n} />` | Full campaign grid placeholder |
| `<TableRowSkeleton cols={n} />` | Table row placeholder (transaction history, leaderboard) |
| `<StatCardSkeleton />` | Dashboard stat card placeholder |
| `<FormFieldSkeleton />` | Form field placeholder during async form init |
| `<Spinner />` | Inline spinner inside buttons and async states |
| `<TransactionStatus />` | Multi-step transaction progress (simulate → sign → submit → confirm) |
| `loading.tsx` | Next.js route-level loading (automatic, Suspense boundary) |

## Rules

**1. Always show a skeleton, not a blank space.**
When data is loading, render the skeleton that matches the shape of the content. Never leave an empty container.

**2. Use `<Spinner />` inside action buttons.**
```tsx
<button disabled={isLoading} className="ds-btn-primary px-4 py-2">
  {isLoading ? <Spinner size={16} label="Submitting…" /> : "Submit"}
</button>
```

**3. Use `<TransactionStatus />` for on-chain actions.**
All wallet transactions go through `signing → submitting → confirming`. Use `TransactionStatus` to show each step rather than a generic spinner.

**4. Apply optimistic updates for contributions.**
`useCampaign` exposes `applyOptimisticContribution` and `rollbackOptimistic`. Call them immediately on submit and roll back on error so the UI feels instant.

**5. Accessibility.**
- All skeleton containers have `aria-busy="true"` and `aria-label`.
- `<TransactionStatus />` uses `aria-live="polite"` so screen readers announce state changes.
- `<Spinner />` has `role="status"` and an `aria-label`.

## Skeleton anatomy

All skeletons use `var(--color-surface-elevated)` for the placeholder blocks and `animate-pulse` for the shimmer. They adapt automatically to light/dark mode via the design token.

## Adding a new skeleton

1. Add a new exported function to `LoadingSkeleton.tsx`.
2. Use `<Block className="…" />` (the internal helper) for each placeholder element.
3. Add `aria-busy="true"` and a descriptive `aria-label` to the root element.
