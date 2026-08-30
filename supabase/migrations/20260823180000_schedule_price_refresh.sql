-- Schedules the refresh-prices Edge Function on two independent cadences:
-- Saudi tickers (Yahoo) every 15 minutes, US tickers (WiseSheets) every
-- minute — the fastest a polling cron job can reasonably run, since true
-- push/WebSocket-level "instant" pricing needs a different architecture
-- entirely (an always-on connection, not a scheduled function).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('refresh-prices-job');

select cron.schedule(
  'refresh-prices-sa-job',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://ldiimsktlnbqbzddmbgl.supabase.co/functions/v1/refresh-prices?market=sa',
    headers := jsonb_build_object(
      'apikey', 'sb_publishable_vdGsdTI7qGGYORNuPyoNvQ_5k-ZhrJE',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'refresh-prices-us-job',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://ldiimsktlnbqbzddmbgl.supabase.co/functions/v1/refresh-prices?market=us',
    headers := jsonb_build_object(
      'apikey', 'sb_publishable_vdGsdTI7qGGYORNuPyoNvQ_5k-ZhrJE',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
