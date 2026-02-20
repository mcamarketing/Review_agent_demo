-- ═══════════════════════════════════════════════════════════════════════════
-- BUSINESS ARCHITECTURE ENGINE — PostgreSQL Schema v1.1
-- Run FIRST before importing any n8n workflows.
-- Usage: psql -U bae_user -d bae -f schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════════════
-- CORE PIPELINE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- ── runs: one record per full pipeline invocation ────────────────────────────
-- Created in SW-01. Status updated at each sub-workflow boundary.
CREATE TABLE IF NOT EXISTS runs (
  run_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  status           TEXT        NOT NULL DEFAULT 'pending',
  -- status enum: pending | running | judging | building | auditing | complete | failed | llm_failure
  intake           JSONB       NOT NULL,   -- raw validated client input
  weights          JSONB,                  -- computed adaptive weight vector
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  error_msg        TEXT,
  execution_ms     INTEGER     GENERATED ALWAYS AS (
    CASE WHEN completed_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (completed_at - created_at))::INTEGER * 1000
    ELSE NULL END
  ) STORED
);

COMMENT ON TABLE runs IS 'One record per BAE pipeline invocation. Root foreign key for all child tables.';
COMMENT ON COLUMN runs.status IS 'Lifecycle: pending → running → judging → building → auditing → complete | failed | llm_failure';
COMMENT ON COLUMN runs.weights IS 'Computed adaptive weight vector: {revenue, speed, automation, margin, founder_dependence}';

-- ── contenders: generated business models from SW-02 fan-out ─────────────────
CREATE TABLE IF NOT EXISTS contenders (
  contender_pk     SERIAL      PRIMARY KEY,
  run_id           UUID        NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  contender_id     TEXT        NOT NULL,   -- e.g. "C1", "C2" ... "C5"
  source_model     TEXT,                   -- e.g. "mistralai/mistral-7b-instruct:free"
  data             JSONB       NOT NULL,   -- full contender JSON object
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (run_id, contender_id)
);

COMMENT ON TABLE contenders IS 'Generated business model contenders from parallel LLM fan-out (SW-02).';
COMMENT ON COLUMN contenders.source_model IS 'OpenRouter model string that generated this contender.';

