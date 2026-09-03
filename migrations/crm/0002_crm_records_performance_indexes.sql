CREATE INDEX IF NOT EXISTS idx_crm_records_type_event_show_status_created
  ON crm_records(record_type, event_slug, event_show_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_crm_records_type_status_updated
  ON crm_records(record_type, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_crm_records_type_company
  ON crm_records(record_type, company);

CREATE INDEX IF NOT EXISTS idx_crm_records_type_email
  ON crm_records(record_type, email);
