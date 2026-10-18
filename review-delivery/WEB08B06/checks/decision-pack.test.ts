/**
 * WEB-08B06 / B06-0 — حتمية حزمة القرار (R01–R05). لا شبكة، ولا بيانات حقيقية.
 * يعيد مقيّم مستقل (هنا) اشتقاق نتائج أمثلة الوصفات الاصطناعية التي حسبها مولّد Python.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- the checks walk untyped JSON documents */
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = fileURLToPath(new URL("../", import.meta.url));
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const PREVIOUS_DELIVERY = "17b870cf4e1bf6fc8ff4d0afb9f9d3b5b675fb26";
const read = (f: string) => JSON.parse(readFileSync(join(DIR, f), "utf8"));
const rights = read("SOURCE-RIGHTS-MATRIX.json");
const recipes = read("COMPARABILITY-RECIPES.json");
const peers = read("PEER-CANDIDATES.json");
const decisions = read("DECISION-REGISTER.json");
const corrections = read("TRACKING-EVENT-CORRECTIONS.json");
const report = readFileSync(join(DIR, "WEB-08B06-INDUSTRY-PEERS-RIGHTS-DECISION_AR.md"), "utf8");
const git = (...args: string[]) => {
  const r = Bun.spawnSync(["git", ...args], { cwd: ROOT });
  if (r.exitCode !== 0) throw Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
  return r.stdout;
};

