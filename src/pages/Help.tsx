import { useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Section } from '@/components/Section'
import { Badge } from '@/components/Badge'
import { cn } from '@/lib/utils'

const FUNNEL_STEPS: { label: string; sub: string; detail: string }[] = [
  { label: 'KJLE Leads (509K)',          sub: 'kjle-api.onrender.com',                   detail: '509,251 niche-segmented leads across 4,598 niches. Lead Finder service exports CSV by niche/state/city. New leads ingested into telehealth.leads daily via n8n.' },
  { label: 'PMTA Email · 12 domains',    sub: 'Cold sequences · niche-targeted',         detail: 'PowerMTA on the VPS sends from 12 reputation-segmented sender domains. n8n drips through per-domain :2525 smtp-listener (no <campaign> syntax). Currently STAGED — awaiting /u/ unsubscribe handler.' },
  { label: 'Bridge Page',                 sub: 'completefamilytelehealth.com',            detail: '21 niche landing pages on WordPress. WPForms ID 6 with TCPA consent. Form submit fires n8n webhook with full UTM + lead context.' },
  { label: 'n8n Cash Cow Engine',         sub: 'kj-autonomous.up.railway.app',            detail: 'Workflow ID 8bW4A5YdfJyU1Pl1. Orchestrates AVA call, ReachInbox enrollment, Day 7 RVM + SMS, Day 10 SMS. Settings → Engine Control governs pause/resume.' },
  { label: 'Lexi AVA Call (within 60s)',  sub: '192.161.173.97:8089/bridge/telehealth/closer', detail: 'Voice = af_heart Kokoro (warm female). Active script = Variant C Consultant. Bearer auth on bridge endpoint. Settings → Lexi Voice Settings → Test Call dispatches a live call.' },
  { label: 'ReachInbox Nurture',          sub: '5 emails over 14 days',                   detail: 'Campaign "Telehealth Nurture — KJE". Stop-on-reply enabled. Step distribution roughly 34/26/18/14/8% of opens.' },
  { label: 'Day 7: Slybroadcast RVM + Twilio SMS', sub: '100 credits · (866) 621-7044', detail: 'Slybroadcast ringless voicemail drop fires same time as the first SMS at Day 7. Settings → RVM Drop Settings shows credit gauge and last drop.' },
  { label: 'Day 10: Final SMS',           sub: 'Twilio',                                   detail: 'Last automated touch. Lead is moved to nurture-only after Day 14 if no conversion event.' },
  { label: 'CONVERSION → $7/mo forever',  sub: 'Allutional ID370228',                     detail: 'Click on Allutional CTA enrolls the lead. $39.95/mo plan, $7/mo recurring commission per active subscriber. LTV ≈ $84.' },
]

