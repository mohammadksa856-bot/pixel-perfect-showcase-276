// WEB-05C reader acceptance fixes (Codex review at 6d696b9): two defects.
//  1) table rows whose cell count differs from the header were silently cut or padded;
//  2) impossible dates such as 2026-02-31 were accepted (Date.parse rolls them over).
// Written before the fix and run on the base (dc2ac11) to prove both defects; see the BR-025 report.
// All rows are synthetic test fixtures (example.com, placeholder numbers).
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactElement } from "react";
import {
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import {
  normalizeKnowledge,
  normalizeResearch,
  parseBody,
  queryResearch,
  RESEARCH_DEFAULTS,
} from "../src/lib/web-v1/library";
import { ArticleSections } from "../src/components/web-v1/library-parts";
import { ResearchCard } from "../src/components/web-v1/library-cards";
import { I18nProvider } from "../src/lib/i18n";

const router = createRouter({
  routeTree: createRootRoute(),
  history: createMemoryHistory({ initialEntries: ["/"] }),
});
const ssr = (el: ReactElement) =>
  renderToStaticMarkup(
    createElement(RouterContextProvider, { router }, createElement(I18nProvider, null, el)),
  );
const T = (ar: string | null, en: string | null) => ({ ar, en });
const tables = (text: string) => parseBody(text).filter((b) => b.type === "table");
const section = (body: string) => [
  { id: "s-1", heading: T("قسم", "Section"), body: T(body, body) },
];

const LONG = "| البند | 2024 | 2025 |\n|---|---|---|\n| الإيرادات | 100 | 120 | 999 |";
const SHORT = "| Item | 2024 | 2025 |\n|---|---|---|\n| Revenue | 100 |";

describe("1. a row that does not match the header is never cut, padded or shown as a sound table", () => {
  test("row longer than the header: no table; every cell (999) kept", () => {
    expect(tables(LONG)).toEqual([]);
    expect(JSON.stringify(parseBody(LONG))).toContain("999");
  });

  test("row shorter than the header: no table; no empty cell invented", () => {
    expect(tables(SHORT)).toEqual([]);
    expect(JSON.stringify(parseBody(SHORT))).toContain("| Revenue | 100 |");
  });

  test("the original text is kept whole, in order, unchanged (signs, Arabic and Latin digits)", () => {
    const src = "| البند | ٢٠٢٤ | 2025 |\n|---|---|---|\n| صافي الربح | (١٢٫٥) | -3.4% | +7 |";
    const html = ssr(createElement(ArticleSections, { sections: section(src) }));
    for (const line of src.split("\n")) expect(html).toContain(line);
    expect(html).toContain("data-table-mismatch");
  });

  test("the warning says the structure does not match, in the reader for research and knowledge alike", () => {
    const html = ssr(createElement(ArticleSections, { sections: section(LONG) }));
    expect(html).toContain("data-table-mismatch");
    expect(html).not.toContain("data-article-table");
    // knowledge sections go through the same normaliser and reader
    const k = normalizeKnowledge({
      slug: "k",
      title: T("موضوع", "Topic"),
      sections: [{ heading: T("مثال", "Example"), body: T(SHORT, SHORT) }],
    })!;
    expect(ssr(createElement(ArticleSections, { sections: k.sections }))).toContain(
      "data-table-mismatch",
    );
  });

  test("untrusted HTML inside a mismatched table is shown as text, never executed or linked", () => {
    const src = '| a | b |\n| <script>alert(1)</script> | <a href="javascript:x">x</a> | extra |';
    const html = ssr(createElement(ArticleSections, { sections: section(src) }));
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript');
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  test("consistent tables still work: empty cells kept as empty, widths equal, separator optional", () => {
    expect(tables("| a | b | c |\n|---|---|---|\n| 1 |  | 3 |")).toEqual([
      { type: "table", header: ["a", "b", "c"], rows: [["1", "", "3"]] },
    ]);
    expect(tables("| a | b |\n| 1 | 2 |\n| 3 | 4 |")).toEqual([
      {
        type: "table",
        header: ["a", "b"],
        rows: [
          ["1", "2"],
          ["3", "4"],
        ],
      },
    ]);
    const html = ssr(
      createElement(ArticleSections, { sections: section("| a | b |\n|---|---|\n| 1 | 2 |") }),
    );
    expect(html).toContain("data-article-table");
    expect(html).not.toContain("data-table-mismatch");
  });
});

describe("2. impossible dates are rejected, not rolled over", () => {
  const at = (published_at: unknown) =>
    normalizeResearch({ slug: "r", title: T("بحث", "Research"), published_at })!;

  test("2026-02-31 and 2025-02-29 are rejected; 2024-02-29 is accepted", () => {
    expect(at("2026-02-31").publishedAt).toBeNull();
    expect(at("2026-02-31T00:00:00Z").publishedAt).toBeNull();
    expect(at("2025-02-29").publishedAt).toBeNull();
    expect(at("2024-02-29").publishedAt).toBe("2024-02-29");
    expect(at("2026-09-01T00:00:00+00:00").publishedAt).toBe("2026-09-01");
  });

  test("other impossible parts: month 13, day 00, month 00, April 31", () => {
    for (const d of ["2026-13-01", "2026-01-00", "2026-00-10", "2026-04-31"])
      expect(at(d).publishedAt, d).toBeNull();
  });

  test("missing stays missing; invalid is recorded as invalid (not as a date)", () => {
    expect(at(undefined)).toMatchObject({ publishedAt: null, dateStatus: "missing" });
    expect(at("2026-02-31")).toMatchObject({ publishedAt: null, dateStatus: "invalid" });
    expect(at("2024-02-29")).toMatchObject({ publishedAt: "2024-02-29", dateStatus: "valid" });
  });

  test("an invalid date sorts like an undated item, never as a date", () => {
    const items = [
      normalizeResearch({ slug: "bad", title: T("أ", "A"), published_at: "2026-02-31" })!,
      normalizeResearch({ slug: "ok", title: T("ب", "B"), published_at: "2026-03-01" })!,
    ];
    expect(queryResearch(items, RESEARCH_DEFAULTS).map((r) => r.slug)).toEqual(["ok", "bad"]);
    expect(
      queryResearch(items, { ...RESEARCH_DEFAULTS, sort: "oldest" }).map((r) => r.slug),
    ).toEqual(["ok", "bad"]);
  });

  test("the card says the source date is invalid and shows no date", () => {
    const html = ssr(
      createElement(ResearchCard, {
        r: normalizeResearch({ slug: "bad", title: T("أ", "A"), published_at: "2026-02-31" })!,
      }),
    );
    expect(html).not.toContain("<time");
    expect(html).not.toContain("2026-02-31");
    expect(html).not.toContain("2026-03-03");
    expect(html).toContain('data-date-state="invalid"');
  });
});
