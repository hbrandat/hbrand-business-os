-- 008_prospect_analysis.sql
-- Website-Analyse Felder für Prospects (LUKAS-Agent)

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS website_analysis JSONB,
  ADD COLUMN IF NOT EXISTS demo_page_html   TEXT,
  ADD COLUMN IF NOT EXISTS analysis_at      TIMESTAMPTZ;
