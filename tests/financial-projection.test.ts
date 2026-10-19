import { expect, test, mock } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { EnginePage } from "../src/lib/engine/company-preview";
import {
  applyPeerGate,
  applyPublicationGate,
  factIdentity,
  type LedgerEntry,
} from "../src/lib/engine/publication-gate.server";

/**
 * ARAMCO95 PROJECTION: بوابة أهلية العرض (A) وأرصدة نهاية الأرباع (B). قيم اصطناعية فقط (علامات 7770xx).
 * الحمولة الأساسية هي الـfixture المجمّد المقبول؛ كل صف اصطناعي يُضاف فوقه.
 */
const fixture = (s: string) =>
  JSON.parse(
    gunzipSync(
      readFileSync(new URL(`./fixtures/codex-20261013/${s}-page.json.gz`, import.meta.url)),
    ).toString(),
  );
const pages = Object.fromEntries(["2222", "1120", "8010"].map((s) => [s, fixture(s)]));
mock.module("virtual:marefa-design-fixtures", () => ({ default: pages }));
const { buildCompanyPreview } = await import("../src/lib/engine/company-preview");
const { fetchCompanyPreview } = await import("../src/lib/engine/company-preview.server");
const { fetchPeerTable } = await import("../src/lib/engine/peer-comparison.server");
const { frozenDesignPreview } = await import("../src/lib/web-v1/design-fixtures.server");
const { buildOverview, intelGroups } = await import("../src/lib/web-v1/company-experience");

type Row = Record<string, unknown>;
type Period = { period_end: string; metrics: Record<string, Row[]> };
type Hist = { status?: string; reason?: string | null; period_kind?: string; periods: Period[] };
type Snap = { metrics?: Record<string, Row[]> };
type Fin = Record<string, Snap> & {
  annual: { metrics: Record<string, Row[]> };
  history: Record<string, Hist> & { quarter: Hist; quarter_position: Hist };
};
const NOW = new Date("2026-10-19T12:00:00Z");
const MARK = ["777001000000", "777002000000", "777003000000", "777004000000", "777005000000"];
const base = () => structuredClone(pages["2222"]) as EnginePage;
const fin = (p: EnginePage) => p.sections.financials as unknown as Fin;
const template = (p: EnginePage, metric: string) =>
  structuredClone(fin(p).history.quarter.periods[0].metrics[metric][0]) as Row;

/** صف اصطناعي جديد لـ Q3-2025 بهوية كاملة ومصدر اصطناعي. */
function synthetic(p: EnginePage, metric: string, value: string, over: Row = {}): Row {
  const r = template(p, "revenue");
  Object.assign(r, {
    value,
    period_start: "2025-07-01",
    period_end: "2025-09-30",
    period_kind: "quarter",
    fiscal_year: 2025,
    fiscal_quarter: 3,
    version: 1,
    source_key: "file:synthetic-projection-q3-2025",
    source_url: "https://example.invalid/synthetic.pdf",
    is_calculated: 0,
    ...over,
  });
  return r;
}

/** حمولة 2222 مع ربع اصطناعي (revenue, net_income) ورصيدين اصطناعيين في quarter_position. */
function withSynthetic(): { page: EnginePage; rows: Record<string, Row> } {
  const p = base();
  const h = fin(p).history;
  const rows: Record<string, Row> = {
    revenue: synthetic(p, "revenue", MARK[0]!),
    net_income: synthetic(p, "net_income", MARK[1]!),
    cash: synthetic(p, "cash", MARK[2]!, { period_kind: "instant", period_start: null }),
    total_equity: synthetic(p, "total_equity", MARK[3]!, {
      period_kind: "instant",
      period_start: null,
    }),
  };
  h.quarter.periods.push({
    period_end: "2025-09-30",
    metrics: { revenue: [rows["revenue"]], net_income: [rows["net_income"]] },
  });
  h.quarter_position = {
    status: "available",
    reason: null,
    period_kind: "instant",
    periods: [
      {
        period_end: "2025-09-30",
        metrics: { cash: [rows["cash"]], total_equity: [rows["total_equity"]] },
      },
    ],
  };
  return { page: p, rows };
}

