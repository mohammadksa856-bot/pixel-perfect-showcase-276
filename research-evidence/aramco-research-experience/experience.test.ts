// WEB-08B05 — tests for the private research experience: placement, evidence, links, kinds, translation,
// holds, and no leak of values or quotes. Each assertion reads the rendered page, not the model alone.
import { describe, expect, test } from "bun:test";
import { allMetricValueStrings, loadContext } from "../aramco-research-pack/evidence";
import { compilePack, topicMap } from "../aramco-research-pack/pack";
import { buildExperience, slotOf } from "./model";
import { renderPage } from "./server";

const ctx = loadContext();
const x = buildExperience(ctx);
const BASE = "http://127.0.0.1:5173";
const html = { ar: renderPage("ar", BASE), en: renderPage("en", BASE) };
const count = (s: string, needle: string) => s.split(needle).length - 1;
/** محتوى عنصر مسمى بسمة بيانات حتى إغلاقه (العناصر هنا غير متداخلة بالاسم نفسه). */
const block = (h: string, open: string, close: string) => {
  const i = h.indexOf(open);
  if (i < 0) return "";
  return h.slice(i, h.indexOf(close, i));
};
const sectionHtml = (h: string, id: string) => {
  const i = h.indexOf(`data-sub="${id}"`);
  if (i < 0) throw Error(`no_section:${id}`);
  const j = h.indexOf('data-sub="', i + 1);
  return h.slice(i, j < 0 ? h.indexOf('data-part="', i) : j);
};

describe("holds: nothing is unblocked or approved", () => {
  test("7 BLOCKED, 22 WITHHELD claims, 142 WITHHELD inputs, 0 financially qualified", () => {
    expect(x.holds).toEqual({
      analysesBlocked: 7,
      analyses: 7,
      claimsWithheld: 22,
      claims: 22,
      inputsWithheld: 142,
      financiallyQualified: 0,
    });
    for (const l of ["ar", "en"] as const) {
      expect(html[l]).toContain('data-stat="analyses-blocked"');
      expect(count(html[l], 'data-analysis="')).toBe(7);
      expect(count(html[l], 'data-status="BLOCKED"')).toBe(7);
    }
  });
  test("no paragraph status reads as approved", () => {
    const statuses = [
      ...html.ar.matchAll(/data-paragraph="[^"]+" data-kind="[^"]+" data-status="([A-Z_]+)"/g),
    ].map((m) => m[1]);
    expect(statuses).toHaveLength(99);
    for (const s of statuses)
      expect(s).toMatch(/^(WITHHELD|UNAPPROVED_|METHODOLOGY_PENDING|OPEN_GAP)/);
  });
});

describe("each paragraph has one primary place; nothing is lost or repeated", () => {
  test("every paragraph is placed in exactly one slot", () => {
    expect(x.slotOf.size).toBe(99);
    const placed = [...x.slots.values()].flat().map((p) => p.id);
    expect(new Set(placed).size).toBe(99);
    expect(placed).toHaveLength(99);
  });
  test("an unknown paragraph id fails instead of silently disappearing", () => {
    const p = { ...x.pack.paragraphs[0]!, id: "zz-unknown", role: "body" as const, parent: null };
    expect(() => slotOf(p)).toThrow(/unplaced_paragraph:zz-unknown/);
  });
  test("each paragraph card is rendered exactly once, in Arabic and English", () => {
    for (const l of ["ar", "en"] as const)
      for (const p of x.pack.paragraphs)
        expect({ id: p.id, n: count(html[l], `data-paragraph="${p.id}"`) }).toEqual({
          id: p.id,
          n: 1,
        });
  });
  test("the topic map links to the primary place and never repeats paragraph text", () => {
    const topics = block(html.ar, 'data-part="topics"', "</main>");
    for (const p of x.pack.paragraphs) expect(topics).not.toContain(p.ar.slice(0, 60));
    const chips = [...topics.matchAll(/data-topic-paragraph="([^"]+)"/g)].map((m) => m[1]!);
    expect(chips.length).toBeGreaterThan(99);
    for (const id of chips) expect(html.ar).toContain(`id="p-${id}"`);
  });
  test("every paragraph has one primary topic; contextual links cover the rest", () => {
    const entries = topicMap(compilePack(ctx));
    for (const t of x.topics) {
      const e = entries.find((y) => y.topic === t.topic)!;
      expect([...t.primary, ...t.context].sort()).toEqual([...e.paragraphs].sort());
    }
    for (const p of x.pack.paragraphs)
      expect(x.topics.filter((t) => t.primary.includes(p.id)).map((t) => t.topic)).toEqual([
        p.topics[0]!,
      ]);
  });
  test("the four declared gap topics stay gaps and are not filled in", () => {
    expect(
      x.topics
        .filter((t) => t.declaredGap)
        .map((t) => t.topic)
        .sort(),
    ).toEqual(["analysts", "news", "trading", "valuation"]);
    for (const k of ["trading", "analysts", "valuation", "news"])
      expect(block(html.ar, `data-topic="${k}"`, "</li>")).toContain('data-declared-gap="true"');
  });
});

