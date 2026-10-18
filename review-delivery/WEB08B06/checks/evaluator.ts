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
 * bound still catches it; fractional digits lost inside the range cannot be detected after parsing (event 118:
 * evaluateRaw checks the lexemes before any double exists).
 */
const safeInput = (v: number, code: string) => {
  if (Math.abs(v) > Number.MAX_SAFE_INTEGER) fail(code);
};

/* ---- event 118: decimal precision policy (exact rationals for verification only, never for results) ---- */
/** Allowed decimal places per input type in the raw lexeme; results are reported and verified at OUT_PLACES. */
const PLACES = { items: 6, policy: 6, "fx.rate": 10 };
const OUT_PLACES = 6;
const MAX_DEPTH = 64;
type Q = { n: bigint; d: bigint };
const absB = (x: bigint) => (x < 0n ? -x : x);
const gcd = (a: bigint, b: bigint): bigint => {
  a = absB(a);
  b = absB(b);
  while (b) [a, b] = [b, a % b];
  return a;
};
const q = (n: bigint, d = 1n): Q => {
  if (d < 0n) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1n;
  return { n: n / g, d: d / g };
};
const qAdd = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const qMul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
/** Callers check the divisor first (R02-F); reaching zero here is a programming error, not data. */
const qDiv = (a: Q, b: Q) => {
  if (b.n === 0n) throw Error("internal: exact division by zero reached unchecked");
  return q(a.n * b.d, a.d * b.n);
};
const qScale = (a: Q, k: number) => q(a.n * BigInt(k), a.d);
/** Exact value of a finite double: doubling is exact for a non-integer double, at most 1074 times. */
function qOfDouble(v: number): Q {
  if (!Number.isFinite(v)) fail("non_finite_result");
  let k = 0n;
  while (!Number.isInteger(v)) {
    v *= 2;
    k++;
  }
  return q(BigInt(v), 2n ** k);
}
/** Scaled integer of q rounded half-to-even at `places` decimals. */
function roundHE(x: Q, places: number): bigint {
  const n = x.n * 10n ** BigInt(places);
  let f = n / x.d;
  if (n < 0n && f * x.d !== n) f -= 1n; // floor
  const twice = 2n * (n - f * x.d);
  if (twice > x.d || (twice === x.d && f % 2n !== 0n)) f += 1n;
  return f;
}

/** A JSON number kept as its source text by parseRaw; it is never a double before the policy check. */
class Lex {
  constructor(readonly text: string) {}
}
/** Ordered object as parsed: a repeated key keeps its first position and its last value (as json.loads). */
class Obj {
  readonly entries = new Map<string, unknown>();
}
const LEX = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?/y;
const NUM = /^(-?)(0|[1-9]\d*)(?:\.(\d+))?(?:[eE]([-+]?\d+))?$/;
/**
 * Strict JSON (RFC 8259) reader that keeps numeric lexemes. Rejects NaN/Infinity, trailing commas, comments,
 * control characters in strings and nesting beyond MAX_DEPTH, all as input_malformed:json.
 */
function parseRaw(text: string): unknown {
  let i = 0;
  const bad = (): never => fail("input_malformed:json");
  const ws = () => {
    while (i < text.length && " \t\n\r".includes(text[i])) i++;
  };
  const str = (): string => {
    if (text[i] !== '"') bad();
    i++;
    let out = "";
    for (;;) {
      if (i >= text.length) bad();
      const c = text[i++];
      if (c === '"') return out;
      if (c < " ") bad();
      if (c !== "\\") {
        out += c;
        continue;
      }
      const esc = text[i++];
      const simple: Record<string, string> = {
        '"': '"',
        "\\": "\\",
        "/": "/",
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "\t",
      };
      if (esc in simple) out += simple[esc];
      else if (esc === "u" && /^[0-9a-fA-F]{4}$/.test(text.slice(i, i + 4))) {
        out += String.fromCharCode(parseInt(text.slice(i, i + 4), 16));
        i += 4;
      } else bad();
    }
  };
  const value = (depth: number): unknown => {
    ws();
    const c = text[i];
    if (c === "{" || c === "[") {
      if (depth > MAX_DEPTH) bad();
      i++;
      ws();
      const close = c === "{" ? "}" : "]";
      const o = c === "{" ? new Obj() : ([] as unknown[]);
      if (text[i] === close) {
        i++;
        return o;
      }
      for (;;) {
        if (o instanceof Obj) {
          ws();
          const k = str();
          ws();
          if (text[i++] !== ":") bad();
          o.entries.set(k, value(depth + 1));
        } else o.push(value(depth + 1));
        ws();
        const sep = text[i++];
        if (sep === close) return o;
        if (sep !== ",") bad();
      }
    }
    if (c === '"') return str();
    for (const [w, v] of [
      ["true", true],
      ["false", false],
      ["null", null],
    ] as const)
      if (text.startsWith(w, i)) {
        i += w.length;
        return v;
      }
    LEX.lastIndex = i;
    const m = LEX.exec(text);
    if (!m) return bad();
    i += m[0].length;
    return new Lex(m[0]);
  };
  const v = value(1);
  ws();
  if (i !== text.length) bad();
  return v;
}

