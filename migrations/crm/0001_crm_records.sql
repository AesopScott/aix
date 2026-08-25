CREATE TABLE IF NOT EXISTS crm_records (
  key TEXT PRIMARY KEY,
  namespace TEXT NOT NULL DEFAULT 'crm',
  record_type TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  event_slug TEXT NOT NULL DEFAULT '',
  event_id TEXT NOT NULL DEFAULT '',
  event_show_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  linkedin_profile_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL,
  d1_updated_at TEXT NOT NULL DEFAULT ''
) STRICT;

CREATE INDEX IF NOT EXISTS idx_crm_records_namespace ON crm_records(namespace);
CREATE INDEX IF NOT EXISTS idx_crm_records_record_type ON crm_records(record_type);
CREATE INDEX IF NOT EXISTS idx_crm_records_email ON crm_records(email);
CREATE INDEX IF NOT EXISTS idx_crm_records_code ON crm_records(code);
CREATE INDEX IF NOT EXISTS idx_crm_records_status ON crm_records(status);
CREATE INDEX IF NOT EXISTS idx_crm_records_event_slug ON crm_records(event_slug);
CREATE INDEX IF NOT EXISTS idx_crm_records_event_id ON crm_records(event_id);
CREATE INDEX IF NOT EXISTS idx_crm_records_created_at ON crm_records(created_at);
CREATE INDEX IF NOT EXISTS idx_crm_records_updated_at ON crm_records(updated_at);
