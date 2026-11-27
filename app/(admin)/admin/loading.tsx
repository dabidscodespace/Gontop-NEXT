export default function AdminLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading admin page">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="h-2.5 w-28 animate-pulse rounded-full bg-orange-100" />
          <div className="h-8 w-56 animate-pulse rounded-xl bg-gray-200" />
          <div className="h-3 w-80 max-w-[70vw] animate-pulse rounded-full bg-gray-100" />
        </div>
        <div className="hidden h-10 w-28 animate-pulse rounded-xl bg-gray-200 sm:block" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-white p-4">
            <div className="h-2.5 w-20 rounded-full bg-gray-100" />
            <div className="mt-5 h-6 w-28 rounded-lg bg-gray-200" />
            <div className="mt-2 h-2.5 w-16 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-100" />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-40 animate-pulse rounded bg-gray-200" />
                <div className="h-2.5 w-64 max-w-[55vw] animate-pulse rounded bg-gray-100" />
              </div>
              <div className="h-7 w-20 animate-pulse rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
