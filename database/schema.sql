-- StellarGuard Database Schema
-- PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Wallets ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key       VARCHAR(56) UNIQUE NOT NULL,
  encrypted_secret TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Organisations ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organisations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(255) NOT NULL,
  owner_id             UUID NOT NULL REFERENCES users(id),
  treasury_public_key  VARCHAR(56) UNIQUE NOT NULL,
  treasury_secret_enc  TEXT NOT NULL,
  threshold_med        INTEGER NOT NULL DEFAULT 2,  -- signatures needed for payments
  threshold_high       INTEGER NOT NULL DEFAULT 3,  -- signatures needed for account changes
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Members ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL DEFAULT 'signer' CHECK (role IN ('owner','admin','signer','viewer')),
  signing_weight  INTEGER NOT NULL DEFAULT 1,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- ─── Proposals ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  proposer_id     UUID NOT NULL REFERENCES users(id),
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  to_address      VARCHAR(56) NOT NULL,
  amount          NUMERIC(20,7) NOT NULL,
  asset           VARCHAR(20) NOT NULL DEFAULT 'XLM',
  status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','executed','expired')),
  votes_for       INTEGER NOT NULL DEFAULT 0,
  votes_against   INTEGER NOT NULL DEFAULT 0,
  stellar_hash    VARCHAR(64),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '72 hours',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Votes ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL REFERENCES users(id),
  vote        VARCHAR(10) NOT NULL CHECK (vote IN ('approve','reject')),
  weight      INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(proposal_id, voter_id)
);

-- ─── Payroll Schedules ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_schedules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  employee_name     VARCHAR(255) NOT NULL,
  employee_address  VARCHAR(56) NOT NULL,
  amount            NUMERIC(20,7) NOT NULL,
  asset             VARCHAR(20) NOT NULL DEFAULT 'XLM',
  frequency         VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly','biweekly','monthly')),
  next_run_at       TIMESTAMPTZ NOT NULL,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Payroll Runs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id  UUID NOT NULL REFERENCES payroll_schedules(id),
  org_id       UUID NOT NULL REFERENCES organisations(id),
  amount       NUMERIC(20,7) NOT NULL,
  asset        VARCHAR(20) NOT NULL,
  stellar_hash VARCHAR(64),
  status       VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed')),
  ran_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Audit Log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID REFERENCES organisations(id),
  actor_id     UUID REFERENCES users(id),
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(50),
  entity_id    UUID,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_members_org      ON members(org_id);
CREATE INDEX IF NOT EXISTS idx_members_user     ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_org    ON proposals(org_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_votes_proposal   ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_payroll_org      ON payroll_schedules(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_next     ON payroll_schedules(next_run_at) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_org        ON audit_log(org_id);
