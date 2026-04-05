// components/Skeleton.jsx
export const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-white/10 rounded ${className}`} />
);

export const SearchSkeleton = () => (
  <div className="space-y-4">
    {/* People Section Skeleton */}
    <div>
      <Skeleton className="h-4 w-20 mb-2" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
    
    {/* Posts Section Skeleton */}
    <div>
      <Skeleton className="h-4 w-20 mb-2" />
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="p-3 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const SearchSuggestionSkeleton = () => (
  <div className="space-y-3 p-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton className="w-4 h-4" />
        <Skeleton className="h-4 w-48" />
      </div>
    ))}
  </div>
);