const COMPONENTS: { name: string; what: string; status: 'active' | 'staged' | 'down'; manage: string; ifBroken: string; url?: string }[] = [
  { name: 'KJLE Lead Engine',       what: 'Provides 509K+ niche-segmented leads',         status: 'active', manage: 'Lead Finder service exports CSV by niche/state/city',                ifBroken: 'Check Render dashboard for kjle-api service health',           url: 'https://kjle-api.onrender.com' },
  { name: 'PMTA Email Servers',     what: 'Sends niche-targeted cold email sequences',    status: 'staged', manage: 'Approve sending in Settings → Email Sending Control',                ifBroken: 'SSH to VPS 192.161.173.97 and check pmtactl status' },
  { name: 'Bridge Page',            what: 'Captures leads, fires n8n webhook',            status: 'active', manage: 'WordPress admin → WPForms ID 6',                                     ifBroken: 'Check WordPress admin and WPForms entry log',                  url: 'https://completefamilytelehealth.com' },
  { name: 'n8n Cash Cow Engine',    what: 'Orchestrates the entire funnel',               status: 'active', manage: 'Settings → Engine Control',                                          ifBroken: 'Check Railway logs for kj-autonomous service',                 url: 'https://kj-autonomous.up.railway.app' },
  { name: 'Lexi AVA Voice',         what: 'Outbound voice agent · Variant C Consultant',   status: 'active', manage: 'Settings → Lexi Voice Settings (Test Call button)',                  ifBroken: 'SSH root@192.161.173.97 then systemctl restart ava-bridge' },
  { name: 'ReachInbox',             what: '5-email nurture over 14 days',                 status: 'active', manage: 'Settings → Nurture Campaign',                                        ifBroken: 'Log into ReachInbox dashboard and verify campaign active',     url: 'https://app.reachinbox.ai' },
  { name: 'Slybroadcast RVM',       what: 'Ringless voicemail drops · Day 7',             status: 'active', manage: 'Settings → RVM Drop Settings · 100 credits',                         ifBroken: 'Check credit balance, refill at slybroadcast.com' },
  { name: 'Twilio SMS',             what: 'Day 7 + Day 10 SMS from (866) 621-7044',       status: 'active', manage: 'Twilio console',                                                     ifBroken: 'Check Twilio balance and verify TWILIO_FROM=+18666217044',     url: 'https://console.twilio.com' },
  { name: 'Supabase Database',      what: 'Schema telehealth (6 tables)',                 status: 'active', manage: 'Supabase dashboard · project dhzpwobfihrprlcxqjbq',                  ifBroken: 'Check Supabase dashboard status',                              url: 'https://supabase.com/dashboard/project/dhzpwobfihrprlcxqjbq' },
  { name: 'Jim Brain',              what: 'Empire memory + daily stats logging',          status: 'active', manage: 'Settings → System Status (proxied via Supabase)',                    ifBroken: 'Check Railway logs for jim-brain-production',                  url: 'https://jim-brain-production.up.railway.app/health' },
]

const TROUBLESHOOTING: { problem: string; fix: string[] }[] = [
  {
    problem: 'AVA not calling',
    fix: [
      'Settings → System Status → check AVA Bridge row',
      'If red, the VPS at 192.161.173.97 is unreachable',
      'SSH: ssh root@192.161.173.97',
      'Restart: systemctl restart ava-bridge',
    ],
  },
  {
    problem: 'Form submits not appearing in Supabase',
    fix: [
      'Verify n8n workflow 8bW4A5YdfJyU1Pl1 is ACTIVE',
      'Settings → Engine Control → status should read ACTIVE',
      'Test by submitting the bridge form once and watching the Dashboard counter for ~30s',
    ],
  },
  {
    problem: 'SMS not sending',
    fix: [
      'Check Twilio balance at console.twilio.com',
      'Verify TWILIO_FROM env var equals +18666217044 in n8n',
      'Confirm the lead phone is not in DNC (Settings → DNC Management → Check)',
    ],
  },
  {
    problem: 'Slybroadcast credits at 0',
    fix: [
      'Settings → RVM Drop Settings → click Buy Credits',
      'Refill at slybroadcast.com',
      'Confirm by re-checking the credit gauge in Cost Intelligence',
    ],
  },
  {
    problem: 'ReachInbox not enrolling leads',
    fix: [
      'Verify campaign Telehealth Nurture — KJE is Active in ReachInbox',
      'Confirm RI API key is valid in n8n environment variables',
      'Check Settings → Nurture Campaign → opens ReachInbox dashboard',
    ],
  },
]

