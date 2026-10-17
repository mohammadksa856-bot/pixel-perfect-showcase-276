// WEB-08B04: local reader — escaping, unapproved labelling, safe links, read-only loopback server.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { AddressInfo } from "node:net";
import { compilePack } from "./pack";
import { createReaderServer, renderReader } from "./reader";

const pack = compilePack();
const APP = "http://127.0.0.1:5173";

describe("render", () => {
  const ar = renderReader(pack, "ar", APP);
  const en = renderReader(pack, "en", APP);
  test("banner, every paragraph with its non-approved status, every analysis BLOCKED, 18 topics", () => {
    for (const h of [ar, en]) {
      expect(h).toContain("data-banner");
      expect(h.match(/data-paragraph="/g)).toHaveLength(pack.paragraphs.length);
      expect(h.match(/data-analysis="[^"]+" data-status="BLOCKED"/g)).toHaveLength(
        pack.analyses.length,
      );
      expect(h.match(/data-topic="/g)).toHaveLength(18);
      expect(h).not.toMatch(/<script|<form|<input/i);
    }
    expect(ar).toContain('dir="rtl"');
    expect(en).toContain('dir="ltr"');
    expect(en).toContain("data-translation-pending");
    // long identifiers in evidence labels must wrap on narrow screens (no horizontal page scroll)
    expect(ar).toContain("code,td{overflow-wrap:anywhere;word-break:break-word}");
    expect(en).toContain(">In the original per the reviewer; not extracted</td>");
    expect(en.match(/data-field-status="/g)).toHaveLength(pack.projects.length * 4);
  });
  test("hostile text and labels are escaped", () => {
    const h0 = structuredClone(pack);
    const evil = '<a href="javascript:alert(1)" data-injected>x</a>';
    h0.paragraphs[0]!.ar = evil;
    h0.paragraphs[1]!.refs[0]!.label = evil;
    (h0.paragraphs[2]!.kind as string) = evil;
    h0.analyses[0]!.inputs[0]!.key = evil;
    h0.analyses[0]!.questions[0] = evil;
    for (const l of ["ar", "en"] as const) {
      const h = renderReader(h0, l, APP);
      expect(h).not.toContain("data-injected>");
      expect(h).not.toContain('href="javascript:');
    }
  });
  test("unsafe APP_BASE disables app links and the server refuses to start", () => {
    for (const bad of [
      "javascript:alert(1)//",
      "https://evil.example",
      "http://127.0.0.1@evil.example",
      "http://127.0.0.1:5173/x",
    ]) {
      const h = renderReader(pack, "en", bad);
      expect(h).toContain("data-app-base-rejected");
      expect(h).not.toMatch(/href="[^"#?][^"]*\/preview\/web-v1/);
      expect(() => createReaderServer(bad)).toThrow(/unsafe_app_base/);
    }
    expect(renderReader(pack, "en", APP)).toContain(
      `href="${APP}/preview/web-v1/companies/2222?tab=financials"`,
    );
  });
});

describe("server", () => {
  const server = createReaderServer(APP);
  let base = "";
  beforeAll(async () => {
    await new Promise<void>((ok) => server.listen(0, "127.0.0.1", () => ok()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => server.close());
  test("GET / is 200 with CSP, noindex and no-store", async () => {
    const r = await fetch(`${base}/?lang=ar`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(r.headers.get("x-robots-tag")).toContain("noindex");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
  test("non-GET is refused and unknown paths are 404", async () => {
    expect((await fetch(`${base}/`, { method: "POST" })).status).toBe(405);
    expect((await fetch(`${base}/x`)).status).toBe(404);
  });
});
