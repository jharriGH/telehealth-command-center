import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from 'recharts'
import { Layout } from '@/components/Layout'
import { Section } from '@/components/Section'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard, SkeletonRows, SkeletonChart } from '@/components/LoadingSkeleton'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/Badge'
import { ChartFrame, CHART_COLORS, TooltipStyle } from '@/components/ChartFrame'
import { supabase } from '@/lib/supabase'
import { ChatbotSession } from '@/lib/types'
import { dateTime, formatNumber, formatPct, ratio } from '@/lib/utils'

export function Chatbot() {
  const [sessions, setSessions] = useState<ChatbotSession[]>([])
  const [nonChatbotConvRate, setNonChatbotConvRate] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const [sess, nonBot] = await Promise.all([
        supabase.from('chatbot_sessions').select('*').order('started_at', { ascending: false }).limit(500),
        supabase.from('leads').select('id, converted', { count: 'exact' }).is('id', 'not.null'),
      ])
      if (sess.error) throw sess.error
      setSessions((sess.data ?? []) as ChatbotSession[])
      const leads = (nonBot.data ?? []) as { converted: boolean | null }[]
      const total = leads.length
      const conv = leads.filter(l => l.converted).length
      setNonChatbotConvRate(ratio(conv, total))
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const stats = useMemo(() => {
    const count = sessions.length
    const totalMessages = sessions.reduce((s, r) => s + (r.message_count ?? 0), 0)
    const handoffs = sessions.filter(s => s.lead_captured).length
    const converted = sessions.filter(s => s.converted).length
    return {
      count,
      avgMessages: count ? totalMessages / count : 0,
      handoffRate: ratio(handoffs, count),
      convRate: ratio(converted, count),
    }
  }, [sessions])

  const topQuestions = useMemo(() => {
    const map = new Map<string, { q: string; count: number; conv: number }>()
    sessions.forEach(s => {
      if (!s.top_question) return
      const cur = map.get(s.top_question) ?? { q: s.top_question, count: 0, conv: 0 }
      cur.count += 1
      if (s.converted) cur.conv += 1
      map.set(s.top_question, cur)
    })
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(q => ({ ...q, convRate: ratio(q.conv, q.count) }))
  }, [sessions])

  const openings = useMemo(() => {
    const map = new Map<string, { msg: string; count: number; submits: number }>()
    sessions.forEach(s => {
      if (!s.opening_message) return
      const cur = map.get(s.opening_message) ?? { msg: s.opening_message, count: 0, submits: 0 }
      cur.count += 1
      if (s.lead_captured) cur.submits += 1
      map.set(s.opening_message, cur)
    })
    return Array.from(map.values())
      .map(o => ({ ...o, rate: ratio(o.submits, o.count) }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5)
  }, [sessions])

  const maxQ = topQuestions[0]?.count ?? 1

  return (
    <Layout title="Chatbot Analytics" subtitle="Conversational funnel · top questions · best openings">
      {error && <ErrorState message={error} onRetry={fetchAll} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Conversations Started" value={formatNumber(stats.count)} />
            <StatCard label="Avg Messages" value={stats.avgMessages.toFixed(1)} accent="gold" />
            <StatCard label="Form Handoff Rate" value={formatPct(stats.handoffRate)} accent="success" />
            <StatCard
              label="Chatbot Conv Rate"
              value={formatPct(stats.convRate)}
              accent={stats.convRate > nonChatbotConvRate ? 'success' : 'warning'}
              delta={nonChatbotConvRate ? (stats.convRate - nonChatbotConvRate) / nonChatbotConvRate : null}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-6">
        <Section title="Top Questions" subtitle="Ranked by frequency · with downstream conv">
          {loading ? (
            <SkeletonRows rows={6} cols={3} />
          ) : topQuestions.length === 0 ? (
            <EmptyState message="No chatbot sessions logged yet." />
          ) : (
            <ol className="space-y-2">
              {topQuestions.map((q, i) => (
                <li key={i} className="hud-card p-3">
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-gold w-6">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/90 truncate">{q.q}</div>
                      <div className="mt-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan rounded-full" style={{ width: `${(q.count / maxQ) * 100}%` }} />
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-heading text-cyan">{formatNumber(q.count)}</div>
                      <div className="text-success">{formatPct(q.convRate)} conv</div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Best Opening Message" subtitle="Quick reply → form submit rate">
          {loading ? (
            <SkeletonChart />
          ) : openings.length === 0 ? (
            <EmptyState message="No opening message data yet." />
          ) : (
            <ChartFrame height={300}>
              <BarChart data={openings} layout="vertical" margin={{ left: 30, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                <XAxis type="number" stroke={CHART_COLORS.axis} fontSize={11} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                <YAxis type="category" dataKey="msg" stroke={CHART_COLORS.axis} fontSize={10} width={100} tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 16) + '…' : v} />
                <Tooltip {...TooltipStyle} formatter={(v: number) => formatPct(v)} />
                <Bar dataKey="rate" fill={CHART_COLORS.gold} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="rate" position="right" fill="#fff" fontFamily="Rajdhani" fontSize={11} formatter={(v: number) => formatPct(v)} />
                </Bar>
              </BarChart>
            </ChartFrame>
          )}
        </Section>
      </div>

      <Section title="Conversation Log" subtitle="Click row to expand full transcript" className="mt-6" noPadding>
        {loading ? (
          <SkeletonRows rows={6} cols={6} />
        ) : sessions.length === 0 ? (
          <EmptyState message="Chatbot conversations will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="hud-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Timestamp</th>
                  <th>Domain</th>
                  <th className="text-right">Messages</th>
                  <th className="text-center">Lead Captured</th>
                  <th className="text-center">Converted</th>
                  <th className="text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 100).map(s => {
                  const open = expanded === s.id
                  return (
                    <>
                      <tr key={s.id} className="cursor-pointer" onClick={() => setExpanded(open ? null : s.id)}>
                        <td className="w-6">{open ? <ChevronDown className="w-4 h-4 text-cyan" /> : <ChevronRight className="w-4 h-4 text-white/40" />}</td>
                        <td className="text-white/70 whitespace-nowrap">{dateTime(s.started_at)}</td>
                        <td className="text-cyan">{s.domain ?? '—'}</td>
                        <td className="text-right">{s.message_count ?? 0}</td>
                        <td className="text-center">{s.lead_captured ? <Badge variant="cyan">Yes</Badge> : <span className="text-white/30">—</span>}</td>
                        <td className="text-center">{s.converted ? <Badge variant="success">Yes</Badge> : <span className="text-white/30">—</span>}</td>
                        <td className="text-right">{s.duration_sec ?? 0}s</td>
                      </tr>
                      {open && (
                        <tr key={s.id + '-x'}>
                          <td colSpan={7} className="bg-bg/50">
                            <pre className="text-xs text-white/70 whitespace-pre-wrap p-3 max-h-96 overflow-auto">{JSON.stringify(s.conversation_log ?? {}, null, 2)}</pre>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </Layout>
  )
}
