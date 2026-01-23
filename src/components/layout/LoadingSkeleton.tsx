export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>

      {/* Form skeleton */}
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>

      {/* Button skeleton */}
      <div className="h-12 bg-gray-200 rounded"></div>
    </div>
  );
}

export function PropertyFormSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      ))}
      <div className="h-12 bg-gray-200 rounded"></div>
    </div>
  );
}

export function ResultSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded w-2/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>

      <div className="space-y-3">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>

      <div className="space-y-3">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 bg-gray-200 rounded flex-1"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
