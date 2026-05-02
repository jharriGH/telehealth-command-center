import { useEffect, useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Section } from '@/components/Section'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonRows } from '@/components/LoadingSkeleton'
import { Badge, outcomeVariant } from '@/components/Badge'
import { supabase } from '@/lib/supabase'
import { CostLogEntry, Lead } from '@/lib/types'
import { dateTime, downloadCSV, formatCurrency, formatNumber } from '@/lib/utils'

const PAGE = 50
const NICHES = ['barber_shop', 'coffee_shop', 'day_care', 'food_trucks', 'pilates_studio', 'yoga_studio', 'pet_boarding_service', 'restaurant', 'salon', 'gym', 'auto_shop', 'florist']

export function CallLog() {
  const [calls, setCalls] = useState<Lead[]>([])
  const [rvms, setRvms] = useState<Lead[]>([])
  const [costs, setCosts] = useState<CostLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [outcome, setOutcome] = useState<string>('all')
  const [niche, setNiche] = useState<string>('all')
  const [convertedOnly, setConvertedOnly] = useState(false)
  const [search, setSearch] = useState('')

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const monthStart = new Date()
      monthStart.setDate(1)
      const monthStartIso = monthStart.toISOString()
      const [callsRes, rvmsRes, costsRes] = await Promise.all([
        supabase.from('leads').select('*').eq('ava_called', true).gte('ava_called_at', `${from}T00:00:00`).lte('ava_called_at', `${to}T23:59:59`).order('ava_called_at', { ascending: false }).limit(2000),
        supabase.from('leads').select('*').eq('rvm_sent', true).gte('rvm_sent_at', `${from}T00:00:00`).lte('rvm_sent_at', `${to}T23:59:59`).order('rvm_sent_at', { ascending: false }).limit(1000),
        supabase.from('cost_log').select('*').gte('logged_at', monthStartIso),
      ])
      if (callsRes.error) throw callsRes.error
      setCalls((callsRes.data ?? []) as Lead[])
      setRvms((rvmsRes.data ?? []) as Lead[])
      setCosts((costsRes.data ?? []) as CostLogEntry[])
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() /* eslint-disable-line */ }, [from, to])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return calls.filter(c => {
      if (outcome !== 'all' && c.ava_outcome !== outcome) return false
      if (niche !== 'all' && c.niche !== niche) return false
      if (convertedOnly && !c.converted) return false
      if (term && !((c.business_name ?? '').toLowerCase().includes(term))) return false
      return true
    })
  }, [calls, outcome, niche, convertedOnly, search])

  const paged = useMemo(() => filtered.slice(page * PAGE, (page + 1) * PAGE), [filtered, page])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE))

  function exportCSV() {
    const rows = filtered.map(c => ({
      timestamp: c.ava_called_at,
      business: c.business_name,
      niche: c.niche,
      phone: c.phone,
      duration_sec: c.ava_duration_sec,
      outcome: c.ava_outcome,
      sms_sent: c.sms_day7_sent || c.sms_day10_sent,
      converted: c.converted,
    }))
    downloadCSV(`ava_calls_${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const voiceCosts = useMemo(() => {
    const ava = costs.filter(c => c.service === 'ava' || c.service?.includes('ava'))
    const sly = costs.filter(c => c.service?.includes('slybroadcast'))
    const avaUnits = ava.reduce((s, c) => s + (c.units ?? 0), 0)
    const avaCost = ava.reduce((s, c) => s + (Number(c.cost_usd) || 0), 0)
    const slyUnits = sly.reduce((s, c) => s + (c.units ?? 0), 0)
    const slyCost = sly.reduce((s, c) => s + (Number(c.cost_usd) || 0), 0)
    const slyRemaining = Math.max(0, 100 - slyUnits)
    return { avaUnits, avaCost, slyUnits, slyCost, slyRemaining, total: avaCost + slyCost }
  }, [costs])

  return (
    <Layout title="Call & Voice Log" subtitle="AVA outbound calls · Slybroadcast RVM drops">
      {error && <ErrorState message={error} onRetry={fetchAll} />}

      <Section title="AVA Call Log" subtitle={`${formatNumber(filtered.length)} of ${formatNumber(calls.length)} calls`} actions={
        <button onClick={exportCSV} disabled={!filtered.length} className="hud-button inline-flex items-center gap-2">
          <Download className="w-3 h-3" /> Export CSV
        </button>
      }>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="hud-input text-sm" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="hud-input text-sm" />
          <select value={outcome} onChange={e => { setOutcome(e.target.value); setPage(0) }} className="hud-input text-sm">
            <option value="all">All Outcomes</option>
            <option value="answered">Answered</option>
            <option value="converted">Converted</option>
            <option value="no_answer">No Answer</option>
            <option value="voicemail">Voicemail</option>
            <option value="declined">Declined</option>
            <option value="busy">Busy</option>
          </select>
          <select value={niche} onChange={e => { setNiche(e.target.value); setPage(0) }} className="hud-input text-sm">
            <option value="all">All Niches</option>
            {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={convertedOnly} onChange={e => { setConvertedOnly(e.target.checked); setPage(0) }} className="accent-cyan" />
            <span className="font-heading uppercase tracking-wider text-white/60">Converted Only</span>
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} placeholder="Business..." className="hud-input text-sm w-full pl-9" />
          </div>
        </div>

        {loading ? (
          <SkeletonRows rows={8} cols={8} />
        ) : paged.length === 0 ? (
          <EmptyState message="No calls match these filters yet." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="hud-table th-table">
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[7%]" />
                  <col className="w-[7%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="th-th-left">Time</th>
                    <th className="th-th-left">Business</th>
                    <th className="th-th-left">Niche</th>
                    <th className="th-th-left">Phone</th>
                    <th className="th-th-right">Duration</th>
                    <th className="th-th-center">Outcome</th>
                    <th className="th-th-center">SMS</th>
                    <th className="th-th-center">Converted</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(c => (
                    <tr key={c.id}>
                      <td className="th-td-left text-white/70 whitespace-nowrap">{c.ava_called_at ? dateTime(c.ava_called_at) : '—'}</td>
                      <td className="th-td-left text-cyan truncate">{c.business_name ?? '—'}</td>
                      <td className="th-td-left text-white/60 truncate">{c.niche ?? '—'}</td>
                      <td className="th-td-left text-white/60 truncate">{c.phone ?? '—'}</td>
                      <td className="th-td-right">{c.ava_duration_sec ?? 0}s</td>
                      <td className="th-td-center"><Badge variant={outcomeVariant(c.ava_outcome)}>{c.ava_outcome ?? 'unknown'}</Badge></td>
                      <td className="th-td-center">{(c.sms_day7_sent || c.sms_day10_sent) ? '✓' : ''}</td>
                      <td className="th-td-center">{c.converted ? <Badge variant="success">Yes</Badge> : <span className="text-white/30">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="text-white/50">Page {page + 1} / {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="hud-button">Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="hud-button">Next</button>
              </div>
            </div>
          </>
        )}
      </Section>

      <Section title="RVM Log" subtitle="Slybroadcast ringless voicemail drops" className="mt-6">
        {loading ? (
          <SkeletonRows rows={5} cols={7} />
        ) : rvms.length === 0 ? (
          <EmptyState message="No RVM drops in this date range yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="hud-table th-table">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[26%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="th-th-left">Time</th>
                  <th className="th-th-left">Business</th>
                  <th className="th-th-left">Phone</th>
                  <th className="th-th-center">Status</th>
                  <th className="th-th-center">Delivered</th>
                  <th className="th-th-center">SMS</th>
                  <th className="th-th-center">Converted</th>
                </tr>
              </thead>
              <tbody>
                {rvms.slice(0, 100).map(r => (
                  <tr key={r.id}>
                    <td className="th-td-left text-white/70 whitespace-nowrap">{r.rvm_sent_at ? dateTime(r.rvm_sent_at) : '—'}</td>
                    <td className="th-td-left text-cyan truncate">{r.business_name ?? '—'}</td>
                    <td className="th-td-left text-white/60 truncate">{r.phone ?? '—'}</td>
                    <td className="th-td-center"><Badge variant={r.rvm_delivered ? 'success' : 'gray'}>{r.rvm_delivered ? 'sent' : 'pending'}</Badge></td>
                    <td className="th-td-center">{r.rvm_delivered ? '✓' : ''}</td>
                    <td className="th-td-center">{(r.sms_day7_sent || r.sms_day10_sent) ? '✓' : ''}</td>
                    <td className="th-td-center">{r.converted ? <Badge variant="success">Yes</Badge> : <span className="text-white/30">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Section title="AVA This Month">
          <div className="font-heading text-3xl text-cyan">{formatCurrency(voiceCosts.avaCost, 2)}</div>
          <div className="text-xs text-white/50 mt-1">{formatNumber(voiceCosts.avaUnits)} calls × $0.016</div>
        </Section>
        <Section title="Slybroadcast This Month">
          <div className="font-heading text-3xl text-gold">{formatCurrency(voiceCosts.slyCost, 2)}</div>
          <div className="text-xs text-white/50 mt-1">{formatNumber(voiceCosts.slyUnits)} drops · {formatNumber(voiceCosts.slyRemaining)} credits left</div>
        </Section>
        <Section title="Total Voice Cost">
          <div className="font-heading text-3xl text-success">{formatCurrency(voiceCosts.total, 2)}</div>
          <div className="text-xs text-white/50 mt-1">Month-to-date</div>
        </Section>
      </div>
    </Layout>
  )
}
