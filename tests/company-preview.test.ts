// اختبارات P02: نموذج عرض صفحة الشركة من المحرك. تُشغَّل بـ `bun test tests/`.
// البيانات ردود حقيقية من المحرك @ b70254e (tests/fixtures/p02)؛ حالات النقص تُصنع بتعديل نسخة منها.
import { describe, expect, test } from "bun:test";
import { stripIsolates } from "../src/lib/bidi";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import {
  buildCompanyPreview,
  companyKind,
  contractProblems,
  formatValue,
  periodOf,
  unitConflict,
  type Block,
  type CompanyPreview,
  type EnginePage,
  type MetricGroup,
  type ValueCell,
} from "../src/lib/engine/company-preview";
import {
  enginePreviewEnabled,
  fetchCompanyPreview,
} from "../src/lib/engine/company-preview.server";

const load = (s: string): EnginePage =>
  JSON.parse(
    gunzipSync(
      readFileSync(new URL(`./fixtures/p02/engine-b70254e_page_SA-${s}.json.gz`, import.meta.url)),
    ).toString(),
  );
const PAGES = { "2222": load("2222"), "1120": load("1120"), "8010": load("8010") };
const clone = (s: keyof typeof PAGES) => structuredClone(PAGES[s]);

const groups = (v: CompanyPreview): MetricGroup[] =>
  v.topics.flatMap((t) => t.blocks).flatMap((b) => (b.type === "metrics" ? [b.group] : []));
const group = (v: CompanyPreview, id: string) => groups(v).find((g) => g.id === id)!;
const cells = (v: CompanyPreview): ValueCell[] => groups(v).flatMap((g) => g.cells);
const cell = (v: CompanyPreview, groupId: string, key: string) =>
  group(v, groupId)?.cells.find((c) => c.key === key);
const topic = (v: CompanyPreview, ordinal: number) => v.topics.find((t) => t.ordinal === ordinal)!;
const blocksOf = <T extends Block["type"]>(v: CompanyPreview, type: T) =>
  v.topics
    .flatMap((t) => t.blocks)
    .filter((b): b is Extract<Block, { type: T }> => b.type === type);

describe("API contract (real engine responses)", () => {
  for (const [s, page] of Object.entries(PAGES))
    test(`${s}: contract v4 with no-placeholder policy and all required sections`, () => {
      expect(contractProblems(page)).toEqual([]);
      expect(page.data_quality.understanding.categories).toHaveLength(18);
    });

  test("contract drift is detected, never guessed around", () => {
    const p = clone("2222") as unknown as Record<string, unknown>;
    p["contract_version"] = 6; // 4 و5 مدعومان
    expect(contractProblems(p)).toContain("contract_version");
    expect(() => buildCompanyPreview(p as unknown as EnginePage)).toThrow(/contract mismatch/);
    const q = clone("2222") as unknown as { placeholder_policy?: string };
    delete q.placeholder_policy;
    expect(contractProblems(q)).toContain("placeholder_policy");
    expect(contractProblems(null)).toEqual(["not_an_object"]);
  });
});

