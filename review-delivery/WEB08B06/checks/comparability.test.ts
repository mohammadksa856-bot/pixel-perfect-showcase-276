/**
 * WEB-08B06 / B06-0 — R02 وR02-A وR02-B: وصفات المقارنة تفشل مغلقة.
 * كل حالة سلبية تختبر سلوكًا كان يُقبل خطأً أو يجب رفضه، لا تعديل مثال حتى ينجح.
 * كل الحالات تُقيَّم بالمقيّم المستقل (evaluator.ts) وبمولّد Python معًا، ويجب أن يتطابقا.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- cases are untyped JSON documents */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { makeEvaluator } from "./evaluator";

const DIR = fileURLToPath(new URL("../", import.meta.url));
const doc = JSON.parse(readFileSync(join(DIR, "COMPARABILITY-RECIPES.json"), "utf8"));
const { recipes, evaluate, evaluatePair } = makeEvaluator(doc);
const R = doc.recipes as any[];
const clone = <T>(x: T): T => structuredClone(x);
const passOf = (id: string) =>
  clone(recipes[id].examples.find((e: any) => e.label.startsWith("pass")));
const pairOf = (id: string, label: string) =>
  clone(recipes[id].pair_examples.find((p: any) => p.label === label));
const NC = (reason: string) => ({ status: "NOT_COMPARABLE", reason });

type Case = { name: string; recipe: string; a: any; b?: any; expect: any };
const CASES: Case[] = [];
const add = (name: string, recipe: string, a: any, expected: any, b?: any) =>
  CASES.push({ name, recipe, a, ...(b ? { b } : {}), expect: expected });
const mutate = (id: string, f: (e: any) => void) => {
  const e = passOf(id);
  f(e);
  return e;
};
const withMeta = (id: string, patch: Record<string, unknown>) =>
  mutate(id, (e) => Object.assign(e.meta, patch));
const without = (id: string, path: string) =>
  mutate(id, (e) => {
    const keys = path.split(".");
    const last = keys.pop()!;
    delete keys.reduce((o, k) => o[k], e)[last];
  });

/* ---------- R02-A.1 capex / FCF: acquisitions and investments must be separable ---------- */
for (const id of ["M06", "M07"]) {
  add(
    `${id} acquisitions classification missing`,
    id,
    without(id, "meta.capex_acquisitions_classification"),
    NC("definition_missing:capex_acquisitions_classification"),
  );
  add(
    `${id} acquisitions combined with PP&E`,
    id,
    withMeta(id, { capex_acquisitions_classification: "combined_with_ppe" }),
    NC("definition_not_accepted:capex_acquisitions_classification"),
  );
  add(
    `${id} investments classification missing`,
    id,
    without(id, "meta.investments_classification"),
    NC("definition_missing:investments_classification"),
  );
  add(
    `${id} investments not separable`,
    id,
    withMeta(id, { investments_classification: "not_separable" }),
    NC("definition_not_accepted:investments_classification"),
  );
  add(
    `${id} legacy flag alone is not evidence`,
    id,
    mutate(id, (e) => {
      delete e.meta.capex_acquisitions_classification;
      e.meta.capex_line_includes_acquisitions = false;
    }),
    NC("definition_missing:capex_acquisitions_classification"),
  );
  add(
    `${id} full cost`,
    id,
    withMeta(id, { e_and_e_method: "full_cost" }),
    NC("definition_not_accepted:e_and_e_method"),
  );
  add(
    `${id} acquisition payments supplied as capex input`,
    id,
    mutate(id, (e) => (e.items.payments_for_acquisitions = 5)),
    NC("item_not_allowed:payments_for_acquisitions"),
  );
  add(
    `${id} equity investments supplied as capex input`,
    id,
    mutate(id, (e) => (e.items.payments_for_equity_investments = 5)),
    NC("item_not_allowed:payments_for_equity_investments"),
  );
}

