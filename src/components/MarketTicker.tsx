// No timestamped market feed is connected. Keep stored fixtures untouched,
// but never render them as a current market ticker.
export function MarketTicker() {
  return null;
}
