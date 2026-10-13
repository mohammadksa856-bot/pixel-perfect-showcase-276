import { expect, test, mock } from "bun:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  designReviewFixturesEnabled,
  DESIGN_REVIEW_BRANCH,
} from "../src/lib/web-v1/design-review-policy";
const fixturePages = Object.fromEntries(
  ["2222", "1120", "8010"].map((s) => [
    s,
    JSON.parse(
      gunzipSync(
        readFileSync(new URL(`./fixtures/codex-20261013/${s}-page.json.gz`, import.meta.url)),
      ).toString(),
    ),
  ]),
);
mock.module("virtual:marefa-design-fixtures", () => ({ default: fixturePages }));
const { frozenDesignPreview } = await import("../src/lib/web-v1/design-fixtures.server");
const { fetchCompanyPreview } = await import("../src/lib/engine/company-preview.server");
const { fetchPeerTable } = await import("../src/lib/engine/peer-comparison.server");
const enabled = {
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: DESIGN_REVIEW_BRANCH,
  MAREFA_DESIGN_FIXTURES: "true",
  WEB_V1_PREVIEW_ENABLED: "true",
  ENGINE_PREVIEW_ENABLED: "true",
  ENGINE_PEERS_ENABLED: "false",
};

test("frozen design mode requires all flags, exact preview environment and authorized branch", () => {
  expect(designReviewFixturesEnabled(enabled)).toBe(true);
  for (const key of Object.keys(enabled).filter((k) => k !== "ENGINE_PEERS_ENABLED"))
    expect(designReviewFixturesEnabled({ ...enabled, [key]: undefined })).toBe(false);
  for (const value of ["production", "development", "staging"])
    expect(designReviewFixturesEnabled({ ...enabled, VERCEL_ENV: value })).toBe(false);
  for (const branch of ["main", "main-fz2efq", "web/vercel-ui-preview-20261013"])
    expect(designReviewFixturesEnabled({ ...enabled, VERCEL_GIT_COMMIT_REF: branch })).toBe(false);
});
test("explicit fixture mode cannot contact a live engine, even with production-looking config", async () => {
  const noNetwork = (() => {
    throw new Error("unexpected network");
  }) as typeof fetch;
  const result = await fetchCompanyPreview(
    { market: "SA", symbol: "2222" },
    {
      ...enabled,
      FINENGINE_API_URL: "https://forbidden.invalid",
      FINENGINE_API_KEY: "unit-test-placeholder",
    },
    noNetwork,
  );
  expect(result.state).toBe("ok");
  const blocked = await fetchCompanyPreview(
    { market: "SA", symbol: "2222" },
    { ...enabled, VERCEL_ENV: "production" },
    noNetwork,
  );
  expect(blocked.state).toBe("disabled");
  expect(await fetchPeerTable({ market: "SA", symbol: "1120" }, enabled, noNetwork)).toBeNull();
});
for (const symbol of ["2222", "1120", "8010"])
  test(`${symbol}: all scores unmeasured, all categories retained, derivatives withheld`, () => {
    const original = JSON.stringify(fixturePages[symbol]);
    const result = frozenDesignPreview({ market: "SA", symbol });
    expect(result.state).toBe("ok");
    if (result.state !== "ok") throw new Error(result.state);
    const p = result.preview;
    expect(p.topics).toHaveLength(18);
    expect(p.factory.categories).toHaveLength(18);
    expect(p.topics.every((t) => t.status === "not_measured" && t.score === null)).toBe(true);
    expect(p.readiness.investorTopics.score).toBeNull();
    expect(p.readiness.operationalCategories.score).toBeNull();
    expect(p.factory.categories.every((c) => c.score === null)).toBe(true);
    expect(p.dataNotices[0]!.en).toContain("frozen development");
    const cells = p.topics
      .flatMap((t) => t.blocks)
      .flatMap((b) => (b.type === "metrics" ? b.group.cells : b.type === "segments" ? b.rows : []));
    expect(
      cells.every(
        (c) =>
          c.proof.independentlyVerified === false &&
          c.proof.kind !== "calculated_inputs_reproduced",
      ),
    ).toBe(true);
    expect(JSON.stringify(fixturePages[symbol])).toBe(original);
  });
test("unknown company never substitutes another sample", () => {
  expect(frozenDesignPreview({ market: "SA", symbol: "9999" }).state).toBe("not_found");
  expect(frozenDesignPreview({ market: "US", symbol: "2222" }).state).toBe("not_found");
});
