/** Static first paint for the console: shell silhouette + content skeleton. No client JS needed. */
export function ShellSkeleton() {
  const bar = "animate-shimmer rounded-sm bg-layer";
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading console">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-stroke-soft bg-default p-4 lg:block">
        <div className={`${bar} h-6 w-28`} />
        <div className={`${bar} mt-5 h-10 w-full`} />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className={`${bar} h-7 w-full`} style={{ opacity: 1 - i * 0.07 }} />
          ))}
        </div>
      </aside>
      <div className="lg:pl-60">
        <div className="flex h-14 items-center gap-3 border-b border-stroke-soft bg-default px-6">
          <div className={`${bar} h-8 w-full max-w-[380px]`} />
          <div className="flex-1" />
          <div className={`${bar} h-8 w-44`} />
          <div className={`${bar} size-8 rounded-full`} />
        </div>
        <div className="hatch-warning h-7 border-b border-warning-faint" />
        <PageSkeleton />
      </div>
    </div>
  );
}

export function PageSkeleton({ variant = "dashboard" }: { variant?: "dashboard" | "table" | "form" }) {
  const bar = "animate-shimmer rounded-sm bg-layer";
  const card = "rounded-md border border-stroke-soft bg-default shadow-xs";
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pt-6 sm:px-6 lg:px-8" aria-hidden>
      <div className={`${bar} h-8 w-48`} />
      <div className={`${bar} mt-2 h-4 w-80 max-w-full`} />
      {variant === "dashboard" && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`${card} h-[150px] p-4`}>
                <div className={`${bar} h-4 w-24`} />
                <div className={`${bar} mt-4 h-8 w-32`} />
                <div className={`${bar} mt-3 h-3 w-20`} />
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <div className={`${card} h-[340px] xl:col-span-2`} />
            <div className={`${card} h-[340px]`} />
          </div>
        </>
      )}
      {variant === "table" && (
        <div className={`${card} mt-6 overflow-hidden`}>
          <div className="flex gap-2 p-4">
            <div className={`${bar} h-8 w-64`} />
            <div className={`${bar} h-8 w-24`} />
            <div className={`${bar} h-8 w-24`} />
          </div>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-t border-stroke-soft px-5 py-3.5">
              <div className={`${bar} h-4 w-24`} />
              <div className={`${bar} h-4 w-40`} />
              <div className={`${bar} ml-auto h-4 w-20`} />
              <div className={`${bar} h-6 w-24 rounded-full`} />
            </div>
          ))}
        </div>
      )}
      {variant === "form" && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className={`${card} h-48`} />
            ))}
          </div>
          <div className={`${card} h-[520px]`} />
        </div>
      )}
    </div>
  );
}
