import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, Trash2, Copy, Download, Bot, AlertTriangle, Key } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const KEY_STORAGE = 'cc_anthropic_key_v1'

const LEILA_SYSTEM_PROMPT = `You are Leila, the AI advisor for the KJE Telehealth Cash Cow Machine. You know everything about this system and help Jim Harris (King James) operate and optimize it.

YOUR KNOWLEDGE BASE:

AFFILIATE INFO:
- Product: Allutional.com telehealth plan
- Price: $39.95/month per employee
- Commission: $7/month recurring per active subscriber
- Affiliate link: https://allutional.com/?referralCode=ID370228#enroll
- Covers: employee + spouse + up to 6 children
- Features: unlimited doctor visits $0 copay, mental health, prescription discounts 80%, 24/7, no contracts

FUNNEL ARCHITECTURE:
- Bridge page: completefamilytelehealth.com (21 niche pages)
- n8n engine: kj-autonomous.up.railway.app
- AVA voice (Lexi): 192.161.173.97:8089/bridge/telehealth/closer
- Active script: Variant C (Consultant) 8/10
- ReachInbox: 5-email nurture over 14 days
- Slybroadcast: RVM Day 7 (100 credits)
- Twilio: SMS Day 7 + Day 10 from (866) 621-7044
- PMTA: 12 domains staged, awaiting /u/ handler
- KJLE: 509,251 leads across 4,598 niches

KEY METRICS TO KNOW:
- Variable cost per lead: $0.075
- At 10K leads/month: ~$517/mo cost
- 2% conversion = 200 new subs/month
- $7/mo × 200 = $1,400 new MRR/month
- Year 1 projection: ~$68,800 net profit

CURRENT STATUS (as of April 2026):
- Engine: ACTIVE
- AVA: calling test leads successfully
- PMTA: staged, not yet sending (needs /u/ handler)
- Slybroadcast: approved, wired, needs VoiceDropz fix
- Command Center: LIVE at dashboard.completefamilytelehealth.com

PENDING ITEMS:
1. /u/ unsubscribe handler for CAN-SPAM compliance
2. VoiceDropz /voice/generate 404 fix
3. PMTA send approval from Jim
4. Lexi call duration optimization

RULES FOR LEILA:
- Always be concise and actionable
- Never use em dashes
- Never use single quotes
- If asked about system status, refer to Settings page
- If asked about metrics, refer to Dashboard
- Always address Jim as "King James" when appropriate
- Be warm, smart, and direct`

const SUGGESTED: string[] = [
  'How is the machine performing today?',
  'What is my estimated monthly commission?',
  'Is Lexi calling correctly?',
  'When will PMTA start sending?',
  'How do I read the conversion funnel?',
  'What should I do if AVA stops calling?',
  'How do I approve PMTA sending?',
  'What is my break-even point?',
  'How do I add a new niche landing page?',
  'What is the Consultant script?',
]

type Msg = { role: 'user' | 'assistant'; content: string; ts: number }

