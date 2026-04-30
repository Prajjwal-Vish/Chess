-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ──────────────────────────────────────────────────

CREATE TYPE game_status AS ENUM (
  'waiting', 'active', 'paused', 'completed', 'abandoned'
);

CREATE TYPE game_mode AS ENUM (
  'online', 'local', 'vs_engine', 'analysis'
);

CREATE TYPE game_result AS ENUM (
  'white_wins', 'black_wins', 'draw', 'aborted'
);

CREATE TYPE game_termination AS ENUM (
  'checkmate', 'resignation', 'timeout', 'stalemate',
  'insufficient_material', 'threefold_repetition',
  'fifty_move_rule', 'mutual_agreement', 'abandoned', 'aborted'
);

CREATE TYPE room_status AS ENUM (
  'open', 'matched', 'expired', 'cancelled'
);

CREATE TYPE analysis_type AS ENUM (
  'position', 'game_review', 'best_move'
);

CREATE TYPE job_status AS ENUM (
  'queued', 'processing', 'completed', 'failed', 'cancelled'
);

CREATE TYPE image_job_status AS ENUM (
  'uploaded', 'preprocessing', 'inferring',
  'completed', 'failed', 'correction_pending'
);

CREATE TYPE game_event_type AS ENUM (
  'draw_offer', 'draw_accept', 'draw_decline', 'resign',
  'rematch_offer', 'rematch_accept', 'rematch_decline', 'abort_request'
);

-- ── Users & Auth ───────────────────────────────────────────

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        VARCHAR(30) UNIQUE NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255),
  rating          INTEGER NOT NULL DEFAULT 1200,
  rating_rd       FLOAT NOT NULL DEFAULT 350,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_verified     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

CREATE TABLE user_profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name    VARCHAR(50),
  avatar_url      VARCHAR(500),
  bio             TEXT,
  country_code    CHAR(2),
  games_played    INTEGER NOT NULL DEFAULT 0,
  games_won       INTEGER NOT NULL DEFAULT 0,
  games_drawn     INTEGER NOT NULL DEFAULT 0,
  games_lost      INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      VARCHAR(255) NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ,
  device_hint     VARCHAR(255)
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ── Time Controls ──────────────────────────────────────────

