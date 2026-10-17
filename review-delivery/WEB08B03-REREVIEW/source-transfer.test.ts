// Additional independent review checks, separate from the unchanged15original assertions.
import { test, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  buildRegister,
  loadSnapshot,
  loadB02,
} from "../../research-evidence/aramco-disclosures/register";
import {
  toResearchClaim,
  bridgeAll,
} from "../../research-evidence/aramco-disclosures/contract-bridge";
import { renderWorkspace, safeAppBase } from "../../research-evidence/aramco-disclosures/demo";
import { SOURCE_REVIEW_REF } from "../../research-evidence/aramco-disclosures/source-review";
const oldSha = "dcdecad97c3c8babd67931a817e69d0cd7a7d6d6";
const oldSource = JSON.parse(
  execFileSync(
    "git",
    ["show", oldSha + ":review-delivery/WEB08B03-INDEPENDENT/RESEARCH-SOURCE-REVIEW.json"],
    { encoding: "utf8" },
  ),
);
const oldClaims = JSON.parse(
  execFileSync("git", ["show", "1030fa8:review-delivery/WEB08B03/CLAIMS-REGISTER.json"], {
    encoding: "utf8",
  }),
).claims;
const r = buildRegister(loadSnapshot(), loadB02());
const author = { authorId: "SYNTHETIC-independent", createdAt: "2026-10-17T00:00:00.000Z" };
test("All22prior review dispositions preserved; two locators explicitly adapted to their stand-alone PDF", () => {
  expect(SOURCE_REVIEW_REF.sha).toBe(oldSha);
  expect(r.claims).toHaveLength(22);
  for (const c of r.claims) {
    const old = oldSource.claims.find((x: { claim_id: string }) => x.claim_id === c.id)!;
    expect(c.sourceReview!.status).toBe(old.research_review);
    const pages =
      c.id === "aramco-jafurah-midstream-contract"
        ? [71]
        : c.id === "aramco-rig-purchase-commitments"
          ? [69]
          : old.independent_pdf_pages;
    expect(c.sourceReview!.reviewerPdfPages).toEqual(pages);
    expect(c.sourceReview!.reviewSha).toBe(oldSha);
    expect(c.evidence.page).toBe(old.provided_page);
    expect(c.evidence.url).toBe(old.source_url);
  }
});
test("Same22claim identities/versions/topics; gas excerpt preserved for traceability but not substituted as original text", () => {
  for (const c of r.claims) {
    const old = oldClaims.find((x: { id: string }) => x.id === c.id)!;
    expect(c.record).toEqual(old.record);
    expect(c.topic).toBe(old.topic);
    expect(c.category).toBe(old.category);
    if (c.id === "aramco-sales-gas-growth-2030") {
      expect(c.engineExcerpt!.text).toBe(old.quote);
      expect(old.quote.startsWith(c.quote)).toBe(true);
    } else expect(c.quote).toBe(old.quote);
  }
});
test("Known meaning/locator/derived conflicts reject even a synthetically complete document identity", () => {
  for (const c of r.claims) {
    const review = c.sourceReview!;
    if (!review.meaningConflict && review.locator !== "conflict" && !review.derivationInEngineText)
      continue;
    const x = toResearchClaim(
      c,
      r.company,
      {
        id: "SYNTHETIC-not-real",
        version: 1,
        sha256: c.evidence.pdfSha256 ?? "0".repeat(64),
        publishedAt: c.evidence.filedAt.slice(0, 10) + "T00:00:00.000Z",
        url: c.evidence.url,
        companyId: r.company.id,
      },
      author,
    );
    expect(x.constructible).toBe(false);
    if (!x.constructible) expect(x.missing.some((m) => m.startsWith("source_review:"))).toBe(true);
  }
});
test("All actual22claims remain unconstructible and withheld; no synthetic identity in committed outputs", () => {
  expect(bridgeAll(r).every((x) => !x.result.constructible)).toBe(true);
  expect(
    r.claims.every(
      (c) => c.qualification.status === "WITHHELD" && !c.qualification.publicationEligible,
    ),
  ).toBe(true);
  expect(
    r.claims.every(
      (c) =>
        c.qualification.gaps.includes("independent_review_receipt_missing") &&
        c.qualification.gaps.includes("editorial_review_missing"),
    ),
  ).toBe(true);
  for (const name of ["CLAIMS-REGISTER", "CONTRACT-BRIDGE", "PROJECTS"])
    expect(
      readFileSync(new URL("../WEB08B03/" + name + ".json", import.meta.url), "utf8"),
    ).not.toContain("SYNTHETIC");
});
test("The142B02inputs stay withheld and no accepted contract/engine-facing/application code changes", () => {
  const inputs = JSON.parse(
    readFileSync(
      new URL("../WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json", import.meta.url),
      "utf8",
    ),
  );
  expect(inputs.results).toHaveLength(142);
  expect(inputs.qualified_for_research).toBe(0);
  expect(inputs.approved_for_display).toBe(0);
  expect(
    inputs.results.every(
      (x: { qualification: { state: string; publicationAuthorized: boolean } }) =>
        x.qualification.state === "WITHHELD" && !x.qualification.publicationAuthorized,
    ),
  ).toBe(true);
  expect(
    execFileSync(
      "git",
      [
        "diff",
        "--name-only",
        "1030fa8",
        "21847fdbd427af23a2b644aeeea92fa4fe9064b9",
        "--",
        "src",
        "config",
        "research-evidence/v1",
        "research-evidence/aramco-qualification",
        "review-delivery/WEB08B02",
      ],
      { encoding: "utf8" },
    ).trim(),
  ).toBe("");
});
test("Conflicting gas magnitude never appears in a rendered claim quotation; review warning is explicitly retained", () => {
  for (const lang of ["ar", "en"] as const) {
    const html = renderWorkspace(r, lang, "http://127.0.0.1:5173");
    const quotes = [...html.matchAll(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/g)].map(
      (m) => m[1],
    );
    expect(quotes.some((q) => q?.includes("more than 80%"))).toBe(false);
    expect(html).toContain("data-excerpt-withheld");
    expect(html).toContain("data-source-review");
  }
});
test("Safe base rejects credentials, external lookalikes, paths and query strings; IPv6 loopback allowed", () => {
  for (const url of [
    "https://localhost.example.invalid",
    "http://127.0.0.1@evil.invalid",
    "http://localhost/x",
    "http://localhost/?x=1",
    "data:text/html,test",
  ])
    expect(safeAppBase(url)).toBeNull();
  expect(safeAppBase("http://[::1]:5173")).toBe("http://[::1]:5173");
});
test("A changed engine record version cannot inherit curated decisions", () => {
  const s = loadSnapshot();
  s.disclosures.find((d) => d.title === "2026 capital investment guidance")!.version++;
  expect(() => buildRegister(s, loadB02())).toThrow(/record_not_unique_or_missing/);
});
