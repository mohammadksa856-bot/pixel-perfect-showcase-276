import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { markets } from "@/data/markets";
import { ui, useI18n } from "@/lib/i18n";

function MarketItem({ market }: { market: (typeof markets)[number] }) {
  return (
    <Link
      to="/markets/$slug"
      params={{ slug: market.slug }}
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
    >
      <span className="font-medium">{market.name}</span>
      <span className="text-muted-foreground">{market.value}</span>
      <span
        className={cn(
          "font-semibold",
          market.change.startsWith("+")
            ? "text-tone-emerald"
            : market.change.startsWith("-")
              ? "text-tone-rose"
              : "text-tone-sky",
        )}
      >
        {market.change}
      </span>
    </Link>
  );
}

export function MarketTicker() {
  const { t } = useI18n();
  return (
    <section className="group relative overflow-hidden bg-background border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center px-4 py-4 sm:px-6">
        <span className="shrink-0 whitespace-nowrap pe-3 text-[11px] text-muted-foreground">
          {t(ui.marketsLastUpdated)}
        </span>
        <span className="me-1 h-4 w-px shrink-0 bg-border" aria-hidden />

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex w-max animate-ticker gap-1 group-hover:[animation-play-state:paused]">
            {markets.map((market) => (
              <MarketItem key={`a-${market.symbol}`} market={market} />
            ))}
            {markets.map((market) => (
              <MarketItem key={`b-${market.symbol}`} market={market} />
            ))}
            {markets.map((market) => (
              <MarketItem key={`c-${market.symbol}`} market={market} />
            ))}
          </div>
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent"
        aria-hidden
      />
    </section>
  );
}