const SCRIPT_VARIANTS: { id: string; title: string; rating: string; active: boolean; greeting: string; body: string[] }[] = [
  {
    id: 'A',
    title: 'A — Direct Closer',
    rating: '8/10',
    active: false,
    greeting: 'Hi, this is Lexi from Complete Family Telehealth. I have 90 seconds to save you up to 60% on family healthcare. Got 90 seconds?',
    body: [
      'Main pitch: $39.95 covers you, spouse, and up to 6 kids. Unlimited doctor visits, $0 copay, 24/7.',
      'Trial close: Sound like something worth a closer look?',
      'Close: I will text you the link right now. You enroll in under two minutes from your phone.',
      'Objection — too good to be true: It feels that way because doctors agreed to take a flat monthly fee for the network. No claims, no copays, no surprises.',
      'Objection — already have insurance: Perfect, this stacks. It covers the visits your insurance charges $50 to $200 for.',
      'Objection — I want to think about it: Totally fair. I will text the link now and follow up in three days.',
      'Urgency close: Cohorts close out so the doctors can keep response times fast. If you enroll today you are in.',
    ],
  },
  {
    id: 'B',
    title: 'B — Storyteller',
    rating: '2/10 (needs rework)',
    active: false,
    greeting: 'Hi, this is Lexi from Complete Family Telehealth. Quick question — when was the last time a $200 ER bill ruined a Tuesday?',
    body: [
      'Story arc: I had a single mom call last month — strep throat, no insurance, $400 ER. We saved her $385 the next time.',
      'This variant under-converts. Consultant + Direct beat it on every cohort.',
    ],
  },
  {
    id: 'C',
    title: 'C — Consultant',
    rating: '8/10 ★ ACTIVE',
    active: true,
    greeting: 'Hi, this is Lexi calling from Complete Family Telehealth. I help small business owners save up to 60% on healthcare for themselves and their families. Got 90 seconds?',
    body: [
      'Main pitch: Frame the offer as a benefit you can stack. $39.95 is the whole family — spouse plus up to six kids. Unlimited doctor visits with $0 copay. Mental health, prescriptions at 80% off, available 24/7.',
      'Trial close: Does that sound like the kind of thing that would help your team or your family?',
      'Close: Easiest path is — I text you the link, you enroll in under two minutes from your phone. Want me to send it?',
      'Objection — too good to be true: I get it. The reason it works is the doctors are paid a flat monthly fee, so they want you to actually use it. No copays, no claims to file.',
      'Objection — already have insurance: Most of our members keep their insurance. This covers the $50–$200 office visits insurance does not.',
      'Objection — I want to talk to my spouse: Smart move. I will text you the link and a one-page overview now. Read it together tonight.',
      'Urgency close: We open new cohorts so the doctors can keep wait times under five minutes. If you enroll today you are in this batch.',
    ],
  },
]

const EMAIL_NICHES: { group: string; domain: string; subjectLines: string[] }[] = [
  { group: 'Salon / Barber',           domain: 'setcforselfemployed.com',     subjectLines: ['$39 family healthcare for shop owners', 'Unlimited visits, no copay, 24/7', 'How [Name] dropped her family premium 65%'] },
  { group: 'Restaurant',               domain: 'telehealthdayornight.com',    subjectLines: ['Restaurant owners get sick at 11pm — we answer', 'Skip the urgent care line', 'For owners who never close'] },
  { group: 'Daycare / Church',         domain: 'nostresstelehealth.com',      subjectLines: ['When the kids are sick at 3am', 'Family telehealth that actually answers', 'No-stress healthcare for families'] },
  { group: 'Contractor / Construction',domain: 'telehealth24x7.com',          subjectLines: ['Healthcare for a job-site lifestyle', '24/7 — even if you are on a roof', 'Coverage that travels with the crew'] },
  { group: 'General',                  domain: 'nocopaytelehealth.com',       subjectLines: ['$0 copay healthcare — really', 'Unlimited doctor visits, $39/mo', 'How families cut $300/mo in copays'] },
]

const METRICS: { name: string; def: string }[] = [
  { name: 'Bridge Submits',     def: 'Form completions on completefamilytelehealth.com bridge page' },
  { name: 'AVA Calls',          def: 'Calls fired by Lexi via the bridge endpoint within 60 seconds of submit' },
  { name: 'RVM Drops',          def: 'Slybroadcast ringless voicemails delivered (Day 7)' },
  { name: 'Email Opens',        def: 'Leads who opened a ReachInbox email (any step in the 5-email sequence)' },
  { name: 'Allutional Clicks',  def: 'Clicks to the affiliate enrollment page (allutional.com/?referralCode=ID370228)' },
  { name: 'Active Subs',        def: 'Estimated active paid subscribers — counted from telehealth.conversions where active=true' },
  { name: 'Est MRR',            def: 'active_subs × $7/month commission' },
  { name: 'Total Earned',       def: 'Cumulative commissions earned all-time (sum of commission_monthly across all conversions)' },
  { name: 'LTV',                def: '$84 — 12-month average retention estimate per subscriber' },
  { name: 'CAC',                def: 'Total monthly variable cost ÷ new subscribers acquired that month' },
]