/* ---------- R02-A.2 definitions present and allow-listed before any computation ---------- */
const COND = R.filter((r) => r.proposed_rating === "CONDITIONALLY_COMPARABLE");
for (const r of COND)
  for (const f of Object.keys(r.required_definitions)) {
    add(`${r.id} ${f} missing`, r.id, without(r.id, `meta.${f}`), NC(`definition_missing:${f}`));
    add(`${r.id} ${f} null`, r.id, withMeta(r.id, { [f]: null }), NC(`definition_missing:${f}`));
    add(
      `${r.id} ${f} unlisted`,
      r.id,
      withMeta(r.id, { [f]: "UNLISTED_VALUE" }),
      NC(`definition_not_accepted:${f}`),
    );
    add(
      `${r.id} ${f} wrong type`,
      r.id,
      withMeta(r.id, { [f]: 1 }),
      NC(`definition_not_accepted:${f}`),
    );
  }
for (const r of COND) {
  const e = passOf(r.id);
  for (const item of Object.keys(e.items)) {
    add(
      `${r.id} ${item} definition missing`,
      r.id,
      mutate(r.id, (x) => delete x.meta.item_definitions[item]),
      NC(`item_definition_missing:${item}`),
    );
    add(
      `${r.id} ${item} definition differs`,
      r.id,
      mutate(r.id, (x) => (x.meta.item_definitions[item] = "some_other_definition")),
      NC(`item_definition_mismatch:${item}`),
    );
    add(
      `${r.id} ${item} as text`,
      r.id,
      mutate(r.id, (x) => (x.items[item] = String(x.items[item]))),
      NC(`item_not_numeric:${item}`),
    );
    add(
      `${r.id} ${item} null`,
      r.id,
      mutate(r.id, (x) => (x.items[item] = null)),
      NC(`required_item_missing:${item}`),
    );
    add(
      `${r.id} ${item} absent`,
      r.id,
      mutate(r.id, (x) => delete x.items[item]),
      NC(`required_item_missing:${item}`),
    );
  }
}
// specific previously-accepted combinations
add(
  "M02 IFRS with LIFO",
  "M02",
  withMeta("M02", { accounting_basis: "IFRS" }),
  NC("inventory_method_inconsistent_with_basis"),
);
add(
  "M02 royalty as income tax",
  "M02",
  withMeta("M02", { royalty_classification: "income_tax" }),
  NC("definition_not_accepted:royalty_classification"),
);
add(
  "M08 hybrids present, classification missing",
  "M08",
  withMeta("M08", { has_hybrids: true }),
  NC("hybrid_classification_not_accepted"),
);
add(
  "M08 hybrids present, classified as equity",
  "M08",
  withMeta("M08", { has_hybrids: true, hybrid_classification: "equity" }),
  NC("hybrid_classification_not_accepted"),
);
add(
  "M08 gearing denominator not positive",
  "M08",
  mutate("M08", (e) => (e.items.total_equity = -250)),
  NC("denominator_not_positive"),
);
add(
  "M09 capital employed not positive",
  "M09",
  mutate("M09", (e) => Object.assign(e.items, { equity_open: -300, equity_close: -300 })),
  NC("denominator_not_positive"),
);
add(
  "M02 IFRS-only item supplied on the US GAAP path",
  "M02",
  mutate("M02", (e) => (e.items.inventory_holding_gain = 1)),
  NC("reclassification_item_conflict:inventory_holding_gain"),
);

/* ---------- R02-A.3 periods: kind, real dates, order, duration, homogeneity ---------- */
const P = (id: string, period: any, extra: Record<string, unknown> = {}) =>
  mutate(id, (e) => {
    e.meta.period = period;
    Object.assign(e.meta, extra);
    if (e.meta.fx?.window_start)
      Object.assign(e.meta.fx, { window_start: period.start, window_end: period.end });
  });
