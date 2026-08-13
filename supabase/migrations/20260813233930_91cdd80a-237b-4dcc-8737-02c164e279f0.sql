ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS ceo jsonb,
  ADD COLUMN IF NOT EXISTS founded_year integer,
  ADD COLUMN IF NOT EXISTS headquarters jsonb,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS executive_summary jsonb,
  ADD COLUMN IF NOT EXISTS stock_performance jsonb,
  ADD COLUMN IF NOT EXISTS competitors jsonb,
  ADD COLUMN IF NOT EXISTS financial_health jsonb,
  ADD COLUMN IF NOT EXISTS growth_outlook jsonb,
  ADD COLUMN IF NOT EXISTS dividends jsonb;