/**
 * Lexeme -> sign, coefficient digits and exponent (value = sign * coef * 10**exp, trailing zeros moved into exp), from the
 * digits only. An exponent written with more than 9 digits is clamped to +-10**9; no decision below changes.
 */
function lexParts(s: string): [bigint, string, number] {
  const g = NUM.exec(s)!;
  const negEx = (g[4] ?? "").startsWith("-");
  const exDigits = (g[4] ?? "0").replace(/^[-+]/, "").replace(/^0+/, "") || "0";
  const ex = (exDigits.length > 9 ? 1e9 : Number(exDigits)) * (negEx ? -1 : 1);
  const frac = g[3] ?? "";
  const digits = (g[2] + frac).replace(/^0+/, "");
  if (!digits) return [1n, "", 0];
  const kept = digits.replace(/0+$/, "");
  return [g[1] ? -1n : 1n, kept, ex - frac.length + (digits.length - kept.length)];
}

/** Exact value of a number text; only for texts whose exponent is small (checked by the caller). */
function qOfLex(s: string): Q {
  const [sign, coef, ex] = lexParts(s);
  return q(
    sign * BigInt(coef || "0") * 10n ** BigInt(Math.max(ex, 0)),
    10n ** BigInt(Math.max(-ex, 0)),
  );
}

/**
 * Raw JSON text -> [example, exact values]. Each numeric lexeme of items, policy and meta.fx.rate is checked
 * against the precision policy before it becomes a double; numbers written inside strings stay strings.
 */
