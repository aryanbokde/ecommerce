import { Skeleton } from "@/components/ui/skeleton";

// Route-level loading UI matching the cart page layout.
export default function CartLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-56" />

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Items column */}
        <div className="lg:col-span-2">
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4">
                <Skeleton className="size-[60px] shrink-0 rounded-md" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="size-7 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                  <div className="mt-2 flex items-center justify-between">
                    <Skeleton className="h-8 w-28 rounded-md" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        {/* Order summary column */}
        <aside className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="my-4 h-px w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="mt-5 h-11 w-full rounded-md" />
            <Skeleton className="mt-4 h-9 w-full rounded-md" />
          </div>
        </aside>
      </div>
    </div>
  );
}
