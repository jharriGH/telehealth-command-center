import { useEffect, useMemo, useState } from 'react'
import {
  Send, Phone, Radio, Mail, Link2, Users, TrendingUp, DollarSign,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, Cell, LabelList,
} from 'recharts'
import { Layout } from '@/components/Layout'
import { StatCard } from '@/components/StatCard'
import { TimeToggle } from '@/components/TimeToggle'
import { Section } from '@/components/Section'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard, SkeletonChart } from '@/components/LoadingSkeleton'
import { ChartFrame, CHART_COLORS, TooltipStyle } from '@/components/ChartFrame'
import { supabase } from '@/lib/supabase'
import { DailyStat, DomainStat, FunnelStage, TimeRange } from '@/lib/types'
import { formatCurrency, formatNumber, formatPct, ratio, rangeISODate, shortDate, timeRangeStart } from '@/lib/utils'

interface Totals {
  bridge_submits: number
  ava_calls: number
  rvm_drops: number
  email_opens: number
  allutional_clicks: number
  conversions: number
  revenue: number
  emails_sent: number
}

const ZERO_TOTALS: Totals = {
  bridge_submits: 0, ava_calls: 0, rvm_drops: 0, email_opens: 0,
  allutional_clicks: 0, conversions: 0, revenue: 0, emails_sent: 0,
}

function aggregate(rows: DailyStat[]): Totals {
  return rows.reduce<Totals>((acc, r) => ({
    bridge_submits: acc.bridge_submits + (r.bridge_submits ?? 0),
    ava_calls: acc.ava_calls + (r.ava_calls_fired ?? 0),
    rvm_drops: acc.rvm_drops + (r.rvm_drops_sent ?? 0),
    email_opens: acc.email_opens + (r.email_opens ?? 0),
    allutional_clicks: acc.allutional_clicks + (r.allutional_clicks ?? 0),
    conversions: acc.conversions + (r.total_conversions ?? 0),
    revenue: acc.revenue + (Number(r.new_mrr) || 0),
    emails_sent: acc.emails_sent + (r.emails_sent ?? 0),
  }), { ...ZERO_TOTALS })
}