for (const id of ["M01", "M05", "M08", "M13"]) {
  add(
    `${id} impossible calendar date`,
    id,
    P(id, { kind: "FY", start: "2030-01-01", end: "2030-02-30", standalone: true }),
    NC("period_date_invalid"),
  );
  add(
    `${id} start missing`,
    id,
    P(id, { kind: "FY", end: "2030-12-31", standalone: true }),
    NC("period_date_invalid"),
  );
  add(
    `${id} date as number`,
    id,
    P(id, { kind: "FY", start: "2030-01-01", end: 20301231, standalone: true }),
    NC("period_date_invalid"),
  );
  add(
    `${id} date with time part`,
    id,
    P(id, { kind: "FY", start: "2030-01-01", end: "2030-12-31T00:00:00Z", standalone: true }),
    NC("period_date_invalid"),
  );
  add(
    `${id} start after end`,
    id,
    P(id, { kind: "FY", start: "2031-01-01", end: "2030-12-31", standalone: true }),
    NC("period_order_invalid"),
  );
  add(
    `${id} FY lasting six months`,
    id,
    P(id, { kind: "FY", start: "2030-07-01", end: "2030-12-31", standalone: true }),
    NC("period_duration_inconsistent"),
  );
  add(
    `${id} H1 lasting a year`,
    id,
    P(id, { kind: "H1", start: "2030-01-01", end: "2030-12-31", standalone: true }),
    NC("period_duration_inconsistent"),
  );
  add(
    `${id} unknown kind`,
    id,
    P(id, { kind: "FY2030", start: "2030-01-01", end: "2030-12-31", standalone: true }),
    NC("period_kind_not_allowed"),
  );
  add(
    `${id} quarter without stand-alone flag`,
    id,
    P(id, { kind: "Q", start: "2030-10-01", end: "2030-12-31" }),
    NC("quarter_not_standalone"),
  );
  add(
    `${id} quarter derived (not stand-alone)`,
    id,
    P(id, { kind: "Q", start: "2030-10-01", end: "2030-12-31", standalone: false }),
    NC("quarter_not_standalone"),
  );
}
for (const id of ["M01", "M05"]) {
  const ttm = {
    kind: "TTM",
    start: "2030-01-01",
    end: "2030-12-31",
    ttm_quarter_ends: ["2030-03-31", "2030-06-30", "2030-09-30", "2030-12-31"],
  };
  add(
    `${id} TTM without components`,
    id,
    P(id, { ...ttm, ttm_quarter_ends: undefined }),
    NC("ttm_components_invalid"),
  );
  add(
    `${id} TTM with three quarters`,
    id,
    P(id, { ...ttm, ttm_quarter_ends: ttm.ttm_quarter_ends.slice(1) }),
    NC("ttm_components_invalid"),
  );
  add(
    `${id} TTM non-consecutive quarters`,
    id,
    P(id, { ...ttm, ttm_quarter_ends: ["2030-03-31", "2030-06-30", "2030-11-30", "2030-12-31"] }),
    NC("ttm_components_invalid"),
  );
  add(
    `${id} TTM last quarter not period end`,
    id,
    P(id, { ...ttm, ttm_quarter_ends: ["2029-12-31", "2030-03-31", "2030-06-30", "2030-09-30"] }),
    NC("ttm_components_invalid"),
  );
}
add(
  "M09 quarter not allowed",
  "M09",
  P(
    "M09",
    { kind: "Q", start: "2030-10-01", end: "2030-12-31", standalone: true },
    { opening_balance_date: "2030-09-30", closing_balance_date: "2030-12-31" },
  ),
  NC("period_kind_not_allowed"),
);
add(
  "M09 opening balance date wrong",
  "M09",
  withMeta("M09", { opening_balance_date: "2029-06-30" }),
  NC("balance_dates_inconsistent"),
);
add(
  "M09 closing balance date wrong",
  "M09",
  withMeta("M09", { closing_balance_date: "2030-06-30" }),
  NC("balance_dates_inconsistent"),
);
{
  const a = passOf("M03");
  const b = withMeta("M03", {
    company: "SYNTH-B",
    period: { kind: "FY", start: "2029-01-01", end: "2029-12-31", standalone: true },
  });
  add("pair with different fiscal years", "M03", a, NC("period_not_homogeneous"), b);
  const c = withMeta("M03", {
    company: "SYNTH-C",
    period: {
      kind: "TTM",
      start: "2030-01-01",
      end: "2030-12-31",
      ttm_quarter_ends: ["2030-03-31", "2030-06-30", "2030-09-30", "2030-12-31"],
    },
  });
  add("pair FY vs TTM of equal dates", "M03", a, NC("period_not_homogeneous"), c);
  const d = withMeta("M01", { company: "SYNTH-D", trading_revenue_basis: "net" });
  add(
    "pair with gross vs net trading revenue",
    "M01",
    passOf("M01"),
    NC("pair_not_homogeneous:trading_revenue_basis"),
    d,
  );
  const p2 = mutate("M11", (e) => (e.policy.gas_scf_per_boe = 5800));
  add("pair with different policy factors", "M11", passOf("M11"), NC("pair_policy_mismatch"), p2);
}

