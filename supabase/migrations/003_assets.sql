-- ============================================================
-- HBrand.at Business OS — Migration 003: Asset-Maschine
-- "Kunde sagt 'ich brauche X' → fertiges professionelles Dokument in Minuten"
-- Agenten-Pipeline: Intake → Content → Format → Qualität → Sales → Freigabe
-- ============================================================

CREATE TABLE IF NOT EXISTS public.assets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id     uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type         text NOT NULL,            -- angebot|rechnung|stellenanzeige|newsletter|datenschutz|social_post|website_konzept|sonstiges
  title        text NOT NULL,
  brief        text,                     -- ursprünglicher Auftrag / Eingabe des Kunden
  content      text,                     -- generierter Inhalt (Markdown)
  format       text DEFAULT 'markdown',  -- markdown|html
  -- Freigabe-Gate: NICHTS geht nach außen ohne Status 'freigegeben'
  status       text DEFAULT 'entwurf',   -- entwurf|in_review|freigegeben|versendet|abgelehnt
  version      int  DEFAULT 1,
  model        text,                     -- welches KI-Modell hat generiert
  metadata     jsonb DEFAULT '{}'::jsonb,
  approved_at  timestamptz,
  approved_by  text,
  sent_at      timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assets_customer ON public.assets(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_status   ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_type     ON public.assets(type);

-- Versionshistorie: jede Regenerierung/Überarbeitung wird festgehalten
CREATE TABLE IF NOT EXISTS public.asset_versions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id   uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  version    int NOT NULL,
  content    text,
  note       text,                       -- was geändert wurde / welche Agenten-Stufe
  created_by text DEFAULT 'KI',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asset_versions ON public.asset_versions(asset_id, version DESC);

-- updated_at Trigger (Funktion existiert bereits aus Migration 002)
DROP TRIGGER IF EXISTS trg_assets_touch ON public.assets;
CREATE TRIGGER trg_assets_touch BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
