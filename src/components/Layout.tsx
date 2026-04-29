import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { useBrainStatus } from '@/hooks/useBrainStatus'
import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Layout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const { online, lastChecked } = useBrainStatus()

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-60 pb-20 md:pb-6">
        <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur-md border-b border-card-border px-4 md:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="hud-heading text-xl md:text-2xl text-white">{title}</h1>
            {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hud-card">
              <Activity className={cn('w-3 h-3', online ? 'text-success' : 'text-danger')} />
              <span className="font-heading uppercase tracking-wider text-white/70">Brain {online ? 'Online' : 'Down'}</span>
            </div>
            {lastChecked && (
              <div className="font-heading uppercase tracking-wider text-white/40">
                Sync {lastChecked.toLocaleTimeString()}
              </div>
            )}
          </div>
        </header>
        <div className="px-4 md:px-8 py-6">{children}</div>
      </main>
    </div>
  )
}
