import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { fetchCompanyPreview } from "../src/lib/engine/company-preview.server";

const root = new URL("../product-tracking/inbox/company-preview-engine-20261013-v1/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("MANIFEST.json", root), "utf8"));
const env = { ENGINE_PREVIEW_ENABLED: "true", FINENGINE_API_URL: "http://engine", FINENGINE_API_KEY: "local-test-only" };
for (const symbol of ["2222", "1120", "8010"]) {
  test(`${symbol}: delivered bytes match manifest and current page5 does not fall back`, async () => {
    for (const name of ["page.json", "preview-evidence.json"]) {
      const path = `samples/${symbol}/${name}`;
      const bytes = readFileSync(new URL(path, root));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(manifest.files[path].sha256);
      expect(bytes.length).toBe(manifest.files[path].bytes);
    }
    const raw = readFileSync(new URL(`samples/${symbol}/page.json`, root), "utf8");
    expect(JSON.parse(raw).contract_version).toBe(5);
    const result = await fetchCompanyPreview({market: "SA", symbol}, env, async () => new Response(raw));
    expect(result.state).toBe("ok");
    if (result.state === "ok") {
      expect(result.preview.readiness.score).toBeNull();
      expect(result.preview.topics.every(topic => topic.score === null)).toBe(true);
      const evidence=JSON.parse(readFileSync(new URL(`samples/${symbol}/preview-evidence.json`,root),"utf8"));
      for (const topic of result.preview.topics) for (const block of topic.blocks) {
        if (block.type!=="metrics") continue;
        for (const cell of block.group.cells) expect(evidence.numeric_evidence.some((row: {metric:string;period_end:string;status:string;value:string|null})=>row.metric===cell.key&&row.period_end===cell.period.end&&row.status==="available"&&Number(row.value)===cell.value)).toBe(true);
      }
    }
  });
  test(`${symbol}: legacy page4 without companion is blocked, not upgraded or displayed`, async () => {
    const raw = gunzipSync(readFileSync(new URL(`./fixtures/p02/engine-b70254e_page_SA-${symbol}.json.gz`, import.meta.url))).toString();
    const result = await fetchCompanyPreview({market: "SA", symbol}, env, async () => new Response(raw));
    expect(result).toEqual({state: "engine_unavailable", reason: "preview_requires_page5"});
  });
}
