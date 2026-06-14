-- Migration 005: Rechnungs-Modul vervollständigen
-- Erweitert invoices um §11-UStG-Pflichtfelder + Positionen + Auto-Nummerierung.
-- Idempotent: kann gefahrlos mehrfach laufen.

-- 1. invoices um fehlende Felder erweitern
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS net_amount   NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount   NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 20;

-- Schema-Drift bereinigen: alte Spalte tax_percent (durch tax_rate ersetzt) entfernen
ALTER TABLE public.invoices DROP COLUMN IF EXISTS tax_percent;

-- order_id darf NULL sein (freie Rechnungen ohne Auftrag), amount default 0
ALTER TABLE public.invoices ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN amount DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN amount SET DEFAULT 0;

-- 2. Rechnungspositionen
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'Stk',
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- 3. updated_at-Trigger (Funktion defensiv definieren — selbstheilend, falls 001/002 nicht vollständig liefen)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_touch ON public.invoices;
CREATE TRIGGER trg_invoices_touch BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Auto-Rechnungsnummer: Format RE-YYYY-#### (laufend pro Jahr)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'RE-' || to_char(COALESCE(NEW.issue_date, CURRENT_DATE), 'YYYY')
      || '-' || lpad(nextval('invoice_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_number ON public.invoices;
CREATE TRIGGER trg_invoices_number BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number();

-- 5. company-Settings vervollständigen (Rechnungskopf/-fuß). Bestehende Werte bleiben erhalten.
UPDATE public.settings
SET value = '{
  "address": "",
  "zip_city": "",
  "phone": "",
  "iban": "",
  "bic": "",
  "bank": "",
  "kleinunternehmer": false
}'::jsonb || value
WHERE key = 'company';
