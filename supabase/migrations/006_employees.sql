-- ============================================================
-- Migration 006: KI-Belegschaft (Mitarbeiter + Tische/Aufgaben)
-- "Firma in einem Dashboard" — benannte KI-Mitarbeiter mit eigenem
-- Aufgabentisch. Nichts geht zum Kunden ohne Chef-Freigabe.
-- ============================================================

-- ── MITARBEITER (die digitale Belegschaft) ──
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  key TEXT UNIQUE NOT NULL,           -- stabiler Bezeichner, z.B. 'dispatcher', 'susi'
  name TEXT NOT NULL,                 -- Anzeigename, z.B. 'Susi'
  role_title TEXT NOT NULL,           -- 'Büro & Finanzen'
  emoji TEXT DEFAULT '🤖',            -- Avatar-Emoji
  color TEXT DEFAULT '#8b5cf6',       -- Akzentfarbe (Karten/Avatar)
  description TEXT,                   -- Kurzbeschreibung der Zuständigkeit
  system_prompt TEXT NOT NULL,        -- rollenspezifischer System-Prompt (das "Gehirn")
  model TEXT DEFAULT 'claude-sonnet-4', -- welches Modell der Mitarbeiter nutzt
  tools JSONB DEFAULT '[]'::jsonb,    -- erlaubte Werkzeuge, z.B. ["web_search","drive"]
  autonomy TEXT DEFAULT 'on_task' CHECK (autonomy IN ('on_task','autonomous','background')),
  -- on_task = arbeitet nur wenn was auf den Tisch kommt
  -- autonomous = darf Aufgaben selbst anstoßen (z.B. Vera sucht täglich Leads)
  -- background = Daueraufgabe im Hintergrund (z.B. Walter Monitoring)
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle','working','blocked','offline')),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 100,
  stats JSONB DEFAULT '{}'::jsonb     -- z.B. {"tasks_done": 0, "cost_usd": 0}
);

-- ── AUFGABEN (der "Tisch" jedes Mitarbeiters) ──
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  assignee UUID REFERENCES employees(id) ON DELETE SET NULL,  -- wessen Tisch
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL, -- welcher Mitarbeiter es übergab (NULL = vom Chef/System)
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  brief TEXT,                         -- die Aufgabenbeschreibung / der Input
  result TEXT,                        -- das Ergebnis (Entwurf) nach Bearbeitung
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT DEFAULT 'inbox' CHECK (status IN (
    'inbox',        -- liegt frisch auf dem Tisch
    'working',      -- Mitarbeiter arbeitet gerade dran
    'needs_chef',   -- fertig, wartet auf Chef-Freigabe/Entscheidung
    'approved',     -- Chef hat freigegeben
    'handoff',      -- an nächsten Mitarbeiter übergeben
    'done',         -- abgeschlossen
    'failed',       -- Bearbeitung gescheitert (Walter schaut hin)
    'cancelled'
  )),
  needs_approval BOOLEAN DEFAULT true, -- Chef-Gate, bevor es weitergeht
  handoff_to UUID REFERENCES employees(id) ON DELETE SET NULL, -- nächster Tisch nach Freigabe
  metadata JSONB DEFAULT '{}'::jsonb,  -- frei: Trace, Tokens, Kosten, Quelle der Anfrage
  error TEXT,                          -- Fehlertext bei status='failed'
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- Indizes für die typischen Abfragen (Tisch eines Mitarbeiters, offene Aufgaben)
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_customer ON tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC);

-- updated_at-Trigger (nutzt bestehende Funktion aus Migration 002)
DROP TRIGGER IF EXISTS trg_employees_touch ON employees;
CREATE TRIGGER trg_employees_touch BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_touch ON tasks;
CREATE TRIGGER trg_tasks_touch BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
