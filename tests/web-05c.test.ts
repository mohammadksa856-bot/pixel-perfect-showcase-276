// WEB-05C: الأبحاث ومكتبة المعرفة. منطق خالص + عرض على الخادم + حراسة من محتوى مختلق.
// كل الصفوف هنا اصطناعية للاختبار فقط (عناوين "اختبار"، مصادر example.com).
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactElement } from "react";
import {
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import {
  isNumericCell,
  keyOf,
  knowledgeGroups,
  languageCoverage,
  normalizeKnowledge,
  normalizeResearch,
  parseBody,
  pick,
  queryKnowledge,
  queryResearch,
  references,
  relatedKnowledge,
  relatedResearch,
  RESEARCH_DEFAULTS,
  KNOWLEDGE_DEFAULTS,
  safeUrl,
  type KnowledgeItem,
  type ResearchItem,
} from "../src/lib/web-v1/library";
import {
  ArticleSections,
  LibraryStateView,
  ReferencesList,
} from "../src/components/web-v1/library-parts";
import { I18nProvider } from "../src/lib/i18n";

const T = (ar: string | null, en: string | null) => ({ ar, en });
const R = (slug: string, o: Record<string, unknown> = {}) =>
  normalizeResearch({
    slug,
    title: T(`بحث اختبار ${slug}`, `Test research ${slug}`),
    summary: T("ملخص", "Summary"),
    published_at: "2026-01-01T00:00:00Z",
    tags: [],
    sections: [],
    refs: [],
    ...o,
  })!;
const K = (slug: string, category: unknown, level: unknown = null) =>
  normalizeKnowledge({
    slug,
    title: T(`موضوع ${slug}`, `Topic ${slug}`),
    category,
    level,
    sections: [],
  })!;

describe("normalisation never invents fields", () => {
  test("missing author/date/reading time stay missing; invalid date dropped", () => {
    const r = normalizeResearch({
      slug: "a",
      title: T("عنوان", null),
      published_at: "not a date",
      reading_time: 0,
    })!;
    expect(r.author).toEqual({ ar: null, en: null });
    expect(r.publishedAt).toBeNull();
    expect(r.readingTime).toBeNull();
    expect(r.sectorSlug).toBeNull();
    expect(r.references).toEqual([]);
  });

  test("rows without slug or title are dropped", () => {
    expect(normalizeResearch({ title: T("x", "x") })).toBeNull();
    expect(normalizeResearch({ slug: "x", title: {} })).toBeNull();
    expect(normalizeKnowledge(null)).toBeNull();
  });

  test("wrong shapes (arrays/strings/null) do not crash", () => {
    const r = normalizeResearch({
      slug: "x",
      title: "عنوان نصي",
      tags: "x",
      sections: {},
      refs: null,
      sectors: [],
    })!;
    expect(r.title.ar).toBe("عنوان نصي");
    expect([r.tags, r.sections, r.references]).toEqual([[], [], []]);
  });

  test("section anchors are unique and safe", () => {
    const r = R("s", {
      sections: [
        { id: "x y", heading: T("أ", "A"), body: T("ب", "B") },
        { id: "x y", heading: T("ج", "C"), body: T("د", "D") },
        { heading: T("هـ", null), body: T(null, null) },
        { heading: T(null, null), body: T(null, null) },
      ],
    });
    const ids = r.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((i) => /^s-[a-z0-9؀-ۿ_-]+$/.test(i))).toBe(true);
    expect(r.sections).toHaveLength(3);
  });
});

describe("references and links", () => {
  test("only http(s) URLs become links; javascript:/credentials never do", () => {
    const refs = references([
      "https://example.com/a",
      "مرجع — https://example.com/b).",
      "javascript:alert(1)",
      "https://user:pw@example.com/x",
      "نص بلا رابط",
      "",
    ]);
    expect(refs.map((r) => r.url)).toEqual([
      "https://example.com/a",
      "https://example.com/b",
      null,
      null,
      null,
    ]);
    expect(safeUrl("data:text/html,x")).toBeNull();
  });

  test("references list renders unsafe entries as text, and an explicit empty state", () => {
    const html = ssr(createElement(ReferencesList, { refs: references(["javascript:alert(1)"]) }));
    expect(html).not.toContain('href="javascript');
    expect(html).toContain("javascript:alert(1)");
    expect(ssr(createElement(ReferencesList, { refs: [] }))).toContain("data-references-empty");
  });
});

