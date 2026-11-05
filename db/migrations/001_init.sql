-- Ritma ilk şema. Tasarım: docs/superpowers/specs/2026-11-05-ritma-database-design.md

-- Çakışma kısıtı (EXCLUDE) için gerekli; her şemada görünsün diye public'e kurulur.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

CREATE TABLE users (
  id           text PRIMARY KEY,
  email        text NOT NULL,
  display_name text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE customers (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users (id),
  first_name text NOT NULL,
  last_name  text NOT NULL,
  birth_date date NOT NULL,
  gender     text NOT NULL CHECK (gender IN ('female', 'male', 'other', 'undisclosed')),
  deleted_at timestamptz
);
CREATE INDEX customers_active_by_user ON customers (user_id) WHERE deleted_at IS NULL;

CREATE TABLE appointments (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES users (id),
  customer_id text NOT NULL REFERENCES customers (id),
  date        date NOT NULL,
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  status      text NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  note        text NOT NULL DEFAULT '',
  CHECK (end_time > start_time),
  -- Aynı kullanıcının iptal edilmemiş randevuları aynı saat aralığına giremez.
  -- Aralık yarı açıktır: 10:00-11:00 ile 11:00-12:00 çakışmaz.
  EXCLUDE USING gist (
    user_id WITH =,
    tsrange(date + start_time, date + end_time) WITH &&
  ) WHERE (status <> 'cancelled')
);
CREATE INDEX appointments_by_user_date ON appointments (user_id, date);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