export function Leila() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(KEY_STORAGE) ?? '')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  function saveKey() {
    const k = keyDraft.trim()
    if (!k.startsWith('sk-ant-')) {
      setError('Anthropic API keys start with sk-ant-')
      return
    }
    localStorage.setItem(KEY_STORAGE, k)
    setApiKey(k)
    setShowKeyModal(false)
    setKeyDraft('')
    setError(null)
  }

  function clearKey() {
    localStorage.removeItem(KEY_STORAGE)
    setApiKey('')
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return
    if (!apiKey) {
      setShowKeyModal(true)
      return
    }
    const next: Msg[] = [...messages, { role: 'user', content: text.trim(), ts: Date.now() }]
    setMessages(next)
    setInput('')
    setSending(true)
    setError(null)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          system: LEILA_SYSTEM_PROMPT,
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`)
      const reply = (json?.content?.[0]?.text ?? '').trim() || 'Sorry, I had no response.'
      const after: Msg[] = [...next, { role: 'assistant', content: reply, ts: Date.now() }]
      setMessages(after)
      logSession(after)
    } catch (e: any) {
      setError(e?.message ?? 'Request failed')
    } finally {
      setSending(false)
    }
  }

  async function logSession(history: Msg[]) {
    try {
      const topQ = history.find(m => m.role === 'user')?.content?.slice(0, 200) ?? null
      if (!sessionId) {
        const newId = crypto.randomUUID()
        setSessionId(newId)
        await supabase.from('chatbot_sessions').insert({
          session_id: newId,
          source_domain: 'command-center-leila',
          started_at: new Date().toISOString(),
          message_count: history.length,
          top_question: topQ,
          conversation_log: history,
        })
      } else {
        await supabase.from('chatbot_sessions').update({
          message_count: history.length,
          conversation_log: history,
          ended_at: new Date().toISOString(),
        }).eq('session_id', sessionId)
      }
    } catch { /* logging is best-effort */ }
  }

  function clearChat() {
    setMessages([])
    setSessionId(null)
    setError(null)
  }

  function copyMsg(content: string) {
    navigator.clipboard.writeText(content).catch(() => {})
  }

  function exportTranscript() {
    const text = messages.map(m => `[${new Date(m.ts).toLocaleString()}] ${m.role === 'user' ? 'KING JAMES' : 'LEILA'}\n${m.content}\n`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `leila-${new Date().toISOString().slice(0, 16).replace(':', '-')}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const empty = messages.length === 0

  return (
    <Layout title="Leila" subtitle="Telehealth AI Advisor · Claude Haiku">
      <div className="flex flex-col h-[calc(100vh-12rem)] hud-card overflow-hidden">

        <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-cyan/15 border border-cyan-dim flex items-center justify-center shadow-glow">
              <Bot className="w-4 h-4 text-cyan" />
            </div>
            <div>
              <div className="font-heading uppercase tracking-widest text-cyan text-sm">LEILA</div>
              <div className="text-[10px] text-white/40 font-heading uppercase tracking-wider">TELEHEALTH AI ADVISOR</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setKeyDraft(apiKey); setShowKeyModal(true) }} className="hud-button inline-flex items-center gap-2">
              <Key className="w-3 h-3" /> {apiKey ? 'Key Set' : 'Set Key'}
            </button>
            <button onClick={exportTranscript} disabled={empty} className="hud-button inline-flex items-center gap-2 disabled:opacity-30">
              <Download className="w-3 h-3" /> Export
            </button>
            <button onClick={clearChat} disabled={empty} className="hud-button inline-flex items-center gap-2 disabled:opacity-30">
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
        </div>

        {!apiKey && (
          <div className="px-4 py-3 bg-warning/10 border-b border-warning/30 text-xs text-warning font-heading uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" /> Click Set Key to add your Anthropic API key (stored locally in this browser only)
          </div>
        )}

        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowKeyModal(false)}>
            <div className="hud-card max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="hud-heading text-base text-cyan">Anthropic API Key</h3>
                <button onClick={() => setShowKeyModal(false)} className="text-white/50 hover:text-white">✕</button>
              </div>
              <p className="text-sm text-white/70 mb-3">
                Pasted keys are stored in this browser only (localStorage). They are never committed to GitHub or shipped in the build. Get one at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-cyan underline">console.anthropic.com</a>.
              </p>
              <input
                type="password"
                value={keyDraft}
                onChange={e => setKeyDraft(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="hud-input w-full mb-3"
                autoFocus
              />
              <div className="flex justify-between">
                <button onClick={clearKey} className="hud-button text-danger">Remove Key</button>
                <div className="flex gap-2">
                  <button onClick={() => setShowKeyModal(false)} className="hud-button">Cancel</button>
                  <button onClick={saveKey} className="hud-button-solid">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {empty && (
            <div className="text-center pt-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-cyan/10 border border-cyan-dim flex items-center justify-center mb-3 shadow-glow">
                <Sparkles className="w-7 h-7 text-cyan" />
              </div>
              <div className="font-heading text-cyan text-lg tracking-wider">Ask Leila anything about the machine</div>
              <div className="text-sm text-white/50 mt-1 mb-5">Suggested starts:</div>
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-3 py-2 rounded-md border border-cyan-dim bg-cyan/5 text-white/80 hover:bg-cyan/10 hover:text-cyan transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-cyan/15 border border-cyan-dim flex-shrink-0 flex items-center justify-center mt-1">
                  <Bot className="w-3 h-3 text-cyan" />
                </div>
              )}
              <div className={cn(
                'max-w-[80%] rounded-md px-3 py-2 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'bg-cyan/15 border border-cyan-dim text-white'
                  : 'hud-card border-card-border text-white/90',
              )}>
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/5 text-[10px] text-white/40 font-heading uppercase tracking-wider">
                  <span>{new Date(m.ts).toLocaleTimeString()}</span>
                  {m.role === 'assistant' && (
                    <button onClick={() => copyMsg(m.content)} className="inline-flex items-center gap-1 hover:text-cyan transition-colors">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-cyan/15 border border-cyan-dim flex-shrink-0 flex items-center justify-center mt-1">
                <Bot className="w-3 h-3 text-cyan animate-pulse" />
              </div>
              <div className="hud-card px-3 py-2 text-sm text-cyan">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-bounce"></span>
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <form
          onSubmit={e => { e.preventDefault(); sendMessage(input) }}
          className="px-4 py-3 border-t border-card-border flex gap-2"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={apiKey ? 'Ask Leila about the machine…' : 'Click Set Key first'}
            disabled={!apiKey || sending}
            className="hud-input flex-1"
          />
          <button type="submit" disabled={!input.trim() || sending || !apiKey} className="hud-button-solid inline-flex items-center gap-2 disabled:opacity-30">
            <Send className="w-3 h-3" /> Send
          </button>
        </form>
      </div>
    </Layout>
  )
}
