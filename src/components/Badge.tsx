import { cn } from '@/lib/utils'

const VARIANTS = {
  cyan: 'bg-cyan/15 text-cyan border-cyan-dim',
  gold: 'bg-gold/15 text-gold border-gold/30',
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  gray: 'bg-white/5 text-white/50 border-white/10',
} as const

export type BadgeVariant = keyof typeof VARIANTS

export function Badge({ variant = 'gray', children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  return (
    <span className={cn('badge border', VARIANTS[variant])}>{children}</span>
  )
}

export function outcomeVariant(outcome: string | null | undefined): BadgeVariant {
  switch ((outcome ?? '').toLowerCase()) {
    case 'answered': return 'cyan'
    case 'converted': return 'success'
    case 'no_answer': return 'gray'
    case 'voicemail': return 'gold'
    case 'declined': return 'danger'
    case 'busy': return 'warning'
    default: return 'gray'
  }
}