/* ---------- R02-A.4 FX: rate, source, date/window and basis ---------- */
const FX = (id: string, f: (fx: any, m: any) => void) => mutate(id, (e) => f(e.meta.fx, e.meta));
for (const [id, kind] of [
  ["M01", "flow"],
  ["M08", "stock"],
] as const) {
  add(
    `${id} SAR without FX`,
    id,
    mutate(id, (e) => delete e.meta.fx),
    NC("fx_missing"),
  );
  add(
    `${id} FX rate zero`,
    id,
    FX(id, (fx) => (fx.rate = 0)),
    NC("fx_rate_invalid"),
  );
  add(
    `${id} FX rate negative`,
    id,
    FX(id, (fx) => (fx.rate = -3.75)),
    NC("fx_rate_invalid"),
  );
  add(
    `${id} FX rate as text`,
    id,
    FX(id, (fx) => (fx.rate = "3.75")),
    NC("fx_rate_invalid"),
  );
  add(
    `${id} FX source missing`,
    id,
    FX(id, (fx) => delete fx.source_id),
    NC("fx_source_missing"),
  );
  add(
    `${id} FX source empty`,
    id,
    FX(id, (fx) => (fx.source_id = "")),
    NC("fx_source_missing"),
  );
  add(
    `${id} FX basis missing`,
    id,
    FX(id, (fx) => delete fx.rate_type),
    NC("fx_rate_type_mismatch"),
  );
  if (kind === "flow") {
    add(
      `${id} closing rate for a flow`,
      id,
      FX(id, (fx) => (fx.rate_type = "closing")),
      NC("fx_rate_type_mismatch"),
    );
    add(
      `${id} average without window`,
      id,
      FX(id, (fx) => {
        delete fx.window_start;
        delete fx.window_end;
      }),
      NC("fx_window_mismatch"),
    );
    add(
      `${id} average window of another period`,
      id,
      FX(id, (fx) => Object.assign(fx, { window_start: "2029-01-01", window_end: "2029-12-31" })),
      NC("fx_window_mismatch"),
    );
    add(
      `${id} average window undated (single date only)`,
      id,
      FX(id, (fx) => {
        delete fx.window_start;
        delete fx.window_end;
        fx.rate_date = "2030-12-31";
      }),
      NC("fx_window_mismatch"),
    );
  } else {
    add(
      `${id} average rate for a stock`,
      id,
      FX(id, (fx) => (fx.rate_type = "period_average")),
      NC("fx_rate_type_mismatch"),
    );
    add(
      `${id} closing rate undated`,
      id,
      FX(id, (fx) => delete fx.rate_date),
      NC("fx_date_mismatch"),
    );
    add(
      `${id} closing rate of another date`,
      id,
      FX(id, (fx) => (fx.rate_date = "2030-06-30")),
      NC("fx_date_mismatch"),
    );
  }
  add(
    `${id} USD cell carrying an FX object`,
    id,
    mutate(id, (e) => (e.meta.currency = "USD")),
    NC("fx_unexpected_for_usd"),
  );
  add(
    `${id} unsupported currency`,
    id,
    withMeta(id, { currency: "EUR" }),
    NC("currency_not_supported"),
  );
  add(`${id} currency missing`, id, without(id, "meta.currency"), NC("currency_not_supported"));
}