describe("R01 source rights", () => {
  const S = rights.sources as any[];
  test("every product and use has a separate status; no excerpt is a legal status or grant", () => {
    expect(S.length).toBeGreaterThanOrEqual(25);
    for (const s of S) {
      expect(Object.keys(s.uses).sort()).toEqual([...rights.uses].sort());
      expect(s.terms.official_text_verified).toBe(false);
      expect(s.terms.verified_at).toBeNull();
      expect(s.b01_grant).toMatchObject({
        status: "unknown",
        uses_granted: [],
        rights_reviewer: null,
      });
      expect(s.content_types.length).toBeGreaterThan(0);
      expect(typeof s.dataset_version).toBe("string");
      for (const u of Object.values<any>(s.uses))
        expect(["PENDING_VERIFICATION", "UNKNOWN"]).toContain(u.proposed_legal_status);
      if (s.terms.excerpt_summary === null)
        for (const u of Object.values<any>(s.uses)) expect(u.proposed_legal_status).toBe("UNKNOWN");
    }
  });
  test("licences are per product, never inherited", () => {
    const keys = S.map((s) => `${s.provider}|${s.product}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const s of S) {
      expect(JSON.stringify(s)).not.toMatch(/inherit(s|ed)_from|applies_to_all_products/);
      expect(s.licence_scope).toMatch(/this product only/);
    }
    const iea = S.filter((s) => s.provider === "IEA");
    const ids = iea.map((s) => s.id).sort();
    expect(ids).toEqual([
      "SRC-IEA-ESDB",
      "SRC-IEA-PAID",
      "SRC-IEA-REPORTS",
      "SRC-IEA-WEO2025-FREE",
    ]);
    const byId = Object.fromEntries(iea.map((s) => [s.id, s]));
    expect(byId["SRC-IEA-WEO2025-FREE"].terms.excerpt_summary).toMatch(/CC BY-NC-SA 4\.0/);
    expect(byId["SRC-IEA-REPORTS"].terms.excerpt_summary).toMatch(/datasets.*excluded/);
    expect(byId["SRC-IEA-PAID"].uses.redistribution.excerpt_reading).toBe(
      "APPEARS_PROHIBITED_WITHOUT_CONSENT",
    );
    // Data Browser: Codex-reported CC BY 4.0 is recorded, not adopted
    expect(byId["SRC-IEA-ESDB"].codex_reported).toMatch(/CC BY 4\.0/);
    for (const u of Object.values<any>(byId["SRC-IEA-ESDB"].uses))
      expect(u.proposed_legal_status).toBe("UNKNOWN");
  });
  test("financial facts and protected content are separate products", () => {
    const ids = new Set(S.map((s) => s.id));
    for (const id of [
      "SRC-SEC-XBRL-FACTS",
      "SRC-SEC-FILING-DOCS",
      "SRC-ARAMCO-FIN",
      "SRC-ARAMCO-NARR",
      "SRC-EIA-OPENDATA",
      "SRC-EIA-SPOT",
    ])
      expect(ids.has(id)).toBe(true);
    const spot = S.find((s) => s.id === "SRC-EIA-SPOT");
    expect(spot.third_party_components.join(" ")).toMatch(/Refinitiv/);
    const aramco = S.find((s) => s.id === "SRC-ARAMCO-FIN");
    expect(aramco.notes).toMatch(/not an established violation/);
  });
});

/* ---------- independent evaluator for COMPARABILITY-RECIPES.json ---------- */
const get = (o: any, path: string) =>
  path.split(".").reduce((c, p) => (c && typeof c === "object" && p in c ? c[p] : undefined), o);
function holds(c: any, ctx: any, r: any): boolean {
  switch (c.op) {
    case "always":
      return true;
    case "monetary":
      return r.measure_type === "flow" || r.measure_type === "stock";
    case "and":
      return c.args.every((a: any) => holds(a, ctx, r));
    case "missing":
      return get(ctx, c.path) === undefined || get(ctx, c.path) === null;
    case "empty": {
      const v = get(ctx, c.path);
      return !v || (Array.isArray(v) && v.length === 0);
    }
    case "eq":
      return get(ctx, c.path) === c.value;
    case "neq":
      return get(ctx, c.path) !== c.value;
    case "neq_path":
      return get(ctx, c.path) !== get(ctx, c.other);
    case "not_in":
      return !c.values.includes(get(ctx, c.path));
    case "not_in_recipe":
      return !r[c.recipe_key].includes(get(ctx, c.path));
    case "fx_type_mismatch": {
      if (!["flow", "stock"].includes(r.measure_type) || get(ctx, "meta.currency") === "USD")
        return false;
      return (
        get(ctx, "meta.fx.rate_type") !== (r.measure_type === "flow" ? "period_average" : "closing")
      );
    }
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
    if (/^\d/.test(t)) return Number(t);
    if (!(t in env)) throw Error(`missing:${t}`);
    return env[t];
  };
  const mul = (): number => {
    let v = atom();
    while (toks[i] === "*" || toks[i] === "/") v = toks[i++] === "*" ? v * atom() : v / atom();
    return v;
  };
  const add = (): number => {
    let v = mul();
    while (toks[i] === "+" || toks[i] === "-") v = toks[i++] === "+" ? v + mul() : v - mul();
    return v;
  };
  return add();
}
function evaluate(r: any, e: any) {
  if (r.proposed_rating === "OUT_OF_SCOPE_B06")
    return { status: "OUT_OF_SCOPE_B06", reason: "out_of_scope_b06" };
  const ctx = { meta: e.meta, policy: e.policy ?? {} };
  for (const c of [...recipes.generic_failure_conditions, ...r.failure_conditions])
    if (holds(c.when, ctx, r)) return { status: "NOT_COMPARABLE", reason: c.code };
  const values: Record<string, number> = {};
  for (const o of r.outputs) {
    const key = o.selector.map((s: string) => String(get(ctx, s))).join("|");
    const expr = o.cases[key];
    if (expr === undefined) return { status: "NOT_COMPARABLE", reason: "no_recipe_for_case" };
    const env: Record<string, number> = { ...e.items };
    for (const [k, v] of Object.entries<number>(e.policy ?? {})) env[`policy_${k}`] = v;
    let v: number;
    try {
      v = calc(expr, env);
    } catch {
      return { status: "NOT_COMPARABLE", reason: "required_item_missing" };
    }
    if (!o.ratio && !o.physical && e.meta.currency !== "USD") v = v / e.meta.fx.rate;
    values[o.key] = Math.round(v * 1e6) / 1e6;
  }
  return { status: "CONDITIONALLY_COMPARABLE", values };
}

describe("R02 comparability recipes", () => {
  const R = recipes.recipes as any[];
  test("17 metrics, each with a complete recipe or a reason it is not comparable", () => {
    expect(R.map((r) => r.id)).toEqual(
      Array.from({ length: 17 }, (_, i) => `M${String(i + 1).padStart(2, "0")}`),
    );
    for (const r of R) {
      expect(["CONDITIONALLY_COMPARABLE", "NOT_COMPARABLE", "OUT_OF_SCOPE_B06"]).toContain(
        r.proposed_rating,
      );
      expect(r.definition.numerator.length).toBeGreaterThan(10);
      expect(r.inputs.length).toBeGreaterThan(0);
      expect(r.ordered_steps.length).toBeGreaterThan(0);
      expect(r.ifrs_vs_us_gaap.length).toBeGreaterThan(2);
      expect(Object.keys(r.basis).sort()).toEqual(["consolidation", "currency", "period", "unit"]);
      expect(Object.keys(r.handling).sort()).toEqual([
        "definition_conflict",
        "missing_values",
        "restatements",
      ]);
      expect(r.failure_conditions.length).toBeGreaterThan(0);
      if (r.proposed_rating === "CONDITIONALLY_COMPARABLE") {
        expect(r.outputs.length).toBeGreaterThan(0);
        expect(r.examples.some((e: any) => e.expected.status === "CONDITIONALLY_COMPARABLE")).toBe(
          true,
        );
        expect(r.examples.some((e: any) => e.expected.status === "NOT_COMPARABLE")).toBe(true);
      } else {
        expect(r.outputs).toEqual([]);
        expect(r.failure_conditions.some((c: any) => c.when.op === "always")).toBe(true);
      }
    }
  });
  test("no metric is COMPARABLE by default; dividends need definition checks", () => {
    expect(R.some((r) => r.proposed_rating === "COMPARABLE")).toBe(false);
    const div = R.find((r) => r.key === "dividends_cash");
    const codes = div.failure_conditions.map((c: any) => c.code);
    for (const c of [
      "dividend_basis_not_cash_paid",
      "dividends_include_nci",
      "performance_linked_not_separable",
      "buybacks_combined",
    ])
      expect(codes).toContain(c);
    expect(R.find((r) => r.key === "valuation_multiples").proposed_rating).toBe("OUT_OF_SCOPE_B06");
  });
  test("an independent evaluator reproduces every synthetic example", () => {
    for (const r of R)
      for (const e of r.examples) {
        expect(e.synthetic).toMatch(/^SYNTHETIC/);
        expect(e.expected.display).toBe("BLOCKED");
        const got = evaluate(r, e) as any;
        expect({ id: r.id, label: e.label, status: got.status }).toEqual({
          id: r.id,
          label: e.label,
          status: e.expected.status,
        });
        if (e.expected.reason) expect(got.reason).toBe(e.expected.reason);
        if (e.expected.values) expect(got.values).toEqual(e.expected.values);
      }
  });
  test("negative conditions fail closed: dropping any formula item or breaking a condition returns NOT_COMPARABLE", () => {
    let probes = 0;
    for (const r of R.filter((x) => x.proposed_rating === "CONDITIONALLY_COMPARABLE")) {
      const pass = r.examples.find((e: any) => e.expected.status === "CONDITIONALLY_COMPARABLE");
      for (const item of Object.keys(pass.items)) {
        const items = { ...pass.items };
        delete items[item];
        const got = evaluate(r, { ...pass, items }) as any;
        // an item not used by the selected case may be dropped without effect; every used item must fail closed
        if (got.status !== "CONDITIONALLY_COMPARABLE") {
          expect(got).toEqual({ status: "NOT_COMPARABLE", reason: "required_item_missing" });
          probes++;
        }
      }
      for (const [mutation, reason] of [
        [{ source_ids: [] }, "source_missing"],
        [{ accounting_basis: "LOCAL_GAAP" }, "accounting_basis_unknown"],
        [{ consolidation: "parent_only" }, "consolidation_not_group"],
        [{ restated_latest: false }, "not_latest_restated"],
        [{ period: { kind: "Q", end: "2030-03-31", standalone: false } }, "quarter_not_standalone"],
      ] as const) {
        const got = evaluate(r, { ...pass, meta: { ...pass.meta, ...mutation } }) as any;
        const want =
          reason === "quarter_not_standalone" && !r.allowed_period_kinds.includes("Q")
            ? "period_kind_not_allowed"
            : reason;
        expect({ id: r.id, got }).toEqual({
          id: r.id,
          got: { status: "NOT_COMPARABLE", reason: want },
        });
        probes++;
      }
      if (["flow", "stock"].includes(r.measure_type)) {
        const got = evaluate(r, {
          ...pass,
          meta: { ...pass.meta, currency: "SAR", fx: undefined },
        }) as any;
        expect(got).toEqual({ status: "NOT_COMPARABLE", reason: "fx_missing" });
        probes++;
      }
    }
    expect(probes).toBeGreaterThan(90);
  });
});

describe("R03 peer eligibility", () => {
  test("candidates only; no approved peer list", () => {
    expect(peers.status).toBe("CANDIDATES_ONLY_NO_APPROVED_PEER_LIST");
    for (const p of peers.candidates) {
      expect(p.approved).toBe(false);
      expect(p.status).toBe("CANDIDATE_PENDING_OWNER_DECISION");
      expect(p.data_availability.company_facts_completeness).toBe("UNVERIFIED");
    }
    expect(JSON.stringify(peers)).not.toMatch(/"approved":\s*true|"APPROVED_PEERS?"/);
  });
  test("ownership, control, consolidation and commercial relationship are separate", () => {
    expect(Object.keys(peers.dimension_rules).sort()).toEqual([
      "commercial_relationship",
      "consolidation",
      "control",
      "ownership",
    ]);
    expect(peers.aramco_relationship_rules.CONSOLIDATED_SUBSIDIARY).toMatch(
      /segment-specific analysis/,
    );
    expect(peers.aramco_relationship_rules.EQUITY_ACCOUNTED).toMatch(/Not automatically excluded/);
    for (const p of peers.candidates) {
      expect(p.ownership).toBeDefined();
      expect(p.control).toBeDefined();
      expect(p.relationship_to_aramco).toBeDefined();
    }
  });
  test("Equinor 78% is the NCS petroleum marginal rate, not a group rate", () => {
    const eq = peers.candidates.find((p: any) => p.id === "EQNR");
    expect(eq.fiscal_regime_note).toMatch(/Norwegian continental shelf/);
    expect(eq.fiscal_regime_note).toMatch(/not the group's effective tax rate/);
  });
});

describe("R04 execution gate", () => {
  test("no implicit authorisation to start B06-1", () => {
    expect(decisions.execution_gate).toEqual([
      "Codex independent review of B06-0",
      "Codex ACCEPT of the B06-0 decision pack",
      "owner decisions required for the batch",
      "explicit implementation assignment for the batch",
      "start of that batch",
    ]);
    for (const d of decisions.decisions) {
      expect(d.implementation_authorization).toBe(false);
      expect(d.owner_approval).toBe("PENDING");
    }
    expect(report).not.toMatch(/يمكن البدء به فورًا|فور مراجعة Codex/);
    expect(report).toMatch(/ACCEPT لحزمة B06-0 لا يعني تصريحًا ببدء B06-1/);
  });
  test("decision register separates facts, recommendation and approvals", () => {
    expect(decisions.decisions.map((d: any) => d.id)).toEqual([
      "D1",
      "D2",
      "D3",
      "D4",
      "D5",
      "D6",
      "D7",
      "D8",
      "D9",
    ]);
    for (const d of decisions.decisions)
      for (const k of [
        "verified_facts",
        "unverified_facts",
        "recommendation",
        "owner_approval",
        "legal_approval",
        "implementation_authorization",
      ])
        expect(d).toHaveProperty(k);
    const now = decisions.decisions
      .filter((d: any) => d.presentable_to_owner_now)
      .map((d: any) => d.id);
    expect(now).toEqual(["D3", "D4", "D8", "D9"]);
    expect(decisions.decisions.find((d: any) => d.id === "D4").recommendation).toMatch(
      /not an established violation/,
    );
  });
});

describe("R05 tracking history", () => {
  const prev = git("show", `${PREVIOUS_DELIVERY}:product-tracking/CHANGELOG.jsonl`);
  const head = readFileSync(join(ROOT, "product-tracking/CHANGELOG.jsonl"));
  test("historical events are preserved byte for byte; corrections are appended", () => {
    expect(head.subarray(0, prev.length).equals(Buffer.from(prev))).toBe(true);
    const added = head
      .subarray(prev.length)
      .toString()
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(added.some((e) => e.event === "tracking_correction")).toBe(true);
    for (const e of added) {
      expect(e.time_source).toBe("system clock (date -u) at authoring");
      expect(e.ts).toBe(e.recorded_at);
    }
  });
  test("each correction points at an exact original line", () => {
    expect(corrections.audited_file_sha256).toBe(createHash("sha256").update(prev).digest("hex"));
    const lines = prev.toString().split("\n");
    expect(corrections.affected.length).toBe(corrections.affected_count);
    for (const a of corrections.affected) {
      const text = lines[a.line - 1];
      expect(createHash("sha256").update(text).digest("hex")).toBe(a.line_sha256);
      expect(JSON.parse(text).ts).toBe(a.ts_as_written);
      expect(a.event_time).toBe("NOT_ESTABLISHED");
      expect(a.ts_as_written > a.event_time_not_later_than).toBe(true);
    }
  });
});

describe("no personal data or secrets in the package", () => {
  const files = (d: string): string[] =>
    readdirSync(d).flatMap((f) =>
      statSync(join(d, f)).isDirectory() ? files(join(d, f)) : [join(d, f)],
    );
  test("no personal email, token, key or local user path", () => {
    const public_role_addresses = new Set([
      "compliance@iea.org",
      "statisticalreview@energyinst.org",
    ]);
    const all = files(DIR);
    expect(all.length).toBeGreaterThanOrEqual(7);
    for (const f of all) {
      const t = readFileSync(f, "utf8");
      for (const m of t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [])
        expect({ f, m, allowed: public_role_addresses.has(m) }).toEqual({ f, m, allowed: true });
      expect({
        f,
        hit: /ghp_[A-Za-z0-9]{20}|github_pat_[A-Za-z0-9_]{20}|sk-[A-Za-z0-9]{20}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY/.test(
          t,
        ),
      }).toEqual({ f, hit: false });
      expect({ f, hit: /\/home\/[a-z]|C:[\\/]Users[\\/]/.test(t) }).toEqual({ f, hit: false });
    }
  });
});
