// Generates fully synthetic engine /page payloads for three invented issuers (SA 9901 ordinary, 9902 bank,
// 9903 insurer) and the frozen-mode publication baseline built from them. No real company, value, document,
// URL or person: names say "Synthetic", amounts are 4242… markers, sources are example.invalid.
// Output is formatted with the repository's prettier, so the sha pins hold for the committed files.
// Usage (repo root): bun tests/fixtures/synthetic-projection/generate.ts
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { format } from "prettier";
import { frozenRowKey } from "../../../src/lib/engine/publication-gate.server";

type Row = Record<string, unknown>;
type Kind = "ordinary" | "bank" | "insurer";
type Spec = {
  key: string;
  label: string;
  statement: string;
  kind: "flow" | "balance" | "ratio" | "eps";
  calc?: string;
};

const ISSUERS: { symbol: string; kind: Kind; name: string; industry: string }[] = [
  {
    symbol: "9901",
    kind: "ordinary",
    name: "Synthetic Projection Industrial Co",
    industry: "Synthetic Industrials",
  },
  { symbol: "9902", kind: "bank", name: "Synthetic Projection Bank", industry: "Banks" },
  {
    symbol: "9903",
    kind: "insurer",
    name: "Synthetic Projection Insurance Co",
    industry: "Insurance",
  },
];
const F = (key: string, label: string, statement = "income_statement"): Spec => ({
  key,
  label,
  statement,
  kind: "flow",
});
const B = (key: string, label: string): Spec => ({
  key,
  label,
  statement: "balance_sheet",
  kind: "balance",
});
const METRICS: Record<Kind, Spec[]> = {
  ordinary: [
    F("revenue", "Revenue"),
    F("ebitda", "EBITDA"),
    F("operating_income", "Operating income"),
    F("net_income", "Net income"),
    F("net_income_parent", "Net income attributable to parent"),
    { key: "basic_eps", label: "Basic EPS", statement: "per_share", kind: "eps" },
    B("cash", "Cash"),
    B("total_assets", "Total assets"),
    B("total_liabilities", "Total liabilities"),
    B("total_equity", "Total equity"),
    F("operating_cash_flow", "Operating cash flow", "cash_flow"),
    F("capex", "Capital expenditure", "cash_flow"),
    F("free_cash_flow", "Free cash flow", "cash_flow"),
    {
      key: "net_margin",
      label: "Net margin",
      statement: "ratios",
      kind: "ratio",
      calc: "net_income / revenue",
    },
  ],
  bank: [
    F("financing_income", "Financing income"),
    F("net_financing_income", "Net financing income"),
    F("net_income", "Net income"),
    B("total_assets", "Total assets"),
    B("customer_deposits", "Customer deposits"),
    B("net_loans", "Net loans"),
    B("total_liabilities", "Total liabilities"),
    B("total_equity", "Total equity"),
    F("operating_cash_flow", "Operating cash flow", "cash_flow"),
    {
      key: "return_on_equity",
      label: "Return on equity",
      statement: "ratios",
      kind: "ratio",
      calc: "net_income / total_equity",
    },
  ],
  insurer: [
    F("insurance_revenue", "Insurance revenue"),
    F("insurance_service_result", "Insurance service result"),
    F("net_income", "Net income"),
    B("cash", "Cash"),
    B("total_assets", "Total assets"),
    B("total_liabilities", "Total liabilities"),
    B("total_equity", "Total equity"),
    F("operating_cash_flow", "Operating cash flow", "cash_flow"),
    {
      key: "net_margin",
      label: "Net margin",
      statement: "ratios",
      kind: "ratio",
      calc: "net_income / insurance_revenue",
    },
  ],
};
const FY = [2025, 2024, 2023, 2022, 2021];
const QUARTERS = [
  { end: "2026-06-30", start: "2026-04-01", q: 2 },
  { end: "2026-03-31", start: "2026-01-01", q: 1 },
];

function value(spec: Spec, issuer: number, metric: number, period: number): string {
  if (spec.kind === "ratio") return `0.42${issuer}${metric}${period}`;
  if (spec.kind === "eps") return `4.2${issuer}${period}`;
  return `4242${issuer}${String(metric).padStart(2, "0")}${period}0000`;
}

function source(symbol: string, filing: string) {
  const url = `https://example.invalid/synthetic/${symbol}/${filing}.pdf`;
  const key = "file:" + createHash("sha256").update(`synthetic:${symbol}:${filing}`).digest("hex");
  return { url, key };
}

