import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ExternalLink, Languages, PlayCircle } from "lucide-react";
import { getKnowledgeArticle } from "@/lib/web-v1/library.functions";
import {
  hasText,
  keyOf,
  KNOWLEDGE_DEFAULTS,
  languageCoverage,
  type KnowledgeItem,
} from "@/lib/web-v1/library";
import { useI18n } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { PreviewContainer, WebV1Shell } from "@/components/web-v1/shell";
import { Breadcrumbs, PageHeader } from "@/components/web-v1/market-parts";
import { KnowledgeCard } from "@/components/web-v1/library-cards";
import {
  ArticleSections,
  ArticleSkeleton,
  L,
  LibraryStateView,
  Meta,
  ReadingTime,
  Toc,
  useLang,
} from "@/components/web-v1/library-parts";

/**
 * WEB-05C: صفحة موضوع المعرفة: قراءة بجدول محتويات، والمقاطع المرئية المذكورة في المصدر، وموضوعات ذات صلة
 * (نفس التصنيف كما ورد)، ورجوع إلى التصنيف في الدليل.
 */
export const Route = createFileRoute("/preview/web-v1/knowledge/$slug")({
  loader: async ({ params }) => {
    const r = await getKnowledgeArticle({ data: { slug: params.slug } });
    if (!r) throw notFound();
    return r;
  },
  pendingComponent: () => (
    <WebV1Shell>
      <PreviewContainer className="max-w-3xl py-12">
        <ArticleSkeleton />
      </PreviewContainer>
    </WebV1Shell>
  ),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${
          loaderData?.state === "ok"
            ? (loaderData.data.item.title.ar ?? loaderData.data.item.title.en)
            : "المعرفة"
        } | معرفة استثمار`,
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: KnowledgePage,
});

const CRUMBS = [
  { label: { ar: "الرئيسية", en: "Home" }, to: "/preview/web-v1" },
  { label: { ar: "مكتبة المعرفة", en: "Knowledge library" }, to: "/preview/web-v1/knowledge" },
];

function KnowledgePage() {
  const result = Route.useLoaderData();
  const { t } = useI18n();
  if (result.state !== "ok")
    return (
      <WebV1Shell>
        <PageHeader
          crumbs={[...CRUMBS, { label: { ar: "موضوع", en: "Topic" } }]}
          title={t({ ar: "مكتبة المعرفة", en: "Knowledge library" })}
        />
        <PreviewContainer className="py-10">
          {result.state === "not_found" ? (
            <LibraryStateView kind="not_found" />
          ) : (
            <LibraryStateView kind={result.state} reason={result.reason} />
          )}
          <Link
            to="/preview/web-v1/knowledge"
            search={KNOWLEDGE_DEFAULTS}
            className="mt-5 inline-block text-[13px] text-brand hover:underline"
          >
            {t({ ar: "كل الموضوعات", en: "All topics" })}
          </Link>
        </PreviewContainer>
      </WebV1Shell>
    );
  return <Topic item={result.data.item} related={result.data.related} />;
}

function Topic({ item, related }: { item: KnowledgeItem; related: KnowledgeItem[] }) {
  const { t } = useI18n();
  const lang = useLang();
  const cov = languageCoverage(item, lang);
  const crumb = item.title[lang] ?? item.title.ar ?? item.title.en ?? "";
  const category = hasText(item.category) ? keyOf(item.category) : null;
  return (
    <WebV1Shell>
      <section className="night-panel border-b border-border/40">
        <PreviewContainer className="py-8 sm:py-12">
          <Breadcrumbs items={[...CRUMBS, { label: { ar: crumb, en: crumb } }]} />
          <div className="mt-5 max-w-3xl">
            {category && (
              <Link
                to="/preview/web-v1/knowledge"
                search={{ ...KNOWLEDGE_DEFAULTS, category }}
                className="text-[12px] font-semibold text-brand hover:underline"
                data-category-link={category}
              >
                <L t={item.category} />
              </Link>
            )}
            <L
              t={item.title}
              as="h1"
              className="mt-2 block text-2xl font-bold leading-[1.4] sm:text-4xl"
            />
            <L
              t={item.summary}
              as="p"
              className="mt-4 block text-[15px] leading-8 text-night-foreground/75 sm:text-[17px]"
            />
            <div className="mt-5 text-night-foreground/70">
              <Meta
                items={[
                  hasText(item.level) && <L key="l" t={item.level} />,
                  item.readingTime && <ReadingTime key="r" minutes={item.readingTime} />,
                ]}
              />
            </div>
          </div>
        </PreviewContainer>
      </section>

      <PreviewContainer className="py-8 sm:py-10">
        {!cov.complete && (
          <p
            className="mb-6 flex items-start gap-2 rounded-xl border border-status-warn/40 bg-status-warn/5 px-4 py-3 text-[13px]"
            data-language-coverage={`${cov.total - cov.missing}/${cov.total}`}
          >
            <Languages className="mt-0.5 size-4 shrink-0 text-status-warn" />
            {t({
              ar: `${iso(cov.missing)} من ${iso(cov.total)} أجزاء غير متوفرة بالعربية في المصدر؛ تُعرض بلغتها الأصلية دون ترجمة آلية.`,
              en: `${cov.missing} of ${cov.total} parts are not available in English in the source; they are shown in their original language without machine translation.`,
            })}
          </p>
        )}
        <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] xl:gap-12">
          <aside className="min-w-0">
            <Toc
              sections={item.sections}
              extra={
                item.videos.length
                  ? [{ id: "videos", label: { ar: "مقاطع مرئية", en: "Videos" } }]
                  : []
              }
            />
          </aside>
          <article className="min-w-0 max-w-3xl" data-article>
            {item.sections.length ? (
              <ArticleSections sections={item.sections} />
            ) : (
              <LibraryStateView
                kind="empty"
                title={{
                  ar: "لا أقسام لهذا الموضوع في المصدر",
                  en: "This topic has no sections in the source",
                }}
              />
            )}
            {item.videos.length > 0 && (
              <section id="videos" className="mt-12 scroll-mt-24" data-videos>
                <h2 className="text-lg font-bold">{t({ ar: "مقاطع مرئية", en: "Videos" })}</h2>
                <ul className="mt-4 space-y-2">
                  {item.videos.map((v, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-[13px]"
                      data-video={i}
                    >
                      <PlayCircle className="size-5 shrink-0 text-brand" />
                      <L t={v.title} className="min-w-0 flex-1" />
                      {v.duration && (
                        <span className="num text-[12px] text-muted-foreground" dir="ltr">
                          {v.duration}
                        </span>
                      )}
                      {v.url ? (
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-brand"
                          aria-label={t({ ar: "فتح المقطع", en: "Open video" })}
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-muted-foreground" data-video-no-link>
                          {t({ ar: "بلا رابط في المصدر", en: "No link in source" })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>
        </div>

        <section className="mt-14" data-related>
          <h2 className="mb-4 text-lg font-bold">
            {t({ ar: "موضوعات ذات صلة", en: "Related topics" })}
            {hasText(item.category) && (
              <span className="ms-2 text-[13px] font-normal text-muted-foreground">
                (<L t={item.category} />)
              </span>
            )}
          </h2>
          {related.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {related.map((k) => (
                <li key={k.slug}>
                  <KnowledgeCard k={k} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted-foreground" data-related-empty>
              {t({
                ar: "لا موضوعات أخرى في التصنيف نفسه.",
                en: "No other topics in the same category.",
              })}
            </p>
          )}
        </section>
      </PreviewContainer>
    </WebV1Shell>
  );
}
