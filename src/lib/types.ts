export type TimeRange = 'today' | '7d' | '30d' | 'all'

export interface Lead {
  id: string
  first_name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  niche: string | null
  city: string | null
  source_domain: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  bridge_submitted_at: string | null
  ava_called: boolean | null
  ava_called_at: string | null
  ava_duration_sec: number | null
  ava_outcome: string | null
  ava_sms_sent: boolean | null
  rvm_sent: boolean | null
  rvm_sent_at: string | null
  rvm_delivered: boolean | null
  sms_day7_sent: boolean | null
  sms_day7_sent_at: string | null
  sms_day10_sent: boolean | null
  sms_day10_sent_at: string | null
  reachinbox_enrolled: boolean | null
  allutional_clicked: boolean | null
  allutional_clicked_at: string | null
  converted: boolean | null
  converted_at: string | null
  conversion_source: string | null
  created_at: string
  notes: string | null
}

export interface Conversion {
  id: string
  lead_id: string | null
  email: string | null
  conversion_source: string | null
  source_domain: string | null
  niche: string | null
  commission_monthly: number | null
  active: boolean | null
  enrolled_at: string
  churned_at: string | null
  months_active: number | null
  lifetime_value: number | null
  created_at: string
}

export interface DailyStat {
  id: string
  stat_date: string
  leads_exported: number | null
  emails_sent: number | null
  email_opens: number | null
  email_clicks: number | null
  bridge_submits: number | null
  ava_calls_fired: number | null
  ava_answered: number | null
  ava_conversions: number | null
  rvm_drops_sent: number | null
  rvm_drops_delivered: number | null
  sms_sent: number | null
  allutional_clicks: number | null
  total_conversions: number | null
  new_mrr: number | null
  cumulative_active_subs: number | null
  cumulative_mrr: number | null
  cost_ava_usd: number | null
  cost_sms_usd: number | null
  cost_rvm_usd: number | null
  cost_chatbot_usd: number | null
  cost_total_usd: number | null
  created_at: string
}

export interface ChatbotSession {
  id: string
  session_id: string | null
  visitor_ip: string | null
  source_domain: string | null
  started_at: string
  ended_at: string | null
  message_count: number | null
  lead_captured: boolean | null
  lead_id: string | null
  converted: boolean | null
  top_question: string | null
  conversation_log: unknown
  created_at: string
}

export interface DomainStat {
  id: string
  domain: string
  niche: string | null
  stat_date: string
  emails_sent: number | null
  emails_delivered: number | null
  opens: number | null
  clicks: number | null
  bridge_submits: number | null
  conversions: number | null
  cost_usd: number | null
  revenue_usd: number | null
  created_at: string
}

export interface CostLogEntry {
  id: string
  service: string
  action: string | null
  units: number | null
  unit_label: string | null
  cost_usd: number | null
  lead_id: string | null
  domain: string | null
  niche: string | null
  logged_at: string
}

export interface FunnelStage {
  label: string
  count: number
  dropoff: number | null
}
