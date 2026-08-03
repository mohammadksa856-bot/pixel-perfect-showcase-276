import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { markets } from "@/data/markets";

export function MarketTicker() {
  return (
    <section className="bg-background border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2.5 sm:px-6">
        <span className="shrink-0 whitespace-nowrap ps-1 text-[11px] text-muted-foreground">
          آخر تحديث قبل دقيقتين
        </span>
        <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />
        {markets.map((market) => (
          <Link
            key={market.symbol}
            to="/markets/$slug"
            params={{ slug: market.slug }}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs transition-colors hover:bg-muted"
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
        ))}
      </div>
    </section>
  );
}