const accepts = (over: Partial<LedgerEntry> = {}) => ({
  source_accept: {
    state: "SOURCE_ACCEPT",
    receipt_sha256: "a".repeat(64),
    reviewer: "TEST-REVIEWER",
  },
  financial_accept: { state: "FINANCIAL_ACCEPT", by: "TEST-FINANCE", at: "2026-10-01T00:00:00Z" },
  publication: {
    state: "PUBLICATION_AUTHORIZED",
    rights_basis: "TEST-RIGHTS",
    by: "TEST-OWNER",
    at: "2026-10-01T00:00:00Z",
    expires_at: "2027-01-01T00:00:00Z",
  },
  ...over,
});
const factEntry = (metric: string, r: Row, over: Partial<LedgerEntry> = {}): LedgerEntry =>
  ({
    kind: "fact",
    identity: factIdentity("sa:2222", metric, r as never)!,
    ...accepts(over),
  }) as LedgerEntry;
const ledger = (entries: LedgerEntry[]) => ({ schema: "marefa-publication-ledger/1", entries });
const has = (x: unknown, v: string) => JSON.stringify(x).includes(v);
const rowCount = (p: EnginePage) => {
  const f = fin(p);
  const conts = [
    ...Object.entries(f)
      .filter(([k]) => k !== "history")
      .map(([, v]) => v),
    ...Object.values(f.history).flatMap((h) => h?.periods ?? []),
  ];
  return (conts as Snap[]).reduce(
    (n, c) => n + Object.values(c?.metrics ?? {}).reduce((m, rs) => m + rs.length, 0),
    0,
  );
};
const gate = (p: EnginePage, l: unknown) => applyPublicationGate(p, l, { now: NOW });

// ───────────────────────── A: البوابة

test("baseline: every frozen fixture row is in the accepted baseline; the gate changes nothing", () => {
  for (const s of ["2222", "1120", "8010"]) {
    const p = structuredClone(pages[s]) as EnginePage;
    const { page, summary } = gate(p, null);
    expect(page).toEqual(p);
    expect(summary.withheld_rows).toBe(0);
    expect(summary.authorized_rows).toBe(0);
    expect(summary.baseline_rows).toBe(rowCount(p));
  }
});

test("frozen path: previews are unchanged with the gate in place", () => {
  for (const s of ["2222", "1120", "8010"]) {
    const r = frozenDesignPreview({ market: "SA", symbol: s });
    expect(r.state).toBe("ok");
  }
});

test("new rows without a ledger never reach the payload; the preview is identical to the baseline", () => {
  const { page } = withSynthetic();
  const { page: g, summary } = gate(page, null);
  for (const v of MARK.slice(0, 4)) expect(has(g, v)).toBe(false);
  expect(summary.withheld_rows).toBe(4);
  expect(summary.reasons).toEqual({ not_in_baseline_or_ledger: 4 });
  // الفترة التي فرغت تُحذف، فلا عمود فارغ ولا تتغير العدادات.
  expect(buildCompanyPreview(g)).toEqual(buildCompanyPreview(base()));
});

test("all three states present: only those rows pass, with their own values", () => {
  const { page, rows } = withSynthetic();
  const { page: g, summary } = gate(
    page,
    ledger([factEntry("revenue", rows["revenue"]!), factEntry("cash", rows["cash"]!)]),
  );
  expect(summary.authorized_rows).toBe(2);
  expect(has(g, MARK[0]!)).toBe(true);
  expect(has(g, MARK[2]!)).toBe(true);
  expect(has(g, MARK[1]!)).toBe(false);
  expect(has(g, MARK[3]!)).toBe(false);
});

