// MAREFA-WEB-V1 / WEB-05A: دليل الشركات والبحث الموحد (منطق خالص وعرض على الخادم).
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactElement } from "react";
import {
  facets,
  matchScore,
  normalize,
  PAGE_SIZE,
  queryText,
  queryDirectory,
  searchCatalog,
  type DirectoryEntry,
} from "../src/lib/web-v1/catalog";
import { LISTED_COMPANIES, LISTED_SOURCE } from "../src/lib/web-v1/listed-companies.data";
import { designReviewFixturesEnabled } from "../src/lib/web-v1/design-review-policy";
import { CompanyCard } from "../src/components/web-v1/company-card";
import { SearchResults } from "../src/components/web-v1/site-search";
import { I18nProvider } from "../src/lib/i18n";
import {
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";

// Link يحتاج سياق الموجّه: موجّه ذاكرة بمسار جذر فقط، يكفي لبناء الروابط في العرض على الخادم.
const router = createRouter({
  routeTree: createRootRoute(),
  history: createMemoryHistory({ initialEntries: ["/"] }),
});
const ssr = (el: ReactElement) =>
  renderToStaticMarkup(
    createElement(RouterContextProvider, { router }, createElement(I18nProvider, null, el)),
  );

// القائمة كما يبنيها الخادم، مع الشركات الثلاث التي لها صفحة من المحرك (هويتها من صفحات المحرك المجمّدة).
const ENGINE: Record<string, Partial<DirectoryEntry>> = {
  "2222": {
    name: { ar: "أرامكو السعودية", en: "Saudi Arabian Oil Company" },
    sector: "Energy",
    industry: "Integrated Oil & Gas",
  },
  "1120": { name: { ar: "الراجحي", en: "Al Rajhi Bank" }, sector: "Financials", industry: "Banks" },
  "8010": {
    name: { ar: "التعاونية", en: "The Company for Cooperative Insurance (Tawuniya)" },
    sector: "Financials",
    industry: "Insurance",
  },
};
const ENTRIES: DirectoryEntry[] = LISTED_COMPANIES.map(([symbol, ar, board]) => {
  const e = ENGINE[symbol];
  return {
    symbol,
    board,
    name: e?.name ?? { ar, en: null },
    sector: e?.sector ?? null,
    industry: e?.industry ?? null,
    dataStatus: e ? "engine_page" : "listed_only",
    readiness: e ? { investorTopics: "not_assessed", operationalCategories: "not_assessed" } : null,
    latestFiling: null,
  };
});

describe("listed companies source", () => {
  test("396 companies from the documented exchange list, fingerprint matches the repo file", () => {
    const raw = readFileSync(new URL(`../${LISTED_SOURCE.path}`, import.meta.url));
    expect(createHash("sha256").update(raw).digest("hex")).toBe(LISTED_SOURCE.sha256);
    expect(LISTED_COMPANIES).toHaveLength(396);
    const src = JSON.parse(raw.toString()) as Record<string, { name_ar: string; exchange: string }>;
    for (const [s, ar, board] of LISTED_COMPANIES) {
      expect(src[s]!.name_ar).toBe(ar);
      expect(board).toBe(src[s]!.exchange === "نمو" ? "nomu" : "main");
    }
  });

  test("identity only: no price, market cap or financial field anywhere in the module", () => {
    const text = readFileSync(
      new URL("../src/lib/web-v1/listed-companies.data.ts", import.meta.url),
      "utf8",
    );
    expect(text).not.toMatch(/price|market_?cap|revenue|سعر/i);
  });
});

describe("search normalisation and matching", () => {
  test("Arabic: hamza, alef maqsura, ta marbuta, diacritics and Arabic-Indic digits", () => {
    expect(normalize("أرامكو")).toBe(normalize("ارامكو"));
    expect(normalize("الإنماء")).toBe("الانماء");
    expect(normalize("مُعَادِن")).toBe("معادن");
    expect(normalize("١١٢٠")).toBe("1120");
    expect(normalize("التعاونية")).toBe(normalize("التعاونيه"));
  });

  test("ticker exact > ticker prefix > name; English names match case-insensitively", () => {
    const rajhi = ENTRIES.find((e) => e.symbol === "1120")!;
    expect(matchScore(rajhi, "1120")).toBe(100);
    expect(matchScore(rajhi, "11")).toBe(80);
    expect(matchScore(rajhi, "al rajhi")).toBeGreaterThan(0);
    expect(matchScore(rajhi, "RAJHI")).toBeGreaterThan(0);
    expect(matchScore(rajhi, "2222")).toBe(0);
  });

  test("results rank the exact ticker first", () => {
    expect(queryDirectory(ENTRIES, { q: "1120" }).items[0]!.symbol).toBe("1120");
    expect(queryDirectory(ENTRIES, { q: "١١٢٠" }).items[0]!.symbol).toBe("1120");
    expect(queryDirectory(ENTRIES, { q: "ارامكو" }).items[0]!.symbol).toBe("2222");
  });
});

describe("directory filters, sort and pagination", () => {
  test("market filter uses the exchange's own market field", () => {
    expect(queryDirectory(ENTRIES, { board: "main" }).total).toBe(270);
    expect(queryDirectory(ENTRIES, { board: "nomu" }).total).toBe(126);
  });

  test("sector filter only knows documented sectors; the rest are 'unclassified', never guessed", () => {
    const f = facets(ENTRIES);
    expect(f.sector).toEqual({ Energy: 1, Financials: 2, unclassified: 393 });
    expect(queryDirectory(ENTRIES, { sector: "Financials" }).items.map((e) => e.symbol)).toEqual([
      "1120",
      "8010",
    ]);
    expect(queryDirectory(ENTRIES, { sector: "unclassified" }).total).toBe(393);
  });

  test("data availability filter and combined filters", () => {
    expect(queryDirectory(ENTRIES, { data: "engine_page" }).items.map((e) => e.symbol)).toEqual([
      "1120",
      "2222",
      "8010",
    ]);
    expect(queryDirectory(ENTRIES, { data: "engine_page", board: "nomu" }).total).toBe(0);
  });

  test("pagination grows by page size and never exceeds the total", () => {
    const p1 = queryDirectory(ENTRIES, {});
    expect(p1.items).toHaveLength(PAGE_SIZE);
    expect(p1.pages).toBe(Math.ceil(396 / PAGE_SIZE));
    expect(queryDirectory(ENTRIES, { page: 2 }).items).toHaveLength(PAGE_SIZE * 2);
    expect(queryDirectory(ENTRIES, { page: 999 }).items).toHaveLength(396);
  });

  test("sort by ticker or by Arabic name", () => {
    const bySymbol = queryDirectory(ENTRIES, { page: 99 }).items.map((e) => e.symbol);
    expect(bySymbol).toEqual([...bySymbol].sort());
    const byName = queryDirectory(ENTRIES, { sort: "name", page: 99 }).items.map((e) => e.name.ar);
    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b, "ar")));
  });
});

