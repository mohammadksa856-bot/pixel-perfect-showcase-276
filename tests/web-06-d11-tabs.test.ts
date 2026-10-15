// WEB-06 D11 fix: active company group tab. Contrast itself is measured in the browser
// (product-tracking/tools/web_06_d11_tabs.mjs); this pins the local style and the non-colour cue.
import { expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router";
import { I18nProvider } from "../src/lib/i18n";
import { COMPANY_TABS } from "../src/lib/web-v1/model";

const pages = Object.fromEntries(
  ["2222"].map((s) => [
    s,
    JSON.parse(
      gunzipSync(
        readFileSync(new URL(`./fixtures/codex-20261013/${s}-page.json.gz`, import.meta.url)),
      ).toString(),
    ),
  ]),
);
mock.module("virtual:marefa-design-fixtures", () => ({ default: pages }));
const { frozenDesignPreview } = await import("../src/lib/web-v1/design-fixtures.server");
const { CompanyTabs } = await import("../src/components/web-v1/company-template");

const r = frozenDesignPreview({ market: "SA", symbol: "2222" });
if (r.state !== "ok") throw new Error(r.state);
const router = createRouter({
  routeTree: createRootRoute(),
  history: createMemoryHistory({ initialEntries: ["/"] }),
});
const render = (tab: (typeof COMPANY_TABS)[number]) =>
  renderToStaticMarkup(
    createElement(
      RouterContextProvider,
      { router },
      createElement(I18nProvider, null, createElement(CompanyTabs, { p: r.preview, tab })),
    ),
  );

for (const tab of COMPANY_TABS)
  test(`${tab}: one active tab, local high-contrast style with a ring, same tabs and text size`, () => {
    const html = render(tab);
    const links = [...html.matchAll(/<a [^>]*data-tab="([^"]+)"[^>]*>/g)];
    expect(links.map((m) => m[1])).toEqual([...COMPANY_TABS]);
    const active = links.filter((m) => m[0].includes("data-active"));
    expect(active).toHaveLength(1);
    const a = active[0]![0];
    expect(a).toContain(`data-tab="${tab}"`);
    expect(a).toContain('aria-current="page"');
    expect(a).toContain("text-foreground");
    expect(a).toContain("ring-1");
    expect(a).not.toContain("bg-brand ");
    expect(a).not.toContain("text-brand-foreground");
    for (const [l] of links) {
      expect(l).toContain("text-[13px]");
      expect(l).toContain("font-medium");
      expect(l).toContain("focus-visible:outline");
    }
  });
