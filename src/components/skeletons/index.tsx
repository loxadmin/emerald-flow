import { Skeleton } from "@/components/ui/skeleton";

/** Rows of list items — used where a table or feed will render. */
export function ListSkeleton({ rows = 5, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`divide-y divide-border ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="hidden h-3 w-16 sm:block" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Horizontal row of KPI/stat tiles. */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-6 w-24" />
          <Skeleton className="mt-3 h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Grid of cards — packages, offers, etc. */
export function CardGridSkeleton({ count = 6, columns = 3 }: { count?: number; columns?: number }) {
  const cols = columns === 2 ? "sm:grid-cols-2" : columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid gap-4 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="mt-4 h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-4/5" />
          <div className="mt-5 flex items-center justify-between">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Chart placeholder with an axis-like baseline. */
export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="mt-2 h-2.5 w-48" />
      <Skeleton className="mt-5 w-full rounded-lg" style={{ height }} />
      <div className="mt-3 flex justify-between">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 w-8" />
        ))}
      </div>
    </div>
  );
}

/** Form / detail panel placeholder. */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-9 w-32 rounded-md" />
    </div>
  );
}

/** Full dashboard shell: header, stats, chart + side list. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <StatsSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartSkeleton />
        </div>
        <div className="rounded-xl border border-border bg-card">
          <div className="p-5">
            <Skeleton className="h-3.5 w-28" />
          </div>
          <ListSkeleton rows={4} />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="p-5">
          <Skeleton className="h-3.5 w-32" />
        </div>
        <ListSkeleton rows={4} />
      </div>
    </div>
  );
}

/** Route-level fallback used while a lazy page chunk loads. */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <DashboardSkeleton />
    </div>
  );
}
