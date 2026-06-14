-- ============================================
-- HBrand.at Business OS — Datenbank Schema v1
-- ============================================

-- KUNDEN
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'AT',
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lead')),
  color TEXT -- für UI-Kennzeichnung
);

-- AUFTRÄGE
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'fixed' CHECK (type IN ('fixed', 'hourly', 'subscription')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  price NUMERIC(10,2),
  hours_budget NUMERIC(8,2),
  hours_used NUMERIC(8,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  telegram_notify BOOLEAN DEFAULT true,
  notes TEXT
);

-- RECHNUNGEN
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES customers(id),
  invoice_number TEXT UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT
);

-- KI JOBS (welche KI macht was)
CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  job_type TEXT NOT NULL, -- 'analysis', 'document', 'email', 'code', 'drive'
  model TEXT NOT NULL,    -- 'claude-opus-4-8', 'claude-sonnet-4', 'claude-haiku-3-5'
  provider TEXT DEFAULT 'anthropic',
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  duration_ms INTEGER,
  status TEXT DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
  prompt_summary TEXT,
  result_summary TEXT
);

-- API KOSTEN (monatliche Übersicht)
CREATE TABLE IF NOT EXISTS api_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  month DATE NOT NULL, -- erster Tag des Monats
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  total_input_tokens BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,
  total_cost_usd NUMERIC(10,4) DEFAULT 0,
  total_cost_eur NUMERIC(10,4) DEFAULT 0
);

-- TELEGRAM NACHRICHTEN LOG
CREATE TABLE IF NOT EXISTS telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  direction TEXT CHECK (direction IN ('in', 'out')),
  chat_id TEXT,
  message TEXT,
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES customers(id),
  processed BOOLEAN DEFAULT false
);

-- GOOGLE DRIVE DATEIEN
CREATE TABLE IF NOT EXISTS drive_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  drive_file_id TEXT UNIQUE,
  name TEXT NOT NULL,
  mime_type TEXT,
  folder_path TEXT,
  url TEXT,
  size_bytes BIGINT
);

-- EINSTELLUNGEN
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUTOMATISCHE updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- INDIZES für Performance
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_customer ON ai_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created ON ai_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_costs_month ON api_costs(month);
CREATE INDEX IF NOT EXISTS idx_drive_files_customer ON drive_files(customer_id);

-- BEISPIELDATEN (Kostenkontrolle Modelle)
INSERT INTO settings (key, value) VALUES 
('ai_pricing', '{
  "claude-opus-4-8":   {"input": 15.00, "output": 75.00},
  "claude-sonnet-4":   {"input": 3.00,  "output": 15.00},
  "claude-haiku-3-5":  {"input": 0.80,  "output": 4.00}
}'::jsonb),
('company', '{
  "name": "HBrand.at",
  "owner": "Alexander Hillebrand",
  "email": "Alexander@hbrand.at",
  "currency": "EUR",
  "vat_id": ""
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
