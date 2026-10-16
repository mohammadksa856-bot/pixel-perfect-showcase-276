import { test, expect, mock } from "bun:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router";
import { I18nProvider } from "../src/lib/i18n";
const raw = JSON.parse(
  gunzipSync(
    readFileSync(new URL("./fixtures/codex-20261013/2222-page.json.gz", import.meta.url)),
  ).toString(),
);
mock.module("virtual:marefa-design-fixtures", () => ({ default: { "2222": raw } }));
const { frozenDesignPreview } = await import("../src/lib/web-v1/design-fixtures.server");
const { CompanyOverview } = await import("../src/components/web-v1/company-overview");
const router = createRouter({
  routeTree: createRootRoute(),
  history: createMemoryHistory({ initialEntries: ["/"] }),
});
const preview = () => {
  const r = frozenDesignPreview({ market: "SA", symbol: "2222" });
  if (r.state !== "ok") throw Error(r.state);
  return structuredClone(r.preview);
};
const render = (p: ReturnType<typeof preview>) =>
  renderToStaticMarkup(
    createElement(
      RouterContextProvider,
      { router },
      createElement(I18nProvider, null, createElement(CompanyOverview, { p })),
    ),
  );
function segments(p: ReturnType<typeof preview>) {
  const b = p.topics.flatMap((t) => t.blocks).find((b) => b.type === "segments");
  if (!b || b.type !== "segments" || b.rows.length < 2) throw Error("fixture segments absent");
  return b;
}
function figure(html: string) {
  return html.match(/<figure[^>]*data-revenue-mix=[\s\S]*?<\/figure>/)?.[0] || "";
}
test("different units must disable comparison bars and preserve per-row source", () => {
  const p = preview(),
    b = segments(p);
  b.rows[1]!.unit = "USD";
  b.rows[1]!.display = { ar: "123 دولار اصطناعي", en: "Synthetic USD123" };
  const h = figure(render(p));
  expect(h.includes('data-provenance="per-row"')).toBe(true);
  expect(h.includes("rounded-full bg-brand")).toBe(false);
});
test("same end date but quarter versus FY must not share a period or compare bars", () => {
  const p = preview(),
    b = segments(p);
  b.rows[1]!.period = {
    ...b.rows[1]!.period,
    kind: "quarter",
    label: { ar: "الربع الرابع الاصطناعي2025", en: "Synthetic Q42025" },
  };
  const h = figure(render(p));
  expect(h.includes('data-provenance="per-row"')).toBe(true);
  expect(h.includes("الربع الرابع الاصطناعي2025")).toBe(true);
  expect(h.includes("rounded-full bg-brand")).toBe(false);
});
test("different end dates must disable comparison bars and preserve periods", () => {
  const p = preview(),
    b = segments(p);
  b.rows[1]!.period = {
    ...b.rows[1]!.period,
    end: "2024-12-31",
    label: { ar: "السنة الاصطناعية2024", en: "Synthetic FY2024" },
  };
  const h = figure(render(p));
  expect(h.includes('data-provenance="per-row"')).toBe(true);
  expect(h.includes("السنة الاصطناعية2024")).toBe(true);
  expect(h.includes("rounded-full bg-brand")).toBe(false);
});
