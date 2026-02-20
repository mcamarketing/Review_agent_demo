-- ═══════════════════════════════════════════════════════════════════════════
-- BAE Schema v1.2 — KB v2.0 Elevation Migration
-- Run against existing bae DB: psql -U bae_user -d bae -f schema_v1.2_migration.sql
-- Safe: all operations are ALTER TABLE ADD COLUMN IF NOT EXISTS
-- ═══════════════════════════════════════════════════════════════════════════

-- ── runs table: Driver Tree + FAST audit fields ──────────────────────────────
ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS primary_driver   TEXT
    CHECK (primary_driver IN ('Acquisition', 'Retention', 'Expansion')),
  ADD COLUMN IF NOT EXISTS driver_rationale TEXT,
  ADD COLUMN IF NOT EXISTS fast_scores      JSONB,
  -- fast_scores shape: { F: 1-4, A: 1-4, S: 1-4, T: 1-4, composite: 1-16, gate_passed: bool }
  ADD COLUMN IF NOT EXISTS roi_formula_tag  TEXT
    CHECK (roi_formula_tag IN ('A_PROFIT', 'B_GROWTH', 'C_VALUE', 'AB', 'BC', 'AC', 'ABC'));

COMMENT ON COLUMN runs.primary_driver   IS 'KB v2.0 Driver Tree: Acquisition | Retention | Expansion';
COMMENT ON COLUMN runs.fast_scores      IS 'FAST framework gate scores. Gate fails if composite < 8.';
COMMENT ON COLUMN runs.roi_formula_tag  IS 'Primary ROI formula alignment: A=Profit, B=Growth, C=Value';

-- ── contenders table: Driver alignment per generated model ───────────────────
ALTER TABLE contenders
  ADD COLUMN IF NOT EXISTS primary_driver  TEXT,
  ADD COLUMN IF NOT EXISTS roi_formula     TEXT,
  ADD COLUMN IF NOT EXISTS behavioral_anchors JSONB;
  -- behavioral_anchors: ["Dopamine Loops", "Loss Aversion", ...]

COMMENT ON COLUMN contenders.primary_driver     IS 'Driver Tree node this contender feeds';
COMMENT ON COLUMN contenders.behavioral_anchors IS 'KB v2.0 cross-domain neuroscience/behavioral anchors applied';

-- ── builds table: ROI lever calculations ────────────────────────────────────
ALTER TABLE builds
  ADD COLUMN IF NOT EXISTS roi_calculations JSONB;
  -- roi_calculations shape:
  -- { formula_a: { monthly_revenue, api_cost, server_cost, net_profit },
  --   formula_b: { acquisition_rate, retention_rate, expansion_rate, growth_velocity },
  --   formula_c: { monthly_cash_flow, risk_score, valuation_multiple, implied_value } }

COMMENT ON COLUMN builds.roi_calculations IS 'KB v2.0 Formula A/B/C computed ROI lever outputs';

-- ── reports table: Pyramid Principle fields ──────────────────────────────────
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS pyramid_lead      TEXT,   -- "We will increase profit by X% in 90 days by..."
  ADD COLUMN IF NOT EXISTS supporting_drivers JSONB, -- ["reduce manual research time", "increase response speed"]
  ADD COLUMN IF NOT EXISTS strategic_driver  TEXT;   -- Acquisition | Retention | Expansion

COMMENT ON COLUMN reports.pyramid_lead      IS 'Pyramid Principle lead sentence — ROI conclusion first';
COMMENT ON COLUMN reports.supporting_drivers IS 'Pyramid Principle tier 2: the 2-3 HOW statements';

-- ── judgements table: Add strategic judge role ───────────────────────────────
ALTER TABLE judgements DROP CONSTRAINT IF EXISTS judgements_judge_role_check;
ALTER TABLE judgements
  ADD CONSTRAINT judgements_judge_role_check
  CHECK (judge_role IN ('cfo', 'systems', 'entrepreneur', 'strategic', 'composite'));

-- ── Index additions for new query patterns ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_runs_primary_driver  ON runs (primary_driver);
CREATE INDEX IF NOT EXISTS idx_runs_roi_formula     ON runs (roi_formula_tag);
CREATE INDEX IF NOT EXISTS idx_reports_verdict      ON reports (final_verdict);
CREATE INDEX IF NOT EXISTS idx_contenders_driver    ON contenders (run_id, primary_driver);
