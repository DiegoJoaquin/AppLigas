/** Esqueletos de carga: aparecen al instante mientras llegan los datos */
export function Bone({ className = "" }: { className?: string }) {
  return <span className={`block animate-pulse rounded-lg bg-mist ${className}`} />;
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-[58px_1fr] items-center gap-3 border-b border-line px-4 py-3 last:border-0">
          <Bone className="h-4 w-10" />
          <div className="space-y-2"><Bone className="h-4 w-3/4" /><Bone className="h-4 w-2/3" /></div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <Bone className="h-4 w-40" />
      <Bone className="mt-3 h-16 w-3/4 sm:h-24" />
      <div className="mt-8"><ListSkeleton /></div>
    </div>
  );
}
