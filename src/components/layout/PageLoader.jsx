/**
 * @file PageLoader.jsx
 * @description Suspense fallback shown while a route chunk downloads.
 * Deliberately minimal: a skeleton of a page, not a spinner on a blank screen.
 */

export function PageLoader() {
  return (
    <div className="shell min-h-[80svh] pt-28" aria-busy="true" aria-label="Loading page">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mt-4 h-10 w-2/3 max-w-lg" />
      <div className="skeleton mt-3 h-4 w-1/2 max-w-sm" />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index}>
            <div className="skeleton aspect-[2/3] w-full" />
            <div className="skeleton mt-2 h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
