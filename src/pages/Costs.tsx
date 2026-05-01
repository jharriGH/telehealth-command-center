import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'
import { Layout } from '@/components/Layout'
import { Section } from '@/components/Section'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonChart, SkeletonRows } from '@/components/LoadingSkeleton'
import { ChartFrame, CHART_COLORS, TooltipStyle } from '@/components/ChartFrame'
import { Badge, BadgeVariant } from '@/components/Badge'
import { supabase } from '@/lib/supabase'
import { CostLogEntry, DailyStat, Conversion } from '@/lib/types'
import { cn, formatCurrency, formatNumber, formatPct, ratio, shortDate } from '@/lib/utils'

interface ServiceRow {
  service: string
  label: string
  units: number
  rate: number
  cost: number
  budget: number
}

const SERVICES: { match: (s: string) => boolean; label: string; rate: number; settingsKey: string; defaultBudget: number }[] = [
  { match: s => s.includes('ava'),                                   label: 'AVA Calls',     rate: 0.016, settingsKey: 'budget_ava_usd',          defaultBudget: 150 },
  { match: s => s.includes('twilio') || s === 'sms',                 label: 'Twilio SMS',    rate: 0.012, settingsKey: 'budget_twilio_usd',       defaultBudget: 250 },
  { match: s => s.includes('slybroadcast'),                          label: 'Slybroadcast',  rate: 0.05,  settingsKey: 'budget_slybroadcast_usd', defaultBudget: 200 },
  { match: s => s.includes('claude') || s.includes('chatbot'),       label: 'Claude Chatbot',rate: 0.001, settingsKey: 'budget_chatbot_usd',      defaultBudget:   5 },
]

function statusVariant(pct: number): { variant: BadgeVariant; label: string } {
  if (pct >= 0.9) return { variant: 'danger', label: '🔴' }
  if (pct >= 0.7) return { variant: 'warning', label: '🟡' }
  return { variant: 'success', label: '🟢' }
}

const SLY_PLAN_TOTAL = 100

