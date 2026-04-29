import { ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'

export const CHART_COLORS = {
  cyan: '#00E5FF',
  gold: '#FFD700',
  success: '#10B981',
  warning: '#FF6B35',
  danger: '#EF4444',
  axis: 'rgba(255,255,255,0.4)',
  grid: 'rgba(0,229,255,0.08)',
}

export function ChartFrame({ height = 280, children }: { height?: number; children: ReactNode }) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}

export const TooltipStyle = {
  contentStyle: {
    background: 'rgba(1,8,16,0.95)',
    border: '1px solid rgba(0,229,255,0.3)',
    borderRadius: 8,
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 12,
  },
  labelStyle: { color: '#00E5FF', fontFamily: 'Rajdhani', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  itemStyle: { color: '#fff' },
}
