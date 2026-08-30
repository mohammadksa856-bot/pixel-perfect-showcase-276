# Data fixes

Confirmed corrections to data pulled from WiseSheets/FMP that must survive
future data refreshes.

## Why this exists

Every financial figure on the site is pulled from an external source
(WiseSheets, FMP) at import time. When a hand-verified check against
Tadawul/Argaam/a company's own earnings release finds the source was
wrong, patching Supabase directly only fixes it until the next import
overwrites it with the same wrong value again.

- `overrides.py` — the confirmed-correct values, each with its source.
- `apply_overrides.py` — re-applies all of them. **Run this after any
  bulk financial-data refresh** (a new Excel/WiseSheets pull, a fresh
  FMP import) so a known-wrong source value can't quietly come back.

```bash
python apply_overrides.py --dry-run   # preview
python apply_overrides.py             # apply for real
```

Needs `SUPABASE_URL` and `SUPABASE_KEY` (a write-capable key, not the
publishable one) set as environment variables.

## Adding a new correction

When you find and verify a new data error:

1. Add it to the right dict in `overrides.py`, with a source comment.
2. Fix the live value the same way `apply_overrides.py` would (or just
   run the script).
3. Never patch Supabase for a confirmed-wrong source value without also
   adding it here — otherwise the next refresh silently undoes the fix.

Separately, `../supabase/functions/refresh-prices/index.ts` recomputes
P/E and P/B live from the current market cap every time it runs, instead
of relying on a static value from the last import — that class of bug
(a valuation multiple going stale as price moves) doesn't need an entry
here, only revenue/shares/balance-sheet corrections do.