export function Costs() {
  const [costs, setCosts] = useState<CostLogEntry[]>([])
  const [stats, setStats] = useState<DailyStat[]>([])
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [budgets, setBudgets] = useState<Record<string, number>>(() =>
    Object.fromEntries(SERVICES.map(s => [s.settingsKey, s.defaultBudget]))
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      const monthStartIso = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString()
      const last30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
      const [c, d, conv, settings] = await Promise.all([
        supabase.from('cost_log').select('*').gte('logged_at', monthStartIso).order('logged_at', { ascending: true }),
        supabase.from('daily_stats').select('*').gte('stat_date', last30),
        supabase.from('conversions').select('*'),
        supabase.from('settings').select('key,value').in('key', SERVICES.map(s => s.settingsKey)),
      ])
      if (c.error) throw c.error
      setCosts((c.data ?? []) as CostLogEntry[])
      setStats((d.data ?? []) as DailyStat[])
      setConversions((conv.data ?? []) as Conversion[])
      if (!settings.error && settings.data?.length) {
        const next = { ...Object.fromEntries(SERVICES.map(s => [s.settingsKey, s.defaultBudget])) }
        for (const row of settings.data as { key: string; value: string }[]) {
          const n = Number(row.value)
          if (Number.isFinite(n)) next[row.key] = n
        }
        setBudgets(next)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const breakdown = useMemo(() => {
    const rows: ServiceRow[] = SERVICES.map(svc => {
      const matching = costs.filter(c => svc.match((c.service ?? '').toLowerCase()))
      const units = matching.reduce((s, m) => s + (m.units ?? 0), 0)
      const cost = matching.reduce((s, m) => s + (Number(m.cost_usd) || 0), 0)
      return {
        service: svc.label,
        label: svc.label,
        units,
        rate: svc.rate,
        cost,
        budget: budgets[svc.settingsKey] ?? svc.defaultBudget,
      }
    })
    return rows
  }, [costs, budgets])

  const totalCost = breakdown.reduce((s, r) => s + r.cost, 0)
  const totalBudget = breakdown.reduce((s, r) => s + r.budget, 0)

  const slyRemaining = useMemo(() => {
    const sly = costs.filter(c => (c.service ?? '').toLowerCase().includes('slybroadcast'))
    const used = sly.reduce((s, c) => s + (c.units ?? 0), 0)
    return Math.max(0, SLY_PLAN_TOTAL - used)
  }, [costs])

  const economics = useMemo(() => {
    const submits = stats.reduce((s, r) => s + (r.bridge_submits ?? 0), 0)
    const clicks = stats.reduce((s, r) => s + (r.allutional_clicks ?? 0), 0)
    const conv = stats.reduce((s, r) => s + (r.total_conversions ?? 0), 0)
    const revenue = stats.reduce((s, r) => s + (Number(r.new_mrr) || 0), 0)
    const ltv = 84
    const roi = totalCost > 0 ? (revenue - totalCost) / totalCost : 0
    return {
      perSubmit: submits ? totalCost / submits : 0,
      perClick: clicks ? totalCost / clicks : 0,
      perConv: conv ? totalCost / conv : 0,
      ltv,
      roi,
      revenue,
    }
  }, [stats, totalCost])

  const trend = useMemo(() => {
    type TrendRow = { date: string; ava: number; twilio: number; slybroadcast: number; claude: number }
    const map = new Map<string, TrendRow>()
    costs.forEach(c => {
      const d = new Date(c.logged_at).toISOString().slice(0, 10)
      const cur: TrendRow = map.get(d) ?? { date: d, ava: 0, twilio: 0, slybroadcast: 0, claude: 0 }
      const svc = (c.service ?? '').toLowerCase()
      const cost = Number(c.cost_usd) || 0
      if (svc.includes('ava')) cur.ava += cost
      else if (svc.includes('twilio') || svc === 'sms') cur.twilio += cost
      else if (svc.includes('slybroadcast')) cur.slybroadcast += cost
      else if (svc.includes('claude') || svc.includes('chatbot')) cur.claude += cost
      map.set(d, cur)
    })
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [costs])

  const monthlyRevVsCost = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; cost: number }>()
    conversions.forEach(c => {
      if (!c.enrolled_at) return
      const d = new Date(c.enrolled_at)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const cur = map.get(k) ?? { month: d.toLocaleDateString(undefined, { month: 'short' }), revenue: 0, cost: 0 }
      cur.revenue += (Number(c.commission_monthly) || 7)
      map.set(k, cur)
    })
    costs.forEach(c => {
      const d = new Date(c.logged_at)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const cur = map.get(k) ?? { month: d.toLocaleDateString(undefined, { month: 'short' }), revenue: 0, cost: 0 }
      cur.cost += Number(c.cost_usd) || 0
      map.set(k, cur)
    })
    return Array.from(map.values())
  }, [conversions, costs])

  const slyPct = slyRemaining / SLY_PLAN_TOTAL
  const slyLow = slyRemaining < 20

  return (
    <Layout title="Cost Intelligence" subtitle="Per-service spend · unit economics · burn rate">
      {error && <ErrorState message={error} onRetry={fetchAll} />}

      <Section title="Cost Breakdown" subtitle="Month-to-date · vs budget" noPadding>
        {loading ? (
          <SkeletonRows rows={5} cols={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="hud-table w-full table-fixed">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="text-left">Service</th>
                  <th className="text-right">Units</th>
                  <th className="text-right">Rate</th>
                  <th className="text-right">This Month</th>
                  <th className="text-right">Budget</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map(r => {
                  const pct = ratio(r.cost, r.budget)
                  const s = statusVariant(pct)
                  return (
                    <tr key={r.service}>
                      <td className="text-left text-cyan truncate">{r.label}</td>
                      <td className="text-right tabular-nums">{formatNumber(r.units)}</td>
                      <td className="text-right tabular-nums text-white/60">{formatCurrency(r.rate, 3)}</td>
                      <td className="text-right tabular-nums text-gold">{formatCurrency(r.cost, 2)}</td>
                      <td className="text-right tabular-nums text-white/60">{formatCurrency(r.budget, 0)}</td>
                      <td className="text-center whitespace-nowrap"><Badge variant={s.variant}>{s.label} {formatPct(pct, 0)}</Badge></td>
                    </tr>
                  )
                })}
                <tr className="border-t-2 border-cyan-dim">
                  <td className="text-left text-white font-heading uppercase tracking-wider">Total</td>
                  <td className="text-right tabular-nums text-white/40">—</td>
                  <td className="text-right tabular-nums text-white/40">—</td>
                  <td className="text-right tabular-nums text-cyan font-heading">{formatCurrency(totalCost, 2)}</td>
                  <td className="text-right tabular-nums text-white/60">{formatCurrency(totalBudget, 0)}</td>
                  <td className="text-center whitespace-nowrap"><Badge variant={statusVariant(ratio(totalCost, totalBudget)).variant}>{formatPct(ratio(totalCost, totalBudget), 0)}</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Section title="Slybroadcast Credits" subtitle={`${formatNumber(slyRemaining)} of ${SLY_PLAN_TOTAL} remaining`}>
          <ChartFrame height={220}>
            <RadialBarChart innerRadius={60} outerRadius={90} startAngle={90} endAngle={-270} data={[{ name: 'credits', value: slyRemaining, fill: slyLow ? CHART_COLORS.danger : slyPct < 0.4 ? CHART_COLORS.warning : CHART_COLORS.success }]}>
              <PolarAngleAxis type="number" domain={[0, SLY_PLAN_TOTAL]} tick={false} />
              <RadialBar background={{ fill: 'rgba(255,255,255,0.05)' }} dataKey="value" cornerRadius={20} />
              <text x="50%" y="48%" textAnchor="middle" fill="#00E5FF" fontFamily="Rajdhani" fontSize={32} fontWeight={700}>{slyRemaining}</text>
              <text x="50%" y="60%" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontFamily="Rajdhani" fontSize={11} letterSpacing="0.2em">CREDITS LEFT</text>
            </RadialBarChart>
          </ChartFrame>
          {slyLow && (
            <div className="mt-2 flex items-center justify-center gap-2 text-warning text-xs font-heading uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" /> Low — refill needed
            </div>
          )}
        </Section>

        <Section title="Unit Economics" subtitle="Cost per outcome · LTV · ROI" className="lg:col-span-2">
          {loading ? (
            <SkeletonRows rows={3} cols={3} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat label="Cost / Submit" value={formatCurrency(economics.perSubmit, 3)} accent="text-cyan" />
              <Stat label="Cost / Click" value={formatCurrency(economics.perClick, 3)} accent="text-cyan" />
              <Stat label="Cost / Conversion" value={formatCurrency(economics.perConv, 2)} accent="text-gold" />
              <Stat label="LTV / Subscriber" value={formatCurrency(economics.ltv, 0)} accent="text-success" />
              <Stat label="Revenue MTD" value={formatCurrency(economics.revenue, 0)} accent="text-gold" />
              <Stat label="ROI" value={isFinite(economics.roi) ? formatPct(economics.roi) : '—'} accent={cn(economics.roi > 0 ? 'text-success' : 'text-danger')} />
            </div>
          )}
        </Section>
      </div>

      <Section title="30-Day Cost Trend" subtitle="Stacked by service" className="mt-6">
        {loading ? (
          <SkeletonChart />
        ) : trend.length === 0 ? (
          <EmptyState message="No cost events logged this month yet." />
        ) : (
          <ChartFrame height={300}>
            <AreaChart data={trend}>
              <defs>
                {['ava', 'twilio', 'slybroadcast', 'claude'].map((k, i) => (
                  <linearGradient id={`g-${k}`} key={k} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={[CHART_COLORS.cyan, CHART_COLORS.gold, CHART_COLORS.warning, CHART_COLORS.success][i]} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={[CHART_COLORS.cyan, CHART_COLORS.gold, CHART_COLORS.warning, CHART_COLORS.success][i]} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" stroke={CHART_COLORS.axis} fontSize={11} tickFormatter={shortDate} />
              <YAxis stroke={CHART_COLORS.axis} fontSize={11} tickFormatter={v => `$${v}`} />
              <Tooltip {...TooltipStyle} formatter={(v: number) => formatCurrency(v, 2)} labelFormatter={shortDate} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Rajdhani', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
              <Area type="monotone" dataKey="ava" name="AVA" stroke={CHART_COLORS.cyan} fill="url(#g-ava)" stackId="1" />
              <Area type="monotone" dataKey="twilio" name="Twilio" stroke={CHART_COLORS.gold} fill="url(#g-twilio)" stackId="1" />
              <Area type="monotone" dataKey="slybroadcast" name="Slybroadcast" stroke={CHART_COLORS.warning} fill="url(#g-slybroadcast)" stackId="1" />
              <Area type="monotone" dataKey="claude" name="Claude" stroke={CHART_COLORS.success} fill="url(#g-claude)" stackId="1" />
            </AreaChart>
          </ChartFrame>
        )}
      </Section>

      <Section title="Revenue vs Cost" subtitle="Profit gap by month" className="mt-6">
        {loading ? (
          <SkeletonChart />
        ) : monthlyRevVsCost.length === 0 ? (
          <EmptyState message="Awaiting first month of revenue + cost data." />
        ) : (
          <ChartFrame height={300}>
            <ComposedChart data={monthlyRevVsCost}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="month" stroke={CHART_COLORS.axis} fontSize={11} />
              <YAxis stroke={CHART_COLORS.axis} fontSize={11} tickFormatter={v => `$${v}`} />
              <Tooltip {...TooltipStyle} formatter={(v: number) => formatCurrency(v, 2)} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Rajdhani', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
              <Bar dataKey="revenue" name="Commission Earned" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="cost" name="Variable Cost" stroke={CHART_COLORS.warning} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ChartFrame>
        )}
      </Section>
    </Layout>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="hud-card p-3">
      <div className="text-xs font-heading uppercase tracking-wider text-white/50">{label}</div>
      <div className={`font-heading text-2xl mt-1 ${accent}`}>{value}</div>
    </div>
  )
}
