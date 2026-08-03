import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const markets = [
  {
    slug: "sp500",
    name: "S&P 500",
    symbol: "SPX",
    value: "6,420.15",
    change: "+0.82%",
  },
  {
    slug: "nasdaq",
    name: "NASDAQ",
    symbol: "IXIC",
    value: "21,320.44",
    change: "+1.17%",
  },
  {
    slug: "dow-jones",
    name: "Dow Jones",
    symbol: "DJI",
    value: "45,210.88",
    change: "-0.14%",
  },
  {
    slug: "brent",
    name: "Brent Oil",
    symbol: "BRENT",
    value: "$72.18",
    change: "+0.35%",
  },
  {
    slug: "gold",
    name: "Gold",
    symbol: "XAU",
    value: "$3,420",
    change: "+0.61%",
  },
  {
    slug: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    value: "$118,530",
    change: "+2.18%",
  },
  {
    slug: "fear-greed",
    name: "Fear & Greed",
    symbol: "FGI",
    value: "71",
    change: "Greed",
  },
];

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
