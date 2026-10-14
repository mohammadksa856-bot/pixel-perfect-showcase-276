import { createServerFn } from "@tanstack/react-start";
import type { KnowledgeItem, LibraryState, ResearchItem } from "./library";

/**
 * WEB-05C: دوال الخادم للأبحاث والمعرفة، خلف WEB_V1_PREVIEW_ENABLED.
 * - وضع العينات المجمّدة: لا اتصال بأي خدمة، وحالة "غير متاح" صريحة (لا عينة موثقة للمحتوى).
 * - غير ذلك: المحتوى المنشور فقط من Supabase (published = true)، بمهلة، وحالة خطأ صريحة دون بديل.
 */
const TIMEOUT_MS = 5000;
const RESEARCH_COLUMNS =
  "slug, title, summary, author, author_role, reading_time, published_at, tags, sections, refs, sectors(slug, name)";
const KNOWLEDGE_COLUMNS = "slug, title, summary, category, level, reading_time, sections, videos";

async function guard<T>(load: () => Promise<LibraryState<T>>): Promise<LibraryState<T> | null> {
  const { webV1PreviewEnabled } = await import("./flag.functions");
  if (!webV1PreviewEnabled()) return null;
  const { designReviewFixturesEnabled } = await import("./design-review-policy");
  const { LIBRARY_COPY } = await import("./library");
  if (designReviewFixturesEnabled()) return { state: "unavailable", reason: LIBRARY_COPY.frozen };
  try {
    return await Promise.race([
      load(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)),
    ]);
  } catch {
    return { state: "error", reason: LIBRARY_COPY.error };
  }
}

async function researchRows() {
  const { supabase } = await import("@/integrations/supabase/client");
  const { normalizeResearch } = await import("./library");
  const { data, error } = await supabase
    .from("research")
    .select(RESEARCH_COLUMNS)
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeResearch).filter((x): x is ResearchItem => x !== null);
}

async function knowledgeRows() {
  const { supabase } = await import("@/integrations/supabase/client");
  const { normalizeKnowledge } = await import("./library");
  const { data, error } = await supabase
    .from("knowledge_articles")
    .select(KNOWLEDGE_COLUMNS)
    .eq("published", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map(normalizeKnowledge).filter((x): x is KnowledgeItem => x !== null);
}

const slugInput = (input: { slug: string }) => ({ slug: String(input?.slug ?? "").slice(0, 160) });

/** قائمة الأبحاث بلا نصوص الأقسام (لا تُرسل الأبحاث كاملة إلى صفحة الاستعراض). */
export const getResearchIndex = createServerFn({ method: "GET" }).handler(() =>
  guard(async () => ({
    state: "ok" as const,
    data: (await researchRows()).map((r) => ({ ...r, sections: [], references: [] })),
  })),
);

export const getResearchArticle = createServerFn({ method: "GET" })
  .validator(slugInput)
  .handler(({ data }) =>
    guard(async () => {
      const { relatedResearch } = await import("./library");
      const all = await researchRows();
      const item = all.find((r) => r.slug === data.slug);
      if (!item) return { state: "not_found" as const };
      const related = relatedResearch(item, all).map((r) => ({
        ...r,
        sections: [],
        references: [],
      }));
      return { state: "ok" as const, data: { item, related } };
    }),
  );

export const getKnowledgeIndex = createServerFn({ method: "GET" }).handler(() =>
  guard(async () => ({
    state: "ok" as const,
    data: (await knowledgeRows()).map((k) => ({ ...k, sections: [], videos: [] })),
  })),
);

export const getKnowledgeArticle = createServerFn({ method: "GET" })
  .validator(slugInput)
  .handler(({ data }) =>
    guard(async () => {
      const { relatedKnowledge } = await import("./library");
      const all = await knowledgeRows();
      const item = all.find((k) => k.slug === data.slug);
      if (!item) return { state: "not_found" as const };
      const related = relatedKnowledge(item, all).map((k) => ({ ...k, sections: [], videos: [] }));
      return { state: "ok" as const, data: { item, related } };
    }),
  );