describe("three companies, three business models", () => {
  const aramco = buildCompanyPreview(clone("2222"));
  const rajhi = buildCompanyPreview(clone("1120"));
  const tawuniya = buildCompanyPreview(clone("8010"));

  test("company kind follows the engine's reviewed industry", () => {
    expect([aramco.kind, rajhi.kind, tawuniya.kind]).toEqual(["ordinary", "bank", "insurer"]);
    expect(companyKind("Banks")).toBe("bank");
    expect(companyKind("Insurance")).toBe("insurer");
    expect(companyKind(null)).toBe("ordinary");
  });

  test("all 18 topics, in order, with engine-derived statuses", () => {
    for (const v of [aramco, rajhi, tawuniya]) {
      expect(v.topics.map((t) => t.ordinal)).toEqual([...Array(18)].map((_, i) => i + 1));
      for (const t of v.topics)
        expect(["available", "partial", "unavailable", "not_measured", "not_applicable"]).toContain(
          t.status,
        );
    }
    const engineStatus = (s: keyof typeof PAGES, ord: number) =>
      PAGES[s].data_quality.understanding.categories.find((c) => c.ordinal === ord)!.status;
    const map = { complete: "available", partial: "partial", missing: "unavailable" } as const;
    for (const ord of [1, 5, 7, 14, 17])
      expect(topic(aramco, ord).status).toBe(map[engineStatus("2222", ord) as keyof typeof map]);
  });

  test("every unavailable or partial topic carries at least one readable reason", () => {
    for (const v of [aramco, rajhi, tawuniya])
      for (const t of v.topics.filter(
        (x) => x.status === "unavailable" || x.status === "partial",
      )) {
        expect(t.reasons.length).toBeGreaterThan(0);
        for (const r of t.reasons) expect(r.ar.length && r.en.length).toBeTruthy();
      }
  });

  test("no topic is marked not applicable for these three (no approved topic-level rule)", () => {
    for (const v of [aramco, rajhi, tawuniya])
      expect(v.topics.some((t) => t.status === "not_applicable")).toBe(false);
  });

  test("Aramco: income FY2025, balance as of interim date, quarter labelled as single quarter", () => {
    const rev = cell(aramco, "income", "revenue")!;
    expect(rev.period).toMatchObject({ kind: "fy", end: "2025-12-31" });
    expect(stripIsolates(rev.period.label.ar)).toBe("السنة المالية 2025");
    expect(stripIsolates(rev.display.ar)).toBe("1,559.34 مليار ريال");
    expect(rev.proof.kind).toBe("reported_extracted");
    const q = cell(aramco, "quarter", "revenue")!;
    expect(q.period).toMatchObject({ kind: "quarter", end: "2026-06-30" });
    expect(stripIsolates(q.period.label.ar)).toContain("ربع منفرد");
    expect(q.period.label.en).toBe("Q2 2026 (single quarter)");
    expect(q.value).not.toBe(rev.value);
    const ytd = cell(aramco, "ytd", "revenue")!;
    expect(ytd.period.label.en).toBe("Year to date to 2026-06-30");
    expect(stripIsolates(cell(aramco, "balance", "total_assets")!.period.label.ar)).toBe(
      "كما في 2026-06-30",
    );
  });

  test("every shown value: finite, explicit period, safe https source, never 'independently verified'", () => {
    for (const v of [aramco, rajhi, tawuniya])
      for (const c of cells(v)) {
        expect(Number.isFinite(c.value)).toBe(true);
        expect(c.period.end).toMatch(/^\d{4}-\d\d-\d\d$/);
        expect(c.period.label.ar.length).toBeGreaterThan(0);
        expect(new URL(c.proof.sourceUrl).protocol).toBe("https:");
        expect(c.proof.independentlyVerified).toBe(false);
        if (c.proof.kind === "calculated_inputs_reproduced") expect(c.proof.formula).toBeTruthy();
        else expect(c.proof.formula).toBeNull();
      }
  });

  test("each section shows only its own period kind", () => {
    const expected: Record<string, string> = {
      income: "fy",
      cash_flow: "fy",
      balance: "instant",
      quarter: "quarter",
      ytd: "ytd",
      position_ratios: "instant",
    };
    for (const v of [aramco, rajhi, tawuniya])
      for (const g of groups(v))
        for (const c of g.cells) expect(c.period.kind).toBe(expected[g.id] ?? "fy");
  });

  test("v4 has no input lineage → every calculated value is withheld (formula alone is not proof)", () => {
    expect(group(rajhi, "ratios").withheld).toContainEqual(
      expect.objectContaining({
        key: "return_on_equity",
        reason: "calculated_inputs_not_reproduced",
      }),
    );
    for (const v of [aramco, rajhi, tawuniya])
      expect(cells(v).some((c) => c.proof.kind === "calculated_inputs_reproduced")).toBe(false);
    expect(cell(rajhi, "income", "net_income")!.proof.kind).toBe("reported_extracted");
  });

  test("Al Rajhi: DCR-001 values withheld, valid duplicate EPS row chosen", () => {
    expect(group(rajhi, "dividends").withheld).toContainEqual(
      expect.objectContaining({ key: "dividends_per_share", reason: "unit_conflict" }),
    );
    expect(group(rajhi, "income").withheld).toContainEqual(
      expect.objectContaining({ key: "weighted_average_shares_diluted", reason: "unit_conflict" }),
    );
    const eps = cell(rajhi, "income", "eps_diluted")!;
    expect(eps.value).toBe(5.85);
    expect(stripIsolates(eps.display.ar)).toBe("5.85 ريال/سهم");
    const all = JSON.stringify(rajhi);
    expect(all).not.toContain("2500000");
    expect(all).not.toContain("5853702");
  });

  test("Al Rajhi: no metric is labelled not applicable; bank FCF is withheld by the lineage rule", () => {
    expect(group(rajhi, "cash_flow").withheld).toContainEqual(
      expect.objectContaining({
        key: "free_cash_flow",
        reason: "calculated_inputs_not_reproduced",
      }),
    );
    expect(cells(rajhi).some((c) => c.key === "free_cash_flow")).toBe(false);
    expect(JSON.stringify(rajhi)).not.toContain("notApplicable");
  });

  test("Al Rajhi history uses the 5-year shareholder net income series", () => {
    const [s] = blocksOf(rajhi, "history")[0]!.series;
    expect(s!.key).toBe("net_income_parent");
    expect(s!.points.map((p) => p.periodEnd)).toEqual([
      "2021-12-31",
      "2022-12-31",
      "2023-12-31",
      "2024-12-31",
      "2025-12-31",
    ]);
  });

  test("Tawuniya: insurance statement from the issuer annual report, no trend with one year", () => {
    const ins = cell(tawuniya, "income", "insurance_revenue")!;
    expect(ins.proof.sourceUrl).toBe("https://www.tawuniya.com/docs/2025_Annual_Report_EN.pdf");
    expect(ins.proof.page).toBeGreaterThan(0);
    expect(blocksOf(tawuniya, "history")[0]!.series).toHaveLength(0);
    // v4 fixture: calculated ratios lack lineage → withheld, never hidden as "not applicable"
    expect(group(tawuniya, "earnings_quality").withheld.map((w) => w.reason)).toEqual(
      expect.arrayContaining(["calculated_inputs_not_reproduced"]),
    );
  });

  test("segments are shown separately, never mixed into consolidated values", () => {
    const seg = blocksOf(aramco, "segments");
    expect(seg.map((s) => s.title.en)).toEqual(["Revenue by product", "Revenue by geography"]);
    expect(seg[0]!.rows.map((r) => r.segment)).toContain("Crude oil");
    expect(cells(aramco).some((c) => c.key === "revenue_by_product")).toBe(false);
  });

  test("view model is compact (server strips the 800 KB contract)", () => {
    expect(JSON.stringify(aramco).length).toBeLessThan(120_000);
  });
});

