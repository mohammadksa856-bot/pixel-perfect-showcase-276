import { createServerFn } from "@tanstack/react-start";
import type { DirectoryEntry, SearchResponse } from "./catalog";

/**
 * WEB-05A: دوال الخادم لدليل الشركات والبحث الموحد. كلها خلف WEB_V1_PREVIEW_ENABLED.
 * - الدليل: قائمة الشركات المدرجة (هوية فقط) + ما يتوفر له صفحة بيانات من المحرك (المصدر نفسه لقالب الشركة).
 * - البحث: في وضع العينات المجمّدة لا يتصل بأي خدمة؛ في غيره يستعمل بحث الموقع القائم للأبحاث والمعرفة.
 */

async function buildDirectory(): Promise<DirectoryEntry[]> {
  const { LISTED_COMPANIES } = await import("./listed-companies.data");
  const { PREVIEW_COMPANIES } = await import("../engine/company-preview.functions");
  const { fetchCompanyPreview } = await import("../engine/company-preview.server");
  const pages = new Map<string, Awaited<ReturnType<typeof fetchCompanyPreview>> | null>(
    await Promise.all(
      PREVIEW_COMPANIES.map(
        async (c) =>
          [
            c.symbol,
            await fetchCompanyPreview({ market: "SA", symbol: c.symbol }).catch(() => null),
          ] as const,
      ),
    ),
  );
  return LISTED_COMPANIES.map(([symbol, nameAr, board]): DirectoryEntry => {
    const r = pages.get(symbol);
    if (r?.state === "ok") {
      const p = r.preview;
      return {
        symbol,
        board,
        name: { ar: nameAr, en: p.company.name.en },
        sector: p.company.sector,
        industry: p.company.industry,
        dataStatus: "engine_page",
        readiness: {
          investorTopics: p.readiness.investorTopics.state,
          operationalCategories: p.readiness.operationalCategories.state,
        },
        latestFiling: p.company.latestFiling,
      };
    }
    return {
      symbol,
      board,
      name: { ar: nameAr, en: null },
      sector: null,
      industry: null,
      dataStatus: "listed_only",
      readiness: null,
      latestFiling: null,
    };
  });
}

export const getDirectory = createServerFn({ method: "GET" }).handler(async () => {
  const { webV1PreviewEnabled } = await import("./flag.functions");
  if (!webV1PreviewEnabled()) return null;
  const { LISTED_SOURCE } = await import("./listed-companies.data");
  return { entries: await buildDirectory(), source: LISTED_SOURCE };
});

const TIMEOUT_MS = 4000;

export const searchSite = createServerFn({ method: "GET" })
  .validator((input: { q: string }) => {
    const q = String(input?.q ?? "").slice(0, 80);
    return { q };
  })
  .handler(async ({ data }): Promise<SearchResponse | null> => {
    const { webV1PreviewEnabled } = await import("./flag.functions");
    if (!webV1PreviewEnabled()) return null;
    const { searchCatalog } = await import("./catalog");
    const { designReviewFixturesEnabled } = await import("./design-review-policy");
    const base = searchCatalog(await buildDirectory(), data.q);
    if (designReviewFixturesEnabled() || !data.q.trim()) return base;

    // وضع المحتوى الحي: الأبحاث والمعرفة والقطاعات من بحث الموقع القائم، بمهلة وحالة خطأ صريحة.
    try {
      const { search } = await import("../content");
      const results = await Promise.race([
        search(data.q),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS),
        ),
      ]);
      // path = null: لا صفحة معاينة لهذا النوع، فتُعرض النتيجة بلا رابط (لا خروج إلى صفحة قديمة).
      const pick = (type: "sector" | "research" | "knowledge", path: string | null) => {
        const items = results
          .filter((r) => r.type === type)
          .map((r) => ({
            id: r.slug,
            title: r.title,
            subtitle: r.subtitle,
            href: path ? `${path}/${r.slug}` : null,
            badge: null,
          }));
        return items.length ? { state: "results" as const, items } : { state: "empty" as const };
      };
      // قطاعات محتوى الموقع ليست تصنيف المحرك في صفحات القطاعات بالمعاينة.
      const liveSectors = pick("sector", null);
      return {
        ...base,
        source: "live_content",
        groups: {
          ...base.groups,
          sectors: base.groups.sectors.state === "results" ? base.groups.sectors : liveSectors,
          research: pick("research", "/preview/web-v1/research"),
          knowledge: pick("knowledge", "/preview/web-v1/knowledge"),
        },
      };
    } catch {
      const error = {
        state: "error" as const,
        reason: {
          ar: "تعذّر الوصول إلى محتوى الموقع الآن. نتائج الشركات أعلاه من الدليل وما زالت صالحة.",
          en: "The site content could not be reached right now. The company results above come from the directory and remain valid.",
        },
      };
      return { ...base, groups: { ...base.groups, research: error, knowledge: error } };
    }
  });

/** ملخص قائمة الشركات المدرجة للواجهة الرئيسية: العدد لكل سوق ومصدر القائمة. لا أسعار ولا أرقام مالية. */
export const getListedSummary = createServerFn({ method: "GET" }).handler(async () => {
  const { webV1PreviewEnabled } = await import("./flag.functions");
  if (!webV1PreviewEnabled()) return null;
  const { LISTED_COMPANIES, LISTED_SOURCE } = await import("./listed-companies.data");
  const { PREVIEW_COMPANIES } = await import("../engine/company-preview.functions");
  return {
    total: LISTED_COMPANIES.length,
    main: LISTED_COMPANIES.filter((c) => c[2] === "main").length,
    nomu: LISTED_COMPANIES.filter((c) => c[2] === "nomu").length,
    withPages: PREVIEW_COMPANIES.length,
    source: LISTED_SOURCE,
  };
});
