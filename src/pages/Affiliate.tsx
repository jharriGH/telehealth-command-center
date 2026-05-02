import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts'
import { Layout } from '@/components/Layout'
import { Section } from '@/components/Section'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonChart, SkeletonRows } from '@/components/LoadingSkeleton'
import { ChartFrame, CHART_COLORS, TooltipStyle } from '@/components/ChartFrame'
import { supabase } from '@/lib/supabase'
import { Conversion, Lead } from '@/lib/types'
import { daysBetween, formatCurrency, formatNumber, formatPct, ratio } from '@/lib/utils'

const SOURCE_LABELS: Record<string, string> = {
  email_click: 'Email Click',
  ava_sms: 'AVA SMS',
  rvm_sms: 'RVM SMS',
  day10_sms: 'Day 10 SMS',
  chatbot: 'Chatbot',
  direct: 'Direct',
  unknown: 'Unknown',
}

const CHURN_RATE = 0.05
const COMMISSION = 7

export function Affiliate() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const [leadsRes, convs] = await Promise.all([
        supabase.from('leads').select('id, allutional_clicked, allutional_clicked_at, converted, converted_at, conversion_source, created_at').limit(5000),
        supabase.from('conversions').select('*').order('enrolled_at', { ascending: true }),
      ])
      if (leadsRes.error) throw leadsRes.error
      setLeads((leadsRes.data ?? []) as Lead[])
      setConversions((convs.data ?? []) as Conversion[])
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const sources = useMemo(() => {
    const map = new Map<string, { src: string; clicks: number; conv: number }>()
    leads.forEach(l => {
      const k = l.conversion_source ?? 'unknown'
      const cur = map.get(k) ?? { src: k, clicks: 0, conv: 0 }
      if (l.allutional_clicked) cur.clicks += 1
      if (l.converted) cur.conv += 1
      map.set(k, cur)
    })
    return Array.from(map.values())
      .map(s => ({
        ...s,
        label: SOURCE_LABELS[s.src] ?? s.src,
        rate: ratio(s.conv, s.clicks),
        revenue: s.conv * COMMISSION * 12,
      }))
      .sort((a, b) => b.conv - a.conv)
  }, [leads])

  const histogram = useMemo(() => {
    const buckets = { 'Same day': 0, '1-2 days': 0, '3-7 days': 0, '7+ days': 0, 'Never': 0 }
    leads.forEach(l => {
      if (!l.allutional_clicked) return
      if (!l.converted || !l.converted_at || !l.allutional_clicked_at) {
        buckets['Never'] += 1
        return
      }
      const d = daysBetween(l.allutional_clicked_at, l.converted_at)
      if (d <= 0) buckets['Same day'] += 1
      else if (d <= 2) buckets['1-2 days'] += 1
      else if (d <= 7) buckets['3-7 days'] += 1
      else buckets['7+ days'] += 1
    })
    return Object.entries(buckets).map(([k, v]) => ({ bucket: k, count: v }))
  }, [leads])

  const totalClicks = leads.filter(l => l.allutional_clicked).length

  const subscribers = useMemo(() => {
    const active = conversions.filter(c => c.active).length
    const churned = conversions.filter(c => !c.active).length
    return {
      active,
      churned,
      total: conversions.length,
      mrr: active * COMMISSION,
      annual: active * COMMISSION * 12,
      churnEst: Math.round(active * CHURN_RATE),
    }
  }, [conversions])

  const projection = useMemo(() => {
    const now = new Date()
    const monthsBack = 6
    const monthsForward = 12
    const series: { label: string; actual: number | null; projected: number | null; mrr: number }[] = []

    const monthMap = new Map<string, number>()
    conversions.forEach(c => {
      if (!c.enrolled_at) return
      const d = new Date(c.enrolled_at)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(k, (monthMap.get(k) ?? 0) + 1)
    })

    let cumulative = 0
    for (let i = -monthsBack; i < 0; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const newSubs = monthMap.get(k) ?? 0
      cumulative = Math.round(cumulative * (1 - CHURN_RATE) + newSubs)
      series.push({ label: d.toLocaleDateString(undefined, { month: 'short' }), actual: cumulative, projected: null, mrr: cumulative * COMMISSION })
    }

    const recent = series.slice(-3).map(s => s.actual ?? 0)
    const avgGrowth = recent.length >= 2 ? Math.max(0, (recent[recent.length - 1] - recent[0]) / Math.max(1, recent.length - 1)) : 0

    let proj = subscribers.active
    series.push({ label: now.toLocaleDateString(undefined, { month: 'short' }), actual: proj, projected: proj, mrr: proj * COMMISSION })
    for (let i = 1; i <= monthsForward; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      proj = Math.round(proj * (1 - CHURN_RATE) + Math.max(avgGrowth, 1))
      series.push({ label: d.toLocaleDateString(undefined, { month: 'short' }), actual: null, projected: proj, mrr: proj * COMMISSION })
    }
    return series
  }, [conversions, subscribers.active])

  return (
    <Layout title="Affiliate Tracking" subtitle="Allutional clicks · subscribers · MRR projection">
      {error && <ErrorState message={error} onRetry={fetchAll} />}

      <Section title="Click Source Breakdown" subtitle="By conversion source attribution" noPadding>
        {loading ? (
          <SkeletonRows rows={6} cols={5} />
        ) : sources.length === 0 ? (
          <EmptyState message="No click data attributed yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="hud-table th-table">
              <colgroup>
                <col className="w-[36%]" />
                <col className="w-[14%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="th-th-left">Source</th>
                  <th className="th-th-right">Clicks</th>
                  <th className="th-th-right">Conversions</th>
                  <th className="th-th-right">Conv%</th>
                  <th className="th-th-right">Annual Revenue</th>
                </tr>
              </thead>
              <tbody>
                {sources.map(s => (
                  <tr key={s.src}>
                    <td className="th-td-left text-cyan truncate">{s.label}</td>
                    <td className="th-td-right">{formatNumber(s.clicks)}</td>
                    <td className="th-td-right">{formatNumber(s.conv)}</td>
                    <td className="th-td-right text-success">{formatPct(s.rate)}</td>
                    <td className="th-td-right text-gold">{formatCurrency(s.revenue, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Section title="Allutional Clicks" subtitle={`${formatNumber(totalClicks)} total · time-to-convert`}>
          {loading ? (
            <SkeletonChart />
          ) : totalClicks === 0 ? (
            <EmptyState message="Allutional click data will populate after launch." />
          ) : (
            <ChartFrame height={260}>
              <BarChart data={histogram}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="bucket" stroke={CHART_COLORS.axis} fontSize={11} />
                <YAxis stroke={CHART_COLORS.axis} fontSize={11} />
                <Tooltip {...TooltipStyle} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {histogram.map((_, i) => (
                    <Cell key={i} fill={i === histogram.length - 1 ? CHART_COLORS.warning : CHART_COLORS.cyan} fillOpacity={0.9 - i * 0.1} />
                  ))}
                </Bar>
              </BarChart>
            </ChartFrame>
          )}
        </Section>

        <Section title="Subscriber Tracker">
          {loading ? (
            <SkeletonRows rows={4} cols={2} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Active Subs" value={formatNumber(subscribers.active)} accent="text-success" />
              <Stat label="Churned" value={formatNumber(subscribers.churned)} accent="text-warning" />
              <Stat label="Est Monthly Churn" value={formatNumber(subscribers.churnEst)} accent="text-warning" />
              <Stat label="MRR" value={formatCurrency(subscribers.mrr, 0)} accent="text-cyan" />
              <Stat label="ARR Projection" value={formatCurrency(subscribers.annual, 0)} accent="text-gold" />
              <Stat label="Lifetime Subs" value={formatNumber(subscribers.total)} accent="text-white/80" />
            </div>
          )}
        </Section>
      </div>

      <Section title="MRR Growth & 12-Month Projection" subtitle="Solid = actual · dashed = projected" className="mt-6">
        {loading ? (
          <SkeletonChart height={320} />
        ) : projection.length === 0 ? (
          <EmptyState />
        ) : (
          <ChartFrame height={340}>
            <ComposedChart data={projection}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="label" stroke={CHART_COLORS.axis} fontSize={11} />
              <YAxis yAxisId="left" stroke={CHART_COLORS.axis} fontSize={11} />
              <YAxis yAxisId="right" orientation="right" stroke={CHART_COLORS.axis} fontSize={11} tickFormatter={v => `$${v}`} />
              <Tooltip {...TooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Rajdhani', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
              <Bar yAxisId="left" dataKey="actual" name="Subs (Actual)" fill={CHART_COLORS.cyan} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="projected" name="Subs (Projected)" fill={CHART_COLORS.gold} fillOpacity={0.5} radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="mrr" name="MRR ($)" stroke={CHART_COLORS.success} strokeWidth={2} dot={false} />
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
