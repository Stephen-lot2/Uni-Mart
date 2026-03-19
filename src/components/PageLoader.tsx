import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

/* ── Top progress bar that animates on route change ── */
export function RouteProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(20);
    const t1 = setTimeout(() => setProgress(60), 80);
    const t2 = setTimeout(() => setProgress(85), 200);
    const t3 = setTimeout(() => setProgress(100), 350);
    const t4 = setTimeout(() => setVisible(false), 550);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden">
      <div
        className="h-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)] transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/* ── Full-page centered spinner (for Suspense fallback) ── */
export function PageLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-[50vh] flex-col items-center justify-center gap-3", className)}>
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
        <div className="absolute inset-[6px] animate-ping rounded-full bg-primary/20" />
      </div>
    </div>
  );
}

/* ── Skeleton card grid ── */
export function SkeletonGrid({ cols = 4, count = 8 }: { cols?: number; count?: number }) {
  return (
    <div className={`grid gap-4 grid-cols-2 md:grid-cols-${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border bg-card">
          <div className="aspect-square animate-pulse bg-muted/60" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 animate-pulse rounded-full bg-muted/60" />
            <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Skeleton list rows ── */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border bg-card p-4">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl bg-muted/60" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted/60" />
            <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted/60" />
          </div>
          <div className="h-6 w-16 animate-pulse rounded-full bg-muted/60" />
        </div>
      ))}
    </div>
  );
}

/* ── Profile skeleton ── */
export function ProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center gap-6 rounded-2xl border bg-card p-8 sm:flex-row sm:items-start">
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-full bg-muted/60" />
          <div className="flex-1 space-y-3 w-full">
            <div className="h-6 w-40 animate-pulse rounded-full bg-muted/60" />
            <div className="h-4 w-24 animate-pulse rounded-full bg-muted/60" />
            <div className="h-4 w-32 animate-pulse rounded-full bg-muted/60" />
          </div>
        </div>
        <div className="mt-8">
          <div className="h-6 w-32 animate-pulse rounded-full bg-muted/60 mb-4" />
          <SkeletonGrid count={6} />
        </div>
      </div>
    </div>
  );
}
