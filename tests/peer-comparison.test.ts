// اختبارات P01-15. تُشغَّل بـ `bun test tests/` ولا تحتاج شبكة ولا اعتماديات جديدة.
// البيانات في tests/fixtures ردود حقيقية من المحرك @ b70254e، لا قيم مصطنعة.
import { describe, expect, test } from "bun:test";
import banks from "./fixtures/engine-b70254e_peers_SA-1120_banks.json";
import bankDefault from "./fixtures/engine-b70254e_peers_SA-1120_default.json";
import aramco from "./fixtures/engine-b70254e_peers_SA-2222_default.json";
import {
  PEER_METRICS,
  buildPeerTable,
  companyKindFromIndustry,
  engineMarketForExchange,
  formatMetric,
  type EnginePeerResponse,
} from "../src/lib/engine/peer-comparison";
import { enginePeersEnabled, fetchPeerTable } from "../src/lib/engine/peer-comparison.server";

const clone = (r: unknown) => structuredClone(r) as EnginePeerResponse;

describe("buildPeerTable — real engine data", () => {
  const table = buildPeerTable(clone(banks), "bank");

  test("banks: available with all 5 bank metrics and 10 companies", () => {
    expect(table.status).toBe("available");
    expect(table.columns.map((c) => c.metric)).toEqual([...PEER_METRICS.bank]);
    expect(table.rows).toHaveLength(10);
    expect(table.rows[0]!.symbol).toBe("1120");
    expect(table.rows[0]!.isTarget).toBe(true);
    expect(table.basis).toBe("inferred_peers");
    expect(table.scopeLabel).toBe("Banks");
  });

  test("every shown cell has an official source and the target's period", () => {
    for (const row of table.rows) {
      for (const col of table.columns) {
        const cell = row.cells[col.metric];
        expect(cell).not.toBeNull();
        expect(cell!.sourceUrl).toMatch(/^https:\/\//);
      }
    }
    expect(new Set(table.columns.map((c) => c.periodEnd))).toEqual(new Set(["2025-12-31"]));
  });

  test("values and scale match the engine exactly (ratio → percent, no rescaling)", () => {
    const rajhi = table.rows[0]!;
    const raw = (banks as EnginePeerResponse).companies.find((c) => c.symbol === "1120")!;
    expect(rajhi.cells["cost_to_income_ratio"]!.value).toBe(
      Number(raw.metrics["cost_to_income_ratio"]!.value),
    );
    expect(rajhi.cells["cost_to_income_ratio"]!.display).toBe("23.35%");
    expect(rajhi.cells["return_on_equity"]!.display).toBe("18.66%");
  });

  test("median uses only accepted cells", () => {
    const roe = table.columns.find((c) => c.metric === "return_on_equity")!;
    const values = table.rows.map((r) => r.cells["return_on_equity"]!.value).sort((a, b) => a - b);
    expect(roe.companies).toBe(10);
    expect(roe.median).toBeCloseTo((values[4]! + values[5]!) / 2, 12);
  });

  test("engine default metrics for a bank: ordinary-company ratios are not shown", () => {
    const t = buildPeerTable(clone(bankDefault), "bank");
    expect(t.columns.map((c) => c.metric)).toEqual(["return_on_equity", "return_on_assets"]);
  });

  test("Aramco: engine says no comparable peer → panel unavailable, nothing invented", () => {
    const t = buildPeerTable(clone(aramco), "ordinary");
    expect(t.status).toBe("unavailable");
    expect(t.reason).toBe((aramco as EnginePeerResponse).reason);
    expect(t.rows).toHaveLength(0);
  });
});

describe("buildPeerTable — withholding rules", () => {
  test("peer with a different period is withheld, not compared", () => {
    const r = clone(banks);
    r.companies.find((c) => c.symbol === "1150")!.metrics["return_on_equity"]!.period_end =
      "2024-12-31";
    const t = buildPeerTable(r, "bank");
    expect(t.rows.find((x) => x.symbol === "1150")!.cells["return_on_equity"]).toBeNull();
    expect(t.withheld).toContainEqual({
      symbol: "1150",
      metric: "return_on_equity",
      reason: "period_mismatch_with_target",
    });
    expect(t.columns.find((c) => c.metric === "return_on_equity")!.companies).toBe(9);
  });

  test("currency amounts (e.g. a mis-scaled per-share value) are never compared", () => {
    const r = clone(banks);
    // نفس شكل خلل DCR-001: قيمة بوحدة عملة بدل نسبة.
    r.companies.find((c) => c.symbol === "1120")!.metrics["cost_of_risk"]!.unit = "SAR";
    const t = buildPeerTable(r, "bank");
    expect(t.columns.map((c) => c.metric)).not.toContain("cost_of_risk");
    expect(t.withheld).toContainEqual({
      symbol: "1120",
      metric: "cost_of_risk",
      reason: "unit_not_dimensionless",
    });
  });

  test("value without a source link is withheld", () => {
    const r = clone(banks);
    r.companies.find((c) => c.symbol === "1080")!.metrics["net_interest_margin"]!.provenance = null;
    const t = buildPeerTable(r, "bank");
    expect(t.rows.find((x) => x.symbol === "1080")!.cells["net_interest_margin"]).toBeNull();
  });

  test("quarterly values are not mixed into annual comparison", () => {
    const r = clone(banks);
    r.companies.find((c) => c.symbol === "1010")!.metrics["return_on_assets"]!.period_kind =
      "quarter";
    const t = buildPeerTable(r, "bank");
    expect(t.withheld).toContainEqual({
      symbol: "1010",
      metric: "return_on_assets",
      reason: "period_kind_not_annual",
    });
  });

  test("column dropped when fewer than 3 companies remain", () => {
    const r = clone(banks);
    r.companies = r.companies.filter((c) => ["1120", "1150"].includes(c.symbol));
    const t = buildPeerTable(r, "bank");
    expect(t.status).toBe("unavailable");
    expect(t.reason).toBe("too_few_companies");
  });

  test("target without a value → column dropped even if peers have it", () => {
    const r = clone(banks);
    delete r.companies.find((c) => c.is_target)!.metrics["cost_of_risk"];
    expect(buildPeerTable(r, "bank").columns.map((c) => c.metric)).not.toContain("cost_of_risk");
  });

  test("null / unavailable engine response", () => {
    expect(buildPeerTable(null, "bank").status).toBe("unavailable");
    expect(
      buildPeerTable({ ...clone(banks), status: "unavailable", reason: "x" }, "bank").reason,
    ).toBe("x");
  });
});

describe("helpers", () => {
  test("company kind", () => {
    expect(companyKindFromIndustry("Banks")).toBe("bank");
    expect(companyKindFromIndustry("Oil & Gas")).toBe("ordinary");
    expect(companyKindFromIndustry(null)).toBe("ordinary");
  });
  test("market from site exchange: Saudi only, nothing guessed", () => {
    for (const e of ["تداول", "نمو", "TADAWUL", " Tasi "])
      expect(engineMarketForExchange(e)).toBe("SA");
    for (const e of ["NASDAQ", "NYSE", "", null, undefined])
      expect(engineMarketForExchange(e)).toBeNull();
  });
  test("format", () => {
    expect(formatMetric("net_margin", 0.1234)).toBe("12.34%");
    expect(formatMetric("current_ratio", 1.5)).toBe("1.50x");
  });
});

describe("feature flag (off by default)", () => {
  const banned: typeof fetch = () => {
    throw new Error("network must not be called");
  };
  test("unset / anything but 'true' → disabled, no network call", async () => {
    for (const v of [undefined, "", "1", "TRUE", "yes"]) {
      const env = {
        ENGINE_PEERS_ENABLED: v,
        FINENGINE_API_URL: "http://x",
        FINENGINE_API_KEY: "k",
      };
      expect(enginePeersEnabled(env)).toBe(false);
      expect(await fetchPeerTable({ market: "SA", symbol: "1120" }, env, banned)).toBeNull();
    }
  });
  test("enabled but missing URL or key → null, no network call", async () => {
    expect(
      await fetchPeerTable(
        { market: "SA", symbol: "1120" },
        { ENGINE_PEERS_ENABLED: "true" },
        banned,
      ),
    ).toBeNull();
  });
  test("enabled, engine down → unavailable table, not an exception", async () => {
    const down: typeof fetch = async () => new Response("", { status: 503 });
    const env = {
      ENGINE_PEERS_ENABLED: "true",
      FINENGINE_API_URL: "http://x",
      FINENGINE_API_KEY: "k",
    };
    const t = await fetchPeerTable({ market: "SA", symbol: "1120" }, env, down);
    expect(t?.status).toBe("unavailable");
  });
});
