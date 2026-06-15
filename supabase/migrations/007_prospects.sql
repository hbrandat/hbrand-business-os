-- ─────────────────────────────────────────────────────────────────────────────
-- 007_prospects.sql
-- Akquise-Pipeline für hBrand.at
-- VERA legt Prospects an, Chef bearbeitet sie, bei Annahme → Customer
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prospects (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW(),

  -- Kontaktdaten (von VERA recherchiert oder manuell)
  name          TEXT          NOT NULL,           -- Ansprechpartner / Inhaber
  company       TEXT,                              -- Firmenname
  phone         TEXT,
  email         TEXT,
  website       TEXT,
  address       TEXT,
  city          TEXT          DEFAULT 'Kärnten',
  industry      TEXT,                              -- Branche (Elektriker, Arzt, ...)

  -- Pipeline-Status
  -- neu | nicht_erreicht | rueckruf | kontaktiert | mail_gesendet | interessiert | gewonnen | abgelehnt
  status        TEXT          NOT NULL DEFAULT 'neu',

  priority      TEXT          DEFAULT 'mittel',   -- hoch | mittel | niedrig
  package       TEXT,                              -- starter | professional | enterprise
  source        TEXT          DEFAULT 'vera',      -- vera | manuell | empfehlung | website

  -- Kontakt-Tracking
  rueckruf_at       TIMESTAMPTZ,                  -- wann zurückrufen
  last_contact_at   TIMESTAMPTZ,                  -- letzter Kontaktversuch
  contact_attempts  INT         DEFAULT 0,         -- Anzahl Versuche

  -- Notizen (Freitext, Gesprächsprotokoll)
  notes         TEXT,

  -- Wenn gewonnen → Referenz auf Kundendatensatz
  customer_id   UUID          REFERENCES customers(id) ON DELETE SET NULL,

  -- E-Mails bereits gesendet?
  welcome_sent  BOOLEAN       DEFAULT FALSE,
  dsgvo_sent    BOOLEAN       DEFAULT FALSE
);

-- updated_at automatisch aktualisieren
CREATE OR REPLACE FUNCTION update_prospects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_prospects_updated_at();

-- Indizes
CREATE INDEX idx_prospects_status    ON prospects(status);
CREATE INDEX idx_prospects_priority  ON prospects(priority);
CREATE INDEX idx_prospects_rueckruf  ON prospects(rueckruf_at) WHERE rueckruf_at IS NOT NULL;

-- RLS (Row Level Security) – gleich wie customers
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service-Role Vollzugriff" ON prospects
  FOR ALL USING (true) WITH CHECK (true);