function intake(text: string): [unknown, Map<string, Q>] {
  const doc = parseRaw(text);
  const exact = new Map<string, Q>();
  const take = (box: Obj, key: string, label: string, exactKey: string, places: number) => {
    const v = box.entries.get(key);
    if (!(v instanceof Lex)) return;
    const [, coef, ex] = lexParts(v.text);
    const written = coef ? Math.max(0, -ex) : 0;
    if (written > places) fail(`decimal_places_exceed_policy:${label}`);
    const d = Number(v.text); // the value JSON.parse gives the same text
    box.entries.set(key, d);
    if (coef && ex + coef.length - 1 >= 16) return; // |x| >= 1e16: the evaluator rejects it
    const x = qOfLex(v.text);
    if (absB(x.n) > BigInt(Number.MAX_SAFE_INTEGER) * x.d) return; // evaluator: unsafe_integer_precision
    // the double must still name the written value at its written precision (else digits were lost)
    if (roundHE(qOfDouble(d), written) !== roundHE(x, written))
      fail(`unsafe_decimal_precision:${label}`);
    exact.set(exactKey, x);
  };
  if (doc instanceof Obj) {
    const items = doc.entries.get("items");
    if (items instanceof Obj)
      for (const k of [...items.entries.keys()]) take(items, k, k, `items.${k}`, PLACES.items);
    const pol = doc.entries.get("policy");
    if (pol instanceof Obj)
      for (const k of [...pol.entries.keys()])
        take(pol, k, `policy.${k}`, `policy.${k}`, PLACES.policy);
    const m = doc.entries.get("meta");
    const fx = m instanceof Obj ? m.entries.get("fx") : undefined;
    if (fx instanceof Obj && fx.entries.has("rate"))
      take(fx, "rate", "fx.rate", "fx.rate", PLACES["fx.rate"]);
  }
  // everything else becomes what JSON.parse would have made it
  const plain = (o: unknown): unknown => {
    if (o instanceof Lex) return Number(o.text);
    if (Array.isArray(o)) return o.map(plain);
    if (!(o instanceof Obj)) return o;
    const out: Record<string, unknown> = {};
    for (const [k, v] of o.entries)
      Object.defineProperty(out, k, {
        value: plain(v),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    return out;
  };
  return [plain(doc), exact];
}
/** Exact input: the raw lexeme when evaluateRaw supplied it, else the double read as printed (shortest round-trip). */
const exactOf = (exact: Map<string, Q> | undefined, key: string, v: number): Q => {
  if (exact?.has(key)) return exact.get(key)!;
  if (!Number.isFinite(v)) fail("non_finite_result");
  return qOfLex(String(v));
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

/** Same grammar as calc(), on exact rationals; only run after the double path succeeded. */
function calcExact(expr: string, env: Record<string, Q>): Q {
  const toks = expr.match(/\d+(?:\.\d+)?|[a-z_]+|[()+\-*/]/g)!;
  let i = 0;
  const atom = (): Q => {
    const t = toks[i++];
    if (t === "(") {
      const v = add();
      i++;
      return v;
    }
    if (!/^\d/.test(t)) return env[t];
    const [w, f = ""] = t.split(".");
    return q(BigInt(w + f), 10n ** BigInt(f.length));
  };
  const mul = (): Q => {
    let v = atom();
    while (toks[i] === "*" || toks[i] === "/") {
      const op = toks[i++];
      const w = atom();
      if (op === "/" && w.n === 0n) fail("non_finite_result"); // R02-F: exact zero divisor, same code as calc()
      v = op === "*" ? qMul(v, w) : qDiv(v, w);
    }
    return v;
  };
  const add = (): Q => {
    let v = mul();
    while (toks[i] === "+" || toks[i] === "-")
      v = toks[i++] === "+" ? qAdd(v, mul()) : qAdd(v, qScale(mul(), -1));
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
  exact: Map<string, Q> | undefined,
  refsX: Record<string, Q>,
  outX: Q[],
): number {
  let total = 0;
  let totalX = q(0n);
  for (const t of terms) {
    if (t.when && !holds(t.when, { meta: e.meta, policy: e.policy ?? {} })) continue;
    if (t.expr.startsWith("ref:")) {
      total = finite(total + t.sign * refs[t.expr.slice(4)]);
      totalX = qAdd(totalX, qScale(refsX[t.expr.slice(4)], t.sign));
      continue;
    }
    const env: Record<string, number> = {};
    const envX: Record<string, Q> = {};
    for (const id of t.expr.match(/[a-z_]+/g) ?? []) {
      if (id.startsWith("policy_")) {
        env[id] = e.policy[id.slice(7)];
        envX[id] = exactOf(exact, `policy.${id.slice(7)}`, env[id]);
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
      envX[id] = exactOf(exact, `items.${id}`, env[id]);
    }
    total = finite(total + t.sign * calc(t.expr, env));
    totalX = qAdd(totalX, qScale(calcExact(t.expr, envX), t.sign));
  }
  outX.push(totalX);
  return total;
}

function run(
  recipes: Record<string, any>,
  r: any,
  e: any,
  top = true,
  exact?: Map<string, Q>,
): Result & { raw?: Record<string, number>; rawX?: Record<string, Q> } {
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
  const refsX: Record<string, Q> = {};
  for (const dep of r.depends_on) {
    const res = run(recipes, recipes[dep], e, false, exact) as any;
    for (const [k, v] of Object.entries<number>(res.raw)) refs[`${dep}.${k}`] = v;
    for (const [k, v] of Object.entries<Q>(res.rawX)) refsX[`${dep}.${k}`] = v;
  }
  const used = new Set<string>();
  const raw: Record<string, number> = {};
  const rawX: Record<string, Q> = {};
  for (const o of r.outputs) {
    const xs: Q[] = [];
    if (o.kind === "ratio") {
      const num = termsValue(o.numerator, r, e, refs, used, exact, refsX, xs);
      const den = termsValue(o.denominator, r, e, refs, used, exact, refsX, xs);
      // R02-F: the sign of the denominator is decided on its exact value, before any division; a double that
      // disagrees with it (e.g. 0.1 + 0.2 - 0.3 = 5.55e-17) cannot carry the ratio
      if (xs[1].n <= 0n) fail("denominator_not_positive");
      if (den <= 0) fail(`precision_not_guaranteed:${o.key}`);
      raw[o.key] = finite(num / den);
      rawX[o.key] = qDiv(xs[0], xs[1]);
    } else {
      raw[o.key] = termsValue(o.terms, r, e, refs, used, exact, refsX, xs);
      rawX[o.key] = xs[0];
    }
  }
  for (const it of [...termItems(r)].filter((x) => !used.has(x)).sort())
    if (it in e.items) fail(`reclassification_item_conflict:${it}`);
  for (const g of r.guards) if (g.part === "value" && raw[g.output] < g.min) fail(g.code);
  const values: Record<string, number> = {};
  for (const o of r.outputs) {
    let v = raw[o.key];
    let x = rawX[o.key];
    if (o.kind === "monetary" && m.currency !== "USD") {
      const rateX = exactOf(exact, "fx.rate", m.fx.rate);
      if (rateX.n <= 0n) fail("fx_rate_invalid"); // R02-F: exact rate checked before dividing
      v = finite(v / m.fx.rate);
      x = qDiv(x, rateX);
    }
    // values of 1e15 and above carry no sub-unit digits to round, and scaling them could overflow.
    // event 118: the double itself is rounded half-to-even exactly, as Python's round(v, 6) does; Math.round(v * 1e6)
    // rounded half-up after an inexact product and could decide a tie differently from Python
    values[o.key] = finite(
      Math.abs(v) >= 1e15 ? v : Number(`${roundHE(qOfDouble(v), OUT_PLACES)}e-${OUT_PLACES}`),
    );
    // event 118: the reported number, read as printed (shortest round-trip decimal), must equal the exact
    // result at the reported precision; a double too coarse to carry it is rejected, never passed on rounded
    if (roundHE(qOfLex(String(values[o.key])), OUT_PLACES) !== roundHE(x, OUT_PLACES))
      fail(`precision_not_guaranteed:${o.key}`);
  }
  return { status: "CONDITIONALLY_COMPARABLE", values, raw, rawX };
}

export function makeEvaluator(doc: any) {
  const recipes: Record<string, any> = Object.fromEntries(doc.recipes.map((r: any) => [r.id, r]));
  /**
   * Pre-parsed object path. Trust boundary: a number already rounded by an earlier parser (JSON.parse) cannot be
   * detected here; only the computation is verified exactly. External data must enter through evaluateRaw.
   */
  const evaluate = (id: string, e: any): Result => guarded(id, () => run(recipes, recipes[id], e));
  /** Raw JSON text path (event 118): numeric lexemes are validated before any double exists. */
  const evaluateRaw = (id: string, text: string): Result =>
    guarded(id, () => {
      const [e, exact] = intake(text);
      return run(recipes, recipes[id], e, true, exact);
    });
  const guarded = (id: string, f: () => any): Result => {
    // an unknown recipe id is a caller fault, not data: it throws instead of returning NOT_COMPARABLE
    if (!(id in recipes)) throw Error(`unknown recipe ${id}`);
    try {
      const res = f();
      delete res.raw;
      delete res.rawX;
      return res;
    } catch (x) {
      if (x instanceof NotComparable) return { status: "NOT_COMPARABLE", reason: x.message };
      throw x;
    }
  };
  /** Pre-parsed pair path; same trust boundary as evaluate. */
  const evaluatePair = (id: string, a: any, b: any): any =>
    pairOf(id, a, b, evaluate(id, a), evaluate(id, b));
  /** Raw pair path (event 119): both sides enter through the raw intake. */
  const evaluatePairRaw = (id: string, textA: string, textB: string): any => {
    const side = (text: string): [any, Result] => {
      let e: any;
      const res = guarded(id, () => {
        const [doc, exact] = intake(text);
        e = doc;
        return run(recipes, recipes[id], doc, true, exact);
      });
      return [e, res];
    };
    const [a, ra] = side(textA);
    const [b, rb] = side(textB);
    return pairOf(id, a, b, ra, rb);
  };
  const pairOf = (id: string, a: any, b: any, ra: Result, rb: Result): any => {
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
  return { recipes, evaluate, evaluateRaw, evaluatePair, evaluatePairRaw };
}