describe("query text from the address", () => {
  test("numeric and string queries are both kept; anything else is empty", () => {
    expect(queryText(1120)).toBe("1120");
    expect(queryText("الراجحي")).toBe("الراجحي");
    expect(queryText({ a: 1 })).toBe("");
    expect(queryText("x".repeat(200))).toHaveLength(80);
  });
});

describe("unified search", () => {
  test("groups: companies and sectors from the directory; research and knowledge declared unavailable, not invented", () => {
    const r = searchCatalog(ENTRIES, "الراجحي");
    expect(r.groups.companies.state).toBe("results");
    expect(r.groups.research.state).toBe("unavailable");
    expect(r.groups.knowledge.state).toBe("unavailable");
    const fin = searchCatalog(ENTRIES, "financ");
    expect(fin.groups.sectors).toMatchObject({ state: "results" });
  });

  test("companies without a data page have no link", () => {
    const r = searchCatalog(ENTRIES, "الراجحي");
    if (r.groups.companies.state !== "results") throw new Error("expected results");
    const rajhi = r.groups.companies.items.find((i) => i.id === "1120")!;
    expect(rajhi.href).toBe("/preview/web-v1/companies/1120");
    expect(
      r.groups.companies.items.filter((i) => i.id !== "1120").every((i) => i.href === null),
    ).toBe(true);
  });

  test("states render: idle, loading, empty, error, results", () => {
    expect(ssr(createElement(SearchResults, { status: { state: "idle" } }))).toContain(
      'data-search-state="idle"',
    );
    expect(ssr(createElement(SearchResults, { status: { state: "loading" } }))).toContain(
      'role="status"',
    );
    expect(ssr(createElement(SearchResults, { status: { state: "error" } }))).toContain(
      'role="alert"',
    );
    const empty = searchCatalog(ENTRIES, "zzzzqqq");
    expect(
      ssr(createElement(SearchResults, { status: { state: "done", response: empty } })),
    ).toContain('data-search-state="empty"');
    const res = searchCatalog(ENTRIES, "2222");
    const html = ssr(createElement(SearchResults, { status: { state: "done", response: res } }));
    expect(html).toContain('data-search-state="results"');
    expect(html).toContain('data-group-state="unavailable"');
  });
});

describe("company card", () => {
  test("engine-page card links to the company template; listed-only card does not; no price or score", () => {
    const withPage = ssr(
      createElement(CompanyCard, { e: ENTRIES.find((e) => e.symbol === "2222")! }),
    );
    expect(withPage).toContain('href="/preview/web-v1/companies/2222?tab=business"');
    expect(withPage.match(/لم يُقيَّم/g)).toHaveLength(2);
    const listed = ssr(
      createElement(CompanyCard, { e: ENTRIES.find((e) => e.symbol === "1010")! }),
    );
    expect(listed).not.toContain("href=");
    expect(listed).toContain("غير مصنّف في المصدر");
    for (const html of [withPage, listed]) expect(html).not.toMatch(/ريال|SAR|\d+\.\d+ \/ 95/);
  });
});

describe("preview branch", () => {
  test("WEB-05A branch is allowed for frozen samples by exact name only", () => {
    const on = {
      MAREFA_DESIGN_FIXTURES: "true",
      VERCEL_ENV: "preview",
      WEB_V1_PREVIEW_ENABLED: "true",
      ENGINE_PREVIEW_ENABLED: "true",
    };
    expect(
      designReviewFixturesEnabled({ ...on, VERCEL_GIT_COMMIT_REF: "claude/web-05a-site-pages" }),
    ).toBe(true);
    expect(designReviewFixturesEnabled({ ...on, VERCEL_GIT_COMMIT_REF: "claude/web-05a" })).toBe(
      false,
    );
    expect(
      designReviewFixturesEnabled({
        ...on,
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_REF: "claude/web-05a-site-pages",
      }),
    ).toBe(false);
  });
});
