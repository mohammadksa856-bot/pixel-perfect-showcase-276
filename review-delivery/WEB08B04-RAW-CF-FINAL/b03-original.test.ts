// Independent acceptance assertions. No author implementation is patched.
// Synthetic mutations of the fixed frozen sample, never approved financial data.
import { test, expect } from "bun:test";
import {
  buildRegister,
  loadSnapshot,
  loadB02,
} from "../../research-evidence/aramco-disclosures/register";
import { CLAIM_CURATION } from "../../research-evidence/aramco-disclosures/curation";
import { toResearchClaim } from "../../research-evidence/aramco-disclosures/contract-bridge";
import { renderWorkspace } from "../../research-evidence/aramco-disclosures/demo";

const snap = loadSnapshot(),
  b02 = loadB02();
const register = () => buildRegister(snap, b02);
const author = { authorId: "SYNTHETIC-author", createdAt: "2026-10-17T00:00:00.000Z" };
const identity = {
  id: "SYNTHETIC-doc",
  version: 1,
  sha256: "0".repeat(64),
  publishedAt: "2026-03-10T00:00:00.000Z",
};
const candidate = () =>
  structuredClone(register().claims.find((c) => c.id === "aramco-jafurah-midstream-contract")!);

test("CONTROL: all real claims remain WITHHELD, never publication eligible", () => {
  const r = register();
  expect(r.claims).toHaveLength(22);
  expect(
    r.claims.every(
      (c) => c.qualification.status === "WITHHELD" && !c.qualification.publicationEligible,
    ),
  ).toBe(true);
});
test("F01: contradictory trusted PDF hash must not construct an evidence claim", () => {
  const c = candidate();
  c.evidence.pdfSha256 = "1".repeat(64);
  expect(toResearchClaim(c, register().company, identity, author).constructible).toBe(false);
});
test("F01: supplied earlier document publication must not backdate source knowledge", () => {
  const c = candidate();
  expect(
    toResearchClaim(
      c,
      register().company,
      { ...identity, publishedAt: "2020-01-01T00:00:00.000Z" },
      author,
    ).constructible,
  ).toBe(false);
});
test("F02: an assumption must not become a published actual fact", () => {
  const c = candidate();
  c.category = "assumption";
  const x = toResearchClaim(c, register().company, identity, author);
  expect(
    !x.constructible ||
      (x.claim.contentKind === "assumption" && x.claim.temporalBasis === "assumption"),
  ).toBe(true);
});
test("F02: research interpretation must not become a published actual fact", () => {
  const c = candidate();
  c.category = "research_opinion";
  const x = toResearchClaim(c, register().company, identity, author);
  expect(!x.constructible || x.claim.contentKind === "research_interpretation").toBe(true);
});
test("F03: a known guidance year must survive bridge construction", () => {
  const c = register().claims.find((c) => c.id === "aramco-capex-guidance-2026")!;
  // Add only a synthetic locator so that missing source identity does not mask period loss.
  const x = toResearchClaim(
    { ...c, evidence: { ...c.evidence, page: 1 } },
    register().company,
    identity,
    author,
  );
  expect(x.constructible).toBe(true);
  if (!x.constructible) return;
  expect(
    x.claim.identity.period.fiscalYear === 2026 ||
      x.claim.limitations.some((s) => s.includes("2026")),
  ).toBe(true);
});
test("F04: incompatible events sharing an id must not select the first event type", () => {
  const cur = structuredClone(CLAIM_CURATION);
  const claims = cur.flatMap((e) => e.claims);
  claims[1]!.eventId = claims[0]!.eventId;
  claims[1]!.eventType = "acquisition";
  expect(() => buildRegister(snap, b02, cur)).toThrow();
});
test("F05: conflicting hashes for the same B02 URL must not choose first", () => {
  const first = b02.documents.find((d) => d.key === "FY2025")!;
  const altered = {
    ...b02,
    documents: [
      first,
      { ...first, sha256: "f".repeat(64) },
      ...b02.documents.filter((d) => d !== first),
    ],
  };
  expect(() => buildRegister(snap, altered)).toThrow();
});
test("F06: an impossible event date must be rejected", () => {
  const cur = structuredClone(CLAIM_CURATION);
  cur[0]!.claims[0]!.effect = {
    kind: "event_date",
    date: "2025-02-30",
    note: "SYNTHETIC invalid date",
  };
  expect(() => buildRegister(snap, b02, cur)).toThrow();
});
test("F07: date fields must not inject HTML into the local reader", () => {
  const r = register();
  r.claims[0]!.effect = {
    kind: "event_date",
    date: '<a href="https://example.invalid" data-injected>SYNTHETIC</a>',
    note: "synthetic",
  };
  const html = renderWorkspace(r, "en", "http://127.0.0.1:5173");
  expect(html).not.toContain("data-injected>SYNTHETIC</a>");
});
test("F08: unsafe APP_BASE must not generate javascript navigation links", () => {
  expect(renderWorkspace(register(), "en", "javascript:alert(1)//")).not.toContain(
    'href="javascript:',
  );
});
test("F09: a different issuer must not inherit Aramco's curated decisions", () => {
  const s = structuredClone(snap);
  s.company = { market: "US", symbol: "OTHER" };
  expect(() => buildRegister(s, b02)).toThrow();
});
test("CONTROL: no network, writes, numeric qualification or production integration added", () => {
  const r = register();
  expect(r.projects.every((p) => p.qualification === "WITHHELD")).toBe(true);
  expect(r.documents).toHaveLength(9);
  expect(r.events).toHaveLength(17);
  expect(r.topicMap).toHaveLength(18);
});
test("R10: the 2030 gas target must not strengthen an approximately operator to greater-than", () => {
  const c = register().claims.find((c) => c.id === "aramco-sales-gas-growth-2030")!;
  // Original annual report SHA 78bb678e..., PDF 13/50/54, inspected independently.
  // This assertion does not approve or replace the claim; it refuses the changed meaning.
  expect(c.quote).not.toMatch(/more than 80%/i);
});
test("R11: a quoted capacity must not be represented as not disclosed", () => {
  const p = register().projects.find((p) => p.id === "msc-12mbd")!;
  expect(p.description.some((d) => /12 million barrels per day/.test(d.quote))).toBe(true);
  expect(p.capacity.status).not.toBe("not_disclosed");
});