/* ---------- R02-A.5/6 no defaults or fallbacks ---------- */
add(
  "M10 performance-linked amount not disclosed",
  "M10",
  mutate("M10", (e) => delete e.items.performance_linked_paid),
  NC("required_item_missing:performance_linked_paid"),
);
add(
  "M10 performance-linked above total",
  "M10",
  mutate("M10", (e) => (e.items.performance_linked_paid = 300)),
  NC("performance_linked_exceeds_total"),
);
add(
  "M10 performance-linked negative",
  "M10",
  mutate("M10", (e) => Object.assign(e.items, { performance_linked_paid: -10 })),
  NC("performance_linked_negative"),
);
add(
  "M11 policy factor missing",
  "M11",
  mutate("M11", (e) => delete e.policy.gas_scf_per_boe),
  NC("policy_missing:gas_scf_per_boe"),
);
add(
  "M11 policy factor zero",
  "M11",
  mutate("M11", (e) => (e.policy.gas_scf_per_boe = 0)),
  NC("policy_invalid:gas_scf_per_boe"),
);
add(
  "M11 policy object missing",
  "M11",
  mutate("M11", (e) => delete e.policy),
  NC("policy_missing:gas_scf_per_boe"),
);
add(
  "M11 affiliate flag differs from policy",
  "M11",
  withMeta("M11", { includes_equity_affiliates: true }),
  NC("affiliate_inclusion_mismatch"),
);
add(
  "M02 US GAAP lease interest part not disclosed",
  "M02",
  mutate("M02", (e) => delete e.items.operating_lease_interest_component),
  NC("required_item_missing:operating_lease_interest_component"),
);
add(
  "M05 interest in financing without amount",
  "M05",
  mutate("M05", (e) => delete e.items.interest_paid_in_financing),
  NC("required_item_missing:interest_paid_in_financing"),
);
add(
  "generic: restated flag missing",
  "M03",
  without("M03", "meta.restated_latest"),
  NC("not_latest_restated"),
);
add(
  "generic: source list of empty strings",
  "M03",
  withMeta("M03", { source_ids: [""] }),
  NC("source_missing"),
);
add(
  "generic: basis missing",
  "M03",
  without("M03", "meta.accounting_basis"),
  NC("accounting_basis_unknown"),
);