describe("evidence: every reference is shown, as an identity, never as a quote or a value", () => {
  test("each evidence drawer lists all of its paragraph's references", () => {
    for (const p of x.pack.paragraphs) {
      const list = block(html.ar, `data-evidence-list="${p.id}"`, "</ul>");
      expect({ id: p.id, n: count(list, "data-evidence-ref=") }).toEqual({
        id: p.id,
        n: p.refs.length,
      });
    }
  });
  test("no B03 quote text is rendered (quotes may carry disclosed figures)", () => {
    const quotes = x.pack.paragraphs
      .flatMap((p) =>
        p.refs
          .filter((r) => r.ref.t === "b03_claim" || r.ref.t === "b03_project")
          .map((r) => r.text),
      )
      .filter((q): q is string => !!q && q.length > 30);
    expect(quotes.length).toBeGreaterThan(10);
    for (const q of quotes)
      for (const l of ["ar", "en"] as const) expect(html[l]).not.toContain(q.slice(0, 40));
  });
  test("no distinctive engine value appears anywhere in the page", () => {
    const vals = [...allMetricValueStrings(ctx)].filter((v) => /\.\d|\d{4,}/.test(v));
    expect(vals.length).toBeGreaterThan(100);
    for (const l of ["ar", "en"] as const) {
      const text = html[l].replace(/<[^>]+>/g, " ");
      for (const v of vals) {
        const re = new RegExp(`(^|[^\\d.])${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\d]|$)`);
        expect({ v, hit: re.test(text) }).toEqual({ v, hit: false });
      }
    }
  });
});

