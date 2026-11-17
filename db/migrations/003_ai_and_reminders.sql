-- Doğal dille randevu asistanı ve randevu öncesi e-posta bildirimi şema değişiklikleri.
-- Tasarım: docs/superpowers/specs/2026-11-12-ritma-ai-assistant-and-reminders-design.md

ALTER TABLE users
  ADD COLUMN reminder_minutes_before integer DEFAULT 30
  CHECK (reminder_minutes_before IN (15, 30, 60));

ALTER TABLE appointments
  ADD COLUMN reminder_sent_at timestamptz;

CREATE TABLE reminder_notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  appointment_id text NOT NULL REFERENCES appointments (id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reminder_notifications_user_sent_idx
  ON reminder_notifications (user_id, sent_at DESC);
