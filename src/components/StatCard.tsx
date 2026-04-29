import { ReactNode } from 'react'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn, formatPct } from '@/lib/utils'

export function StatCard({
  label,
  value,
  delta,
  icon,
  accent = 'cyan',
  loading = false,
}: {
  label: string
  value: ReactNode
  delta?: number | null
  icon?: ReactNode
  accent?: 'cyan' | 'gold' | 'success' | 'warning'
  loading?: boolean
}) {
  const accentClass = {
    cyan: 'text-cyan',
    gold: 'text-gold',
    success: 'text-success',
    warning: 'text-warning',
  }[accent]

  const showDelta = delta != null && isFinite(delta)
  const deltaUp = (delta ?? 0) > 0
  const deltaDown = (delta ?? 0) < 0

  return (
    <div className="hud-card p-4 md:p-5 relative overflow-hidden">
      <div className="flex items-start justify-between mb-2">
        <div className="font-heading text-xs uppercase tracking-wider text-white/60">{label}</div>
        {icon && <div className={cn('opacity-60', accentClass)}>{icon}</div>}
      </div>
      {loading ? (
        <div className="h-9 w-24 bg-white/5 rounded animate-pulse" />
      ) : (
        <div className={cn('font-heading font-bold text-2xl md:text-3xl', accentClass)}>{value}</div>
      )}
      {showDelta && (
        <div className={cn(
          'mt-1 flex items-center gap-1 text-xs font-heading',
          deltaUp && 'text-success',
          deltaDown && 'text-danger',
          !deltaUp && !deltaDown && 'text-white/40',
        )}>
          {deltaUp && <ArrowUp className="w-3 h-3" />}
          {deltaDown && <ArrowDown className="w-3 h-3" />}
          {!deltaUp && !deltaDown && <Minus className="w-3 h-3" />}
          <span>{formatPct(Math.abs(delta ?? 0))} vs prev</span>
        </div>
      )}
    </div>
  )
}
