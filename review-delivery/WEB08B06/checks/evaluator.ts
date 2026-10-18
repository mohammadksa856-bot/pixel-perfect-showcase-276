/**
 * WEB-08B06 / B06-0 — مقيّم مستقل لـCOMPARABILITY-RECIPES.json (recipes/3).
 * مكتوب منفصلًا عن مولّد Python (tools/recipes.py)، ويُقارن به في comparability.test.ts.
 * يفشل مغلقًا: أي نقص أو التباس أو عدم تجانس يعيد NOT_COMPARABLE بكود محدد، ولا قيمة افتراضية.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- recipes and examples are untyped JSON documents */

export type Result =
  | {
      status: "CONDITIONALLY_COMPARABLE";
      values: Record<string, number>;
      raw?: Record<string, number>;
    }
  | { status: "NOT_COMPARABLE" | "OUT_OF_SCOPE_B06"; reason: string };

const CURRENCIES = ["USD", "SAR"];
const DURATION: Record<string, [number, number]> = {
  FY: [364, 371],
  TTM: [364, 371],
  H1: [181, 184],
  Q: [89, 92],
};

class NotComparable extends Error {}
const fail = (code: string): never => {
  throw new NotComparable(code);
};
const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
/** R02-E: every intermediate and final value must stay finite. */
const finite = (v: number): number =>
  !Number.isFinite(v)
    ? fail("non_finite_result")
    : Math.abs(v) > Number.MAX_SAFE_INTEGER
      ? fail("unsafe_integer_precision")
      : v;
/**
 * Event 117 precision policy: a numeric input is used only within the IEEE-754 safe-integer range. JSON.parse has
 * already rounded the source text, but every integer text above MAX_SAFE_INTEGER parses to at least 2**53, so the
 * bound still catches it; fractional digits lost inside the range cannot be detected after parsing.
 */
const safeInput = (v: number, code: string) => {
  if (Math.abs(v) > Number.MAX_SAFE_INTEGER) fail(code);
};

/** R02-D: structure is validated before any property is read; malformed data is NOT_COMPARABLE, not an exception. */
function checkShape(e: unknown) {
  if (!isObject(e)) fail("input_malformed:example");
  const x = e as any;
  if (!isObject(x.meta)) fail("input_malformed:meta");
  if (!isObject(x.items)) fail("input_malformed:items");
  if ("policy" in x && !isObject(x.policy)) fail("input_malformed:policy");
  const m = x.meta;
  if ("period" in m && !isObject(m.period)) fail("input_malformed:meta.period");
  if ("fx" in m && !isObject(m.fx)) fail("input_malformed:meta.fx");
  if (
    "item_definitions" in m &&
    (!isObject(m.item_definitions) ||
      !Object.values(m.item_definitions).every((v) => typeof v === "string"))
  )
    fail("input_malformed:meta.item_definitions");
}
const get = (o: any, path: string) =>
  path
    .split(".")
    .reduce((c, p) => (c !== null && typeof c === "object" && p in c ? c[p] : undefined), o);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const absent = (v: unknown) => v === undefined || v === null;

/** Day number of a real calendar date written YYYY-MM-DD, else null. */
export function day(s: unknown): number | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  return d.getTime() / 86_400_000;
}

function holds(c: any, ctx: any): boolean {
  switch (c.op) {
    case "always":
      return true;
    case "and":
      return c.args.every((a: any) => holds(a, ctx));
    case "eq":
      return get(ctx, c.path) === c.value;
    case "neq_path":
      return get(ctx, c.path) !== get(ctx, c.other);
    case "not_in":
      return !c.values.includes(get(ctx, c.path));
  }
  throw Error(`unknown op ${c.op}`);
}

function calc(expr: string, env: Record<string, number>): number {
  const toks = expr.match(/\d+(?:\.\d+)?|[a-z_]+|[()+\-*/]/g)!;
  let i = 0;
  const atom = (): number => {
    const t = toks[i++];
    if (t === "(") {
      const v = add();
      i++;
      return v;
    }
    return /^\d/.test(t) ? Number(t) : env[t];
  };
  const mul = (): number => {
    let v = atom();
    while (toks[i] === "*" || toks[i] === "/") {
      const op = toks[i++];
      const w = atom();
      if (op === "/" && w === 0) fail("non_finite_result");
      v = finite(op === "*" ? v * w : v / w);
    }
    return v;
  };
  const add = (): number => {
    let v = mul();
    while (toks[i] === "+" || toks[i] === "-")
      v = finite(toks[i++] === "+" ? v + mul() : v - mul());
    return v;
  };
  return add();
}

