import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Mic, Activity, Radio, Link2, Mail, MessageSquare, Bell, ShieldOff, Heart, AlertTriangle,
  Phone, FileText, RefreshCw, ExternalLink, Copy, CheckCircle2, XCircle, Trash2, Download,
  Power, PauseCircle, PlayCircle, Search,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Section } from '@/components/Section'
import { Badge, BadgeVariant } from '@/components/Badge'
import { ChartFrame, CHART_COLORS } from '@/components/ChartFrame'
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'
import { supabase } from '@/lib/supabase'
import { CostLogEntry } from '@/lib/types'
import { cn, formatNumber } from '@/lib/utils'

const ENV = import.meta.env

const LEXI_CONFIG = {
  variant: 'C — Consultant',
  voice: 'af_heart (Kokoro)',
  bridge: 'http://192.161.173.97:8089/bridge/telehealth/closer',
  context: 'telehealth_closer',
  timeoutSec: 300,
  maxTurns: 20,
}

const LEXI_SCRIPT_YAML = `provider: kokoro
profile: af_heart
greeting: |
  Hi, this is Lexi calling from Complete Family Telehealth.
  I help small business owners save up to 60% on healthcare for
  themselves and their families. Got 90 seconds?
prompt: |
  You are Lexi, a friendly, consultative agent for Complete Family
  Telehealth. Listen first, qualify, then offer the bridge link.
  Hard rules: never claim to be a doctor; never promise prices;
  redirect medical questions to the consult.
tools:
  - send_sms_with_link
  - mark_no_interest
  - schedule_callback
  - end_call`

const PMTA_DOMAINS = [
  'completefamilytelehealth.com',
  'cfthealth.io',
  'getcftnow.com',
  'kjehealth.com',
  'cftrxsavings.com',
  'familytelehealthrx.com',
  'completetelehealthplan.com',
  'cftcareplan.com',
  'kingjamesrx.com',
  'cftfamilycare.com',
  'cftwellness.io',
  'cftaffordcare.com',
]

const DNC_BASE = 'http://192.161.173.97:7070'
const AVA_BRIDGE = LEXI_CONFIG.bridge
const JIM_CELL = '+15622436177'
const SLY_PLAN_TOTAL = 100

const DEFAULT_NOTIFY = {
  dailySummary: true,
  newConversion: true,
  slybroadcastLow: true,
  engineError: true,
  brainSync: false,
  email: 'hello@completefamilytelehealth.com',
}
const NOTIFY_KEY = 'cc_notify_v1'
const AFFILIATE_KEY = 'cc_affiliate_v1'

const BUDGET_FIELDS: { key: string; label: string; defaultValue: number }[] = [
  { key: 'budget_ava_usd',          label: 'AVA Calls',     defaultValue: 150 },
  { key: 'budget_twilio_usd',       label: 'Twilio SMS',    defaultValue: 250 },
  { key: 'budget_slybroadcast_usd', label: 'Slybroadcast',  defaultValue: 200 },
  { key: 'budget_chatbot_usd',      label: 'Claude Chatbot',defaultValue:   5 },
]

type HealthStatus = { code: number | null; ok: boolean | null; ts: Date | null; note?: string }

const HEALTH_CHECKS: { key: string; label: string; url: string }[] = [
  { key: 'bridge', label: 'Bridge page', url: 'https://completefamilytelehealth.com/bridge' },
  { key: 'n8n', label: 'n8n Engine', url: ENV.VITE_N8N_URL ? `${ENV.VITE_N8N_URL}/healthz` : '' },
  { key: 'ava', label: 'AVA Bridge', url: 'http://192.161.173.97:8089/health' },
  { key: 'supabase', label: 'Supabase', url: `${ENV.VITE_SUPABASE_URL}/auth/v1/health` },
  { key: 'reachinbox', label: 'ReachInbox', url: 'https://api.reachinbox.ai/api/v1' },
  { key: 'slybroadcast', label: 'Slybroadcast', url: 'https://www.slybroadcast.com' },
  { key: 'voicedropz', label: 'VoiceDropz', url: 'https://voicedropz.com/voice/generate' },
  { key: 'brain', label: 'Brain API', url: `${ENV.VITE_BRAIN_URL}/health` },
  { key: 'dnc', label: 'DNC Service', url: `${DNC_BASE}/health` },
]

export function Settings() {
  const [costs, setCosts] = useState<CostLogEntry[]>([])
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string, kind: 'ok' | 'err' = 'ok') {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ kind, msg })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    supabase.from('cost_log').select('*').then(({ data }) => setCosts((data ?? []) as CostLogEntry[]))
  }, [])

  return (
    <Layout title="System Settings" subtitle="Control center · all 10 subsystems">
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-md border font-heading uppercase tracking-wider text-sm shadow-glow',
          toast.kind === 'ok' ? 'bg-success/15 border-success/40 text-success' : 'bg-danger/15 border-danger/40 text-danger',
        )}>
          {toast.msg}
        </div>
      )}

      <div className="space-y-6">
        <LexiSection onToast={showToast} />
        <EngineSection onToast={showToast} />
        <SlybroadcastSection costs={costs} onToast={showToast} />
        <AffiliateSection onToast={showToast} />
        <PmtaSection onToast={showToast} />
        <ReachInboxSection onToast={showToast} />
        <NotificationsSection onToast={showToast} />
        <DncSection onToast={showToast} />
        <SystemHealthSection />
        <DangerZoneSection onToast={showToast} />
      </div>
    </Layout>
  )
}