export function Help() {
  const [openComponent, setOpenComponent] = useState<string | null>(null)
  const [openStep, setOpenStep] = useState<number | null>(null)
  const [openTrouble, setOpenTrouble] = useState<string | null>(null)
  const [openScript, setOpenScript] = useState<string | null>('C')
  const [openEmail, setOpenEmail] = useState<string | null>(null)
  const [checks, setChecks] = useState<Record<string, boolean>>({})

  function toggleCheck(k: string) {
    setChecks(c => ({ ...c, [k]: !c[k] }))
  }

  return (
    <Layout title="Help & Training" subtitle="Reference for the entire Telehealth Cash Cow Machine">
      <div className="space-y-6">

        <Section title="How the Machine Works" subtitle="Click any step to expand">
          <div className="space-y-1">
            {FUNNEL_STEPS.map((s, i) => {
              const open = openStep === i
              return (
                <button
                  key={i}
                  onClick={() => setOpenStep(open ? null : i)}
                  className={cn(
                    'w-full text-left hud-card p-3 transition-colors',
                    open ? 'border-cyan-dim shadow-glow' : 'hover:border-cyan-dim',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-gold w-6 text-sm">{i + 1}</span>
                    <div className="flex-1">
                      <div className="font-heading uppercase tracking-wider text-sm text-cyan">{s.label}</div>
                      <div className="text-xs text-white/50 mt-0.5">{s.sub}</div>
                    </div>
                    {open ? <ChevronDown className="w-4 h-4 text-cyan" /> : <ChevronRight className="w-4 h-4 text-white/40" />}
                  </div>
                  {open && <div className="mt-3 pt-3 border-t border-card-border text-sm text-white/80 leading-relaxed">{s.detail}</div>}
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="System Components" subtitle="Every service · status · how to manage · what to do if it breaks">
          <div className="space-y-1">
            {COMPONENTS.map(c => {
              const open = openComponent === c.name
              return (
                <div key={c.name} className={cn('hud-card transition-colors', open && 'border-cyan-dim')}>
                  <button onClick={() => setOpenComponent(open ? null : c.name)} className="w-full text-left p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-heading uppercase tracking-wider text-sm text-cyan">{c.name}</div>
                      <div className="text-xs text-white/50 mt-0.5">{c.what}</div>
                    </div>
                    <Badge variant={c.status === 'active' ? 'success' : c.status === 'staged' ? 'warning' : 'danger'}>{c.status.toUpperCase()}</Badge>
                    {open ? <ChevronDown className="w-4 h-4 text-cyan" /> : <ChevronRight className="w-4 h-4 text-white/40" />}
                  </button>
                  {open && (
                    <div className="px-3 pb-3 border-t border-card-border space-y-2 text-sm">
                      <Detail label="Manage" value={c.manage} />
                      <Detail label="If broken" value={c.ifBroken} />
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noreferrer" className="hud-button inline-flex items-center gap-2 mt-2">
                          <ExternalLink className="w-3 h-3" /> Open
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="Your Daily 2-Minute Check" subtitle="Tap to mark complete">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-heading uppercase tracking-wider text-xs text-white/60 mb-2">Morning</div>
              {[
                'Open Command Center Dashboard',
                'Verify Bridge Submits > 0 (once PMTA sending active)',
                'Verify AVA Calls firing',
                'Check any new conversions',
                'Review Cost Intelligence — under budget?',
                'Check Slybroadcast credits > 20',
              ].map(t => <CheckRow key={t} label={t} done={!!checks[`am:${t}`]} onToggle={() => toggleCheck(`am:${t}`)} />)}
            </div>
            <div>
              <div className="font-heading uppercase tracking-wider text-xs text-white/60 mb-2">Weekly</div>
              {[
                'Review Campaign Intelligence — top performing domain?',
                'Review Chatbot Analytics — top questions?',
                'Check PMTA domain reputation',
                'Review Lexi call recordings (VPS logs)',
              ].map(t => <CheckRow key={t} label={t} done={!!checks[`wk:${t}`]} onToggle={() => toggleCheck(`wk:${t}`)} />)}
            </div>
          </div>
        </Section>

        <Section title="Troubleshooting Guide" subtitle="Common issues · click to expand">
          <div className="space-y-1">
            {TROUBLESHOOTING.map(t => {
              const open = openTrouble === t.problem
              return (
                <div key={t.problem} className={cn('hud-card', open && 'border-warning/40')}>
                  <button onClick={() => setOpenTrouble(open ? null : t.problem)} className="w-full text-left p-3 flex items-center gap-3">
                    <div className="flex-1 font-heading uppercase tracking-wider text-sm text-warning">{t.problem}</div>
                    {open ? <ChevronDown className="w-4 h-4 text-warning" /> : <ChevronRight className="w-4 h-4 text-white/40" />}
                  </button>
                  {open && (
                    <ol className="px-3 pb-3 border-t border-card-border space-y-1 text-sm text-white/80">
                      {t.fix.map((s, i) => (
                        <li key={i} className="flex gap-2 pt-2"><span className="text-cyan font-heading">{i + 1}.</span><span>{s}</span></li>
                      ))}
                    </ol>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="Lexi's Scripts — All 3 Variants" subtitle="C is active · A is backup · B needs rework">
          <div className="space-y-1">
            {SCRIPT_VARIANTS.map(v => {
              const open = openScript === v.id
              return (
                <div key={v.id} className={cn('hud-card', open && 'border-cyan-dim')}>
                  <button onClick={() => setOpenScript(open ? null : v.id)} className="w-full text-left p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-heading uppercase tracking-wider text-sm text-cyan">{v.title}</div>
                      <div className="text-xs text-white/50 mt-0.5">Rating: {v.rating}</div>
                    </div>
                    {v.active && <Badge variant="success">ACTIVE</Badge>}
                    {open ? <ChevronDown className="w-4 h-4 text-cyan" /> : <ChevronRight className="w-4 h-4 text-white/40" />}
                  </button>
                  {open && (
                    <div className="px-3 pb-3 border-t border-card-border space-y-3 text-sm text-white/85">
                      <div className="pt-3"><span className="font-heading uppercase tracking-wider text-xs text-cyan">Greeting:</span> {v.greeting}</div>
                      <ul className="space-y-2">
                        {v.body.map((b, i) => <li key={i} className="flex gap-2"><span className="text-gold">•</span><span>{b}</span></li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="PMTA Email Sequences by Niche" subtitle="3 emails per niche group">
          <div className="space-y-1">
            {EMAIL_NICHES.map(e => {
              const open = openEmail === e.group
              return (
                <div key={e.group} className={cn('hud-card', open && 'border-cyan-dim')}>
                  <button onClick={() => setOpenEmail(open ? null : e.group)} className="w-full text-left p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-heading uppercase tracking-wider text-sm text-cyan">{e.group}</div>
                      <div className="text-xs text-white/50 mt-0.5">{e.domain}</div>
                    </div>
                    {open ? <ChevronDown className="w-4 h-4 text-cyan" /> : <ChevronRight className="w-4 h-4 text-white/40" />}
                  </button>
                  {open && (
                    <ol className="px-3 pb-3 border-t border-card-border space-y-1 text-sm text-white/80 pt-2">
                      {e.subjectLines.map((s, i) => (
                        <li key={i} className="flex gap-2"><span className="text-gold font-heading">Email {i + 1}:</span><span>{s}</span></li>
                      ))}
                    </ol>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="Key Metrics Glossary" subtitle="What every number on the dashboard means">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {METRICS.map(m => (
              <div key={m.name} className="hud-card p-3">
                <div className="font-heading uppercase tracking-wider text-xs text-cyan">{m.name}</div>
                <div className="text-sm text-white/80 mt-1">{m.def}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </Layout>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-heading uppercase tracking-wider text-[10px] text-white/40">{label}: </span>
      <span className="text-white/80">{value}</span>
    </div>
  )
}

function CheckRow({ label, done, onToggle }: { label: string; done: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full text-left flex items-center gap-3 hud-card p-2.5 mb-1.5 hover:border-cyan-dim transition-colors">
      <span className={cn(
        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
        done ? 'bg-cyan/30 border-cyan text-cyan' : 'border-white/30',
      )}>
        {done && <span className="text-[10px]">✓</span>}
      </span>
      <span className={cn('text-sm', done ? 'text-white/40 line-through' : 'text-white/80')}>{label}</span>
    </button>
  )
}
