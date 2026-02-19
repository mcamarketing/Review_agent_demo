-- ============================================================
-- LEAD REACTIVATION ENGINE — DATABASE SCHEMA
-- ============================================================

-- -------------------------------------------------------
-- CLIENTS (your agency's customers)
-- -------------------------------------------------------
CREATE TABLE clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name     TEXT NOT NULL,
  email             TEXT UNIQUE NOT NULL,
  phone             TEXT,
  twilio_number     TEXT,                        -- per-client sending number
  review_link       TEXT,
  avg_deal_value    NUMERIC(10,2),               -- for ROI reporting
  status            TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'trial')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- CAMPAIGNS (one reactivation push per client per batch)
-- -------------------------------------------------------
CREATE TABLE campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID REFERENCES clients(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  status            TEXT DEFAULT 'draft' 
                    CHECK (status IN ('draft', 'pending_approval', 'approved', 'running', 'paused', 'complete')),
  total_leads       INT DEFAULT 0,
  approved_at       TIMESTAMPTZ,
  approved_by       TEXT,                        -- client contact who approved
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

-- -------------------------------------------------------
-- LEADS (imported from CSV or CRM, normalised)
-- -------------------------------------------------------
CREATE TABLE leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id       UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Core identity
  first_name        TEXT,
  last_name         TEXT,
  phone             TEXT,
  email             TEXT,

  -- Relationship context (from CRM / CSV import)
  last_contact_date DATE,
  last_interaction  TEXT,                        -- 'booked', 'replied', 'opened', 'ghosted', etc.
  deal_stage        TEXT,
  lead_source       TEXT,
  raw_notes         TEXT,                        -- original CRM notes field

  -- AI scoring (populated after scoring workflow)
  segment           TEXT,                        -- 'warm_ghost', 'past_customer', 'price_objection', etc.
  temperature_score INT CHECK (temperature_score BETWEEN 0 AND 100),
  scoring_reason    TEXT,                        -- AI explanation
  scored_at         TIMESTAMPTZ,

  -- Status tracking
  status            TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'sent', 'replied', 'reactivated', 'opted_out', 'skipped')),
  opted_out         BOOLEAN DEFAULT FALSE,
  opted_out_at      TIMESTAMPTZ,

  -- Import metadata
  import_source     TEXT,                        -- 'csv', 'hubspot', 'gohighlevel', 'salesforce'
  external_id       TEXT,                        -- CRM record ID for sync
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_client ON leads(client_id);
CREATE INDEX idx_leads_campaign ON leads(campaign_id);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_opted_out ON leads(opted_out);

-- -------------------------------------------------------
-- MESSAGES (every outbound message, per lead)
-- -------------------------------------------------------
CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id       UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id         UUID REFERENCES clients(id) ON DELETE CASCADE,

  sequence_number   INT DEFAULT 1,              -- 1 = initial, 2 = follow-up 1, etc.
  direction         TEXT CHECK (direction IN ('outbound', 'inbound')),
  channel           TEXT DEFAULT 'sms' CHECK (channel IN ('sms', 'email', 'whatsapp')),

  body              TEXT NOT NULL,
  twilio_sid        TEXT,                        -- Twilio message SID for status lookup
  status            TEXT DEFAULT 'queued'
                    CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'received')),

  -- AI generation metadata
  ai_segment_used   TEXT,
  ai_model          TEXT,
  ai_prompt_tokens  INT,
  ai_completion_tokens INT,

  sent_at           TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_lead ON messages(lead_id);
CREATE INDEX idx_messages_campaign ON messages(campaign_id);
CREATE INDEX idx_messages_twilio_sid ON messages(twilio_sid);

-- -------------------------------------------------------
-- REPLIES (inbound messages from leads)
-- -------------------------------------------------------
CREATE TABLE replies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id        UUID REFERENCES messages(id) ON DELETE SET NULL,
  lead_id           UUID REFERENCES leads(id) ON DELETE CASCADE,
  client_id         UUID REFERENCES clients(id) ON DELETE CASCADE,

  body              TEXT NOT NULL,
  from_phone        TEXT,
  twilio_sid        TEXT,

  -- AI reply classification
  sentiment         TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'opt_out', 'question')),
  intent            TEXT,                        -- 'wants_to_book', 'needs_info', 'not_interested', etc.
  classified_at     TIMESTAMPTZ,

  received_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_replies_lead ON replies(lead_id);

-- -------------------------------------------------------
-- FOLLOW_UP_SCHEDULE (when to send follow-ups)
-- -------------------------------------------------------
CREATE TABLE follow_up_schedule (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id       UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  sequence_number   INT NOT NULL,
  scheduled_for     TIMESTAMPTZ NOT NULL,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'skipped')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_followup_scheduled ON follow_up_schedule(scheduled_for) WHERE status = 'pending';

-- -------------------------------------------------------
-- OPT_OUTS (global — survives campaign deletion)
-- -------------------------------------------------------
CREATE TABLE opt_outs (
  phone             TEXT PRIMARY KEY,
  client_id         UUID REFERENCES clients(id) ON DELETE CASCADE,
  opted_out_at      TIMESTAMPTZ DEFAULT NOW(),
  reason            TEXT                         -- 'STOP reply', 'manual', etc.
);

-- -------------------------------------------------------
-- CAMPAIGN_METRICS (materialised summary for dashboards)
-- -------------------------------------------------------
CREATE TABLE campaign_metrics (
  campaign_id       UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  total_leads       INT DEFAULT 0,
  messages_sent     INT DEFAULT 0,
  messages_delivered INT DEFAULT 0,
  replies_received  INT DEFAULT 0,
  positive_replies  INT DEFAULT 0,
  opt_outs          INT DEFAULT 0,
  leads_reactivated INT DEFAULT 0,
  estimated_revenue NUMERIC(10,2),              -- reactivated * avg_deal_value
  last_updated      TIMESTAMPTZ DEFAULT NOW()
);
