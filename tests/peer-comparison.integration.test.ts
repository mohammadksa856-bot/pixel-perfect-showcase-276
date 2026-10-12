// تكامل P01-15 مع API المحرك الحقيقي على localhost. يُتخطّى إن لم يُضبط ENGINE_IT_URL.
// تشغيل: انظر product-tracking/tools/p01_15_integration.sh
import { describe, expect, test } from "bun:test";
import { fetchPeerTable } from "../src/lib/engine/peer-comparison.server";

const url = process.env["ENGINE_IT_URL"];
const key = process.env["ENGINE_IT_KEY"];
const env = { ENGINE_PEERS_ENABLED: "true", FINENGINE_API_URL: url, FINENGINE_API_KEY: key };

describe.skipIf(!url || !key)("engine API integration", () => {
  test("Al Rajhi: bank metric set, 10 banks, single period, sourced", async () => {
    const t = await fetchPeerTable({ market: "SA", symbol: "1120" }, env);
    expect(t?.status).toBe("available");
    expect(t!.kind).toBe("bank");
    expect(t!.columns.length).toBe(5);
    expect(t!.rows.length).toBe(10);
    expect(new Set(t!.columns.map((c) => c.periodEnd)).size).toBe(1);
    for (const r of t!.rows)
      for (const c of Object.values(r.cells)) expect(c?.evidence.sourceUrl).toMatch(/^https:\/\//);
  });

  test("every enabled bank resolves to the same 10-bank universe", async () => {
    for (const s of ["1180", "1010", "1050", "1060", "1080", "1140", "1150", "1020", "1030"]) {
      const t = await fetchPeerTable({ market: "SA", symbol: s }, env);
      expect(t?.status).toBe("available");
      expect(t!.rows[0]!.symbol).toBe(s);
      expect(t!.rows.length).toBe(10);
    }
  });

  test("Aramco and SABIC: unavailable, not padded", async () => {
    for (const s of ["2222", "2010"]) {
      const t = await fetchPeerTable({ market: "SA", symbol: s }, env);
      expect(t?.status).toBe("unavailable");
      expect(t!.rows.length).toBe(0);
    }
  });

  test("unknown company → unavailable, no throw", async () => {
    const t = await fetchPeerTable({ market: "SA", symbol: "4190" }, env);
    expect(t?.status).toBe("unavailable");
  });

  test("wrong API key → unavailable, never falls back to other data", async () => {
    const t = await fetchPeerTable(
      { market: "SA", symbol: "1120" },
      { ...env, FINENGINE_API_KEY: "wrong" },
    );
    expect(t?.status).toBe("unavailable");
  });
});
