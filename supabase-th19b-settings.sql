-- TH-19B — telehealth.settings (editable budgets + future flags)
-- Run this in Supabase SQL Editor for project dhzpwobfihrprlcxqjbq.

CREATE TABLE IF NOT EXISTS telehealth.settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO telehealth.settings (key, value) VALUES
  ('budget_ava_usd',          '150'),
  ('budget_twilio_usd',       '250'),
  ('budget_slybroadcast_usd', '200'),
  ('budget_chatbot_usd',        '5')
ON CONFLICT (key) DO NOTHING;

-- Grants so the dashboard (anon role) can read + update budgets
GRANT USAGE ON SCHEMA telehealth TO anon;
GRANT SELECT, INSERT, UPDATE ON telehealth.settings TO anon;