/* ---------- R02-B dividends received, CFO and FCF ---------- */
{
  const X = pairOf("M05", "same_economics_reconciled").a;
  const Y = pairOf("M05", "same_economics_reconciled").b;
  add(
    "CFO: same economics, investing vs operating dividends received",
    "M05",
    X,
    { status: "CONDITIONALLY_COMPARABLE", values: { a: { cfo_norm: 750 }, b: { cfo_norm: 750 } } },
    Y,
  );
  add(
    "CFO: investing classification without disclosed amount",
    "M05",
    pairOf("M05", "evidence_missing").a,
    NC("a:required_item_missing:dividends_received_in_investing"),
    Y,
  );
  add(
    "CFO: operating classification plus reclassification item (double count)",
    "M05",
    X,
    NC("b:reclassification_item_conflict:dividends_received_in_investing"),
    pairOf("M05", "double_count_rejected").b,
  );
  const Z = clone(Y);
  Z.meta.company = "SYNTH-Z";
  Z.meta.dividends_paid_classification = "operating";
  Z.items.cfo = 700;
  Z.items.dividends_paid_in_operating = 100;
  Z.meta.item_definitions.dividends_paid_in_operating =
    recipes.M05.item_definitions.dividends_paid_in_operating;
  add(
    "CFO: dividends paid in operating are added back",
    "M05",
    Z,
    { status: "CONDITIONALLY_COMPARABLE", values: { a: { cfo_norm: 750 }, b: { cfo_norm: 750 } } },
    Y,
  );
  const Z2 = clone(Z);
  delete Z2.items.dividends_paid_in_operating;
  add(
    "CFO: dividends paid in operating without amount",
    "M05",
    Z2,
    NC("a:required_item_missing:dividends_paid_in_operating"),
    Y,
  );
  const Y2 = clone(Y);
  Y2.items.dividends_paid_in_operating = 100;
  Y2.meta.item_definitions.dividends_paid_in_operating =
    recipes.M05.item_definitions.dividends_paid_in_operating;
  add(
    "CFO: financing classification plus add-back item (double count)",
    "M05",
    Y2,
    NC("reclassification_item_conflict:dividends_paid_in_operating"),
  );
  add(
    "CFO: dividends paid to parent are not a CFO input",
    "M05",
    mutate("M05", (e) => (e.items.dividends_paid_parent = 10)),
    NC("item_not_allowed:dividends_paid_parent"),
  );
  add(
    "CFO: dividends paid to NCI are not a CFO input",
    "M05",
    mutate("M05", (e) => (e.items.dividends_paid_nci = 10)),
    NC("item_not_allowed:dividends_paid_nci"),
  );
  add(
    "CFO: US GAAP investing distributions",
    "M05",
    withMeta("M05", { accounting_basis: "US_GAAP", interest_paid_classification: "operating" }),
    NC("dividends_received_investing_under_us_gaap_not_reconcilable"),
  );
  add(
    "CFO: US GAAP interest paid in financing",
    "M05",
    withMeta("M05", { accounting_basis: "US_GAAP" }),
    NC("interest_paid_classification_inconsistent_with_basis"),
  );
  add(
    "CFO: interest received outside operating",
    "M05",
    withMeta("M05", { interest_received_classification: "investing" }),
    NC("definition_not_accepted:interest_received_classification"),
  );
  add(
    "CFO: mixed dividends received classification",
    "M05",
    withMeta("M05", { dividends_received_classification: "partly_operating" }),
    NC("definition_not_accepted:dividends_received_classification"),
  );

  const FX_ = pairOf("M07", "fcf_same_economics_reconciled");
  add(
    "FCF: built on normalised CFO for both companies",
    "M07",
    FX_.a,
    {
      status: "CONDITIONALLY_COMPARABLE",
      values: { a: { fcf_rebuilt: 330 }, b: { fcf_rebuilt: 330 } },
    },
    FX_.b,
  );
  add(
    "FCF: rejected when CFO reconciliation evidence is missing",
    "M07",
    pairOf("M07", "fcf_evidence_missing").a,
    NC("a:required_item_missing:dividends_received_in_investing"),
    FX_.b,
  );
  const FD = clone(FX_.b);
  FD.items.dividends_received_in_investing = 30;
  FD.meta.item_definitions.dividends_received_in_investing =
    recipes.M05.item_definitions.dividends_received_in_investing;
  add(
    "FCF: double count propagates from CFO",
    "M07",
    FD,
    NC("reclassification_item_conflict:dividends_received_in_investing"),
  );

  add(
    "M10: NCI dividends mixed into parent dividends",
    "M10",
    mutate("M10", (e) => (e.items.dividends_paid_nci = 20)),
    NC("item_not_allowed:dividends_paid_nci"),
  );
  add(
    "M10: dividends received mixed into dividends paid",
    "M10",
    mutate("M10", (e) => (e.items.dividends_received_in_operating = 20)),
    NC("item_not_allowed:dividends_received_in_operating"),
  );
  add(
    "M10: buybacks mixed into dividends",
    "M10",
    mutate("M10", (e) => (e.items.share_buybacks = 20)),
    NC("item_not_allowed:share_buybacks"),
  );
  add(
    "M10: scope includes NCI",
    "M10",
    withMeta("M10", { dividends_paid_scope: "parent_and_nci" }),
    NC("definition_not_accepted:dividends_paid_scope"),
  );
  add(
    "M10: amount defined including NCI",
    "M10",
    mutate(
      "M10",
      (e) => (e.meta.item_definitions.dividends_paid_parent = "cash_dividends_paid_incl_nci"),
    ),
    NC("item_definition_mismatch:dividends_paid_parent"),
  );
  add(
    "M10: declared, not paid",
    "M10",
    withMeta("M10", { dividend_basis: "declared" }),
    NC("definition_not_accepted:dividend_basis"),
  );
}

const run = (c: Case) => (c.b ? evaluatePair(c.recipe, c.a, c.b) : evaluate(c.recipe, c.a));

