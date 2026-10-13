// تكامل P01-15 مع API المحرك الحقيقي على localhost. يُتخطّى إن لم يُضبط ENGINE_IT_URL.
// تشغيل: انظر product-tracking/tools/p01_15_integration.sh
import { describe, expect, test } from "bun:test";
import { fetchPeerTable } from "../src/lib/engine/peer-comparison.server";

const url = process.env["ENGINE_IT_URL"];
const key = process.env["ENGINE_IT_KEY"];
const env = { ENGINE_PEERS_ENABLED: "true", FINENGINE_API_URL: url, FINENGINE_API_KEY: key };

describe.skipIf(!url || !key)("engine API integration", () => {
  test("Al Rajhi: unrecorded calculated ratios withheld, no median or ranked display", async () => {
    const t = await fetchPeerTable({ market: "SA", symbol: "1120" }, env);
    expect(t?.status).toBe("unavailable");
    expect(t!.kind).toBe("bank");
    expect(t!.columns).toEqual([]);
    const raw=await (await fetch(`${url}/v1/companies/SA/1120/peers?metrics=return_on_equity,return_on_assets,cost_to_income_ratio,net_interest_margin,cost_of_risk`,{headers:{"X-API-Key":key!}})).json();
    expect(raw.companies.length).toBe(10);
    for(const company of raw.companies)for(const point of Object.values(company.metrics) as {value: unknown;is_calculated: number;quality_reasons:string[];provenance:{derivation:{lineage:{current_inputs_reproduced:boolean}}};point_id:number;version:number}[]){
      if(point.is_calculated){expect(point.value).toBeNull();expect(point.quality_reasons).toContain("calculated_input_lineage_not_reproduced");expect(point.provenance.derivation.lineage.current_inputs_reproduced).toBe(false);expect(point.point_id).toBeGreaterThan(0);expect(point.version).toBeGreaterThan(0);expect(point).not.toHaveProperty("ascending_rank");}
    }
  });

  test("every enabled bank preserves the same fail-closed peer display policy", async () => {
    for (const s of ["1180", "1010", "1050", "1060", "1080", "1140", "1150", "1020", "1030"]) {
      const t = await fetchPeerTable({ market: "SA", symbol: s }, env);
      expect(t?.status).toBe("unavailable");
      expect(t!.columns).toEqual([]);
    }
  });

  test("Aramco and SABIC: unavailable, not padded", async () => {
    for (const s of ["2222", "2010"]) {
      const t = await fetchPeerTable({ market: "SA", symbol: s }, env);
      expect(t?.status).toBe("unavailable");
      expect(t!.rows.length).toBe(0);
    }
  });

  test("unknown company → unavailable, no throw", async () => {
    const t = await fetchPeerTable({ market: "SA", symbol: "4190" }, env);
    expect(t?.status).toBe("unavailable");
  });

  test("wrong API key → unavailable, never falls back to other data", async () => {
    const t = await fetchPeerTable(
      { market: "SA", symbol: "1120" },
      { ...env, FINENGINE_API_KEY: "wrong" },
    );
    expect(t?.status).toBe("unavailable");
  });
});