describe("metric links follow the accepted B04 register", () => {
  const reg = [...x.links.values()];
  test("register is the accepted 72: 29 FOCUSABLE and 43 NOT_RENDERED", () => {
    expect(reg).toHaveLength(72);
    expect(reg.filter((r) => r.status === "FOCUSABLE")).toHaveLength(29);
    expect(reg.filter((r) => r.status === "NOT_RENDERED")).toHaveLength(43);
  });
  test("a FOCUSABLE metric links to its exact register target; a NOT_RENDERED metric is never clickable", () => {
    for (const l of ["ar", "en"] as const) {
      const anchors = [...html[l].matchAll(/<a href="([^"]+)"[^>]*data-metric-link="([^"]+)"/g)];
      expect(anchors.length).toBeGreaterThan(0);
      for (const [, href, key] of anchors) {
        const r = x.links.get(key!)!;
        expect(r.status).toBe("FOCUSABLE");
        expect(href!.replace(/&amp;/g, "&")).toBe(BASE + r.intelligence);
      }
      for (const r of reg.filter((y) => y.status === "NOT_RENDERED")) {
        expect(html[l]).not.toContain(`data-metric-link="${r.key}"`);
        expect(html[l]).not.toContain(`focus=${r.key}"`);
      }
    }
  });
  test("every analysis input shows the register's status for its metric", () => {
    for (const a of x.analyses)
      for (const i of a.inputs) {
        expect(i.links.status).toBe(x.links.get(i.key)!.status);
        const row = block(html.ar, `data-input="${i.key}"`, "</li>");
        expect(row).toContain(`data-metric-link-state="${i.links.status}"`);
      }
  });
  test("with an unsafe APP_BASE, no app link is emitted", () => {
    const h = renderPage("ar", "https://evil.example");
    expect(h).toContain("data-app-base-rejected");
    expect(h).not.toContain("data-metric-link=");
    expect(h).not.toMatch(/href="https:\/\/evil/);
  });
});

describe("kinds are never mixed: records, guidance, interpretation, assumptions, scenarios, gaps", () => {
  const expectKinds = (sub: string, kinds: string[]) => {
    const h = sectionHtml(html.ar, sub);
    const found = [
      ...new Set([...h.matchAll(/data-paragraph="[^"]+" data-kind="([^"]+)"/g)].map((m) => m[1])),
    ];
    expect({ sub, found }).toEqual({ sub, found: kinds });
  };
  test("risk subsections hold one kind each", () => {
    expectKinds("risks-disclosures", ["reported_record"]);
    expectKinds("risks-guidance", ["management_plan"]);
    expectKinds("risks-interpretations", ["research_interpretation"]);
    expectKinds("risks-assumptions", ["assumption"]);
    expectKinds("risks-scenarios", ["scenario"]);
    expectKinds("risks-gaps", ["gap"]);
  });
  test("every card carries exactly one kind badge matching its kind", () => {
    for (const m of html.ar.matchAll(
      /<article[^>]*data-paragraph="([^"]+)" data-kind="([^"]+)"[\s\S]*?<\/header>/g,
    ))
      expect([...m[0].matchAll(/data-kind-badge="([^"]+)"/g)].map((y) => y[1])).toEqual([m[2]]);
  });
  test("management targets are never shown as achieved, and milestones stay withheld", () => {
    const reported = sectionHtml(html.ar, "projects-reported");
    const targets = sectionHtml(html.ar, "projects-targets");
    for (const p of x.projects) {
      const home = p.track === "management_target" ? targets : reported;
      expect(home).toContain(`data-project="${p.id}"`);
      expect(home).toContain(`data-track="${p.track}"`);
    }
    expect(
      x.projects
        .filter((p) => p.track === "management_target")
        .map((p) => p.id)
        .sort(),
    ).toEqual(["msc-12mbd", "sales-gas-growth-2030"]);
    for (const p of x.projects.filter((y) => y.track === "management_target"))
      expect(p.b03.executionStatus).toBe("target");
    expect(targets).not.toContain('data-track="reported_milestone"');
  });
  test("project relations rest only on identities specific to one project", () => {
    expect(x.relations.length).toBeGreaterThan(0);
    for (const r of x.relations)
      for (const v of r.via) expect(v).not.toContain("aramco-project-milestones-2025");
    for (const r of x.relations)
      expect(x.projects.find((p) => p.id === r.project)!.identities).toEqual(
        expect.arrayContaining(r.via),
      );
  });
});

describe("navigation", () => {
  test("every in-page link resolves to an element id", () => {
    for (const l of ["ar", "en"] as const) {
      const ids = new Set([...html[l].matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
      const targets = [...html[l].matchAll(/href="#([^"]+)"/g)].map((m) => m[1]!);
      expect(targets.length).toBeGreaterThan(300);
      for (const t of targets) expect({ t, ok: ids.has(t) }).toEqual({ t, ok: true });
    }
  });
  test("desktop and mobile contents cover every part, subsection and analysis", () => {
    for (const v of ["desktop", "mobile"]) {
      const toc =
        block(html.ar, `data-toc="${v}"`, "</ol></li></ol>") +
        block(html.ar, `data-toc="${v}"`, "</nav>");
      for (const part of ["overview", "business", "projects", "financial", "risks", "topics"])
        expect(toc).toContain(`data-toc-link="${part}"`);
      for (const a of x.analyses) expect(toc).toContain(`data-toc-link="analysis-${a.id}"`);
    }
  });
});

describe("languages: Arabic is primary; untranslated text is never presented as English", () => {
  test("document direction and language", () => {
    expect(html.ar).toMatch(/^<!doctype html><html lang="ar" dir="rtl"/);
    expect(html.en).toMatch(/^<!doctype html><html lang="en" dir="ltr"/);
    expect(html.ar).not.toContain("data-translation=");
  });
  test("in English, only author drafts show English; the rest is Arabic, marked pending, with lang=ar dir=rtl", () => {
    const withEn = x.pack.paragraphs.filter((p) => p.en);
    expect(withEn.length).toBeLessThan(10);
    for (const p of x.pack.paragraphs) {
      const card = block(html.en, `data-paragraph="${p.id}"`, "</article>");
      if (p.en) {
        expect(card).toContain('data-translation="author_draft"');
        expect(card).toContain('lang="en" dir="ltr"');
      } else {
        expect(card).toContain('data-translation="pending"');
        expect(card).toContain('lang="ar" dir="rtl"');
        expect(card).not.toContain('data-translation="author_draft"');
      }
    }
  });
});

describe("no script, form, inline style or external resource in the page", () => {
  test("static, self-contained markup", () => {
    for (const l of ["ar", "en"] as const) {
      expect(html[l]).not.toMatch(/<script|<form|<iframe|\sstyle="|\son[a-z]+="/i);
      for (const [, url] of html[l].matchAll(
        /<(?:link|img|source|use)[^>]*\s(?:href|src)="([^"]+)"/g,
      ))
        expect(url).toMatch(/^(\/assets\/|#i-|data:,$)/);
    }
  });
});
