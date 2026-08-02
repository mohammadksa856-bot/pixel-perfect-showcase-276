import { Link } from "@tanstack/react-router";

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
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">📊 حالة الأسواق</h2>

            <p className="text-sm text-muted-foreground">
              آخر تحديث قبل دقيقتين
            </p>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {markets.map((market) => (
            <Link
              key={market.symbol}
              to="/markets/$slug"
              params={{ slug: market.slug }}
              className="block min-w-[220px] rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {market.symbol}
                  </div>

                  <h3 className="mt-1 font-semibold">
                    {market.name}
                  </h3>
                </div>

                <div
                  className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                    market.change.startsWith("+")
                      ? "bg-green-100 text-green-700"
                      : market.change.startsWith("-")
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {market.change}
                </div>
              </div>

              <div className="mt-6 text-2xl font-bold">
                {market.value}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