export function Dashboard() {
  const [range, setRange] = useState<TimeRange>('7d')
  const [stats, setStats] = useState<DailyStat[]>([])
  const [prevStats, setPrevStats] = useState<DailyStat[]>([])
  const [domainStats, setDomainStats] = useState<DomainStat[]>([])
  const [activeSubs, setActiveSubs] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const start = timeRangeStart(range)
      const startDate = rangeISODate(range)
      const spanDays = Math.max(1, Math.round((Date.now() - start.getTime()) / 86400000))
      const prevStart = new Date(start.getTime() - spanDays * 86400000).toISOString().slice(0, 10)
      const prevEnd = startDate

      const [curr, prev, doms, subs, earnedRows] = await Promise.all([
        supabase.from('daily_stats').select('*').gte('stat_date', startDate).order('stat_date', { ascending: true }),
        supabase.from('daily_stats').select('*').gte('stat_date', prevStart).lt('stat_date', prevEnd),
        supabase.from('domain_stats').select('*').gte('stat_date', rangeISODate('today')),
        supabase.from('conversions').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('conversions').select('commission_monthly'),
      ])

      if (curr.error) throw curr.error
      setStats((curr.data ?? []) as DailyStat[])
      setPrevStats((prev.data ?? []) as DailyStat[])
      setDomainStats((doms.data ?? []) as DomainStat[])
      setActiveSubs(subs.count ?? 0)
      const earned = ((earnedRows.data ?? []) as { commission_monthly: number | null }[])
        .reduce((s, r) => s + (Number(r.commission_monthly) || 0), 0)
      setTotalEarned(earned)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, 60000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  const totals = useMemo(() => aggregate(stats), [stats])
  const prevTotals = useMemo(() => aggregate(prevStats), [prevStats])
  const estMRR = activeSubs * 7

  function deltaPct(curr: number, prev: number) {
    if (!prev) return curr > 0 ? 1 : null
    return (curr - prev) / prev
  }

  const funnel: FunnelStage[] = useMemo(() => {
    const stages = [
      { label: 'Emails Sent', count: totals.emails_sent },
      { label: 'Email Opens', count: totals.email_opens },
      { label: 'Bridge Submits', count: totals.bridge_submits },
      { label: 'AVA Calls', count: totals.ava_calls },
      { label: 'Clicks', count: totals.allutional_clicks },
      { label: 'Conversions', count: totals.conversions },
    ]
    return stages.map((s, i) => ({
      label: s.label,
      count: s.count,
      dropoff: i === 0 ? null : ratio(s.count, stages[i - 1].count),
    }))
  }, [totals])

  const dailyChart = useMemo(() => {
    const map = new Map<string, { date: string; submits: number; calls: number; conv: number }>()
    stats.forEach(r => {
      const k = r.stat_date
      const cur = map.get(k) ?? { date: k, submits: 0, calls: 0, conv: 0 }
      cur.submits += r.bridge_submits ?? 0
      cur.calls += r.ava_calls_fired ?? 0
      cur.conv += r.total_conversions ?? 0
      map.set(k, cur)
    })
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [stats])

  const topDomains = useMemo(() => {
    const map = new Map<string, { domain: string; submits: number; conv: number; rev: number }>()
    domainStats.forEach(r => {
      const cur = map.get(r.domain) ?? { domain: r.domain, submits: 0, conv: 0, rev: 0 }
      cur.submits += r.bridge_submits ?? 0
      cur.conv += r.conversions ?? 0
      cur.rev += Number(r.revenue_usd) || 0
      map.set(r.domain, cur)
    })
    return Array.from(map.values())
      .map(d => ({ ...d, convRate: ratio(d.conv, d.submits) }))
      .sort((a, b) => b.convRate - a.convRate)
      .slice(0, 3)
  }, [domainStats])

  return (
    <Layout title="Live Dashboard" subtitle="Real-time funnel telemetry · auto-refresh 60s">
      <div className="flex justify-end mb-4">
        <TimeToggle value={range} onChange={setRange} />
      </div>

      {error && <ErrorState message={error} onRetry={fetchAll} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {loading && stats.length === 0 ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Bridge Submits" value={formatNumber(totals.bridge_submits)} delta={deltaPct(totals.bridge_submits, prevTotals.bridge_submits)} icon={<Send className="w-4 h-4" />} accent="cyan" />
            <StatCard label="AVA Calls" value={formatNumber(totals.ava_calls)} delta={deltaPct(totals.ava_calls, prevTotals.ava_calls)} icon={<Phone className="w-4 h-4" />} accent="cyan" />
            <StatCard label="RVM Drops" value={formatNumber(totals.rvm_drops)} delta={deltaPct(totals.rvm_drops, prevTotals.rvm_drops)} icon={<Radio className="w-4 h-4" />} accent="cyan" />
            <StatCard label="Email Opens" value={formatNumber(totals.email_opens)} delta={deltaPct(totals.email_opens, prevTotals.email_opens)} icon={<Mail className="w-4 h-4" />} accent="cyan" />
            <StatCard label="Allutional Clicks" value={formatNumber(totals.allutional_clicks)} delta={deltaPct(totals.allutional_clicks, prevTotals.allutional_clicks)} icon={<Link2 className="w-4 h-4" />} accent="gold" />
            <StatCard label="Active Subs" value={formatNumber(activeSubs)} icon={<Users className="w-4 h-4" />} accent="success" />
            <StatCard label="Est MRR" value={formatCurrency(estMRR, 0)} icon={<TrendingUp className="w-4 h-4" />} accent="success" />
            <StatCard label="Total Earned" value={formatCurrency(totalEarned, 0)} icon={<DollarSign className="w-4 h-4" />} accent="gold" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-6">
        <Section title="Conversion Funnel" subtitle="Stage-to-stage drop-off">
          {loading ? (
            <SkeletonChart />
          ) : funnel.every(f => f.count === 0) ? (
            <EmptyState />
          ) : (
            <ChartFrame height={320}>
              <BarChart data={funnel} layout="vertical" margin={{ left: 30, right: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                <XAxis type="number" stroke={CHART_COLORS.axis} fontSize={11} />
                <YAxis type="category" dataKey="label" stroke={CHART_COLORS.axis} fontSize={11} width={120} />
                <Tooltip {...TooltipStyle} formatter={(v: number, _n, p: any) => [
                  `${formatNumber(v)}${p?.payload?.dropoff != null ? ` (${formatPct(p.payload.dropoff)} retained)` : ''}`,
                  'Count',
                ]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnel.map((_, i) => (
                    <Cell key={i} fill={i === funnel.length - 1 ? CHART_COLORS.success : CHART_COLORS.cyan} fillOpacity={1 - i * 0.1} />
                  ))}
                  <LabelList dataKey="count" position="right" fill="#fff" fontFamily="Rajdhani" fontSize={12} formatter={(v: number) => formatNumber(v)} />
                </Bar>
              </BarChart>
            </ChartFrame>
          )}
        </Section>

        <Section title="Daily Performance" subtitle="Submits · Calls · Conversions">
          {loading ? (
            <SkeletonChart />
          ) : dailyChart.length === 0 ? (
            <EmptyState />
          ) : (
            <ChartFrame height={320}>
              <LineChart data={dailyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="date" stroke={CHART_COLORS.axis} fontSize={11} tickFormatter={shortDate} />
                <YAxis stroke={CHART_COLORS.axis} fontSize={11} />
                <Tooltip {...TooltipStyle} labelFormatter={shortDate} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Rajdhani', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                <Line type="monotone" dataKey="submits" name="Submits" stroke={CHART_COLORS.cyan} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="calls" name="AVA Calls" stroke={CHART_COLORS.gold} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="conv" name="Conversions" stroke={CHART_COLORS.success} strokeWidth={2} dot={false} />
              </LineChart>
            </ChartFrame>
          )}
        </Section>
      </div>

      <Section title="Top Performing Domains" subtitle="Today · ranked by conversion rate" className="mt-6">
        {loading ? (
          <SkeletonChart height={120} />
        ) : topDomains.length === 0 ? (
          <EmptyState message="Domain stats will appear after first traffic." />
        ) : (
          <div className="overflow-x-auto">
            <table className="hud-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Domain</th>
                  <th className="text-right">Submits</th>
                  <th className="text-right">Conv</th>
                  <th className="text-right">Conv Rate</th>
                  <th className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topDomains.map((d, i) => (
                  <tr key={d.domain}>
                    <td className="text-gold font-heading">#{i + 1}</td>
                    <td className="text-cyan">{d.domain}</td>
                    <td className="text-right">{formatNumber(d.submits)}</td>
                    <td className="text-right">{formatNumber(d.conv)}</td>
                    <td className="text-right text-success">{formatPct(d.convRate)}</td>
                    <td className="text-right text-gold">{formatCurrency(d.rev, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </Layout>
  )
}