test("fail-closed: each missing or invalid state withholds, and two of three is never enough", () => {
  const { page, rows } = withSynthetic();
  const r = rows["revenue"]!;
  const cases: [Partial<LedgerEntry>, string][] = [
    [{ source_accept: null }, "source_accept_missing"],
    [
      {
        source_accept: {
          state: "SOURCE_REVIEW_PENDING",
          receipt_sha256: "a".repeat(64),
          reviewer: "x",
        },
      },
      "source_accept_missing",
    ],
    [
      { source_accept: { state: "SOURCE_ACCEPT", receipt_sha256: "not-a-hash", reviewer: "x" } },
      "source_accept_missing",
    ],
    [
      { source_accept: { state: "SOURCE_ACCEPT", receipt_sha256: "a".repeat(64), reviewer: " " } },
      "source_accept_missing",
    ],
    [{ financial_accept: null }, "financial_accept_missing"],
    [
      { financial_accept: { state: "FINANCIAL_REVIEW", by: "x", at: "2026-10-01T00:00:00Z" } },
      "financial_accept_missing",
    ],
    [
      { financial_accept: { state: "FINANCIAL_ACCEPT", by: "x", at: "yesterday" } },
      "financial_accept_missing",
    ],
    [{ publication: null }, "publication_authorization_missing"],
    [
      {
        publication: {
          state: "PUBLICATION_AUTHORIZED",
          rights_basis: "",
          by: "x",
          at: "2026-10-01T00:00:00Z",
        },
      },
      "publication_authorization_missing",
    ],
    [
      {
        publication: {
          state: "UNKNOWN_NO_GRANT",
          rights_basis: "x",
          by: "x",
          at: "2026-10-01T00:00:00Z",
        },
      },
      "publication_authorization_missing",
    ],
    [
      {
        publication: {
          state: "PUBLICATION_AUTHORIZED",
          rights_basis: "x",
          by: "x",
          at: "2026-10-01T00:00:00Z",
          expires_at: "2026-10-19T11:59:59Z",
        },
      },
      "publication_authorization_expired",
    ],
    [
      {
        publication: {
          state: "PUBLICATION_AUTHORIZED",
          rights_basis: "x",
          by: "x",
          at: "2026-10-01T00:00:00Z",
          expires_at: "soon",
        },
      },
      "publication_authorization_expired",
    ],
    [{ withheld: true }, "explicit_withheld"],
  ];
  for (const [over, reason] of cases) {
    const { page: g, summary } = gate(page, ledger([factEntry("revenue", r, over)]));
    expect([reason, has(g, MARK[0]!)]).toEqual([reason, false]);
    expect(summary.reasons[reason as keyof typeof summary.reasons]).toBe(1);
  }
});

test("identity: a new version, another source or another value no longer matches the ledger entry", () => {
  const { page, rows } = withSynthetic();
  const entry = factEntry("revenue", rows["revenue"]!);
  const changes: Row[] = [
    { version: 2 },
    { source_key: "file:another-source" },
    { value: "777001000001" },
    { period_start: "2025-01-01", period_kind: "ytd" },
    { scope: "parent" },
    { currency: "USD" },
    { unit: "SAR thousands" },
    { dimensions: { segment: "upstream" } },
  ];
  for (const c of changes) {
    const p = structuredClone(page);
    Object.assign(fin(p).history.quarter.periods.at(-1).metrics.revenue[0], c);
    const { page: g, summary } = gate(p, ledger([entry]));
    expect([JSON.stringify(c), summary.authorized_rows]).toEqual([JSON.stringify(c), 0]);
    expect(has(g, String(c["value"] ?? MARK[0]))).toBe(false);
  }
});

test("fail-closed: unreadable or unknown ledgers, conflicting entries and incomplete identities", () => {
  const { page, rows } = withSynthetic();
  for (const bad of [
    { schema: "unreadable" },
    { schema: "marefa-publication-ledger/2", entries: [] },
    { schema: "marefa-publication-ledger/1" },
    "x",
    7,
  ]) {
    const { page: g, summary } = gate(page, bad);
    expect(summary.ledger).toBe("invalid");
    expect(MARK.slice(0, 4).some((v) => has(g, v))).toBe(false);
    expect(summary.baseline_rows).toBe(rowCount(base())); // the accepted baseline is kept
  }
  const ok = factEntry("revenue", rows["revenue"]!);
  const { summary: conflict } = gate(
    page,
    ledger([ok, factEntry("revenue", rows["revenue"]!, { financial_accept: null })]),
  );
  expect(conflict.reasons["ledger_conflict"]).toBe(1);
  const p = structuredClone(page);
  delete fin(p).history.quarter.periods.at(-1).metrics.revenue[0].version;
  const { page: g, summary } = gate(p, ledger([ok]));
  expect(summary.reasons["identity_incomplete"]).toBe(1);
  expect(has(g, MARK[0]!)).toBe(false);
});

test("explicit WITHHELD also removes an accepted baseline row", () => {
  const p = base();
  const row = fin(p).annual.metrics.revenue[0];
  const { page: g, summary } = gate(p, ledger([factEntry("revenue", row, { withheld: true })]));
  expect(summary.reasons["explicit_withheld"]).toBeGreaterThanOrEqual(1);
  expect(JSON.stringify(fin(g).annual.metrics.revenue ?? [])).not.toContain(row.value);
});

// ───────────────────────── A: الوصول المباشر إلى API

