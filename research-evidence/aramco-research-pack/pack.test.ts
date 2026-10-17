// WEB-08B04: research pack — withholding, semantics, periods, sources, numeric guard, leak checks.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { TOPICS } from "../v1/contract";
import { allMetricValueStrings, loadContext } from "./evidence";
import { SECTIONS, compilePack, gapRegister, topicMap } from "./pack";
import { deliverables } from "./build";
import { STATUS_OF_KIND, type Paragraph, type Section } from "./schema";

const ctx = loadContext();
const pack = compilePack(ctx);
const files = deliverables(pack, ctx);
const all = Object.values(files).join("\n");
const clone = () => structuredClone(SECTIONS) as Section[];
const firstBody = (s: Section[], id: string) =>
  s.flatMap((x) => x.paragraphs).find((p) => p.id === id)!;
const build = (s: Section[]) => () => compilePack(ctx, s);

describe("withholding: nothing is approved, nothing is unblocked", () => {
  test("every paragraph status is derived from its kind and none is approved", () => {
    for (const p of pack.paragraphs) expect(p.status).toBe(STATUS_OF_KIND[p.kind]);
    expect(Object.values(STATUS_OF_KIND).some((s) => /^APPROVED|QUALIFIED|ELIGIBLE/.test(s))).toBe(
      false,
    );
    expect(all).not.toMatch(/"status": "(APPROVED|QUALIFIED|ELIGIBLE)"/);
  });
  test("the 22 B03 claims and the 142 B02 inputs stay withheld", () => {
    expect(ctx.register.claims).toHaveLength(22);
    for (const c of ctx.register.claims) {
      expect(c.qualification.status).toBe("WITHHELD");
      expect(c.qualification.publicationEligible).toBe(false);
    }
    const w = JSON.parse(
      readFileSync(
        new URL(
          "../../review-delivery/WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(w.results).toHaveLength(142);
    expect(w.qualified_for_research).toBe(0);
    expect(w.approved_for_display).toBe(0);
  });
  test("every quantitative analysis is BLOCKED and no input is qualified", () => {
    expect(pack.analyses).toHaveLength(7);
    for (const a of pack.analyses) {
      expect(a.status).toBe("BLOCKED");
      expect(a.blockers).toContain("NO_FINANCIAL_REVIEW");
      if (a.definition.basis === "issuer_non_ifrs")
        expect(a.blockers).toContain("ISSUER_DEFINITION_NOT_BOUND");
      for (const i of a.inputs)
        expect([
          "B02_WITHHELD_INPUT",
          "UNREVIEWED_ENGINE_FACT",
          "UNAPPROVED_DERIVED_METRIC",
          "NOT_IN_SNAPSHOT",
        ]).toContain(i.status);
    }
  });
  test("an input that is one of the 142 is labelled as such", () => {
    const rev = pack.analyses
      .find((a) => a.id === "fa-revenue")!
      .inputs.find((i) => i.key === "revenue")!;
    expect(rev.status).toBe("B02_WITHHELD_INPUT");
    const fcf = pack.analyses
      .find((a) => a.id === "fa-cash-flow")!
      .inputs.find((i) => i.key === "free_cash_flow")!;
    expect(fcf.status).toBe("UNAPPROVED_DERIVED_METRIC");
  });
});

describe("no parallel financial store and no numeric leak", () => {
  test("no distinctive engine value (financials, ownership, market) appears in any deliverable", () => {
    const vals = [...allMetricValueStrings(ctx)].filter((x) => /\.\d|\d{4,}/.test(x));
    expect(vals.length).toBeGreaterThan(100);
    for (const v of vals) {
      const re = new RegExp(`(^|[^\\d.])${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\d]|$)`);
      expect(re.test(all)).toBe(false);
    }
  });
  test("figures inside B03 quotes are not re-published by the pack", () => {
    for (const f of [
      "22.275",
      "6.789",
      "11.3",
      "USD 50 billion",
      "USD 55 billion",
      "more than 80%",
    ])
      expect(all).not.toContain(f);
  });
  test("deliverables hold identities, not values", () => {
    for (const name of Object.keys(files).filter((n) => n.endsWith(".json")))
      expect(files[name]).not.toMatch(
        /"(value|value_text|raw_value|amount|ownership_pct|shares)":/,
      );
  });
});

describe("semantic separation (negative cases)", () => {
  test("a management plan must cite a plan claim and never a fact claim", () => {
    const s = clone();
    firstBody(s, "rk-mgmt-contingency-view").refs = [
      { t: "b03_claim", id: "aramco-contingencies-ordinary-course" },
    ];
    expect(build(s)).toThrow(/plan_without_plan_evidence:rk-mgmt-contingency-view/);
    const s2 = clone();
    firstBody(s2, "up-msc").refs.push({ t: "b03_claim", id: "aramco-rig-purchase-commitments" });
    expect(build(s2)).toThrow(/plan_cites_fact_claim:up-msc/);
  });
  test("an engine record cannot rest on a management-plan claim", () => {
    const s = clone();
    firstBody(s, "up-volumes").refs.push({ t: "b03_claim", id: "aramco-capex-guidance-2026" });
    expect(build(s)).toThrow(/record_cites_plan_claim:up-volumes/);
  });
  test("assumptions and scenarios carry no numbers", () => {
    const s = clone();
    firstBody(s, "rk-sc-price").ar += " بانخفاض 20%";
    expect(build(s)).toThrow(/number_in_scenario:rk-sc-price/);
    const s2 = clone();
    firstBody(s2, "rk-asm-fiscal").ar += " بنسبة 15";
    expect(build(s2)).toThrow(/number_in_assumption:rk-asm-fiscal/);
  });
  test("a number not present in the cited evidence is rejected (no invented figures)", () => {
    const s = clone();
    firstBody(s, "up-volumes").ar += " بلغ الإنتاج 9.5 مليون برميل يوميًا.";
    expect(build(s)).toThrow(/unsupported_number:up-volumes:9.5/);
    const s2 = clone();
    firstBody(s2, "rv-mechanics").ar += " الهامش 35%.";
    expect(build(s2)).toThrow(/unsupported_number:rv-mechanics:35/);
  });
  test("an engine record cannot carry a year after the snapshot; plans may", () => {
    const s = clone();
    firstBody(s, "up-volumes").ar += " حتى 2031.";
    expect(build(s)).toThrow(/future_year_in_record:up-volumes:2031/);
    expect(firstBody(clone(), "rk-mgmt-guidance").ar).toContain("2030");
  });
  test("Arabic-Indic digits, unknown meta numbers, duplicate ids, empty evidence and bad topics are rejected", () => {
    const cases: [(s: Section[]) => void, RegExp][] = [
      [(s) => (firstBody(s, "up-volumes").ar += " ١٢"), /non_latin_digits/],
      [(s) => (firstBody(s, "scope-what").metaNumbers = ["999"]), /unknown_meta_number/],
      [(s) => (firstBody(s, "up-volumes").id = "up-scope"), /duplicate_id:up-scope/],
      [(s) => (firstBody(s, "up-volumes").refs = []), /no_evidence:up-volumes/],
      [
        (s) => ((firstBody(s, "up-volumes").topics as string[]) = ["valuation_dcf"]),
        /invalid_topic/,
      ],
    ];
    for (const [mutate, err] of cases) {
      const s = clone();
      mutate(s);
      expect(build(s)).toThrow(err);
    }
  });
  test("unresolvable evidence fails closed", () => {
    const cases: [Paragraph["refs"][number], RegExp][] = [
      [{ t: "b03_claim", id: "aramco-invented" }, /unresolved_ref:b03_claim/],
      [
        {
          t: "engine_metric",
          key: "upstream_revenue",
          bucket: "annual",
          dims: { segment: "Downstream" },
        },
        /unresolved_ref:engine_metric/,
      ],
      [{ t: "engine_metric", key: "free_cash_flow", bucket: "ttm" as never }, /./],
      [{ t: "b02_withheld", metric: "ebitda" }, /unresolved_ref:b02_withheld/],
      [{ t: "engine_profile", field: "target_price" }, /unresolved_ref:engine_profile/],
      [{ t: "engine_capability", name: "dcf" }, /unresolved_ref:engine_capability/],
    ];
    for (const [ref, err] of cases) {
      const s = clone();
      firstBody(s, "up-volumes").refs.push(ref);
      expect(build(s)).toThrow(err);
    }
  });
});

describe("periods and sources", () => {
  test("analysis input periods are the snapshot's own periods, not invented ones", () => {
    const rev = pack.analyses
      .find((a) => a.id === "fa-revenue")!
      .inputs.find((i) => i.key === "revenue")!;
    expect(rev.periods).toEqual(["FY2021", "FY2022", "FY2023", "FY2024", "FY2025"]);
    const seg = pack.analyses
      .find((a) => a.id === "fa-revenue")!
      .inputs.find((i) => i.key === "upstream_revenue")!;
    expect(seg.periods).toEqual(["FY2025"]);
    const q = pack.analyses
      .find((a) => a.id === "fa-cash-flow")!
      .inputs.find((i) => i.bucket === "history_quarter")!;
    expect(q.periods).toEqual(["2026Q1", "2026Q2"]);
  });
  test("guidance stays a plan for 2026; the capex analysis does not equate it with actual capex", () => {
    const g = pack.paragraphs.find((p) => p.id === "pg-capex-guidance")!;
    expect(g.kind).toBe("management_plan");
    expect(g.ar).toContain("لا يُقارن آليًا");
    expect(pack.analyses.find((a) => a.id === "fa-capex")!.definition.ar).toContain(
      "لا يُطابَق آليًا",
    );
  });
  test("every cited source URL is https; external reviews are pinned by SHA", () => {
    for (const p of pack.paragraphs)
      for (const r of p.refs) {
        if (r.source.url) expect(r.source.url).toMatch(/^https:\/\//);
        if (r.ref.t === "external_review") expect(r.label).toMatch(/@ 4f7145e$/);
      }
  });
  test("projects mirror the accepted B03 project statuses, including no 'not_disclosed'", () => {
    for (const pr of pack.projects) {
      const b = ctx.register.projects.find((x) => x.id === pr.id)!;
      expect(pr.b03.capacity).toBe(b.capacity.status);
      expect(pr.b03.timing).toBe(b.timing.status);
      expect(pr.b03.cost).toBe(b.cost.status);
      expect(pr.b03.qualification).toBe("WITHHELD");
    }
    expect(pack.projects.map((p) => p.id).sort()).toEqual(
      ctx.register.projects.map((p) => p.id).sort(),
    );
    expect(all).not.toContain('"not_disclosed"');
  });
  test("the gas target is never quoted with the conflicting magnitude", () => {
    const g = pack.paragraphs.find((p) => p.id === "pj-gas-nature")!;
    expect(g.ar).toContain("لا يُقتبس المقدار");
    expect(g.refs.some((r) => r.ref.t === "external_review")).toBe(true);
  });
});

describe("topics, links and gaps", () => {
  test("all 18 topics are mapped, none empty; gap-only topics say so", () => {
    const m = topicMap(pack);
    expect(m.map((t) => t.topic)).toEqual([...TOPICS]);
    for (const t of m) expect(t.paragraphs.length + t.analyses.length).toBeGreaterThan(0);
    const st = new Map(m.map((t) => [t.topic, t.status]));
    for (const t of ["valuation", "analysts", "trading"] as const)
      expect(st.get(t)).toBe("methodology_or_gap_only");
    for (const t of [
      "business",
      "operations",
      "financials",
      "risks",
      "forecasts",
      "dividends_actions",
    ] as const)
      expect(st.get(t)).toBe("research_content");
  });
  test("links are relative app routes to Company Intelligence and Marefa Data only", () => {
    const links = JSON.parse(files["MAREFA-DATA-LINKS.json"]!).metrics as {
      intelligence: string;
      data: string;
    }[];
    expect(links.length).toBeGreaterThan(40);
    for (const l of links) {
      expect(l.intelligence).toMatch(
        /^\/preview\/web-v1\/companies\/2222\/intelligence\?topic=[a-z_]+&focus=[a-z0-9_]+$/,
      );
      expect(l.data).toMatch(
        /^\/preview\/web-v1\/companies\/2222\?tab=(business|financials|shareholders|market|risks)$/,
      );
    }
  });
  test("the gap register covers inputs, issuer definitions, sources, coverage and cited claims", () => {
    const g = gapRegister(pack, ctx);
    const kinds = new Set(g.map((x) => x.kind));
    for (const k of [
      "financial_input",
      "issuer_definition",
      "source",
      "coverage",
      "claim_qualification",
    ])
      expect(kinds.has(k as never)).toBe(true);
    for (const x of g.filter((y) => y.kind === "claim_qualification"))
      expect(x.status).toBe("WITHHELD");
    expect(
      g.filter((y) => y.kind === "financial_input").every((y) => y.status !== "QUALIFIED"),
    ).toBe(true);
  });
});

describe("deliverables", () => {
  test("committed review-delivery/WEB08B04 files equal a fresh deterministic build", () => {
    for (const [name, content] of Object.entries(files))
      expect(
        readFileSync(new URL(`../../review-delivery/WEB08B04/${name}`, import.meta.url), "utf8"),
      ).toBe(content);
  });
});
