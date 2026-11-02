-- CampusGigs schema (PostgreSQL 13+)
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(80)  NOT NULL,
  email           VARCHAR(160) NOT NULL UNIQUE,
  password_hash   TEXT         NOT NULL,
  avatar          TEXT,
  headline        VARCHAR(120),
  bio             TEXT,
  department      VARCHAR(80),
  year_of_study   VARCHAR(20),
  skills          TEXT[]       NOT NULL DEFAULT '{}',
  portfolio_url   VARCHAR(255),
  upi_id          VARCHAR(80),
  xp              INTEGER      NOT NULL DEFAULT 0 CHECK (xp >= 0),
  balance         INTEGER      NOT NULL DEFAULT 0 CHECK (balance >= 0),
  reset_token     TEXT,
  reset_expires   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gigs (
  id               SERIAL PRIMARY KEY,
  poster_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(140) NOT NULL,
  description      TEXT NOT NULL,
  category         VARCHAR(40)  NOT NULL,
  budget           INTEGER NOT NULL CHECK (budget > 0),
  deadline         DATE,
  status           VARCHAR(20) NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','in_progress','delivered','completed','cancelled')),
  assigned_to      INTEGER REFERENCES users(id),
  accepted_bid_id  INTEGER,
  escrow_amount    INTEGER NOT NULL DEFAULT 0,
  fee_amount       INTEGER NOT NULL DEFAULT 0,
  delivery_note    TEXT,
  revision_note    TEXT,
  delivered_at     TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gigs_status   ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_gigs_poster   ON gigs(poster_id);
CREATE INDEX IF NOT EXISTS idx_gigs_assigned ON gigs(assigned_to);

CREATE TABLE IF NOT EXISTS bids (
  id             SERIAL PRIMARY KEY,
  gig_id         INTEGER NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  bidder_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount         INTEGER NOT NULL CHECK (amount > 0),
  message        TEXT,
  delivery_days  INTEGER,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gig_id, bidder_id)
);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder_id);

-- Wallet ledger. amount is the signed effect on the user's AVAILABLE balance.
CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gig_id      INTEGER REFERENCES gigs(id) ON DELETE SET NULL,
  type        VARCHAR(20) NOT NULL
              CHECK (type IN ('topup','escrow_hold','escrow_release','refund','withdrawal','bonus')),
  amount      INTEGER NOT NULL,
  label       VARCHAR(200),
  reference   VARCHAR(60),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_gig  ON transactions(gig_id);

-- CCL: gig cover image stored in S3 (URL like /api/media/gigs/xyz.jpg)
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS image_url TEXT;
