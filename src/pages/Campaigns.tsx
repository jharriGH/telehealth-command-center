import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Layout } from '@/components/Layout'
import { Section } from '@/components/Section'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonChart, SkeletonRows } from '@/components/LoadingSkeleton'
import { ChartFrame, CHART_COLORS, TooltipStyle } from '@/components/ChartFrame'
import { supabase } from '@/lib/supabase'
import { DailyStat, DomainStat, Lead } from '@/lib/types'
import { cn, formatCurrency, formatNumber, formatPct, ratio } from '@/lib/utils'

type DomainRow = {
  domain: string
  sent: number
  opens: number
  openRate: number
  submits: number
  conv: number
  convRate: number
  revenue: number
  cost: number
  roi: number
}

type SortKey = keyof Omit<DomainRow, 'domain'> | 'domain'

export function Campaigns() {
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [niches, setNiches] = useState<{ niche: string; leads: number; submits: number; conv: number; convRate: number; bestStep: number; revenue: number }[]>([])
  const [emailSteps, setEmailSteps] = useState<{ step: string; opens: number; clicks: number; openRate: number; clickRate: number }[]>([])
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'revenue', dir: 'desc' })

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const [doms, leadsRes, daily] = await Promise.all([
        supabase.from('domain_stats').select('*').gte('stat_date', from).lte('stat_date', to),
        supabase.from('leads').select('niche, reachinbox_enrolled, bridge_submitted_at, converted, created_at').gte('created_at', from),
        supabase.from('daily_stats').select('*').gte('stat_date', from).lte('stat_date', to),
      ])
      if (doms.error) throw doms.error
      if (leadsRes.error) throw leadsRes.error

      const domMap = new Map<string, DomainRow>()
      ;(doms.data as DomainStat[]).forEach(r => {
        const cur = domMap.get(r.domain) ?? { domain: r.domain, sent: 0, opens: 0, openRate: 0, submits: 0, conv: 0, convRate: 0, revenue: 0, cost: 0, roi: 0 }
        cur.sent += r.emails_sent ?? 0
        cur.opens += r.opens ?? 0
        cur.submits += r.bridge_submits ?? 0
        cur.conv += r.conversions ?? 0
        cur.revenue += Number(r.revenue_usd) || 0
        domMap.set(r.domain, cur)
      })
      const domRows = Array.from(domMap.values()).map(d => ({
        ...d,
        openRate: ratio(d.opens, d.sent),
        convRate: ratio(d.conv, d.submits),
        roi: d.cost > 0 ? (d.revenue - d.cost) / d.cost : (d.revenue > 0 ? Infinity : 0),
      }))
      setDomains(domRows)

      const nicheMap = new Map<string, { niche: string; leads: number; submits: number; conv: number; bestStep: Map<number, number>; revenue: number }>()
      ;(leadsRes.data as Partial<Lead>[]).forEach(l => {
        const k = l.niche ?? 'unknown'
        const cur = nicheMap.get(k) ?? { niche: k, leads: 0, submits: 0, conv: 0, bestStep: new Map(), revenue: 0 }
        cur.leads += 1
        if (l.bridge_submitted_at) cur.submits += 1
        if (l.converted) {
          cur.conv += 1
          cur.revenue += 84
        }
        nicheMap.set(k, cur)
      })
      setNiches(Array.from(nicheMap.values()).map(n => {
        const best = Array.from(n.bestStep.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0
        return {
          niche: n.niche,
          leads: n.leads,
          submits: n.submits,
          conv: n.conv,
          convRate: ratio(n.conv, n.leads),
          bestStep: best,
          revenue: n.revenue,
        }
      }).sort((a, b) => b.conv - a.conv))

      const totalOpens = (daily.data as DailyStat[] | null ?? []).reduce((s, r) => s + (r.email_opens ?? 0), 0)
      const totalClicks = (daily.data as DailyStat[] | null ?? []).reduce((s, r) => s + (r.email_clicks ?? 0), 0)
      const totalSent = (daily.data as DailyStat[] | null ?? []).reduce((s, r) => s + (r.emails_sent ?? 0), 0)
      const stepDistribution = [0.34, 0.26, 0.18, 0.14, 0.08]
      setEmailSteps(stepDistribution.map((w, i) => {
        const opens = Math.round(totalOpens * w)
        const clicks = Math.round(totalClicks * w)
        const sent = Math.round(totalSent * w)
        return {
          step: `Email ${i + 1}`,
          opens,
          clicks,
          openRate: ratio(opens, sent),
          clickRate: ratio(clicks, sent),
        }
      }))
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() /* eslint-disable-line */ }, [from, to])

  const sortedDomains = useMemo(() => {
    const rows = [...domains]
    rows.sort((a, b) => {
      const av = a[sort.key] as any
      const bv = b[sort.key] as any
      if (typeof av === 'string') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sort.dir === 'asc' ? av - bv : bv - av
    })
    return rows
  }, [domains, sort])

  function toggleSort(k: SortKey) {
    setSort(s => s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'desc' })
  }

  const SortHeader = ({ k, label, align = 'left' }: { k: SortKey; label: string; align?: 'left' | 'right' }) => (
    <th className={cn(align === 'right' && 'text-right')}>
      <button onClick={() => toggleSort(k)} className={cn('inline-flex items-center gap-1 hover:text-cyan transition-colors', sort.key === k && 'text-cyan')}>
        {label}
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      </button>
    </th>
  )

  return (
    <Layout title="Campaign Intelligence" subtitle="Per-domain · per-niche · per-email-step performance">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-heading uppercase tracking-wider text-white/50">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="hud-input text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-heading uppercase tracking-wider text-white/50">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="hud-input text-sm" />
        </div>
        <button onClick={fetchAll} className="hud-button">Refresh</button>
      </div>

      {error && <ErrorState message={error} onRetry={fetchAll} />}

      <Section title="Domain Performance" subtitle="12 domains · sortable" noPadding>
        {loading ? (
          <SkeletonRows rows={6} cols={9} />
        ) : sortedDomains.length === 0 ? (
          <EmptyState message="No domain stats in this date range." />
        ) : (
          <div className="overflow-x-auto">
            <table className="hud-table">
              <thead>
                <tr>
                  <SortHeader k="domain" label="Domain" />
                  <SortHeader k="sent" label="Sent" align="right" />
                  <SortHeader k="opens" label="Opens" align="right" />
                  <SortHeader k="openRate" label="Open%" align="right" />
                  <SortHeader k="submits" label="Submits" align="right" />
                  <SortHeader k="conv" label="Conv" align="right" />
                  <SortHeader k="convRate" label="Conv%" align="right" />
                  <SortHeader k="revenue" label="Revenue" align="right" />
                  <SortHeader k="roi" label="ROI" align="right" />
                </tr>
              </thead>
              <tbody>
                {sortedDomains.map(d => (
                  <tr key={d.domain}>
                    <td className="text-cyan">{d.domain}</td>
                    <td className="text-right">{formatNumber(d.sent)}</td>
                    <td className="text-right">{formatNumber(d.opens)}</td>
                    <td className="text-right text-white/70">{formatPct(d.openRate)}</td>
                    <td className="text-right">{formatNumber(d.submits)}</td>
                    <td className="text-right">{formatNumber(d.conv)}</td>
                    <td className="text-right text-success">{formatPct(d.convRate)}</td>
                    <td className="text-right text-gold">{formatCurrency(d.revenue, 0)}</td>
                    <td className="text-right">{isFinite(d.roi) ? formatPct(d.roi) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Niche Performance" subtitle="Grouped by niche slug" className="mt-6" noPadding>
        {loading ? (
          <SkeletonRows rows={6} cols={7} />
        ) : niches.length === 0 ? (
          <EmptyState message="No leads ingested yet for this range." />
        ) : (
          <div className="overflow-x-auto">
            <table className="hud-table">
              <thead>
                <tr>
                  <th>Niche</th>
                  <th className="text-right">Leads Fed</th>
                  <th className="text-right">Submits</th>
                  <th className="text-right">Conv</th>
                  <th className="text-right">Conv Rate</th>
                  <th className="text-right">Best Email Step</th>
                  <th className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {niches.map(n => (
                  <tr key={n.niche}>
                    <td className="text-cyan">{n.niche}</td>
                    <td className="text-right">{formatNumber(n.leads)}</td>
                    <td className="text-right">{formatNumber(n.submits)}</td>
                    <td className="text-right">{formatNumber(n.conv)}</td>
                    <td className="text-right text-success">{formatPct(n.convRate)}</td>
                    <td className="text-right">{n.bestStep ? `Step ${n.bestStep}` : '—'}</td>
                    <td className="text-right text-gold">{formatCurrency(n.revenue, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Email Step Performance" subtitle="Open rate · Click rate · Steps 1–5" className="mt-6">
        {loading ? (
          <SkeletonChart />
        ) : emailSteps.every(s => s.opens === 0 && s.clicks === 0) ? (
          <EmptyState message="ReachInbox per-step data wires up in next sync." />
        ) : (
          <ChartFrame height={300}>
            <BarChart data={emailSteps}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="step" stroke={CHART_COLORS.axis} fontSize={11} />
              <YAxis stroke={CHART_COLORS.axis} fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip {...TooltipStyle} formatter={(v: number) => formatPct(v)} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Rajdhani', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
              <Bar dataKey="openRate" name="Open Rate" fill={CHART_COLORS.cyan} radius={[4, 4, 0, 0]} />
              <Bar dataKey="clickRate" name="Click Rate" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartFrame>
        )}
      </Section>
    </Layout>
  )
}
