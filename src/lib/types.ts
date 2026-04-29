export type TimeRange = 'today' | '7d' | '30d' | 'all'

export interface Lead {
  id: string
  business_name: string | null
  email: string | null
  phone: string | null
  niche: string | null
  domain: string | null
  email_step: number | null
  email_opened: boolean | null
  email_clicked: boolean | null
  bridge_submitted: boolean | null
  bridge_submitted_at: string | null
  ava_called: boolean | null
  ava_called_at: string | null
  ava_outcome: string | null
  ava_duration_sec: number | null
  rvm_sent: boolean | null
  rvm_sent_at: string | null
  rvm_delivered: boolean | null
  sms_sent: boolean | null
  sms_sent_at: string | null
  allutional_clicked: boolean | null
  allutional_clicked_at: string | null
  converted: boolean | null
  converted_at: string | null
  conversion_source: string | null
  created_at: string
}

export interface Conversion {
  id: string
  lead_id: string | null
  email: string | null
  active: boolean | null
  monthly_commission: number | null
  converted_at: string
  churned_at: string | null
}

export interface DailyStat {
  id: string
  stat_date: string
  domain: string | null
  niche: string | null
  emails_sent: number | null
  email_opens: number | null
  email_clicks: number | null
  email_bounces: number | null
  email_unsubs: number | null
  email_complaints: number | null
  bridge_submits: number | null
  ava_calls: number | null
  ava_answered: number | null
  rvm_drops: number | null
  rvm_delivered: number | null
  sms_sent: number | null
  allutional_clicks: number | null
  conversions: number | null
  revenue: number | null
}

export interface ChatbotSession {
  id: string
  domain: string | null
  started_at: string
  ended_at: string | null
  message_count: number | null
  duration_sec: number | null
  top_question: string | null
  opening_message: string | null
  lead_captured: boolean | null
  converted: boolean | null
  conversation_log: unknown
}

export interface DomainStat {
  id: string
  domain: string
  stat_date: string
  sent: number | null
  opens: number | null
  clicks: number | null
  bridge_submits: number | null
  conversions: number | null
  revenue: number | null
}

export interface CostLogEntry {
  id: string
  service: string
  units: number | null
  rate: number | null
  total_cost: number | null
  credits_remaining: number | null
  occurred_at: string
  notes: string | null
}

export interface FunnelStage {
  label: string
  count: number
  dropoff: number | null
}