describe("withholding rules on tampered real data", () => {
  const revenueRows = (p: EnginePage) => p.sections.financials.annual.metrics["revenue"]!;

  test("quarter row inside the annual section is rejected, not relabelled", () => {
    const p = clone("2222");
    revenueRows(p)[0]!.period_kind = "quarter";
    expect(group(buildCompanyPreview(p), "income").withheld).toContainEqual(
      expect.objectContaining({ key: "revenue", reason: "period_kind_mismatch" }),
    );
  });

  test("currency amount with mismatched currency is withheld", () => {
    const p = clone("2222");
    revenueRows(p)[0]!.currency = "USD";
    expect(cell(buildCompanyPreview(p), "income", "revenue")).toBeUndefined();
  });

  test("quarantined, javascript: link, missing source, formula-less calculation", () => {
    const cases: ((r: EnginePage) => void)[] = [
      (p) => (revenueRows(p)[0]!.quality_status = "quarantined"),
      (p) => (revenueRows(p)[0]!.provenance!.source!.source_url = "javascript:alert(1)"),
      (p) => (revenueRows(p)[0]!.provenance!.source = null),
      (p) => {
        revenueRows(p)[0]!.is_calculated = 1;
        revenueRows(p)[0]!.calculation = null;
      },
    ];
    const reasons = [
      "quality_flagged",
      "unsafe_source_url",
      "no_source",
      "calculated_without_formula",
    ];
    cases.forEach((mutate, i) => {
      const p = clone("2222");
      mutate(p);
      const v = buildCompanyPreview(p);
      expect(group(v, "income").withheld).toContainEqual(
        expect.objectContaining({ key: "revenue", reason: reasons[i] }),
      );
      expect(JSON.stringify(v)).not.toContain("javascript:");
    });
  });

  test("non-numeric value is withheld", () => {
    const p = clone("2222");
    revenueRows(p)[0]!.value = "n/a";
    expect(group(buildCompanyPreview(p), "income").withheld).toContainEqual(
      expect.objectContaining({ key: "revenue", reason: "non_numeric_value" }),
    );
  });

  test("ownership with an impossible stake or unsafe link is dropped", () => {
    const p = clone("2222");
    (p.sections.ownership[0] as Record<string, unknown>)["ownership_pct"] = "1.5";
    (p.sections.ownership[1] as Record<string, unknown>)["source_url"] = "data:text/html,x";
    const rows = blocksOf(buildCompanyPreview(p), "ownership")[0]!.rows;
    expect(rows).toHaveLength(PAGES["2222"].sections.ownership.length - 2);
  });
});