-- ── judgements: scores from the 3-judge panel (SW-03) ────────────────────────
CREATE TABLE IF NOT EXISTS judgements (
  judgement_pk     SERIAL      PRIMARY KEY,
  run_id           UUID        NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  contender_id     TEXT        NOT NULL,
  judge_role       TEXT        NOT NULL CHECK (judge_role IN ('cfo', 'systems', 'entrepreneur', 'composite')),
  raw_output       JSONB,                  -- raw LLM response before parsing
  score_output     JSONB,                  -- parsed judge JSON from LLM
  final_score      NUMERIC(5,2),           -- composite weighted score 0-100
  eliminated       BOOLEAN     DEFAULT FALSE,
  elimination_rank INTEGER,                -- 1 = worst, 2 = second worst
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE judgements IS 'Parallel judge scores from CFO, Systems Architect, Entrepreneur roles (SW-03).';

-- ── builds: deep build output per contender per refinement pass (SW-04) ──────
CREATE TABLE IF NOT EXISTS builds (
  build_pk         SERIAL      PRIMARY KEY,
  run_id           UUID        NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  contender_id     TEXT        NOT NULL,
  pass_number      INTEGER     NOT NULL DEFAULT 0,   -- 0 = initial, 1-3 = refinement passes
  build_data       JSONB       NOT NULL,              -- full BuildOutput LLM payload
  score            NUMERIC(5,2),                      -- finalScore from SCORE_BUILD_NODE
  status           TEXT        CHECK (status IN ('passed', 'refinement', 'hard_fail')),
  weak_dims        JSONB,                             -- array of dimension keys scoring < 60
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (run_id, contender_id, pass_number)
);

COMMENT ON TABLE builds IS 'Recursive deep build outputs. Up to 3 refinement passes per contender (SW-04).';

-- ── build_state: lean state table for SW-04 refinement loop ─────────────────
-- This is the critical "lean memory" table. The n8n item only carries
-- contender_id between loop iterations. All payload lives here.
-- ON CONFLICT DO UPDATE enables true UPSERT behavior for the loop.
CREATE TABLE IF NOT EXISTS build_state (
  contender_id     TEXT        PRIMARY KEY,
  run_id           UUID        NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  iteration        INTEGER     NOT NULL DEFAULT 0,
  plan_json        JSONB,                  -- current best BuildOutput from LLM
  weak_dims        JSONB,                  -- ["automation","margin"] — dimensions scoring < 60
  final_score      NUMERIC(5,2),           -- score after most recent scoring pass
  status           TEXT        CHECK (status IN ('running', 'passed', 'hard_fail')),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE build_state IS 'Lean UPSERT state for SW-04 loop. n8n items carry only contender_id; payload lives here.';

-- ── reports: final SW-05 audit output ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  report_pk        SERIAL      PRIMARY KEY,
  run_id           UUID        NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE UNIQUE,
  audit_output     JSONB,                  -- structured audit JSON from LLM
  report_md        TEXT,                   -- formatted markdown report
  final_score      NUMERIC(5,2),
  final_verdict    TEXT        CHECK (final_verdict IN ('GO', 'GO_WITH_CONDITIONS', 'NO_GO')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE reports IS 'Final GO/NO_GO audit report from SW-05. One record per completed run.';

-- ═══════════════════════════════════════════════════════════════════════════
-- RELIABILITY & OBSERVABILITY TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- ── dlq_failures: Dead Letter Queue for irrecoverable node failures ───────────
-- Populated automatically by the error branch of every HTTP Request node
-- and by the Global Error Trigger workflow.
-- NEVER let a failure vanish — it must land here.
CREATE TABLE IF NOT EXISTS dlq_failures (
  dlq_pk           SERIAL      PRIMARY KEY,
  run_id           UUID,                   -- nullable: crash may occur before run_id is assigned
  workflow_name    TEXT,                   -- e.g. "BAE_SW02_CONTENDERS"
  node_name        TEXT,                   -- e.g. "HTTP_LLM_A"
  error_code       TEXT,                   -- HTTP status code or internal code
  error_message    TEXT,
  raw_payload      JSONB,                  -- the original n8n item that caused the failure
  execution_id     TEXT,                   -- n8n execution ID for correlation in UI
  retry_count      INTEGER     DEFAULT 0,  -- how many retries were exhausted before DLQ
  resolved         BOOLEAN     DEFAULT FALSE,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE dlq_failures IS 'Dead Letter Queue. All irrecoverable node failures land here for manual review.';

-- ── errors: general structured error log for pipeline events ─────────────────
CREATE TABLE IF NOT EXISTS errors (
  error_pk         SERIAL      PRIMARY KEY,
  run_id           UUID,
  workflow_name    TEXT,
  node_name        TEXT,
  error_type       TEXT,        -- e.g. "JSON_PARSE_FAILURE", "HTTP_429", "TIMEOUT"
  error_detail     TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE errors IS 'Structured error log for pipeline monitoring and alerting.';

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- Standard B-tree indexes for frequent WHERE and JOIN operations
CREATE INDEX IF NOT EXISTS idx_runs_status          ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_created         ON runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cont_run             ON contenders(run_id);
CREATE INDEX IF NOT EXISTS idx_cont_run_id          ON contenders(run_id, contender_id);
CREATE INDEX IF NOT EXISTS idx_judge_run            ON judgements(run_id);
CREATE INDEX IF NOT EXISTS idx_judge_cont           ON judgements(contender_id);
CREATE INDEX IF NOT EXISTS idx_judge_role           ON judgements(judge_role);
CREATE INDEX IF NOT EXISTS idx_build_run            ON builds(run_id);
CREATE INDEX IF NOT EXISTS idx_build_cont_pass      ON builds(contender_id, pass_number);
CREATE INDEX IF NOT EXISTS idx_build_status         ON builds(status);
CREATE INDEX IF NOT EXISTS idx_bstate_run           ON build_state(run_id);
CREATE INDEX IF NOT EXISTS idx_bstate_status        ON build_state(status);
CREATE INDEX IF NOT EXISTS idx_dlq_run              ON dlq_failures(run_id);
CREATE INDEX IF NOT EXISTS idx_dlq_created          ON dlq_failures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dlq_resolved         ON dlq_failures(resolved);
CREATE INDEX IF NOT EXISTS idx_errors_run           ON errors(run_id);
CREATE INDEX IF NOT EXISTS idx_errors_type          ON errors(error_type);

-- GIN indexes for JSONB key-path queries
-- Enables fast: WHERE data @> '{"model_type": "SaaS"}' queries
CREATE INDEX IF NOT EXISTS idx_cont_data_gin        ON contenders USING gin(data);
CREATE INDEX IF NOT EXISTS idx_build_data_gin       ON builds USING gin(build_data);
CREATE INDEX IF NOT EXISTS idx_bstate_plan_gin      ON build_state USING gin(plan_json);
CREATE INDEX IF NOT EXISTS idx_bstate_weak_gin      ON build_state USING gin(weak_dims);
CREATE INDEX IF NOT EXISTS idx_judge_score_out_gin  ON judgements USING gin(score_output);
CREATE INDEX IF NOT EXISTS idx_runs_intake_gin      ON runs USING gin(intake);

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER VIEWS
-- ═══════════════════════════════════════════════════════════════════════════

-- Quick run summary view for monitoring dashboards
CREATE OR REPLACE VIEW vw_run_summary AS
SELECT
  r.run_id,
  r.status,
  r.created_at,
  r.completed_at,
  r.execution_ms,
  r.intake->>'business_type'                   AS business_type,
  r.intake->>'budget_usd'                      AS budget_usd,
  COUNT(DISTINCT c.contender_pk)               AS contender_count,
  COUNT(DISTINCT b.build_pk)                   AS build_count,
  rep.final_verdict,
  rep.final_score
FROM runs r
LEFT JOIN contenders c     ON c.run_id = r.run_id
LEFT JOIN builds b         ON b.run_id = r.run_id
LEFT JOIN reports rep      ON rep.run_id = r.run_id
GROUP BY r.run_id, rep.final_verdict, rep.final_score
ORDER BY r.created_at DESC;

COMMENT ON VIEW vw_run_summary IS 'Quick monitoring view: one row per run with key pipeline metrics.';

-- DLQ monitoring view — unresolved failures only
CREATE OR REPLACE VIEW vw_dlq_open AS
SELECT
  dlq_pk,
  run_id,
  workflow_name,
  node_name,
  error_code,
  error_message,
  retry_count,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS hours_open
FROM dlq_failures
WHERE resolved = FALSE
ORDER BY created_at DESC;

COMMENT ON VIEW vw_dlq_open IS 'All unresolved DLQ failures. Monitor this view for system health.';

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════
-- After running this script, verify with:
--   psql -U bae_user -d bae -c "\dt"
--   psql -U bae_user -d bae -c "\di"
--   psql -U bae_user -d bae -c "\dv"