describe("R02 recipes are complete", () => {
  test("17 metrics; conditionally comparable ones carry allow-listed definitions and item definitions", () => {
    expect(R.map((r) => r.id)).toEqual(
      Array.from({ length: 17 }, (_, i) => `M${String(i + 1).padStart(2, "0")}`),
    );
    expect(doc.schema).toBe("marefa-web08b06-comparability-recipes/2");
    for (const r of R) {
      expect(["CONDITIONALLY_COMPARABLE", "NOT_COMPARABLE", "OUT_OF_SCOPE_B06"]).toContain(
        r.proposed_rating,
      );
      for (const k of ["definition", "ordered_steps", "ifrs_vs_us_gaap", "basis", "handling"])
        expect(r[k]).toBeTruthy();
      if (r.proposed_rating === "CONDITIONALLY_COMPARABLE") {
        expect(Object.keys(r.required_definitions).length + r.depends_on.length).toBeGreaterThan(0);
        for (const o of r.outputs)
          for (const t of [...(o.terms ?? []), ...(o.numerator ?? []), ...(o.denominator ?? [])])
            if (!t.expr.startsWith("ref:"))
              for (const id of t.expr.match(/[a-z_]+/g) ?? [])
                if (!id.startsWith("policy_"))
                  expect({ r: r.id, id, defined: id in r.item_definitions }).toEqual({
                    r: r.id,
                    id,
                    defined: true,
                  });
      } else {
        expect(r.outputs).toEqual([]);
        expect(r.failure_conditions.some((c: any) => c.when.op === "always")).toBe(true);
      }
    }
    expect(R.some((r) => r.proposed_rating === "COMPARABLE")).toBe(false);
    expect(recipes.M10.proposed_rating).toBe("CONDITIONALLY_COMPARABLE");
    expect(recipes.M07.depends_on).toEqual(["M05", "M06"]);
  });
  test("the evaluator reproduces every example and pair example", () => {
    for (const r of R) {
      for (const e of r.examples) {
        expect(e.expected.display).toBe("BLOCKED");
        const { display: _d, ...want } = e.expected;
        expect({ id: r.id, label: e.label, got: evaluate(r.id, e) }).toEqual({
          id: r.id,
          label: e.label,
          got: want,
        });
        expect(e.label.startsWith("pass")).toBe(e.expected.status === "CONDITIONALLY_COMPARABLE");
      }
      for (const p of r.pair_examples) {
        const { display: _d, ...want } = p.expected;
        expect({ id: r.id, label: p.label, got: evaluatePair(r.id, p.a, p.b) }).toEqual({
          id: r.id,
          label: p.label,
          got: want,
        });
      }
    }
  });
});

describe("R02-A / R02-B regression cases (behaviour, not examples)", () => {
  test("case count covers every guard family", () => {
    expect(CASES.length).toBeGreaterThan(300);
    expect(new Set(CASES.map((c) => c.name)).size).toBe(CASES.length);
  });
  for (const c of CASES) test(c.name, () => expect(run(c)).toEqual(c.expect));
  test("every pass example still passes (cases are not vacuous)", () => {
    for (const r of COND)
      expect(evaluate(r.id, passOf(r.id)).status).toBe("CONDITIONALLY_COMPARABLE");
  });
  test("the Python generator's evaluator returns the same result for every case", () => {
    const dir = mkdtempSync(join(tmpdir(), "b06-parity-"));
    const file = join(dir, "cases.json");
    writeFileSync(
      file,
      JSON.stringify(CASES.map(({ recipe, a, b }) => ({ recipe, a, ...(b ? { b } : {}) }))),
    );
    const p = Bun.spawnSync(["python3", join(DIR, "tools/recipes.py"), "--evaluate", file]);
    expect(p.exitCode).toBe(0);
    const py = JSON.parse(p.stdout.toString());
    expect(py.length).toBe(CASES.length);
    CASES.forEach((c, i) =>
      expect({ name: c.name, py: py[i] }).toEqual({ name: c.name, py: run(c) }),
    );
  });
});
