import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Section({
  title,
  subtitle,
  actions,
  children,
  className,
  noPadding = false,
}: {
  title?: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  noPadding?: boolean
}) {
  return (
    <section className={cn('hud-card', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-b border-card-border">
          <div>
            {title && <h2 className="hud-heading text-sm md:text-base text-white">{title}</h2>}
            {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={noPadding ? '' : 'p-4 md:p-5'}>{children}</div>
    </section>
  )
}
