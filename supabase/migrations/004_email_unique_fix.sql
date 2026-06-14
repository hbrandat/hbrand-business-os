-- Migration 004: email Unique-Fix
-- Problem: UNIQUE(email) verhinderte mehrere Kunden ohne E-Mail (leerer String kollidiert).
-- Lösung: partieller Unique-Index — eindeutig nur, wenn email gesetzt ist.

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_email_key;

UPDATE public.customers SET email = NULL WHERE email = '';

CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique
  ON public.customers (email) WHERE email IS NOT NULL;
