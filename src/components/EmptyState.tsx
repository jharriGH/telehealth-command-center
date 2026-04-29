import { Rocket } from 'lucide-react'
import { ReactNode } from 'react'

export function EmptyState({ title = 'No data yet', message = 'Funnel launches soon.', icon }: { title?: string; message?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-cyan/10 border border-cyan-dim flex items-center justify-center text-cyan mb-3">
        {icon ?? <Rocket className="w-6 h-6" />}
      </div>
      <div className="font-heading uppercase tracking-wider text-white/80">{title}</div>
      <div className="text-sm text-white/40 mt-1 max-w-md">{message}</div>
    </div>
  )
}
