import { TimeRange } from '@/lib/types'
import { cn } from '@/lib/utils'

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'all', label: 'All' },
]

export function TimeToggle({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  return (
    <div className="inline-flex hud-card p-1">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1 rounded text-xs font-heading uppercase tracking-wider transition-all',
            value === opt.value
              ? 'bg-cyan text-bg shadow-glow'
              : 'text-white/60 hover:text-cyan'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
