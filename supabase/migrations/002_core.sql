-- ============================================================
-- HBrand.at Business OS — Core Migration 002
-- Vollständiger Lebenszyklus: Kontakt → Lead → Auftrag → Zeit → Rechnung → Support
-- ============================================================

-- ---------- ERWEITERUNGEN BESTEHENDER TABELLEN ----------

-- Kunden: Pipeline / Erstkontakt-Tracking
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS source text;            -- woher kam der Kontakt (Empfehlung, Website, Telegram...)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tags text[];            -- frei wählbare Schlagworte
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS vat_id text;            -- UID-Nummer
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS first_contact_at timestamptz DEFAULT now();

-- Aufträge: Pipeline-Stufe + Priorität
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stage text DEFAULT 'kontakt';   -- kontakt|angebot|zusage|in_arbeit|review|abgeschlossen
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal'; -- niedrig|normal|hoch|dringend
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tags text[];

-- ---------- ACTIVITIES (universelle Timeline) ----------
-- Jede relevante Aktion im System landet hier. Das ist das Rückgrat
-- für die lückenlose Historie pro Kunde und pro Auftrag.
CREATE TABLE IF NOT EXISTS public.activities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  text NOT NULL,            -- 'customer' | 'order' | 'invoice' | 'ticket'
  entity_id    uuid NOT NULL,
  customer_id  uuid REFERENCES public.customers(id) ON DELETE CASCADE,  -- denormalisiert für schnelle Kunden-Timeline
  type         text NOT NULL,            -- 'note'|'status_change'|'email'|'call'|'meeting'|'file'|'invoice'|'payment'|'ticket'|'system'
  title        text NOT NULL,
  description  text,
  metadata     jsonb DEFAULT '{}'::jsonb,
  created_by   text DEFAULT 'Alexander',
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activities_entity   ON public.activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_customer ON public.activities(customer_id, created_at DESC);

-- ---------- ORDER ITEMS (Positionen) ----------
CREATE TABLE IF NOT EXISTS public.order_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity    numeric DEFAULT 1,
  unit        text DEFAULT 'Stk',        -- Stk|Std|Pauschal
  unit_price  numeric NOT NULL DEFAULT 0,
  position    int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id, position);

-- ---------- TIME ENTRIES (Zeiterfassung) ----------
CREATE TABLE IF NOT EXISTS public.time_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  description text NOT NULL,
  minutes     int NOT NULL DEFAULT 0,
  billable    boolean DEFAULT true,
  entry_date  date DEFAULT current_date,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_time_entries_order ON public.time_entries(order_id, entry_date DESC);

-- ---------- TICKETS (Support) ----------
CREATE TABLE IF NOT EXISTS public.tickets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id     uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ticket_number text UNIQUE,
  subject      text NOT NULL,
  description  text,
  status       text DEFAULT 'offen',     -- offen|in_bearbeitung|wartet_kunde|gelöst|geschlossen
  priority     text DEFAULT 'normal',    -- niedrig|normal|hoch|dringend
  channel      text DEFAULT 'dashboard', -- dashboard|email|telefon|telegram
  assigned_to  text DEFAULT 'Alexander',
  resolved_at  timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON public.tickets(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status   ON public.tickets(status);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender     text NOT NULL,              -- 'Alexander' | Kundenname | 'KI'
  is_internal boolean DEFAULT false,     -- interne Notiz vs. an Kunde sichtbar
  body       text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages(ticket_id, created_at);

-- ---------- CUSTOMER FILES (Google Drive) ----------
CREATE TABLE IF NOT EXISTS public.customer_files (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id    uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  name        text NOT NULL,             -- aktueller (ggf. KI-vergebener) Dateiname
  original_name text,                    -- ursprünglicher Name vor KI-Benennung
  drive_id    text,                      -- Google Drive File ID
  drive_url   text,
  mime_type   text,
  size_bytes  bigint,
  ai_named    boolean DEFAULT false,     -- wurde der Name von der KI vergeben?
  category    text,                      -- Angebot|Rechnung|Vertrag|Foto|Sonstiges
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_files_customer ON public.customer_files(customer_id);

-- ---------- SEQUENCES für Nummerierung ----------
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;

-- ---------- updated_at Trigger ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tickets_touch ON public.tickets;
CREATE TRIGGER trg_tickets_touch BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