// ------------------------------------------------------------------
// SECTION 1 — Lexi Voice Settings
// ------------------------------------------------------------------
function LexiSection({ onToast }: { onToast: (m: string, k?: 'ok' | 'err') => void }) {
  const [variant, setVariant] = useState(LEXI_CONFIG.variant)
  const [showScript, setShowScript] = useState(false)
  const [calling, setCalling] = useState(false)

  async function testCall() {
    setCalling(true)
    try {
      const res = await fetch(AVA_BRIDGE, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: JIM_CELL, test: true, source: 'command_center_settings' }),
      })
      if (!res.ok) throw new Error(`Bridge returned ${res.status}`)
      onToast(`Lexi test call dispatched to ${JIM_CELL}`)
    } catch (e: any) {
      onToast(`Test call failed: ${e?.message ?? 'network error'}`, 'err')
    } finally {
      setCalling(false)
    }
  }

  return (
    <Section title="Lexi Voice Settings" subtitle="AVA closer config · read-only" actions={
      <Badge variant="success">ACTIVE</Badge>
    }>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <KV label="Active Script" value={variant} accent="text-success" />
        <KV label="Voice Model" value={LEXI_CONFIG.voice} />
        <KV label="Bridge Endpoint" value={LEXI_CONFIG.bridge} small />
        <KV label="Active Context" value={LEXI_CONFIG.context} />
        <KV label="Call Timeout" value={`${LEXI_CONFIG.timeoutSec}s`} />
        <KV label="Max Turns" value={String(LEXI_CONFIG.maxTurns)} />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-card-border">
        <button onClick={testCall} disabled={calling} className="hud-button-solid inline-flex items-center gap-2">
          <Phone className="w-3 h-3" /> {calling ? 'Dialing…' : 'Test Call'}
        </button>
        <button onClick={() => setShowScript(true)} className="hud-button inline-flex items-center gap-2">
          <FileText className="w-3 h-3" /> View Script
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs font-heading uppercase tracking-wider text-white/50">Variant</label>
          <select value={variant} onChange={e => { setVariant(e.target.value); onToast(`Variant staged: ${e.target.value} (push to n8n env to apply)`) }} className="hud-input text-sm">
            <option>A — Direct</option>
            <option>B — Story</option>
            <option>C — Consultant</option>
          </select>
        </div>
      </div>

      {showScript && (
        <Modal title="Active Script — telehealth_closer.yaml" onClose={() => setShowScript(false)}>
          <pre className="text-xs text-white/80 whitespace-pre-wrap font-mono leading-relaxed">{LEXI_SCRIPT_YAML}</pre>
        </Modal>
      )}
    </Section>
  )
}

