-- 005b: settings.value von TEXT auf JSONB migrieren (echte DB wich von Migration 001 ab)
-- + company-Objekt anlegen, das die PDF-Ansicht erwartet. Idempotent.

DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name='settings' AND column_name='value') = 'text' THEN
    ALTER TABLE public.settings
      ALTER COLUMN value TYPE JSONB USING to_jsonb(value);
  END IF;
END $$;

INSERT INTO public.settings (key, value)
VALUES ('company', '{
  "name": "HBrand.at",
  "owner": "Alexander Hillebrand",
  "email": "Alexander@hbrand.at",
  "currency": "EUR",
  "vat_id": "",
  "address": "",
  "zip_city": "",
  "phone": "",
  "iban": "",
  "bic": "",
  "bank": "",
  "kleinunternehmer": false
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
