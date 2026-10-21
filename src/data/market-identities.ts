// Route labels only: deliberately no sample quotes in the public module graph.
const identities = [
  { slug: "sp500", name: "S&P 500", symbol: "SPX" },
  { slug: "nasdaq", name: "NASDAQ", symbol: "IXIC" },
  { slug: "dow-jones", name: "Dow Jones", symbol: "DJI" },
  { slug: "brent", name: "Brent Oil", symbol: "BRENT" },
  { slug: "gold", name: "Gold", symbol: "XAU" },
  { slug: "bitcoin", name: "Bitcoin", symbol: "BTC" },
  { slug: "fear-greed", name: "Fear & Greed", symbol: "FGI" },
];

export const getMarketIdentity = (slug: string) =>
  identities.find((market) => market.slug === slug);
