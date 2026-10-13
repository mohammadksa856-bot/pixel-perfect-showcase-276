// تكامل P02 مع API المحرك الحقيقي على localhost. يُتخطّى إن لم يُضبط ENGINE_IT_URL.
// تشغيل: product-tracking/tools/p02_integration.sh
import { describe, expect, test } from "bun:test";
import { contractProblems } from "../src/lib/engine/company-preview";
import { fetchCompanyPreview } from "../src/lib/engine/company-preview.server";

const url = process.env["ENGINE_IT_URL"];
const key = process.env["ENGINE_IT_KEY"];
const env = { ENGINE_PREVIEW_ENABLED: "true", FINENGINE_API_URL: url, FINENGINE_API_KEY: key };
// Separate existing insurer import-preview database, never silently merged with native engine records.
const urlFor=(symbol: string)=>symbol==="8010"?process.env["ENGINE_IT_INSURANCE_URL"]??url:url;

describe.skipIf(!url || !key)("engine API contract and preview (live local API)", () => {
  for (const symbol of ["2222", "1120", "8010"]) {
    test(`${symbol}: raw /page response satisfies current contract v5`, async () => {
      const res = await fetch(`${urlFor(symbol)}/v1/companies/SA/${symbol}/page`, {
        headers: { "X-API-Key": key! },
      });
      expect(res.status).toBe(200);
      const raw=await res.json();
      expect(raw.contract_version).toBe(5);
      expect(contractProblems(raw)).toEqual([]);
    });

    test(`${symbol}: preview builds with 18 topics and sourced values`, async () => {
      const r = await fetchCompanyPreview({ market: "SA", symbol }, {...env,FINENGINE_API_URL:urlFor(symbol)});
      expect(r.state).toBe("ok");
      if (r.state !== "ok") return;
      expect(r.preview.topics).toHaveLength(18);
      expect(r.preview.counts.shown).toBeGreaterThan(0);
      // Missing measurement stays unmeasured: never require a fabricated readiness score to pass.
      expect(r.preview.readiness.score).toBeNull();
      expect(r.preview.topics.every((t) => t.score===null)).toBe(true);
      if(symbol==="8010")expect(r.preview.dataNotices.length).toBeGreaterThan(0);
    });
  }

  test("unknown company → not_found (engine 404), no data", async () => {
    expect(await fetchCompanyPreview({ market: "SA", symbol: "4190" }, env)).toEqual({
      state: "not_found",
    });
  });

  test("wrong key → auth failure, no data", async () => {
    expect(
      await fetchCompanyPreview(
        { market: "SA", symbol: "2222" },
        { ...env, FINENGINE_API_KEY: "wrong" },
      ),
    ).toEqual({
      state: "engine_unavailable",
      reason: "engine_auth_failed",
    });
  });

  test("engine down → unreachable, no data", async () => {
    const r = await fetchCompanyPreview(
      { market: "SA", symbol: "2222" },
      { ...env, FINENGINE_API_URL: "http://127.0.0.1:9" },
    );
    expect(r).toEqual({ state: "engine_unavailable", reason: "engine_unreachable" });
  });
});
