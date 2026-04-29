import { useEffect, useState } from 'react'
import { pingBrain } from '@/lib/brain'

export function useBrainStatus(intervalMs = 60000) {
  const [online, setOnline] = useState<boolean | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  useEffect(() => {
    let active = true
    const tick = async () => {
      const ok = await pingBrain()
      if (!active) return
      setOnline(ok)
      setLastChecked(new Date())
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