describe("body parsing: paragraphs, lists, tables, quotes — no HTML", () => {
  test("plain text stays paragraphs", () => {
    expect(parseBody("سطر أول\nسطر ثان\n\nفقرة ثانية")).toEqual([
      { type: "p", text: "سطر أول سطر ثان" },
      { type: "p", text: "فقرة ثانية" },
    ]);
  });

  // WEB-05C reader fixes: this test used to assert that a short row is padded with "" — the defect
  // Codex found. A row that does not match the header now yields the original text, not a table.
  test("pipe table with separator; a short row is not padded: original text kept (WEB-05C fix)", () => {
    const b = parseBody("قبل\n| أ | ب | ج |\n|---|---|---|\n| 1 | 2 |\n| 3 | 4 | 5 |\nبعد");
    expect(b[1]).toEqual({
      type: "table_mismatch",
      text: "| أ | ب | ج |\n|---|---|---|\n| 1 | 2 |\n| 3 | 4 | 5 |",
      header: 3,
      widths: [3, 3, 2, 3],
    });
    expect(b.map((x) => x.type)).toEqual(["p", "table_mismatch", "p"]);
  });

  test("lists, subheading, quote", () => {
    const b = parseBody("- أ\n- ب\n\n1. أول\n2) ثان\n\n### عنوان\n> اقتباس");
    expect(b).toEqual([
      { type: "list", ordered: false, items: ["أ", "ب"] },
      { type: "list", ordered: true, items: ["أول", "ثان"] },
      { type: "h", text: "عنوان" },
      { type: "quote", text: "اقتباس" },
    ]);
  });

  test("HTML in content is rendered as text, never as markup", () => {
    const html = ssr(
      createElement(ArticleSections, {
        sections: [
          {
            id: "s-1",
            heading: T("قسم", "Section"),
            body: T("<script>x()</script><b>b</b>", null),
          },
        ],
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("numeric cells detected for alignment only", () => {
    expect(["1,000", "-10%", "(5.2)", "١٢٠"].every(isNumericCell)).toBe(true);
    expect(["البند", "Q1 2025", ""].some(isNumericCell)).toBe(false);
  });
});

describe("language: no machine translation", () => {
  test("pick falls back to the other language and flags it", () => {
    expect(pick(T("عربي", null), "en")).toEqual({ value: "عربي", lang: "ar", fallback: true });
    expect(pick(T(null, null), "ar")).toEqual({ value: null, lang: null, fallback: false });
  });

  test("coverage counts parts missing in the UI language", () => {
    const r = R("c", {
      title: T("عنوان", "Title"),
      sections: [
        { heading: T("أ", "A"), body: T("ب", "B") },
        { heading: T("ج", null), body: T("د", null) },
      ],
    });
    expect(languageCoverage(r, "en")).toEqual({ complete: false, missing: 2, total: 5 });
    expect(languageCoverage(r, "ar").complete).toBe(true);
  });

  test("a section in the other language shows the fallback notice", () => {
    const html = ssr(
      createElement(ArticleSections, {
        sections: [{ id: "s-1", heading: T(null, "Section"), body: T(null, "English only") }],
      }),
    );
    // الواجهة عربية (افتراضي العرض على الخادم): القسم الإنجليزي يُعلَن ويبقى بلغته واتجاهه.
    expect(html).toContain("data-lang-fallback");
    expect(html).toContain('lang="en" dir="ltr"');
  });
});

describe("search, filters, related — documented fields only", () => {
  const items: ResearchItem[] = [
    R("a", {
      published_at: "2026-03-01",
      tags: [T("وسم", "Tag")],
      sectors: { slug: "s1", name: T("ق١", "S1") },
    }),
    R("b", { published_at: "2026-01-01", sectors: { slug: "s1", name: T("ق١", "S1") } }),
    R("c", { published_at: null, tags: [T("وسم", "Tag")] }),
    R("d", { published_at: "2026-02-01", sectors: { slug: "s2", name: T("ق٢", "S2") } }),
  ];

  test("sort by date; undated always last", () => {
    expect(queryResearch(items, RESEARCH_DEFAULTS).map((r) => r.slug)).toEqual([
      "a",
      "d",
      "b",
      "c",
    ]);
    expect(
      queryResearch(items, { ...RESEARCH_DEFAULTS, sort: "oldest" }).map((r) => r.slug),
    ).toEqual(["b", "d", "a", "c"]);
  });

  test("filter by sector, tag, text (Arabic normalised)", () => {
    expect(queryResearch(items, { ...RESEARCH_DEFAULTS, sector: "s1" })).toHaveLength(2);
    expect(
      queryResearch(items, { ...RESEARCH_DEFAULTS, tag: keyOf(T("وسم", "Tag")) }).map(
        (r) => r.slug,
      ),
    ).toEqual(["a", "c"]);
    expect(queryResearch(items, { ...RESEARCH_DEFAULTS, q: "اختبار d" })[0]!.slug).toBe("d");
  });

  test("related research = same sector or shared tag, never arbitrary", () => {
    expect(relatedResearch(items[0]!, items).map((r) => r.slug)).toEqual(["b", "c"]);
    expect(relatedResearch(items[3]!, items)).toEqual([]);
  });

  test("knowledge: groups by source category; related = same category only", () => {
    const ks: KnowledgeItem[] = [
      K("1", T("أ", "A"), T("مبتدئ", "Beginner")),
      K("2", T("أ", "A")),
      K("3", T("ب", "B")),
      K("4", null),
    ];
    expect(knowledgeGroups(ks).map((g) => [g.key, g.items.length])).toEqual([
      ["a", 2],
      ["b", 1],
      ["uncategorized", 1],
    ]);
    expect(relatedKnowledge(ks[0]!, ks).map((k) => k.slug)).toEqual(["2"]);
    expect(relatedKnowledge(ks[3]!, ks)).toEqual([]);
    expect(
      queryKnowledge(ks, { ...KNOWLEDGE_DEFAULTS, level: "beginner" }).map((k) => k.slug),
    ).toEqual(["1"]);
  });
});

describe("states and guards", () => {
  test("state views: unavailable/error/empty/not_found are distinct and announced", () => {
    for (const kind of ["unavailable", "error", "empty", "not_found"] as const) {
      const html = ssr(createElement(LibraryStateView, { kind }));
      expect(html).toContain(`data-library-state="${kind}"`);
    }
    expect(ssr(createElement(LibraryStateView, { kind: "error" }))).toContain('role="alert"');
  });

  test("server functions: frozen mode never calls Supabase; only published rows are read", () => {
    const src = readFileSync(
      new URL("../src/lib/web-v1/library.functions.ts", import.meta.url),
      "utf8",
    );
    expect(src).toMatch(/designReviewFixturesEnabled\(\)\) return \{ state: "unavailable"/);
    expect(src.match(/\.eq\("published", true\)/g)).toHaveLength(2);
  });

  test("no seed/mock content is imported by the new pages", () => {
    const files = [
      "src/lib/web-v1/library.ts",
      "src/lib/web-v1/library.functions.ts",
      "src/components/web-v1/library-parts.tsx",
      "src/components/web-v1/library-cards.tsx",
      "src/routes/preview.web-v1.research.index.tsx",
      "src/routes/preview.web-v1.research.$slug.tsx",
      "src/routes/preview.web-v1.knowledge.index.tsx",
      "src/routes/preview.web-v1.knowledge.$slug.tsx",
    ];
    for (const f of files) {
      const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
      expect(src, f).not.toMatch(
        /@\/data\/content|web_05c_mock|synthetic-research|dangerouslySetInnerHTML/,
      );
    }
  });
});

const router = createRouter({
  routeTree: createRootRoute(),
  history: createMemoryHistory({ initialEntries: ["/"] }),
});
function ssr(el: ReactElement) {
  return renderToStaticMarkup(
    createElement(RouterContextProvider, { router }, createElement(I18nProvider, null, el)),
  );
}
