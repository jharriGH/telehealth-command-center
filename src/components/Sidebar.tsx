import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Radio, Phone, Mail, MessageSquare, Link2, DollarSign, LogOut, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useBrainStatus } from '@/hooks/useBrainStatus'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/campaigns', label: 'Campaigns', icon: Radio },
  { to: '/calls', label: 'Call Log', icon: Phone },
  { to: '/email', label: 'Email Log', icon: Mail },
  { to: '/chatbot', label: 'Chatbot', icon: MessageSquare },
  { to: '/affiliate', label: 'Affiliate', icon: Link2 },
  { to: '/costs', label: 'Costs', icon: DollarSign },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const { online, lastChecked } = useBrainStatus()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-60 flex-col border-r border-card-border bg-bg/80 backdrop-blur-md z-30">
        <div className="px-5 pt-6 pb-4 border-b border-card-border">
          <div className="font-heading font-bold text-cyan tracking-widest text-lg">TELEHEALTH</div>
          <div className="font-heading text-xs text-white/50 tracking-widest">COMMAND CENTER</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md font-heading uppercase tracking-wider text-sm transition-all',
                  isActive
                    ? 'bg-cyan/10 text-cyan border border-cyan-dim shadow-glow'
                    : 'text-white/60 hover:text-cyan hover:bg-cyan/5 border border-transparent'
                )
              }
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-card-border space-y-2">
          <div className="flex items-center justify-between px-2 text-xs">
            <div className="flex items-center gap-2">
              <Activity className={cn('w-3 h-3', online ? 'text-success' : online === false ? 'text-danger' : 'text-white/30')} />
              <span className="font-heading uppercase tracking-wider text-white/60">Brain</span>
            </div>
            <span className={cn('font-heading uppercase tracking-wider', online ? 'text-success' : online === false ? 'text-danger' : 'text-white/30')}>
              {online == null ? '...' : online ? 'Online' : 'Down'}
            </span>
          </div>
          {lastChecked && (
            <div className="px-2 text-[10px] text-white/30 font-heading">
              SYNC {lastChecked.toLocaleTimeString()}
            </div>
          )}
          <div className="px-2 text-xs text-white/40 truncate">{user?.email}</div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-danger hover:bg-danger/10 rounded-md transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-heading uppercase tracking-wider">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-card-border bg-bg/95 backdrop-blur-md z-30 flex items-center justify-around px-2 overflow-x-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 px-2 min-w-[3.5rem]',
                isActive ? 'text-cyan' : 'text-white/50'
              )
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-heading uppercase tracking-wider">{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