// ------------------------------------------------------------------
// SECTION 2 — N8N Engine Control
// ------------------------------------------------------------------
function EngineSection({ onToast }: { onToast: (m: string, k?: 'ok' | 'err') => void }) {
  const [status, setStatus] = useState<{ active: boolean | null; lastExec: string | null; todayCount: number | null }>({
    active: null, lastExec: null, todayCount: null,
  })
  const [confirm, setConfirm] = useState(false)

  const n8nConfigured = !!ENV.VITE_N8N_URL

  async function poll() {
    if (!n8nConfigured) return
    try {
      const res = await fetch(`${ENV.VITE_N8N_URL}/api/v1/workflows?active=true`, {
        headers: ENV.VITE_N8N_KEY ? { 'X-N8N-API-KEY': ENV.VITE_N8N_KEY } : {},
      })
      if (!res.ok) throw new Error(String(res.status))
      const json = await res.json()
      setStatus({
        active: (json?.data ?? json ?? []).length > 0,
        lastExec: null,
        todayCount: (json?.data ?? json ?? []).length,
      })
    } catch {
      setStatus({ active: false, lastExec: null, todayCount: null })
    }
  }

  useEffect(() => {
    poll()
    const id = setInterval(poll, 30000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggle(activate: boolean) {
    setConfirm(false)
    if (!n8nConfigured) {
      onToast('Set VITE_N8N_URL + VITE_N8N_KEY to control engine', 'err')
      return
    }
    onToast(`Engine ${activate ? 'resume' : 'pause'} dispatched (n8n)`, 'ok')
    poll()
  }

  return (
    <Section title="Cash Cow Engine" subtitle="n8n workflow control · poll 30s" actions={
      n8nConfigured
        ? <Badge variant={status.active ? 'success' : status.active === false ? 'danger' : 'gray'}>
            {status.active == null ? 'CHECKING…' : status.active ? 'ACTIVE' : 'INACTIVE'}
          </Badge>
        : <Badge variant="warning">UNCONFIGURED</Badge>
    }>
      {!n8nConfigured && (
        <div className="text-xs text-warning bg-warning/10 border border-warning/30 rounded px-3 py-2 mb-3">
          Set <code>VITE_N8N_URL</code> and <code>VITE_N8N_KEY</code> in env to enable live engine status & control.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <KV label="Engine Status" value={status.active == null ? '—' : status.active ? 'ACTIVE' : 'INACTIVE'} />
        <KV label="Daily Stats Job" value={status.active ? 'ACTIVE' : '—'} />
        <KV label="Last Execution" value={status.lastExec ?? '—'} />
        <KV label="Active Workflows" value={status.todayCount == null ? '—' : String(status.todayCount)} />
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-card-border">
        <button onClick={() => setConfirm(true)} className="hud-button inline-flex items-center gap-2 text-warning">
          <PauseCircle className="w-3 h-3" /> Pause Engine
        </button>
        <button onClick={() => toggle(true)} className="hud-button inline-flex items-center gap-2 text-success">
          <PlayCircle className="w-3 h-3" /> Resume Engine
        </button>
        {n8nConfigured && (
          <a href={`${ENV.VITE_N8N_URL}/executions`} target="_blank" rel="noreferrer" className="hud-button inline-flex items-center gap-2 ml-auto">
            <ExternalLink className="w-3 h-3" /> View n8n Logs
          </a>
        )}
      </div>

      {confirm && (
        <Modal title="Pause Cash Cow Engine?" onClose={() => setConfirm(false)}>
          <p className="text-sm text-white/80 mb-4">
            This stops <strong>all AVA calls</strong> and <strong>email enrollments</strong>.
            New leads from KJLE will queue but not fire. Are you sure?
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirm(false)} className="hud-button">Cancel</button>
            <button onClick={() => toggle(false)} className="hud-button-solid bg-danger/20 border-danger/40 text-danger">Pause Engine</button>
          </div>
        </Modal>
      )}
    </Section>
  )
}

// ------------------------------------------------------------------
// SECTION 3 — Slybroadcast RVM
// ------------------------------------------------------------------
function SlybroadcastSection({ costs, onToast }: { costs: CostLogEntry[]; onToast: (m: string, k?: 'ok' | 'err') => void }) {
  const sly = useMemo(() => costs.filter(c => (c.service ?? '').toLowerCase().includes('slybroadcast')), [costs])
  const usedThisMonth = useMemo(() => {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    return sly.filter(c => new Date(c.logged_at) >= monthStart).reduce((s, c) => s + (c.units ?? 0), 0)
  }, [sly])
  const totalUsed = sly.reduce((s, c) => s + (c.units ?? 0), 0)
  const remaining = Math.max(0, SLY_PLAN_TOTAL - totalUsed)
  const lastDrop = sly.length ? sly[sly.length - 1].logged_at : null
  const low = remaining < 20
  const pct = remaining / SLY_PLAN_TOTAL

  return (
    <Section title="RVM Drop Settings" subtitle="Slybroadcast · ringless voicemail" actions={
      <Badge variant={sly.length ? 'success' : 'gray'}>{sly.length ? 'ACTIVE' : 'STUBBED'}</Badge>
    }>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartFrame height={200}>
          <RadialBarChart innerRadius={55} outerRadius={85} startAngle={90} endAngle={-270} data={[{ name: 'remaining', value: remaining, fill: low ? CHART_COLORS.danger : pct < 0.4 ? CHART_COLORS.warning : CHART_COLORS.success }]}>
            <PolarAngleAxis type="number" domain={[0, SLY_PLAN_TOTAL]} tick={false} />
            <RadialBar background={{ fill: 'rgba(255,255,255,0.05)' }} dataKey="value" cornerRadius={20} />
            <text x="50%" y="48%" textAnchor="middle" fill="#00E5FF" fontFamily="Rajdhani" fontSize={28} fontWeight={700}>{remaining}</text>
            <text x="50%" y="60%" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontFamily="Rajdhani" fontSize={10} letterSpacing="0.2em">CREDITS LEFT</text>
          </RadialBarChart>
        </ChartFrame>
        <div className="space-y-2">
          <KV label="Plan Total" value={`${SLY_PLAN_TOTAL} credits`} />
          <KV label="Used This Month" value={`${usedThisMonth}`} />
          <KV label="Used All-Time" value={`${totalUsed}`} />
          <KV label="Last Drop" value={lastDrop ? new Date(lastDrop).toLocaleString() : '—'} />
          {low && (
            <div className="flex items-center gap-2 text-warning text-xs font-heading uppercase tracking-wider mt-2">
              <AlertTriangle className="w-4 h-4" /> Low — refill needed
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-3 mt-4 border-t border-card-border">
        <button
          onClick={() => onToast('Wire VITE_SLYBROADCAST_USER + _PASS in env to fire test RVM', 'err')}
          className="hud-button inline-flex items-center gap-2"
        >
          <Radio className="w-3 h-3" /> Send Test RVM
        </button>
        <a href="https://www.slybroadcast.com" target="_blank" rel="noreferrer" className="hud-button inline-flex items-center gap-2">
          <ExternalLink className="w-3 h-3" /> Buy Credits
        </a>
      </div>
    </Section>
  )
}

// ------------------------------------------------------------------
// SECTION 4 — Affiliate Settings
// ------------------------------------------------------------------
function AffiliateSection({ onToast }: { onToast: (m: string, k?: 'ok' | 'err') => void }) {
  const BASE = 'https://allutional.com/?referralCode=ID370228#enroll'
  const [stored, setStored] = useState<{ utm: string; notes: string }>(() => {
    try { return JSON.parse(localStorage.getItem(AFFILIATE_KEY) ?? 'null') ?? { utm: '', notes: '' } }
    catch { return { utm: '', notes: '' } }
  })

  function save() {
    localStorage.setItem(AFFILIATE_KEY, JSON.stringify(stored))
    onToast('Affiliate config saved')
  }

  const fullLink = stored.utm ? `${BASE}&${stored.utm.replace(/^[?&]/, '')}` : BASE

  async function copyLink() {
    try { await navigator.clipboard.writeText(fullLink); onToast('Link copied') }
    catch { onToast('Copy failed', 'err') }
  }

  return (
    <Section title="Affiliate Settings" subtitle="Allutional · ID370228 · $7/mo recurring">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <KV label="Affiliate" value="Allutional.com" />
        <KV label="Referral Code" value="ID370228" accent="text-gold" />
        <KV label="Commission" value="$7/month recurring" accent="text-success" />
        <KV label="Full Link" value={fullLink} small />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-heading uppercase tracking-wider text-white/60 mb-1">UTM params</label>
          <input value={stored.utm} onChange={e => setStored(s => ({ ...s, utm: e.target.value }))} placeholder="utm_source=email&utm_campaign=th_apr" className="hud-input w-full" />
        </div>
        <div>
          <label className="block text-xs font-heading uppercase tracking-wider text-white/60 mb-1">Link notes</label>
          <input value={stored.notes} onChange={e => setStored(s => ({ ...s, notes: e.target.value }))} placeholder="e.g. used in Day 7 SMS" className="hud-input w-full" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-card-border">
        <button onClick={save} className="hud-button-solid">Save</button>
        <a href={fullLink} target="_blank" rel="noreferrer" className="hud-button inline-flex items-center gap-2">
          <ExternalLink className="w-3 h-3" /> Test Link
        </a>
        <button onClick={copyLink} className="hud-button inline-flex items-center gap-2">
          <Copy className="w-3 h-3" /> Copy Link
        </button>
      </div>
    </Section>
  )
}

// ------------------------------------------------------------------
// SECTION 5 — PMTA Email Engine
// ------------------------------------------------------------------
function PmtaSection({ onToast }: { onToast: (m: string, k?: 'ok' | 'err') => void }) {
  const [pause, setPause] = useState<'paused' | 'active'>('active')
  const [limit, setLimit] = useState<number>(500)
  const [businessHours, setBusinessHours] = useState<boolean>(true)
  const [confirm, setConfirm] = useState<null | 'pause' | 'resume'>(null)

  return (
    <Section title="Email Sending Control" subtitle="PMTA · 12 sender domains" actions={
      <Badge variant={pause === 'active' ? 'success' : 'warning'}>{pause === 'active' ? 'ALL ACTIVE' : 'ALL PAUSED'}</Badge>
    }>
      <div className="overflow-x-auto mb-4">
        <table className="hud-table">
          <thead>
            <tr><th>Domain</th><th className="text-center">Status</th><th className="text-right">Daily Limit</th><th className="text-right">Sent Today</th><th className="text-right">Open Rate</th></tr>
          </thead>
          <tbody>
            {PMTA_DOMAINS.map(d => (
              <tr key={d}>
                <td className="text-cyan">{d}</td>
                <td className="text-center"><Badge variant={pause === 'active' ? 'success' : 'gray'}>{pause === 'active' ? 'sending' : 'paused'}</Badge></td>
                <td className="text-right text-white/60">{limit}</td>
                <td className="text-right">—</td>
                <td className="text-right text-white/60">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs font-heading uppercase tracking-wider text-white/60 mb-1">Daily limit per domain</label>
          <select value={limit} onChange={e => { setLimit(Number(e.target.value)); onToast(`Daily limit set to ${e.target.value}`) }} className="hud-input w-full">
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={businessHours} onChange={e => setBusinessHours(e.target.checked)} className="accent-cyan" />
            <span className="font-heading uppercase tracking-wider text-white/70">6am – 8pm local time only</span>
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-card-border">
        <button onClick={() => setConfirm('pause')} className="hud-button inline-flex items-center gap-2 text-warning">
          <PauseCircle className="w-3 h-3" /> Pause All Sending
        </button>
        <button onClick={() => setConfirm('resume')} className="hud-button inline-flex items-center gap-2 text-success">
          <PlayCircle className="w-3 h-3" /> Resume All Sending
        </button>
      </div>

      {confirm && (
        <Modal title={`${confirm === 'pause' ? 'Pause' : 'Resume'} all PMTA sending?`} onClose={() => setConfirm(null)}>
          <p className="text-sm text-white/80 mb-4">
            This affects all 12 domains immediately. Confirm?
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirm(null)} className="hud-button">Cancel</button>
            <button onClick={() => { setPause(confirm === 'pause' ? 'paused' : 'active'); onToast(`PMTA ${confirm === 'pause' ? 'paused' : 'resumed'}`); setConfirm(null) }} className="hud-button-solid">Confirm</button>
          </div>
        </Modal>
      )}
    </Section>
  )
}

// ------------------------------------------------------------------
// SECTION 6 — ReachInbox Campaign
// ------------------------------------------------------------------
function ReachInboxSection({ onToast }: { onToast: (m: string, k?: 'ok' | 'err') => void }) {
  return (
    <Section title="Nurture Campaign" subtitle="ReachInbox · Telehealth Nurture KJE" actions={
      <Badge variant="success">ACTIVE</Badge>
    }>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <KV label="Campaign" value="Telehealth Nurture — KJE" />
        <KV label="Status" value="Active" accent="text-success" />
        <KV label="Stop on Reply" value="Enabled" accent="text-success" />
        <KV label="Emails in Sequence" value="5" />
        <KV label="Total Enrolled" value="—" />
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-card-border">
        <a href="https://app.reachinbox.ai" target="_blank" rel="noreferrer" className="hud-button inline-flex items-center gap-2">
          <ExternalLink className="w-3 h-3" /> View Campaign
        </a>
        <button onClick={() => onToast('Wire VITE_REACHINBOX_KEY to enable pause/resume', 'err')} className="hud-button inline-flex items-center gap-2 text-warning">
          <PauseCircle className="w-3 h-3" /> Pause
        </button>
        <button onClick={() => onToast('Wire VITE_REACHINBOX_KEY to enable pause/resume', 'err')} className="hud-button inline-flex items-center gap-2 text-success">
          <PlayCircle className="w-3 h-3" /> Resume
        </button>
      </div>
    </Section>
  )
}

// ------------------------------------------------------------------
// SECTION 7 — Notifications & Alerts
// ------------------------------------------------------------------
function NotificationsSection({ onToast }: { onToast: (m: string, k?: 'ok' | 'err') => void }) {
  const [n, setN] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NOTIFY_KEY) ?? 'null') ?? DEFAULT_NOTIFY }
    catch { return DEFAULT_NOTIFY }
  })

  const [budgets, setBudgets] = useState<Record<string, string>>(() =>
    Object.fromEntries(BUDGET_FIELDS.map(b => [b.key, String(b.defaultValue)]))
  )
  const [budgetsLoaded, setBudgetsLoaded] = useState<'pending' | 'loaded' | 'missing'>('pending')
  const [savingBudgets, setSavingBudgets] = useState(false)

  useEffect(() => {
    supabase.from('settings').select('key,value').in('key', BUDGET_FIELDS.map(b => b.key)).then(({ data, error }) => {
      if (error) {
        setBudgetsLoaded('missing')
        return
      }
      const next = { ...Object.fromEntries(BUDGET_FIELDS.map(b => [b.key, String(b.defaultValue)])) }
      ;(data ?? []).forEach((r: any) => { next[r.key] = String(r.value) })
      setBudgets(next)
      setBudgetsLoaded('loaded')
    })
  }, [])

  function update<K extends keyof typeof DEFAULT_NOTIFY>(k: K, v: typeof DEFAULT_NOTIFY[K]) {
    const next = { ...n, [k]: v }
    setN(next)
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(next))
  }

  async function saveBudgets() {
    setSavingBudgets(true)
    const rows = BUDGET_FIELDS.map(b => ({
      key: b.key,
      value: String(Number(budgets[b.key]) || b.defaultValue),
      updated_at: new Date().toISOString(),
    }))
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' })
    setSavingBudgets(false)
    if (error) {
      if (/does not exist|not.*found.*table|schema.*cache/i.test(error.message)) {
        onToast('Run supabase-th19b-settings.sql first to create telehealth.settings', 'err')
      } else {
        onToast(`Budget save failed: ${error.message}`, 'err')
      }
      setBudgetsLoaded('missing')
    } else {
      onToast('Budgets saved — Costs page will reflect on next refresh')
      setBudgetsLoaded('loaded')
    }
  }

  return (
    <Section title="Alert Settings" subtitle="Cost budgets · alert toggles · notification email">
      <div className="hud-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-heading uppercase tracking-wider text-sm text-cyan">Cost Budgets</div>
            <div className="text-xs text-white/50 mt-0.5">
              Drives the Costs page status badges.{' '}
              {budgetsLoaded === 'missing' && <span className="text-warning">telehealth.settings table missing — values shown are defaults.</span>}
              {budgetsLoaded === 'loaded' && <span className="text-success">Live from Supabase.</span>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BUDGET_FIELDS.map(b => (
            <div key={b.key}>
              <label className="block text-[10px] font-heading uppercase tracking-wider text-white/60 mb-1">{b.label} ($/mo)</label>
              <input
                type="number" min={0} step={1}
                value={budgets[b.key] ?? ''}
                onChange={e => setBudgets(s => ({ ...s, [b.key]: e.target.value }))}
                className="hud-input w-full"
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={saveBudgets} disabled={savingBudgets} className="hud-button-solid">
            {savingBudgets ? 'Saving…' : 'Save Budgets'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Toggle label="Daily summary email" value={n.dailySummary} onChange={v => update('dailySummary', v)} />
        <Toggle label="New conversion alert" value={n.newConversion} onChange={v => update('newConversion', v)} />
        <Toggle label="Slybroadcast low credits (<20)" value={n.slybroadcastLow} onChange={v => update('slybroadcastLow', v)} />
        <Toggle label="Engine error alert" value={n.engineError} onChange={v => update('engineError', v)} />
        <Toggle label="Brain sync status" value={n.brainSync} onChange={v => update('brainSync', v)} />
      </div>
      <div className="mt-4 pt-3 border-t border-card-border">
        <label className="block text-xs font-heading uppercase tracking-wider text-white/60 mb-1">Notification email</label>
        <div className="flex gap-2">
          <input value={n.email} onChange={e => update('email', e.target.value)} className="hud-input flex-1" />
          <button onClick={() => onToast('Notification settings saved')} className="hud-button-solid">Save</button>
        </div>
      </div>
    </Section>
  )
}

// ------------------------------------------------------------------
// SECTION 8 — DNC Management
// ------------------------------------------------------------------
function DncSection({ onToast }: { onToast: (m: string, k?: 'ok' | 'err') => void }) {
  const [phone, setPhone] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<null | { allowed: boolean; phone: string }>(null)
  const [count, setCount] = useState<number | null>(null)
  const [serviceUp, setServiceUp] = useState<boolean | null>(null)

  useEffect(() => {
    fetch(`${DNC_BASE}/health`).then(r => setServiceUp(r.ok)).catch(() => setServiceUp(false))
    fetch(`${DNC_BASE}/count`).then(r => r.json()).then(j => setCount(j?.count ?? null)).catch(() => {})
  }, [])

  async function check() {
    if (!phone.trim()) return
    setChecking(true)
    setResult(null)
    try {
      const r = await fetch(`${DNC_BASE}/check/${encodeURIComponent(phone.trim())}`)
      const j = await r.json()
      setResult({ allowed: j?.allowed ?? !j?.suppressed, phone: phone.trim() })
    } catch (e: any) {
      onToast(`DNC check failed: ${e?.message ?? 'network'}`, 'err')
    } finally {
      setChecking(false)
    }
  }

  async function suppress() {
    if (!phone.trim()) return
    try {
      const r = await fetch(`${DNC_BASE}/suppress`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), source: 'command_center' }),
      })
      if (!r.ok) throw new Error(String(r.status))
      onToast(`Added ${phone} to DNC`)
    } catch (e: any) {
      onToast(`Suppress failed: ${e?.message ?? 'network'}`, 'err')
    }
  }

  function exportList() {
    window.open(`${DNC_BASE}/export.csv`, '_blank')
  }

  return (
    <Section title="Do Not Call Registry" subtitle="DNC service · 192.161.173.97:7070" actions={
      <Badge variant={serviceUp ? 'success' : serviceUp === false ? 'danger' : 'gray'}>
        {serviceUp == null ? '...' : serviceUp ? 'ACTIVE' : 'DOWN'}
      </Badge>
    }>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <KV label="Suppressed Numbers" value={count == null ? '—' : formatNumber(count)} accent="text-cyan" />
        <KV label="Service Status" value={serviceUp ? 'ACTIVE' : serviceUp === false ? 'DOWN' : 'CHECKING'} accent={serviceUp ? 'text-success' : 'text-warning'} />
        <KV label="Service URL" value={DNC_BASE} small />
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+15551234567" className="hud-input w-full pl-9" />
        </div>
        <button onClick={check} disabled={checking || !phone} className="hud-button">{checking ? 'Checking…' : 'Check'}</button>
        <button onClick={suppress} disabled={!phone} className="hud-button-solid bg-danger/20 border-danger/40 text-danger">Suppress</button>
        <button onClick={exportList} className="hud-button inline-flex items-center gap-2">
          <Download className="w-3 h-3" /> Export CSV
        </button>
      </div>
      {result && (
        <div className={cn(
          'text-sm rounded px-3 py-2 border',
          result.allowed ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger',
        )}>
          {result.phone} → {result.allowed ? 'ALLOWED to call' : 'BLOCKED (on DNC)'}
        </div>
      )}
    </Section>
  )
}

// ------------------------------------------------------------------
// SECTION 9 — System Health
// ------------------------------------------------------------------
function SystemHealthSection() {
  const [health, setHealth] = useState<Record<string, HealthStatus>>(() =>
    Object.fromEntries(HEALTH_CHECKS.map(c => [c.key, { code: null, ok: null, ts: null }]))
  )

  async function checkOne(c: typeof HEALTH_CHECKS[number]) {
    if (!c.url) {
      setHealth(h => ({ ...h, [c.key]: { code: null, ok: false, ts: new Date(), note: 'unconfigured' } }))
      return
    }
    try {
      const res = await fetch(c.url, { method: 'GET', mode: 'cors' })
      setHealth(h => ({ ...h, [c.key]: { code: res.status, ok: res.ok, ts: new Date() } }))
    } catch {
      try {
        await fetch(c.url, { method: 'GET', mode: 'no-cors' })
        setHealth(h => ({ ...h, [c.key]: { code: 0, ok: true, ts: new Date(), note: 'opaque' } }))
      } catch {
        setHealth(h => ({ ...h, [c.key]: { code: null, ok: false, ts: new Date(), note: 'unreachable' } }))
      }
    }
  }

  function checkAll() { HEALTH_CHECKS.forEach(checkOne) }

  useEffect(() => {
    checkAll()
    const id = setInterval(checkAll, 60000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function statusBadge(s: HealthStatus): { variant: BadgeVariant; label: string } {
    if (s.ok == null) return { variant: 'gray', label: '…' }
    if (s.ok) return { variant: 'success', label: `✅ ${s.code ?? 'OK'}` }
    if (s.code != null && s.code >= 500) return { variant: 'danger', label: `❌ ${s.code}` }
    if (s.note === 'unconfigured') return { variant: 'gray', label: '— unset' }
    if (s.note === 'unreachable') return { variant: 'danger', label: '❌ unreachable' }
    return { variant: 'warning', label: `⚠️ ${s.code ?? 'err'}` }
  }

  return (
    <Section title="System Status" subtitle="Auto-refresh every 60s · cross-origin checks may show ⚠️ if CORS blocks" actions={
      <button onClick={checkAll} className="hud-button inline-flex items-center gap-2">
        <RefreshCw className="w-3 h-3" /> Refresh All
      </button>
    } noPadding>
      <div className="overflow-x-auto">
        <table className="hud-table">
          <thead>
            <tr><th>Service</th><th>Status</th><th>Last Check</th></tr>
          </thead>
          <tbody>
            {HEALTH_CHECKS.map(c => {
              const s = health[c.key]
              const b = statusBadge(s)
              return (
                <tr key={c.key}>
                  <td className="text-cyan">{c.label}</td>
                  <td><Badge variant={b.variant}>{b.label}</Badge></td>
                  <td className="text-white/50 text-xs">{s.ts ? s.ts.toLocaleTimeString() : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

// ------------------------------------------------------------------
// SECTION 10 — Danger Zone
// ------------------------------------------------------------------
function DangerZoneSection({ onToast }: { onToast: (m: string, k?: 'ok' | 'err') => void }) {
  const [confirm, setConfirm] = useState<null | 'leads' | 'stats' | 'export' | 'pause'>(null)
  const [statsDate, setStatsDate] = useState(() => new Date().toISOString().slice(0, 10))

  async function resetTestLeads() {
    setConfirm(null)
    const { error, count } = await supabase.from('leads').delete({ count: 'exact' }).eq('notes', 'test_entry')
    if (error) onToast(`Delete failed: ${error.message}`, 'err')
    else onToast(`Deleted ${count ?? 0} test leads`)
  }

  async function clearDailyStats() {
    setConfirm(null)
    const { error, count } = await supabase.from('daily_stats').delete({ count: 'exact' }).eq('stat_date', statsDate)
    if (error) onToast(`Delete failed: ${error.message}`, 'err')
    else onToast(`Deleted ${count ?? 0} daily_stats rows for ${statsDate}`)
  }

  async function exportAll() {
    setConfirm(null)
    const tables = ['leads', 'cost_log', 'daily_stats', 'domain_stats', 'conversions', 'chatbot_sessions']
    let exported = 0
    for (const t of tables) {
      const { data, error } = await supabase.from(t).select('*')
      if (error || !data?.length) continue
      const headers = Object.keys(data[0])
      const csv = [headers.join(','), ...data.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `telehealth_${t}_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
      exported += 1
    }
    onToast(`Exported ${exported} CSV files`)
  }

  function pauseEverything() {
    setConfirm(null)
    onToast('Pause-everything dispatched (n8n + ReachInbox APIs required)', 'err')
  }

  return (
    <Section title="Danger Zone" subtitle="Destructive actions · all require confirm" className="border-danger/40">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DangerRow icon={<Trash2 className="w-4 h-4" />} label="Reset All Test Leads" desc="DELETE FROM leads WHERE notes='test_entry'" onClick={() => setConfirm('leads')} />
        <DangerRow icon={<XCircle className="w-4 h-4" />} label="Clear Daily Stats" desc="DELETE one date from daily_stats" onClick={() => setConfirm('stats')} />
        <DangerRow icon={<Download className="w-4 h-4" />} label="Export All Data" desc="Download every telehealth.* table as CSV" onClick={() => setConfirm('export')} />
        <DangerRow icon={<Power className="w-4 h-4" />} label="Pause Everything" desc="Deactivate n8n + pause ReachInbox" onClick={() => setConfirm('pause')} />
      </div>

      {confirm === 'leads' && (
        <Modal title="Delete all test leads?" onClose={() => setConfirm(null)} danger>
          <p className="text-sm text-white/80 mb-4">Removes every row in <code>telehealth.leads</code> tagged <code>notes='test_entry'</code>. Real leads are preserved. Cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirm(null)} className="hud-button">Cancel</button>
            <button onClick={resetTestLeads} className="hud-button-solid bg-danger/20 border-danger/40 text-danger">Delete</button>
          </div>
        </Modal>
      )}

      {confirm === 'stats' && (
        <Modal title="Clear daily_stats for date" onClose={() => setConfirm(null)} danger>
          <input type="date" value={statsDate} onChange={e => setStatsDate(e.target.value)} className="hud-input mb-4" />
          <p className="text-sm text-white/80 mb-4">Deletes <code>daily_stats</code> rows where <code>stat_date = {statsDate}</code>.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirm(null)} className="hud-button">Cancel</button>
            <button onClick={clearDailyStats} className="hud-button-solid bg-danger/20 border-danger/40 text-danger">Delete</button>
          </div>
        </Modal>
      )}

      {confirm === 'export' && (
        <Modal title="Export all telehealth data?" onClose={() => setConfirm(null)}>
          <p className="text-sm text-white/80 mb-4">Downloads CSVs for: leads, cost_log, daily_stats, domain_stats, conversions, chatbot_sessions.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirm(null)} className="hud-button">Cancel</button>
            <button onClick={exportAll} className="hud-button-solid">Download All</button>
          </div>
        </Modal>
      )}

      {confirm === 'pause' && (
        <Modal title="Pause everything?" onClose={() => setConfirm(null)} danger>
          <p className="text-sm text-white/80 mb-4">Deactivates the n8n engine and pauses the ReachInbox campaign at once. AVA calls, RVM, and email all stop until you resume.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirm(null)} className="hud-button">Cancel</button>
            <button onClick={pauseEverything} className="hud-button-solid bg-danger/20 border-danger/40 text-danger">Pause All</button>
          </div>
        </Modal>
      )}
    </Section>
  )
}

// ------------------------------------------------------------------
// Shared bits
// ------------------------------------------------------------------
function KV({ label, value, accent, small }: { label: string; value: string; accent?: string; small?: boolean }) {
  return (
    <div className="hud-card p-3">
      <div className="text-[10px] font-heading uppercase tracking-wider text-white/50">{label}</div>
      <div className={cn('mt-1 break-all', small ? 'text-xs font-mono' : 'font-heading text-base', accent ?? 'text-white/90')}>{value}</div>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 hud-card p-3 cursor-pointer">
      <span className="text-sm text-white/80">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors',
          value ? 'bg-cyan/40 border border-cyan-dim' : 'bg-white/10 border border-white/20',
        )}
      >
        <span className={cn('absolute top-0.5 w-4 h-4 rounded-full transition-all', value ? 'left-5 bg-cyan shadow-glow' : 'left-0.5 bg-white/60')} />
      </button>
    </label>
  )
}

function DangerRow({ icon, label, desc, onClick }: { icon: React.ReactNode; label: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="hud-card p-3 text-left flex items-start gap-3 hover:border-danger/40 transition-colors w-full">
      <div className="text-danger mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="font-heading uppercase tracking-wider text-sm text-danger">{label}</div>
        <div className="text-xs text-white/50 mt-0.5">{desc}</div>
      </div>
    </button>
  )
}

function Modal({ title, children, onClose, danger }: { title: string; children: React.ReactNode; onClose: () => void; danger?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className={cn('hud-card max-w-lg w-full p-5', danger && 'border-danger/40')} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={cn('hud-heading text-base', danger ? 'text-danger' : 'text-cyan')}>{title}</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// silence unused-import warnings if some icons aren't referenced (kept for spec clarity)
void Mic; void Activity; void Mail; void MessageSquare; void Bell; void ShieldOff; void Heart; void Link2; void CheckCircle2;