CREATE TABLE time_controls (
  id                SERIAL PRIMARY KEY,
  label             VARCHAR(50) NOT NULL,
  base_seconds      INTEGER NOT NULL,
  increment_seconds INTEGER NOT NULL DEFAULT 0,
  is_standard       BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO time_controls (label, base_seconds, increment_seconds, is_standard) VALUES
  ('Bullet 1+0',    60,   0,  true),
  ('Bullet 2+1',    120,  1,  true),
  ('Blitz 3+0',     180,  0,  true),
  ('Blitz 3+2',     180,  2,  true),
  ('Blitz 5+0',     300,  0,  true),
  ('Blitz 5+3',     300,  3,  true),
  ('Rapid 10+0',    600,  0,  true),
  ('Rapid 10+5',    600,  5,  true),
  ('Rapid 15+10',   900,  10, true),
  ('Classical 30+0',1800, 0,  true),
  ('Unlimited',     0,    0,  true);

-- ── Games ──────────────────────────────────────────────────

CREATE TABLE games (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  black_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  white_guest_token   VARCHAR(64),
  black_guest_token   VARCHAR(64),
  mode                game_mode NOT NULL,
  status              game_status NOT NULL DEFAULT 'waiting',
  result              game_result,
  termination         game_termination,
  time_control_id     INTEGER REFERENCES time_controls(id),
  white_rating_before INTEGER,
  black_rating_before INTEGER,
  white_rating_after  INTEGER,
  black_rating_after  INTEGER,
  current_fen         VARCHAR(100) NOT NULL DEFAULT
                        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  starting_fen        VARCHAR(100) NOT NULL DEFAULT
                        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn                 TEXT,
  move_count          INTEGER NOT NULL DEFAULT 0,
  white_clock_ms      INTEGER,
  black_clock_ms      INTEGER,
  last_move_at        TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  rematch_game_id     UUID REFERENCES games(id),
  engine_skill_level  SMALLINT,
  engine_color        CHAR(1),
  invite_code         VARCHAR(12) UNIQUE,
  is_private          BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_games_white_user ON games(white_user_id);
CREATE INDEX idx_games_black_user ON games(black_user_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_created ON games(created_at DESC);
CREATE INDEX idx_games_invite_code ON games(invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX idx_games_active ON games(status) WHERE status = 'active';
CREATE INDEX idx_games_user_recent ON games(white_user_id, created_at DESC);
CREATE INDEX idx_games_user_recent_b ON games(black_user_id, created_at DESC);

-- ── Moves ──────────────────────────────────────────────────

CREATE TABLE moves (
  id              BIGSERIAL PRIMARY KEY,
  game_id         UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  move_number     SMALLINT NOT NULL,
  color           CHAR(1) NOT NULL CHECK (color IN ('w', 'b')),
  ply             SMALLINT NOT NULL,
  san             VARCHAR(10) NOT NULL,
  uci             VARCHAR(5) NOT NULL,
  fen_after       VARCHAR(100) NOT NULL,
  clock_white_ms  INTEGER,
  clock_black_ms  INTEGER,
  time_spent_ms   INTEGER,
  is_book         BOOLEAN DEFAULT false,
  annotation      TEXT,
  nag             SMALLINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, ply)
);

CREATE INDEX idx_moves_game ON moves(game_id, ply);

-- ── Game Rooms ─────────────────────────────────────────────

CREATE TABLE game_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         UUID REFERENCES games(id),
  creator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  invite_code     VARCHAR(12) UNIQUE NOT NULL,
  time_control_id INTEGER REFERENCES time_controls(id),
  mode            game_mode NOT NULL,
  is_private      BOOLEAN NOT NULL DEFAULT false,
  status          room_status NOT NULL DEFAULT 'open',
  creator_color   CHAR(1),
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rooms_status ON game_rooms(status) WHERE status = 'open';
CREATE INDEX idx_rooms_invite ON game_rooms(invite_code);
CREATE INDEX idx_rooms_expires ON game_rooms(expires_at);

-- ── Game Events ────────────────────────────────────────────

CREATE TABLE game_events (
  id              BIGSERIAL PRIMARY KEY,
  game_id         UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),
  event_type      game_event_type NOT NULL,
  payload         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_events_game ON game_events(game_id, created_at DESC);

-- ── Analysis ───────────────────────────────────────────────

CREATE TABLE analysis_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  game_id         UUID REFERENCES games(id) ON DELETE SET NULL,
  analysis_type   analysis_type NOT NULL,
  input_fen       VARCHAR(100),
  depth           SMALLINT NOT NULL DEFAULT 20,
  multipv         SMALLINT NOT NULL DEFAULT 1,
  status          job_status NOT NULL DEFAULT 'queued',
  priority        SMALLINT NOT NULL DEFAULT 5,
  queued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  cache_key       VARCHAR(64) UNIQUE
);

CREATE INDEX idx_analysis_user ON analysis_requests(user_id);
CREATE INDEX idx_analysis_game ON analysis_requests(game_id);
CREATE INDEX idx_analysis_status ON analysis_requests(status)
  WHERE status IN ('queued', 'processing');
CREATE INDEX idx_analysis_cache ON analysis_requests(cache_key)
  WHERE cache_key IS NOT NULL;

CREATE TABLE engine_evaluations (
  id              BIGSERIAL PRIMARY KEY,
  analysis_id     UUID NOT NULL REFERENCES analysis_requests(id) ON DELETE CASCADE,
  game_id         UUID REFERENCES games(id),
  move_ply        SMALLINT,
  fen             VARCHAR(100) NOT NULL,
  depth_reached   SMALLINT NOT NULL,
  score_cp        INTEGER,
  score_mate      INTEGER,
  best_move_uci   VARCHAR(5),
  pv_line         TEXT,
  nodes_searched  BIGINT,
  time_ms         INTEGER,
  multipv_lines   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evals_analysis ON engine_evaluations(analysis_id);
CREATE INDEX idx_evals_game_ply ON engine_evaluations(game_id, move_ply);

-- ── Image to FEN (Snapfen placeholder) ────────────────────

CREATE TABLE board_image_uploads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  object_key          VARCHAR(500) NOT NULL,
  original_filename   VARCHAR(255),
  file_size_bytes     INTEGER,
  mime_type           VARCHAR(50),
  status              image_job_status NOT NULL DEFAULT 'uploaded',
  inferred_fen        VARCHAR(100),
  confidence          FLOAT,
  corrected_fen       VARCHAR(100),
  active_color        CHAR(1),
  castling_rights     VARCHAR(4),
  error_message       TEXT,
  spawned_game_id     UUID REFERENCES games(id),
  spawned_analysis_id UUID REFERENCES analysis_requests(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_image_uploads_user ON board_image_uploads(user_id);
CREATE INDEX idx_image_uploads_status ON board_image_uploads(status);