describe("missing data: every gap explained, nothing invented", () => {
  test("engine not assessed → 'not measured' with reason, not 'unavailable'", () => {
    const p = clone("1120");
    for (const c of p.data_quality.understanding.categories) {
      c.status = null;
      c.score = null;
    }
    const v = buildCompanyPreview(p);
    expect(new Set(v.topics.map((t) => t.status))).toEqual(new Set(["not_measured"]));
    for (const t of v.topics)
      expect(t.reasons.map((r) => r.en)).toContain("Not yet assessed by the engine");
  });

  test("empty financial sections → no values, statuses and reasons still present", () => {
    const p = clone("8010");
    for (const k of ["annual", "quarter", "ytd", "instant"] as const)
      p.sections.financials[k].metrics = {};
    p.sections.financials.history.annual.periods = [];
    const v = buildCompanyPreview(p);
    expect(v.counts.shown).toBe(0);
    expect(v.topics).toHaveLength(18);
    expect(topic(v, 5).reasons.length).toBeGreaterThan(0);
  });

  test("no market price → market block says so; quarterly absent → no quarter section", () => {
    const v = buildCompanyPreview(clone("1120"));
    expect(blocksOf(v, "market")[0]!.latest).toBeNull();
    expect(groups(v).some((g) => g.id === "quarter")).toBe(false);
    expect(topic(v, 5).reasons.map((r) => r.en)).toContain("No quarterly data");
  });

  test("valuation, forecasts and analyst topics carry contract/licensing reasons, no values", () => {
    const v = buildCompanyPreview(clone("2222"));
    expect(topic(v, 15).reasons.map((r) => r.en)).toContain(
      "Valuation multiples are not in the current API contract (ACR-001)",
    );
    expect(topic(v, 14).reasons.map((r) => r.en)).toContain(
      "Needs a licensed analyst-consensus feed",
    );
    expect(topic(v, 13).shownCount).toBe(0);
  });
});

