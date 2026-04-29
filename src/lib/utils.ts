import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { TimeRange } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number | null | undefined, opts: { decimals?: number } = {}) {
  if (n == null) return '0'
  if (opts.decimals != null) return n.toLocaleString(undefined, { maximumFractionDigits: opts.decimals, minimumFractionDigits: opts.decimals })
  return Math.round(n).toLocaleString()
}

export function formatCurrency(n: number | null | undefined, decimals = 2) {
  if (n == null) return '$0.00'
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export function formatPct(n: number | null | undefined, decimals = 1) {
  if (n == null || !isFinite(n)) return '0%'
  return `${(n * 100).toFixed(decimals)}%`
}

export function ratio(num: number | null | undefined, den: number | null | undefined) {
  const n = num ?? 0
  const d = den ?? 0
  if (!d) return 0
  return n / d
}

export function timeRangeStart(range: TimeRange): Date {
  const now = new Date()
  const d = new Date(now)
  switch (range) {
    case 'today':
      d.setHours(0, 0, 0, 0)
      return d
    case '7d':
      d.setDate(d.getDate() - 7)
      return d
    case '30d':
      d.setDate(d.getDate() - 30)
      return d
    case 'all':
    default:
      return new Date('2020-01-01')
  }
}

export function rangeISO(range: TimeRange): string {
  return timeRangeStart(range).toISOString()
}

export function rangeISODate(range: TimeRange): string {
  return timeRangeStart(range).toISOString().slice(0, 10)
}

export function delta(curr: number, prev: number) {
  if (!prev) return curr > 0 ? 1 : 0
  return (curr - prev) / prev
}

export function csvEscape(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => csvEscape(r[h])).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function shortDate(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function dateTime(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function daysBetween(a: string | Date, b: string | Date) {
  const da = typeof a === 'string' ? new Date(a) : a
  const db = typeof b === 'string' ? new Date(b) : b
  return Math.floor((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24))
}