const ENV = (ledgerPath?: string) => ({
  ENGINE_PREVIEW_ENABLED: "true",
  FINENGINE_API_URL: "http://engine.test",
  FINENGINE_API_KEY: "test-key",
  ...(ledgerPath ? { MAREFA_PUBLICATION_LEDGER_PATH: ledgerPath } : {}),
});
const engineFetch = (page: unknown) =>
  (async () => new Response(JSON.stringify(page), { status: 200 })) as unknown as typeof fetch;

test("server response (getCompanyPreview → fetchCompanyPreview): withheld values are not serialised", async () => {
  const { page, rows } = withSynthetic();
  const dir = mkdtempSync(join(tmpdir(), "ledger-"));
  try {
    const none = await fetchCompanyPreview(
      { market: "SA", symbol: "2222" },
      ENV(),
      engineFetch(page),
    );
    expect(none.state).toBe("ok");
    for (const v of MARK.slice(0, 4)) expect(has(none, v)).toBe(false);
    const path = join(dir, "ledger.json");
    writeFileSync(path, "{not json");
    const broken = await fetchCompanyPreview(
      { market: "SA", symbol: "2222" },
      ENV(path),
      engineFetch(page),
    );
    for (const v of MARK.slice(0, 4)) expect(has(broken, v)).toBe(false);
    writeFileSync(
      path,
      JSON.stringify(
        ledger([factEntry("revenue", rows["revenue"]!), factEntry("cash", rows["cash"]!)]),
      ),
    );
    const some = await fetchCompanyPreview(
      { market: "SA", symbol: "2222" },
      ENV(path),
      engineFetch(page),
    );
    if (some.state !== "ok") throw new Error(some.state);
    const q = some.preview.statements.find((v) => v.mode === "quarter")!;
    const i = q.periods.findIndex((x) => x.end === "2025-09-30");
    expect(i).toBeGreaterThanOrEqual(0);
    const cell = (k: string) => q.rows.find((r) => r.key === k)?.cells[i];
    expect(cell("revenue")).toMatchObject({ state: "value", cell: { value: 777001000000 } });
    expect(cell("cash")).toMatchObject({ state: "value", cell: { value: 777003000000 } });
    expect(cell("net_income")?.state ?? "missing").not.toBe("value");
    expect(cell("total_equity")?.state ?? "missing").not.toBe("value");
    // Overview, Investor (intelligence) and Data read the same preview: no withheld number anywhere.
    const all = JSON.stringify([some, buildOverview(some.preview), intelGroups(some.preview)]);
    expect(all.includes("777002000000") || all.includes("777004000000")).toBe(false);
    expect(/77700[24]/.test(all)).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("peers: no accepted baseline, so values need an eligible ledger entry; otherwise they arrive empty", async () => {
  const resp = {
    status: "available",
    reason: null,
    methodology: "x",
    scope: { field: "industry", value: "Integrated Oil & Gas" },
    peer_count: 1,
    metric_count: 1,
    companies: [
      {
        market: "SA",
        symbol: "2222",
        name: "A",
        is_target: true,
        metrics: {
          net_margin: {
            value: "0.777101",
            unit: "ratio",
            period_end: "2025-12-31",
            period_kind: "fy",
          },
        },
      },
      {
        market: "SA",
        symbol: "2030",
        name: "B",
        is_target: false,
        metrics: {
          net_margin: {
            value: "0.777102",
            unit: "ratio",
            period_end: "2025-12-31",
            period_kind: "fy",
          },
        },
      },
    ],
  };
  const none = applyPeerGate(resp as never, null, { now: NOW });
  expect(none.withheld).toBe(2);
  expect(has(none.resp, "0.7771")).toBe(false);
  const entry = {
    kind: "peer_metric",
    identity: {
      market: "SA",
      symbol: "2030",
      metric: "net_margin",
      period_kind: "fy",
      period_end: "2025-12-31",
      unit: "ratio",
      value: "0.777102",
    },
    ...accepts(),
  };
  const one = applyPeerGate(resp as never, ledger([entry as never]), { now: NOW });
  expect([one.withheld, has(one.resp, "0.777102"), has(one.resp, "0.777101")]).toEqual([
    1,
    true,
    false,
  ]);
  const fetchImpl = (async (url: string) =>
    new Response(
      JSON.stringify(String(url).includes("/peers") ? resp : { industry: "Integrated Oil & Gas" }),
      { status: 200 },
    )) as unknown as typeof fetch;
  const table = await fetchPeerTable(
    { market: "SA", symbol: "2222" },
    { ENGINE_PEERS_ENABLED: "true", FINENGINE_API_URL: "http://e", FINENGINE_API_KEY: "k" },
    fetchImpl,
  );
  expect(has(table, "0.7771")).toBe(false);
});

// ───────────────────────── B: أرصدة نهاية الأرباع

/** quarter_position مؤهلة بالكامل (سجل بكل الصفوف الاصطناعية) لفحص التمثيل وحده. */
function positionsPage(extra: { period_end: string; metrics: Record<string, Row[]> }[] = []) {
  const { page, rows } = withSynthetic();
  fin(page).history.quarter_position.periods.push(...extra);
  const entries = [
    ...Object.entries(rows).map(([m, r]) => factEntry(m, r)),
    ...extra.flatMap((p) =>
      Object.entries(p.metrics).flatMap(([m, rs]) => rs.map((r) => factEntry(m, r))),
    ),
  ];
  return gate(page, ledger(entries)).page;
}
const view = (p: EnginePage, mode: string) =>
  buildCompanyPreview(p).statements.find((v) => v.mode === mode)!;

test("quarter-end balances sit in the quarter view at their own dates, as balance rows", () => {
  const p = positionsPage();
  const q = view(p, "quarter");
  const i = q.periods.findIndex((x) => x.end === "2025-09-30");
  for (const [k, v] of [
    ["cash", 777003000000],
    ["total_equity", 777004000000],
  ] as const) {
    const row = q.rows.find((r) => r.key === k)!;
    expect(row.section).toBe("balance");
    expect(row.cells[i]).toMatchObject({ state: "value", cell: { value: v } });
  }
});

test("they never become flows, never replace the latest balance and never mix with year-end balances", () => {
  const p = base();
  const year = synthetic(p, "cash", "777005000000", {
    period_kind: "instant",
    period_start: null,
    period_end: "2025-12-31",
    fiscal_quarter: 4,
  });
  const odd = synthetic(p, "cash", "777006000000", {
    period_kind: "instant",
    period_start: null,
    period_end: "2025-08-15",
  });
  const flowInPositions = synthetic(p, "total_equity", "777007000000", {
    period_end: "2025-06-30",
    period_start: "2025-04-01",
  });
  const g = positionsPage([
    { period_end: "2025-12-31", metrics: { cash: [year] } },
    { period_end: "2025-08-15", metrics: { cash: [odd] } },
    { period_end: "2025-06-30", metrics: { total_equity: [flowInPositions] } },
  ]);
  const before = buildCompanyPreview(base());
  const after = buildCompanyPreview(g);
  const q = after.statements.find((v) => v.mode === "quarter")!;
  expect(q.periods.map((x) => x.end)).not.toContain("2025-12-31"); // year end stays out of the quarter view
  expect(q.periods.map((x) => x.end)).not.toContain("2025-08-15"); // not a quarter end
  expect(has(q, "777005") || has(q, "777006")).toBe(false);
  const j = q.periods.findIndex((x) => x.end === "2025-06-30");
  if (j >= 0)
    expect(q.rows.find((r) => r.key === "total_equity")?.cells[j]?.state).not.toBe("value"); // a flow row is rejected
  expect(after.statements.find((v) => v.mode === "annual")).toEqual(
    before.statements.find((v) => v.mode === "annual"),
  );
  expect(after.statements.find((v) => v.mode === "ytd")).toEqual(
    before.statements.find((v) => v.mode === "ytd"),
  );
  expect(buildOverview(after).keyFigures).toEqual(buildOverview(before).keyFigures); // latest/annual key figures intact
});

test("quarter-end balances are gated before the preview like any other new row", () => {
  const { page } = withSynthetic();
  const q = view(gate(page, null).page, "quarter");
  expect(q.periods.map((x) => x.end)).not.toContain("2025-09-30");
  expect(has(q, "77700")).toBe(false);
});

test("without a known fiscal year end the series is not used (cannot separate year-end balances)", () => {
  const p = positionsPage();
  (p.company as { fiscal_year_end: string | null }).fiscal_year_end = null;
  const q = view(p, "quarter");
  expect(q.rows.find((r) => r.key === "cash")).toBeUndefined();
});

test("pages without the new key build exactly as before", () => {
  for (const s of ["2222", "1120", "8010"]) {
    const p = structuredClone(pages[s]) as EnginePage;
    const withEmpty = structuredClone(p);
    fin(withEmpty).history.quarter_position = {
      status: "unavailable",
      reason: "no_quarter_end_positions",
      period_kind: "instant",
      periods: [],
    };
    expect(buildCompanyPreview(withEmpty)).toEqual(buildCompanyPreview(p));
  }
});