describe("formatting and periods", () => {
  test("units", () => {
    expect(formatValue(0.1866, "ratio", null).en).toBe("18.66%");
    expect(formatValue(52.5, "percent", null).en).toBe("52.50%");
    expect(stripIsolates(formatValue(-25_896_451_000, "SAR", "SAR").ar)).toBe("−25.90 مليار ريال");
    expect(stripIsolates(formatValue(12.891, "mmboed", null).ar)).toBe(
      "12.89 مليون برميل مكافئ/يوم",
    );
    expect(formatValue(5.85, "SAR/share", "SAR").en).toBe("SAR 5.85/share");
  });
  test("Arabic numbers and dates are direction-isolated (no reversed dates)", () => {
    expect(formatValue(-25_896_451_000, "SAR", "SAR").ar).toBe("\u2066−25.90\u2069 مليار ريال");
    expect(periodOf({ period_kind: "instant", period_end: "2025-12-31" }).label.ar).toBe(
      "كما في \u20662025-12-31\u2069",
    );
    expect(formatValue(0.5, "ratio", null).en).toBe("50.00%"); // الإنجليزية بلا رموز عزل
  });

  test("period labels never hide the period kind", () => {
    expect(
      stripIsolates(
        periodOf({
          period_kind: "quarter",
          period_end: "2026-03-31",
          fiscal_year: 2026,
          fiscal_quarter: 1,
        }).label.ar,
      ),
    ).toBe("الربع 1 من 2026 (ربع منفرد)");
    expect(
      periodOf({
        period_kind: "quarter",
        period_end: "2026-03-31",
        fiscal_year: 2026,
        fiscal_quarter: null,
      }).label.en,
    ).toBe("Single quarter ended 2026-03-31");
    expect(periodOf({ period_kind: "ttm", period_end: "2026-06-30" }).label.en).toBe(
      "Trailing 12 months to 2026-06-30",
    );
  });
  test("unit conflict rules (R02)", () => {
    expect(
      unitConflict("dividends_per_share", { unit: "SAR", currency: "SAR", statement: "per_share" }),
    ).toBe(true);
    expect(
      unitConflict("eps_diluted", {
        unit: "USD/shares",
        currency: "USD",
        statement: "income_statement",
      }),
    ).toBe(true);
    expect(
      unitConflict("eps_diluted", { unit: "SAR/share", currency: "SAR", statement: "per_share" }),
    ).toBe(false);
    expect(
      unitConflict("weighted_average_shares_diluted", {
        unit: "SAR",
        currency: "SAR",
        statement: "income_statement",
      }),
    ).toBe(true);
    expect(
      unitConflict("revenue", { unit: "SAR", currency: "USD", statement: "income_statement" }),
    ).toBe(true);
  });
});

describe("server fetch: flag off by default, no fallback", () => {
  const banned: typeof fetch = () => {
    throw new Error("network must not be called");
  };
  const env = {
    ENGINE_PREVIEW_ENABLED: "true",
    FINENGINE_API_URL: "http://engine",
    FINENGINE_API_KEY: "k",
  };

  test("disabled unless exactly 'true'; no network call", async () => {
    for (const v of [undefined, "", "1", "TRUE"]) {
      expect(enginePreviewEnabled({ ENGINE_PREVIEW_ENABLED: v })).toBe(false);
      expect(
        await fetchCompanyPreview(
          { market: "SA", symbol: "2222" },
          { ...env, ENGINE_PREVIEW_ENABLED: v },
          banned,
        ),
      ).toEqual({ state: "disabled" });
    }
  });

  test("missing URL/key, 404, 401, 500, bad JSON, contract drift → no data", async () => {
    const resp = (status: number, body: string) => async () => new Response(body, { status });
    const ref = { market: "SA", symbol: "2222" };
    expect(
      await fetchCompanyPreview(ref, { ENGINE_PREVIEW_ENABLED: "true" }, banned),
    ).toMatchObject({ state: "engine_unavailable", reason: "engine_not_configured" });
    expect(await fetchCompanyPreview(ref, env, resp(404, '{"error":"x"}'))).toEqual({
      state: "not_found",
    });
    expect(await fetchCompanyPreview(ref, env, resp(401, "{}"))).toMatchObject({
      reason: "engine_auth_failed",
    });
    expect(await fetchCompanyPreview(ref, env, resp(500, "{}"))).toMatchObject({
      reason: "engine_http_500",
    });
    expect(await fetchCompanyPreview(ref, env, resp(200, "not json"))).toMatchObject({
      reason: "engine_invalid_json",
    });
    expect(await fetchCompanyPreview(ref, env, resp(200, '{"contract_version":3}'))).toMatchObject({
      state: "engine_unavailable",
    });
  });

  test("sends the key only as a header to the configured engine", async () => {
    let seen: { url: string; key: string | null } | null = null;
    const spy: typeof fetch = async (url, init) => {
      seen = { url: String(url), key: new Headers(init?.headers).get("X-API-Key") };
      return new Response(JSON.stringify(PAGES["2222"]), { status: 200 });
    };
    const r = await fetchCompanyPreview({ market: "sa", symbol: "2222" }, env, spy);
    expect(seen).toEqual({ url: "http://engine/v1/companies/SA/2222/page", key: "k" });
    expect(r).toEqual({ state: "engine_unavailable", reason: "preview_requires_page5" });
    expect(JSON.stringify(r)).not.toContain('"k"');
  });
});
