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

  test("projects keep capacity and cost unknown and drivers unauthored", () => {
    expect(ar.match(/data-project="/g)).toHaveLength(r.projects.length);
    expect((ar.match(/data-not-authored/g) ?? []).length).toBe(r.projects.length);
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
