-- ---------------------------------------------------------------------------
-- AeroRank — player performance schema
--
-- This project currently ships as a static single-page build with no server, so
-- the browser persists these same fields in localStorage through
-- src/state/scores.ts (see PlayerScoresRow — the column names match exactly).
--
-- Run this file on Postgres / MySQL / SQLite when you add a backend, then point
-- `setScoresAdapter()` at your API and the frontend needs no other change.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS player_scores (
  player_id         TEXT        PRIMARY KEY,          -- stable per-device/account id
  player_name       TEXT        NOT NULL,
  player_gender     TEXT        NOT NULL DEFAULT 'male' CHECK (player_gender IN ('male', 'female')),

  -- highest Final_XP ever reached, one column per game
  -- Sambisa Fighter : Final_XP = Total_Kills * 10 (76 kills = 760 XP baseline)
  -- Brick Smash     : Final_XP = (Total_Bricks * 14) + (Total_Rows_Cleared * 100)
  -- Sky Flap        : Final_XP = Gates_Cleared * 10
  -- Cliff Climber   : Final_XP = Metres_Climbed * 2
  sambisa_highscore INTEGER     NOT NULL DEFAULT 0,   -- Sambisa Fighter Final_XP
  cliff_highscore   INTEGER     NOT NULL DEFAULT 0,   -- Cliff Climber   Final_XP
  brick_highscore   INTEGER     NOT NULL DEFAULT 0,   -- Brick Smash     Final_XP
  flap_highscore    INTEGER     NOT NULL DEFAULT 0,   -- Sky Flap        Final_XP

  created_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Migration for existing installs (safe to run twice):
-- ALTER TABLE player_scores ADD COLUMN player_gender TEXT NOT NULL DEFAULT 'male';

-- Leaderboard reads: "top N for one game" stays index-only.
CREATE INDEX IF NOT EXISTS idx_player_scores_sambisa ON player_scores (sambisa_highscore DESC);
CREATE INDEX IF NOT EXISTS idx_player_scores_cliff   ON player_scores (cliff_highscore   DESC);
CREATE INDEX IF NOT EXISTS idx_player_scores_brick   ON player_scores (brick_highscore   DESC);
CREATE INDEX IF NOT EXISTS idx_player_scores_flap    ON player_scores (flap_highscore    DESC);

-- ---------------------------------------------------------------------------
-- Upsert a finished run. GREATEST() means a worse run can never lower a record,
-- which is the same rule the client applies offline.
-- Postgres / SQLite 3.24+ syntax:
-- ---------------------------------------------------------------------------
-- INSERT INTO player_scores (player_id, player_name, sambisa_highscore)
-- VALUES ($1, $2, $3)
-- ON CONFLICT (player_id) DO UPDATE SET
--   player_name       = EXCLUDED.player_name,
--   sambisa_highscore = GREATEST(player_scores.sambisa_highscore, EXCLUDED.sambisa_highscore),
--   updated_at        = CURRENT_TIMESTAMP;

-- MySQL 8 equivalent:
-- INSERT INTO player_scores (player_id, player_name, sambisa_highscore)
-- VALUES (?, ?, ?) AS new
-- ON DUPLICATE KEY UPDATE
--   player_name       = new.player_name,
--   sambisa_highscore = GREATEST(player_scores.sambisa_highscore, new.sambisa_highscore),
--   updated_at        = CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- The leaderboard maximum per game, used to normalise "Best Game" (see
-- src/lib/bestGame.ts). One row, four numbers.
-- ---------------------------------------------------------------------------
-- SELECT MAX(sambisa_highscore) AS sambisa_max,
--        MAX(cliff_highscore)   AS cliff_max,
--        MAX(brick_highscore)   AS brick_max,
--        MAX(flap_highscore)    AS flap_max
-- FROM player_scores;

-- ---------------------------------------------------------------------------
-- Optional: one row per finished run. Mirrors the GA4 events in
-- src/lib/analytics.ts so product data and your own data agree.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_runs (
  run_id        TEXT      PRIMARY KEY,
  player_id     TEXT      NOT NULL,
  game_id       TEXT      NOT NULL,   -- 'skirmish' | 'climb' | 'brick' | 'flap'
  score         INTEGER   NOT NULL,
  duration_ms   INTEGER   NOT NULL,
  is_high_score BOOLEAN   NOT NULL DEFAULT FALSE,
  started_at    TIMESTAMP NOT NULL,
  ended_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_runs_player ON game_runs (player_id, ended_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_runs_game   ON game_runs (game_id, score DESC);
