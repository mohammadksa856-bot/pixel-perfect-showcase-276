import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { PeerComparisonPanel } from "../src/components/peer-comparison-panel";
import { I18nProvider } from "../src/lib/i18n";
import { buildPeerTable, type EnginePeerResponse } from "../src/lib/engine/peer-comparison";
import banks from "./fixtures/engine-b70254e_peers_SA-1120_banks.json";
import { withUnitTestLineage } from "./peer-lineage-fixture";

test("engine panel is a separate provenance boundary, not a site-data endorsement", () => {
  const table = buildPeerTable(withUnitTestLineage(banks), "bank");
  const html = renderToStaticMarkup(
    <I18nProvider>
      <PeerComparisonPanel table={table} />
    </I18nProvider>,
  );
  expect(html).toContain('data-data-origin="engine-api"');
  expect(html).toContain("API المحرك فقط");
  expect(html).toContain("لا يثبت مدخلاتها");
  expect(html).not.toContain('data-data-origin="site-demo"');
});

test("disabled or unavailable panel renders nothing", () => {
  expect(
    renderToStaticMarkup(
      <I18nProvider>
        <PeerComparisonPanel table={null} />
      </I18nProvider>,
    ),
  ).toBe("");
});

test("company route retains a separately labelled site demonstration boundary", () => {
  const source = readFileSync(
    new URL("../src/routes/companies.$slug.tsx", import.meta.url),
    "utf8",
  );
  expect(source).toContain('data-data-origin="site-demo"');
  expect(source).toContain("لا تستبدل بيانات الموقع أو تصادق عليها");
  expect(source).not.toContain("...peers");
});
