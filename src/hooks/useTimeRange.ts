import { useState } from 'react'
import { TimeRange } from '@/lib/types'

export function useTimeRange(initial: TimeRange = '7d') {
  const [range, setRange] = useState<TimeRange>(initial)
  return { range, setRange }
}
