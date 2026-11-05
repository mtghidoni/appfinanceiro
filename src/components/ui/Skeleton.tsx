export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`rounded-lg bg-thead motion-safe:animate-pulse ${className}`} />;
}

/** Placeholder de uma seção de lista enquanto os dados carregam. */
export function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 md:px-5 py-4">
        <Skeleton className="size-9 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="divide-y divide-border border-t border-border">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 md:px-5 py-3.5">
            <Skeleton className="h-3.5 flex-1 max-w-[45%]" />
            <Skeleton className="h-3.5 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