function row(
  symbol: string,
  spec: Spec,
  v: string,
  end: string,
  start: string | null,
  kind: string,
  fy: number,
  q: number | null,
  filing: string,
): Row {
  const s = source(symbol, filing);
  const calculated = spec.kind === "ratio";
  const currency = spec.kind === "ratio" ? "" : "SAR";
  const unit = spec.kind === "ratio" ? "ratio" : spec.kind === "eps" ? "SAR/share" : "SAR";
  return {
    display_name: spec.label,
    category: calculated ? "calculated" : "financial",
    statement: spec.statement,
    value: v,
    value_text: null,
    value_json: null,
    value_type: "decimal",
    currency,
    unit,
    period_start: start ?? "",
    period_end: end,
    period_kind: kind,
    fiscal_year: fy,
    fiscal_quarter: q,
    scope: "consolidated",
    version: 1,
    quality_score: "1",
    source_key: s.key,
    source_url: s.url,
    filed_at: `${fy + (q ? 0 : 1)}-0${q ? 8 : 3}-15`,
    is_calculated: calculated ? 1 : 0,
    calculation: calculated ? spec.calc : null,
    dimensions: {},
    provenance: {
      source: {
        source_key: s.key,
        source_url: s.url,
        filing_type: `Synthetic ${filing}`,
        filed_at: null,
        content_hash: s.key.slice(5),
        artifact_key: null,
        artifact_sha256: null,
        content_type: "application/pdf",
        byte_size: null,
        metadata: {},
      },
      extraction: {
        raw_label: spec.label.toLowerCase(),
        raw_value: v,
        page: 3,
        table_ref: "synthetic statement",
      },
      ...(calculated
        ? {
            derivation: {
              type: "deterministic_calculation",
              calculation: spec.calc,
              lineage: { status: "reproduced", current_inputs_reproduced: true },
            },
          }
        : {}),
    },
  };
}

function snapshot(kind: string, end: string | null, metrics: Record<string, Row[]>) {
  const n = Object.keys(metrics).length;
  return {
    status: n ? "available" : "unavailable",
    reason: n ? null : "synthetic_not_provided",
    period_kind: kind,
    period_end: end,
    metrics,
  };
}

function page(i: number) {
  const { symbol, kind, name, industry } = ISSUERS[i]!;
  const specs = METRICS[kind];
  const idx = (s: Spec) => specs.indexOf(s);
  const flows = specs.filter((s) => s.kind !== "balance");
  const balances = specs.filter((s) => s.kind === "balance");
  const fyRow = (s: Spec, fy: number, p: number) =>
    row(
      symbol,
      s,
      value(s, i + 1, idx(s), p),
      `${fy}-12-31`,
      `${fy}-01-01`,
      "fy",
      fy,
      null,
      `fy-${fy}`,
    );
  const balRow = (s: Spec, end: string, fy: number, q: number | null, p: number, filing: string) =>
    row(symbol, s, value(s, i + 1, idx(s), p), end, null, "instant", fy, q, filing);
  const group = (rows: [string, Row][]) =>
    rows.reduce<Record<string, Row[]>>((m, [k, r]) => ((m[k] ??= []).push(r), m), {});
  const quarterFlows = flows.filter((s) => s.kind === "flow").slice(0, 3);
  const financials = {
    annual: snapshot("fy", "2025-12-31", group(flows.map((s) => [s.key, fyRow(s, 2025, 0)]))),
    quarter: snapshot(
      "quarter",
      "2026-06-30",
      group(
        quarterFlows.map((s) => [
          s.key,
          row(
            symbol,
            s,
            value(s, i + 1, idx(s), 7),
            "2026-06-30",
            "2026-04-01",
            "quarter",
            2026,
            2,
            "q2-2026",
          ),
        ]),
      ),
    ),
    ytd: snapshot(
      "ytd",
      "2026-06-30",
      group(
        quarterFlows.map((s) => [
          s.key,
          row(
            symbol,
            s,
            value(s, i + 1, idx(s), 8),
            "2026-06-30",
            "2026-01-01",
            "ytd",
            2026,
            2,
            "q2-2026",
          ),
        ]),
      ),
    ),
    ttm: snapshot("ttm", null, {}),
    instant: snapshot(
      "instant",
      "2026-06-30",
      group(balances.map((s) => [s.key, balRow(s, "2026-06-30", 2026, 2, 9, "q2-2026")])),
    ),
    history: {
      annual: {
        status: "available",
        reason: null,
        period_kind: "fy",
        periods: FY.map((fy, p) => ({
          period_end: `${fy}-12-31`,
          metrics: group(flows.map((s) => [s.key, fyRow(s, fy, p)])),
        })),
      },
      annual_position: {
        status: "available",
        reason: null,
        period_kind: "instant",
        periods: FY.map((fy, p) => ({
          period_end: `${fy}-12-31`,
          metrics: group(
            balances.map((s) => [s.key, balRow(s, `${fy}-12-31`, fy, null, p, `fy-${fy}`)]),
          ),
        })),
      },
      quarter: {
        status: "available",
        reason: null,
        period_kind: "quarter",
        periods: QUARTERS.map((q, p) => ({
          period_end: q.end,
          metrics: group(
            quarterFlows
              .slice(0, 2)
              .map((s) => [
                s.key,
                row(
                  symbol,
                  s,
                  value(s, i + 1, idx(s), 5 + p),
                  q.end,
                  q.start,
                  "quarter",
                  2026,
                  q.q,
                  `q${q.q}-2026`,
                ),
              ]),
          ),
        })),
      },
    },
  };
  const cap = (count: number) => ({
    status: count ? "available" : "unavailable",
    count,
    reason: count ? null : "synthetic_not_provided",
  });
  const completeness = {
    expected_fields: 0,
    populated_fields: 0,
    required_fields: 0,
    populated_required_fields: 0,
    completeness_score: "0",
    status: "missing",
    reason: "synthetic",
    categories: [],
  };
  return {
    contract_version: 5,
    generated_at: "2026-10-20T00:00:00+00:00",
    placeholder_policy: "never_substitute_demo_values",
    company: {
      company_id: `sa:${symbol}`,
      market: "SA",
      symbol,
      name,
      currency: "SAR",
      cik: null,
      isin: null,
      fiscal_year_end: "12-31",
      exchange: "Synthetic",
      country: "SA",
      sector: "Synthetic",
      industry,
      timezone: "Asia/Riyadh",
      locale: "en",
      fact_counts: {
        calculated: 0,
        commercial: 0,
        financial: 0,
        market: 0,
        operational: 0,
        ratio: 0,
      },
      latest_filing: "2026-08-15",
      listings: [],
      completeness,
    },
    capabilities: {
      profile: cap(0),
      annual_financials: cap(1),
      quarterly_financials: cap(1),
      market_history: cap(0),
      ownership: cap(0),
      corporate_actions: cap(0),
      disclosures: cap(0),
      consensus: cap(0),
      peer_comparison: cap(0),
      news: cap(0),
      five_year_history: cap(1),
      official_sources: cap(0),
    },
    data_quality: {
      completeness,
      understanding: {
        company_id: `sa:${symbol}`,
        readiness_state: "not_ready",
        total_score: null,
        target_score: "95",
        source_map_version: "synthetic",
        hard_gates: {},
        blocking_reasons: [],
        categories: [],
      },
      factory_readiness: {
        company_id: `sa:${symbol}`,
        scoring_model: "synthetic",
        readiness_state: "not_ready",
        total_score: null,
        target_score: "95",
        blocking_reasons: [],
        categories: [],
      },
      field_availability: [],
      open_backlog: 0,
    },
    sections: {
      profile: {},
      financials,
      market: { latest: null, history: [] },
      ownership: [],
      corporate_actions: [],
      disclosures: [],
      consensus: {},
      peer_comparison: {},
      official_sources: [],
    },
  };
}

