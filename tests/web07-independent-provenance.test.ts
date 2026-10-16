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
const html = (p: ReturnType<typeof preview>) =>
  renderToStaticMarkup(
    createElement(
      RouterContextProvider,
      { router },
      createElement(I18nProvider, null, createElement(CompanyOverview, { p })),
    ),
  );
test("each ownership number keeps its own source, not the first holder source", () => {
  const p = preview();
  const block = p.topics.flatMap((t) => t.blocks).find((b) => b.type === "ownership");
  if (!block || block.type !== "ownership" || block.rows.length < 2)
    throw Error("fixture missing ownership");
  block.rows[1]!.sourceUrl = "https://example.org/synthetic-holder-second.pdf";
  block.rows[1]!.asOf = "2024-12-31";
  const result = html(p);
  expect(result).toContain(block.rows[1]!.holder);
  expect(result.includes("https://example.org/synthetic-holder-second.pdf")).toBe(true);
  expect(result).toContain("2024-12-31");
});
test("each revenue segment preserves source and period, not first-row metadata", () => {
  const p = preview();
  const block = p.topics.flatMap((t) => t.blocks).find((b) => b.type === "segments");
  if (!block || block.type !== "segments" || block.rows.length < 2)
    throw Error("fixture missing segments");
  block.rows[1]!.proof.sourceUrl = "https://example.org/synthetic-segment-second.pdf";
  block.rows[1]!.period = {
    ...block.rows[1]!.period,
    end: "2024-12-31",
    label: { ar: "سنة اصطناعية2024", en: "Synthetic FY2024" },
  };
  const result = html(p);
  expect(result).toContain(block.rows[1]!.segment);
  expect(result.includes("https://example.org/synthetic-segment-second.pdf")).toBe(true);
  expect(result).toContain("2024");
});
test("empty returns/ownership card explains missing data instead of title-only content", () => {
  const p = preview();
  for (const t of p.topics) if (t.ordinal === 4 || t.ordinal === 9) t.blocks = [];
  const result = html(p);
  const card =
    result.match(/<section[^>]*data-overview-card="shareholders"[\s\S]*?<\/section>/)?.[0] || "";
  expect(card.length > 0).toBe(true);
  expect(/لا .*بيانات|غير متوفر|No .*data|not available/i.test(card)).toBe(true);
});
