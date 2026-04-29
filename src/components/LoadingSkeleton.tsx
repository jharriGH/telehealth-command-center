export function SkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-6 flex-1 bg-white/5 rounded animate-pulse"
              style={{ animationDelay: `${(i + j) * 60}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ height = 240 }: { height?: number }) {
  return (
    <div
      className="bg-white/5 rounded animate-pulse"
      style={{ height: `${height}px` }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="hud-card p-5">
      <div className="h-3 w-20 bg-white/10 rounded mb-3 animate-pulse" />
      <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
    </div>
  )
}