const dir = new URL("./", import.meta.url);
const shas: Record<string, string> = {};
const keys = new Set<string>();
let rows = 0;
const incomplete: string[] = [];
for (const [i, issuer] of ISSUERS.entries()) {
  const p = page(i);
  const text = await format(JSON.stringify(p), { parser: "json" });
  writeFileSync(new URL(`${issuer.symbol}-page.json`, dir), text);
  shas[issuer.symbol] = createHash("sha256").update(text).digest("hex");
  const fin = p.sections.financials as Record<
    string,
    { metrics?: Record<string, Row[]>; periods?: { metrics: Record<string, Row[]> }[] }
  >;
  const containers = [
    ...Object.entries(fin)
      .filter(([k]) => k !== "history")
      .map(([, v]) => v),
    ...Object.values(
      fin["history"] as Record<string, { periods: { metrics: Record<string, Row[]> }[] }>,
    ).flatMap((h) => h.periods),
  ];
  for (const c of containers)
    for (const [metric, list] of Object.entries(c.metrics ?? {}))
      for (const r of list) {
        rows++;
        const key = frozenRowKey(p.company.company_id, metric, r);
        if (key) keys.add(key);
        else incomplete.push(`${p.company.company_id}:${metric}:${String(r["period_end"])}`);
      }
}
const baseline = {
  schema: "marefa-publication-baseline/1",
  basis:
    "Identities of every financial row in the synthetic frozen fixtures tests/fixtures/synthetic-projection (sha-pinned); hashes only, no values",
  fixtures: shas,
  identity_fields: [
    "company_id",
    "metric",
    "period_kind",
    "period_start",
    "period_end",
    "scope",
    "dimensions",
    "currency",
    "unit",
    "version",
    "source_key",
    "value",
  ],
  rows,
  incomplete_identity_rows: incomplete.length,
  keys: [...keys].sort(),
};
writeFileSync(
  new URL("../../../src/lib/engine/publication-baseline.json", import.meta.url),
  await format(JSON.stringify(baseline), { parser: "json" }),
);
console.log(
  JSON.stringify({ fixtures: shas, rows, unique: keys.size, incomplete: incomplete.length }),
);