function checkPeriod(r: any, m: any): [number, number] {
  const p = m.period;
  if (p === null || typeof p !== "object" || Array.isArray(p)) fail("period_missing");
  if (!r.allowed_period_kinds.includes(p.kind)) fail("period_kind_not_allowed");
  const s = day(p.start);
  const e = day(p.end);
  if (s === null || e === null) return fail("period_date_invalid");
  if (s >= e) fail("period_order_invalid");
  const [lo, hi] = DURATION[p.kind];
  const len = e - s + 1;
  if (len < lo || len > hi) fail("period_duration_inconsistent");
  if (p.kind === "Q" && p.standalone !== true) fail("quarter_not_standalone");
  if (p.kind === "TTM") {
    const q = p.ttm_quarter_ends;
    const ds = Array.isArray(q) && q.length === 4 ? q.map(day) : null;
    const ok =
      ds !== null &&
      ds.every((x: number | null) => x !== null) &&
      ds[3] === e &&
      ds.slice(1).every((b: number, k: number) => b - ds[k] >= 89 && b - ds[k] <= 92) &&
      ds[0] - s + 1 >= 89 &&
      ds[0] - s + 1 <= 92;
    if (!ok) fail("ttm_components_invalid");
  }
  if (
    r.requires_balance_dates &&
    (day(m.opening_balance_date) !== s - 1 || day(m.closing_balance_date) !== e)
  )
    fail("balance_dates_inconsistent");
  return [s, e];
}

function checkFx(r: any, m: any, s: number, e: number) {
  if (r.measure_type !== "flow" && r.measure_type !== "stock") return;
  if (!CURRENCIES.includes(m.currency)) fail("currency_not_supported");
  const fx = m.fx;
  if (m.currency === "USD") {
    if (!absent(fx)) fail("fx_unexpected_for_usd");
    return;
  }
  if (fx === null || typeof fx !== "object" || Array.isArray(fx)) fail("fx_missing");
  if (!isNum(fx.rate) || fx.rate <= 0) fail("fx_rate_invalid");
  safeInput(fx.rate, "unsafe_integer_precision:fx.rate");
  if (typeof fx.source_id !== "string" || !fx.source_id) fail("fx_source_missing");
  const want = r.measure_type === "flow" ? "period_average" : "closing";
  if (fx.rate_type !== want) fail("fx_rate_type_mismatch");
  if (want === "period_average") {
    if (day(fx.window_start) !== s || day(fx.window_end) !== e) fail("fx_window_mismatch");
  } else if (day(fx.rate_date) !== e) fail("fx_date_mismatch");
}

const termItems = (r: any): Set<string> => {
  const out = new Set<string>();
  for (const o of r.outputs)
    for (const t of [...(o.terms ?? []), ...(o.numerator ?? []), ...(o.denominator ?? [])])
      if (!t.expr.startsWith("ref:"))
        for (const x of t.expr.match(/[a-z_]+/g) ?? []) if (!x.startsWith("policy_")) out.add(x);
  return out;
};

function termsValue(
  terms: any[],
  r: any,
  e: any,
  refs: Record<string, number>,
  used: Set<string>,
): number {
  let total = 0;
  for (const t of terms) {
    if (t.when && !holds(t.when, { meta: e.meta, policy: e.policy ?? {} })) continue;
    if (t.expr.startsWith("ref:")) {
      total = finite(total + t.sign * refs[t.expr.slice(4)]);
      continue;
    }
    const env: Record<string, number> = {};
    for (const id of t.expr.match(/[a-z_]+/g) ?? []) {
      if (id.startsWith("policy_")) {
        env[id] = e.policy[id.slice(7)];
        continue;
      }
      used.add(id);
      const v = e.items[id];
      if (!(id in e.items) || v === null) fail(`required_item_missing:${id}`);
      if (!isNum(v)) fail(`item_not_numeric:${id}`);
      safeInput(v as number, `unsafe_integer_precision:${id}`);
      const d = e.meta.item_definitions?.[id];
      if (absent(d)) fail(`item_definition_missing:${id}`);
      if (d !== r.item_definitions[id]) fail(`item_definition_mismatch:${id}`);
      env[id] = v as number;
    }
    total = finite(total + t.sign * calc(t.expr, env));
  }
  return total;
}

