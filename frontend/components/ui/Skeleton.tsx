/**
 * Reusable skeleton primitives for loading states
 */

export function SkeletonBlock({ className = '' }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-[#E6DED8] rounded-lg ${className}`} />
    );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="animate-pulse bg-[#E6DED8] rounded h-4"
                    style={{ width: i === lines - 1 ? '60%' : '100%' }}
                />
            ))}
        </div>
    );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <div className={`bg-white rounded-xl border border-[#E6DED8] p-6 ${className}`}>
            <SkeletonBlock className="h-4 w-1/3 mb-3" />
            <SkeletonBlock className="h-8 w-1/2 mb-2" />
            <SkeletonBlock className="h-3 w-1/4" />
        </div>
    );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="bg-white rounded-xl border border-[#E6DED8] overflow-hidden">
            {/* Header */}
            <div className="flex gap-4 p-4 border-b border-[#E6DED8] bg-[#FAF8F6]">
                {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonBlock key={i} className="h-4 flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 border-b border-[#F5F0EB] last:border-0">
                    {Array.from({ length: 5 }).map((_, j) => (
                        <SkeletonBlock key={j} className="h-4 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

/**
 * Full page skeleton inside AppLayout — shows sidebar + header as solid,
 * with a skeleton content area. Used as loading.tsx in route segments.
 */
export function PageSkeleton({ title, cards = 0, table = true }: { title?: string; cards?: number; table?: boolean }) {
    return (
        <div className="space-y-6">
            {/* Page header skeleton */}
            <div className="flex items-center justify-between">
                <div>
                    {title ? (
                        <h1 className="text-2xl font-bold text-[#3E2723]">{title}</h1>
                    ) : (
                        <SkeletonBlock className="h-8 w-48" />
                    )}
                    <SkeletonBlock className="h-4 w-32 mt-2" />
                </div>
                <SkeletonBlock className="h-10 w-32 rounded-lg" />
            </div>

            {/* Stats cards */}
            {cards > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: cards }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            )}

            {/* Search bar skeleton */}
            <SkeletonBlock className="h-10 w-full max-w-md rounded-lg" />

            {/* Table skeleton */}
            {table && <SkeletonTable />}
        </div>
    );
}
