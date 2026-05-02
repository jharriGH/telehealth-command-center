import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Brain runs server-side (Railway) and writes to Supabase. Browsers cannot
// fetch Brain directly because of CORS — use Supabase as the proxy signal.
// Reachable Supabase → Brain considered ONLINE; failure → UNKNOWN, never DOWN
// purely from CORS.
export function useBrainStatus(intervalMs = 60000) {
  const [online, setOnline] = useState<boolean | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  useEffect(() => {
    let active = true
    const tick = async () => {
      try {
        const { error } = await supabase.from('settings').select('key').limit(1)
        const reachable = !error || /not.*found.*table|schema.*cache|does not exist/i.test(error?.message ?? '')
        if (!active) return
        setOnline(reachable)
        setLastChecked(new Date())
      } catch {
        if (!active) return
        setOnline(null)
        setLastChecked(new Date())
      }
    }
    tick()
    const id = setInterval(tick, intervalMs)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [intervalMs])

  return { online, lastChecked }
}
