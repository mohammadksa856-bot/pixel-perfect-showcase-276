export type MarketIndex = {
  slug: string;
  name: string;
  symbol: string;
  value: string;
  change: string;
};

export const markets: MarketIndex[] = [
  { slug: "sp500", name: "S&P 500", symbol: "SPX", value: "6,420.15", change: "+0.82%" },
  { slug: "nasdaq", name: "NASDAQ", symbol: "IXIC", value: "21,320.44", change: "+1.17%" },
  { slug: "dow-jones", name: "Dow Jones", symbol: "DJI", value: "45,210.88", change: "-0.14%" },
  { slug: "brent", name: "Brent Oil", symbol: "BRENT", value: "$72.18", change: "+0.35%" },
  { slug: "gold", name: "Gold", symbol: "XAU", value: "$3,420", change: "+0.61%" },
  { slug: "bitcoin", name: "Bitcoin", symbol: "BTC", value: "$118,530", change: "+2.18%" },
  { slug: "fear-greed", name: "Fear & Greed", symbol: "FGI", value: "71", change: "Greed" },
];

export const getMarket = (slug: string): MarketIndex | undefined =>
  markets.find((m) => m.slug === slug);
