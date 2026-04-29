import { FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function Login() {
  const { session, signIn, loading } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null
  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError(error.message)
    } else {
      nav('/', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-cyan/10 border border-cyan-dim shadow-glow mb-4">
            <Lock className="w-6 h-6 text-cyan" />
          </div>
          <h1 className="font-heading font-bold text-2xl tracking-widest text-cyan">TELEHEALTH</h1>
          <div className="font-heading text-xs tracking-[0.3em] text-white/50 mt-1">COMMAND CENTER</div>
        </div>
        <form onSubmit={handleSubmit} className="hud-card p-6 space-y-4">
          <div>
            <label className="block font-heading text-xs uppercase tracking-wider text-white/60 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="hud-input w-full pl-9"
                placeholder="commander@telehealth.io"
              />
            </div>
          </div>
          <div>
            <label className="block font-heading text-xs uppercase tracking-wider text-white/60 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="hud-input w-full pl-9"
                placeholder="••••••••"
              />
            </div>
          </div>
          {error && (
            <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded px-3 py-2">
              {error}
            </div>
          )}
          <button type="submit" disabled={submitting} className="hud-button-solid w-full">
            {submitting ? 'Authenticating...' : 'Engage'}
          </button>
        </form>
        <div className="text-center mt-4 font-heading text-[10px] text-white/30 tracking-[0.3em]">
          AUTHORIZED PERSONNEL ONLY
        </div>
      </div>
    </div>
  )
}