function run(
  recipes: Record<string, any>,
  r: any,
  e: any,
  top = true,
): Result & { raw?: Record<string, number> } {
  if (r.proposed_rating === "OUT_OF_SCOPE_B06")
    return { status: "OUT_OF_SCOPE_B06", reason: "out_of_scope_b06" };
  checkShape(e);
  const m = e.meta;
  const ctx = { meta: m, policy: e.policy ?? {} };
  if (
    !Array.isArray(m.source_ids) ||
    m.source_ids.length === 0 ||
    !m.source_ids.every((x: unknown) => typeof x === "string" && x)
  )
    fail("source_missing");
  if (m.accounting_basis !== "IFRS" && m.accounting_basis !== "US_GAAP")
    fail("accounting_basis_unknown");
  if (m.consolidation !== "consolidated") fail("consolidation_not_group");
  if (m.restated_latest !== true) fail("not_latest_restated");
  const [s, en] = checkPeriod(r, m);
  checkFx(r, m, s, en);
  for (const c of r.failure_conditions) if (c.when.op === "always") fail(c.code);
  for (const [f, allowed] of Object.entries<any[]>(r.required_definitions)) {
    if (!(f in m) || absent(m[f])) fail(`definition_missing:${f}`);
    if (!allowed.includes(m[f])) fail(`definition_not_accepted:${f}`);
  }
  for (const [f, allowed] of Object.entries<any[]>(
    r.required_definitions_by_basis[m.accounting_basis] ?? {},
  )) {
    if (!(f in m) || absent(m[f])) fail(`definition_missing:${f}`);
    if (!allowed.includes(m[f])) fail(`definition_not_accepted:${f}`);
  }
  for (const [k, kind] of Object.entries<string>(r.policy_requirements)) {
    const v = e.policy?.[k];
    if (absent(v)) fail(`policy_missing:${k}`);
    if (
      (kind === "positive_number" && (!isNum(v) || v <= 0)) ||
      (kind === "boolean" && typeof v !== "boolean")
    )
      fail(`policy_invalid:${k}`);
    if (kind === "positive_number") safeInput(v, `unsafe_integer_precision:policy.${k}`);
  }
  for (const c of r.failure_conditions) if (holds(c.when, ctx)) fail(c.code);
  for (const it of [
    ...r.forbidden_items,
    ...r.depends_on.flatMap((d: string) => recipes[d].forbidden_items),
  ])
    if (it in e.items) fail(`item_not_allowed:${it}`);
  if (top) {
    // a dependency sees the dependant's full item set; recognition is checked once, against the union
    const known = new Set(Object.keys(r.item_definitions));
    for (const dep of r.depends_on)
      for (const k of Object.keys(recipes[dep].item_definitions)) known.add(k);
    for (const it of Object.keys(e.items).sort())
      if (!known.has(it)) fail(`item_not_recognised:${it}`);
  }
  const refs: Record<string, number> = {};
  for (const dep of r.depends_on) {
    const res = run(recipes, recipes[dep], e, false) as any;
    for (const [k, v] of Object.entries<number>(res.raw)) refs[`${dep}.${k}`] = v;
  }
  const used = new Set<string>();
  const raw: Record<string, number> = {};
  for (const o of r.outputs) {
    if (o.kind === "ratio") {
      const num = termsValue(o.numerator, r, e, refs, used);
      const den = termsValue(o.denominator, r, e, refs, used);
      if (den <= 0) fail("denominator_not_positive");
      raw[o.key] = finite(num / den);
    } else raw[o.key] = termsValue(o.terms, r, e, refs, used);
  }
  for (const it of [...termItems(r)].filter((x) => !used.has(x)).sort())
    if (it in e.items) fail(`reclassification_item_conflict:${it}`);
  for (const g of r.guards) if (g.part === "value" && raw[g.output] < g.min) fail(g.code);
  const values: Record<string, number> = {};
  for (const o of r.outputs) {
    let v = raw[o.key];
    if (o.kind === "monetary" && m.currency !== "USD") v = finite(v / m.fx.rate);
    // values of 1e15 and above carry no sub-unit digits to round, and scaling them could overflow
    values[o.key] = finite(Math.abs(v) >= 1e15 ? v : Math.round(v * 1e6) / 1e6);
  }
  return { status: "CONDITIONALLY_COMPARABLE", values, raw };
}

export function makeEvaluator(doc: any) {
  const recipes: Record<string, any> = Object.fromEntries(doc.recipes.map((r: any) => [r.id, r]));
  const evaluate = (id: string, e: any): Result => {
    // an unknown recipe id is a caller fault, not data: it throws instead of returning NOT_COMPARABLE
    if (!(id in recipes)) throw Error(`unknown recipe ${id}`);
    try {
      const res = run(recipes, recipes[id], e) as any;
      delete res.raw;
      return res;
    } catch (x) {
      if (x instanceof NotComparable) return { status: "NOT_COMPARABLE", reason: x.message };
      throw x;
    }
  };
  const evaluatePair = (id: string, a: any, b: any): any => {
    const ra = evaluate(id, a);
    const rb = evaluate(id, b);
    for (const [side, res] of [
      ["a", ra],
      ["b", rb],
    ] as const)
      if (res.status !== "CONDITIONALLY_COMPARABLE")
        return { status: res.status, reason: `${side}:${res.reason}` };
    const pa = a.meta.period;
    const pb = b.meta.period;
    if (pa.kind !== pb.kind || pa.start !== pb.start || pa.end !== pb.end)
      return { status: "NOT_COMPARABLE", reason: "period_not_homogeneous" };
    for (const f of recipes[id].pair_homogeneous_fields)
      if (a.meta[f] !== b.meta[f])
        return { status: "NOT_COMPARABLE", reason: `pair_not_homogeneous:${f}` };
    if (JSON.stringify(a.policy ?? null) !== JSON.stringify(b.policy ?? null))
      return { status: "NOT_COMPARABLE", reason: "pair_policy_mismatch" };
    return {
      status: "CONDITIONALLY_COMPARABLE",
      values: { a: (ra as any).values, b: (rb as any).values },
    };
  };
  return { recipes, evaluate, evaluatePair };
}
