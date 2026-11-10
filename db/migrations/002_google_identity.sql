-- Google ile giriş: kullanıcıya Google kimliği eklenir. Tasarım: docs/superpowers/specs/2026-11-10-ritma-google-auth-design.md

ALTER TABLE users ADD COLUMN google_sub text;
CREATE UNIQUE INDEX users_google_sub_unique ON users (google_sub) WHERE google_sub IS NOT NULL;
