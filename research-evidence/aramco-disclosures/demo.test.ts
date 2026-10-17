// WEB-08B03: local demo — escaping, unapproved labelling, no values, read-only loopback server.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { AddressInfo } from "node:net";
import { buildRegister, loadB02, loadSnapshot } from "./register";
import { createDemoServer, renderWorkspace } from "./demo";

const r = buildRegister(loadSnapshot(), loadB02());
const APP = "http://127.0.0.1:5173";

describe("render", () => {
  const ar = renderWorkspace(r, "ar", APP);
  const en = renderWorkspace(r, "en", APP);

  test("banner says unapproved/local; every claim card is WITHHELD; Arabic RTL and English LTR", () => {
    expect(ar).toContain("data-banner");
    expect(ar).toContain('dir="rtl"');
    expect(en).toContain('dir="ltr"');
    expect(ar.match(/data-claim="/g)).toHaveLength(r.claims.length);
    expect(ar.match(/data-status="WITHHELD"/g)).toHaveLength(r.claims.length);
  });

  test("no scripts, forms or financial-statement values; results card links to Marefa Data", () => {
    for (const h of [ar, en]) {
      expect(h).not.toMatch(/<script|<form|<input/i);
      for (const v of ["1,559.342", "350.210", "510.798", "190.444"])
        expect(h.includes(v)).toBe(false);
    }
    expect(ar).toContain("data-no-quote");
    expect(ar).toContain(`${APP}/preview/web-v1/companies/2222?tab=financials`);
  });

  test("all 18 topics are present in the five groups; empty topics say so", () => {
    expect(ar.match(/data-topic="/g)).toHaveLength(18);
    expect(ar.match(/data-group="/g)).toHaveLength(5);
    expect(ar).toMatch(/data-topic="valuation" data-topic-status="no_disclosure_in_sample"/);
  });

  test("projects show field statuses (never 'not disclosed'), drivers unauthored, mobile-stacked table", () => {
    expect(ar.match(/data-project="/g)).toHaveLength(r.projects.length);
    expect((ar.match(/data-not-authored/g) ?? []).length).toBe(r.projects.length);
    expect((ar.match(/data-field-status="/g) ?? []).length).toBe(r.projects.length * 3);
    expect(ar).not.toContain('data-field-status="not_disclosed"');
    expect(en).toContain("Not in the engine record; original unchecked");
    // every project cell carries a label so the table stacks into cards on narrow screens
    expect(en).toMatch(/@media \(max-width:760px\)\{table\.stack thead\{display:none\}/);
    const row = en.slice(
      en.indexOf('data-project="jafurah"'),
      en.indexOf("</tr>", en.indexOf('data-project="jafurah"')),
    );
    expect(row.match(/<td /g)!.length).toBe(row.match(/data-label="/g)!.length);
  });

  test("gas target: only the non-conflicting engine text is quoted; the conflict is shown", () => {
    for (const h of [ar, en])
      for (const q of h.match(/<blockquote[^>]*>[^<]*<\/blockquote>/g) ?? [])
        expect(q).not.toMatch(/more than 80%/);
    expect(en).toContain(">Aramco targets growth in sales gas production capacity</blockquote>");
    expect(en).toContain("data-excerpt-withheld");
  });

  test("hostile text is escaped and non-https source links are not rendered as links", () => {
    const hostile = structuredClone(r);
    hostile.claims[0]!.quote = '<script>alert(1)</script>"><img src=x>';
    hostile.claims[0]!.evidence.url = "javascript:alert(1)";
    const h = renderWorkspace(hostile, "ar", APP);
    expect(h).not.toContain("<script>alert(1)</script>");
    expect(h).toContain("&lt;script&gt;");
    expect(h).not.toContain('href="javascript:');
  });
});

describe("R05 local reader safety", () => {
  const evil = '<a href="https://example.invalid" data-injected>SYNTHETIC</a>';
  test("every effect-period field and free text is escaped", () => {
    const h0 = structuredClone(r);
    h0.claims[0]!.effect = { kind: "event_date", date: evil, note: evil };
    h0.claims[1]!.effect = { kind: "reporting_period", start: evil, end: evil, note: "x" };
    h0.claims[2]!.effect = { kind: "as_of", date: evil, note: "x" };
    (h0.claims[3]!.effect as unknown) = { kind: "fiscal_year", fiscalYear: evil, note: "x" };
    (h0.claims[4]!.effect as unknown) = {
      kind: "through_year",
      baseYear: evil,
      targetYear: evil,
      note: "x",
    };
    (h0.claims[5]!.effect as unknown) = {
      kind: "term",
      years: evil,
      months: null,
      start: null,
      note: "x",
    };
    for (const t of h0.topicMap)
      for (const list of [t.claims, t.crossClaims])
        list.forEach((id, i) => id === h0.claims[6]!.id && (list[i] = evil));
    h0.claims[6]!.id = evil;
    (h0.claims[6]!.category as unknown) = evil;
    (h0.claims[6]!.eventType as unknown) = evil;
    h0.claims[6]!.evidence.filedAt = evil;
    h0.claims[6]!.evidence.note = evil;
    h0.claims[6]!.qualification.gaps.push(evil as never);
    h0.events[0]!.eventId = evil;
    h0.documents[0]!.family = evil;
    h0.projects[0]!.name = evil;
    for (const l of ["ar", "en"] as const) {
      const h = renderWorkspace(h0, l, APP);
      expect(h).not.toContain("data-injected>");
      expect(h).not.toContain('<a href="https://example.invalid"');
    }
  });

  test("unsafe or misleading APP_BASE never produces app links; the page says so", () => {
    for (const bad of [
      "javascript:alert(1)//",
      "data:text/html,x",
      "https://evil.example",
      "http://127.0.0.1@evil.example",
      "http://localhost.evil.example:5173",
      "http://user:pw@127.0.0.1:5173",
      "http://127.0.0.1:5173/path",
      "http://127.0.0.1:5173/?x=1",
      "//127.0.0.1:5173",
      "",
    ]) {
      const h = renderWorkspace(r, "en", bad);
      expect(h).not.toContain('href="javascript:');
      expect(h).not.toContain('href="data:');
      expect(h).not.toMatch(/href="[^"#?][^"]*\/preview\/web-v1/);
      expect(h).toContain("data-app-base-rejected");
      expect(() => createDemoServer(bad)).toThrow(/unsafe_app_base/);
    }
    const ok = renderWorkspace(r, "en", "http://localhost:5173");
    expect(ok).not.toContain("data-app-base-rejected");
    expect(ok).toContain(
      'href="http://localhost:5173/preview/web-v1/companies/2222?tab=financials"',
    );
  });

  test("a hostile source URL is not linked", () => {
    const h0 = structuredClone(r);
    h0.claims[0]!.evidence.url = "https://user:pw@evil.example/x";
    h0.documents[0]!.artifactUrl = "javascript:alert(1)";
    const h = renderWorkspace(h0, "en", APP);
    expect(h).not.toContain('href="https://user:pw@');
    expect(h).not.toContain('href="javascript:');
  });
});

describe("server", () => {
  const server = createDemoServer(APP);
  let base = "";
  beforeAll(async () => {
    await new Promise<void>((ok) => server.listen(0, "127.0.0.1", () => ok()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => server.close());

  test("GET / is 200 with CSP, noindex and no-store", async () => {
    const res = await fetch(`${base}/?lang=en`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(res.headers.get("content-security-policy")).toContain("form-action 'none'");
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  test("non-GET is refused and unknown paths are 404", async () => {
    expect((await fetch(`${base}/`, { method: "POST", body: "x" })).status).toBe(405);
    expect((await fetch(`${base}/admin`)).status).toBe(404);
  });
});
