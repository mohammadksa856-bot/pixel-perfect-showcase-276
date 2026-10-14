import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Building2, Languages, Layers, Tag } from "lucide-react";
import { getResearchArticle } from "@/lib/web-v1/library.functions";
import {
  hasText,
  keyOf,
  languageCoverage,
  LIBRARY_COPY,
  RESEARCH_DEFAULTS,
  type ResearchItem,
} from "@/lib/web-v1/library";
import { useI18n, type LocalizedText } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { PreviewContainer, WebV1Shell } from "@/components/web-v1/shell";
import { Breadcrumbs, PageHeader } from "@/components/web-v1/market-parts";
import { ResearchCard } from "@/components/web-v1/library-cards";
import {
  ArticleSections,
  ArticleSkeleton,
  DateText,
  L,
  LibraryStateView,
  Meta,
  ReadingTime,
  ReferencesList,
  Toc,
  useLang,
} from "@/components/web-v1/library-parts";

/**
 * WEB-05C: صفحة البحث التفصيلي: رأس بالبيانات الوصفية كما في المصدر، وجدول محتويات ثابت، وأقسام طويلة
 * بجداول ومراجع، وأبحاث ذات صلة (نفس القطاع أو وسم مشترك). لا ربط بشركة دون حقل موثق.
 */
export const Route = createFileRoute("/preview/web-v1/research/$slug")({
  loader: async ({ params }) => {
    const r = await getResearchArticle({ data: { slug: params.slug } });
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
            : "بحث"
        } | معرفة استثمار`,
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResearchPage,
});

const CRUMBS = [
  { label: { ar: "الرئيسية", en: "Home" }, to: "/preview/web-v1" },
  { label: { ar: "الأبحاث", en: "Research" }, to: "/preview/web-v1/research" },
];

function ResearchPage() {
  const result = Route.useLoaderData();
  const { t } = useI18n();
  if (result.state !== "ok")
    return (
      <WebV1Shell>
        <PageHeader
          crumbs={[...CRUMBS, { label: { ar: "بحث", en: "Research piece" } }]}
          title={t({ ar: "البحث", en: "Research" })}
        />
        <PreviewContainer className="py-10">
          {result.state === "not_found" ? (
            <LibraryStateView kind="not_found" />
          ) : (
            <LibraryStateView kind={result.state} reason={result.reason} />
          )}
          <Link
            to="/preview/web-v1/research"
            search={RESEARCH_DEFAULTS}
            className="mt-5 inline-block text-[13px] text-brand hover:underline"
          >
            {t({ ar: "كل الأبحاث", en: "All research" })}
          </Link>
        </PreviewContainer>
      </WebV1Shell>
    );
  return <Article item={result.data.item} related={result.data.related} />;
}

function Article({ item, related }: { item: ResearchItem; related: ResearchItem[] }) {
  const { t } = useI18n();
  const lang = useLang();
  const cov = languageCoverage(item, lang);
  const crumb = item.title[lang] ?? item.title.ar ?? item.title.en ?? "";
  return (
    <WebV1Shell>
      <section className="night-panel border-b border-border/40">
        <PreviewContainer className="py-8 sm:py-12">
          <Breadcrumbs items={[...CRUMBS, { label: { ar: crumb, en: crumb } }]} />
          <div className="mt-5 max-w-4xl">
            {hasText(item.sectorName) && (
              <L t={item.sectorName} className="text-[12px] font-semibold text-brand" />
            )}
            <L
              t={item.title}
              as="h1"
              className="mt-2 block text-2xl font-bold leading-[1.4] tracking-tight sm:text-4xl"
            />
            <L
              t={item.summary}
              as="p"
              className="mt-4 block text-[15px] leading-8 text-night-foreground/75 sm:text-[17px]"
            />
            <div className="mt-6 text-night-foreground/70">
              <Meta
                items={[
                  hasText(item.author) && (
                    <span key="a">
                      <L t={item.author} className="font-semibold text-night-foreground" />
                      {hasText(item.authorRole) && (
                        <>
                          {" — "}
                          <L t={item.authorRole} />
                        </>
                      )}
                    </span>
                  ),
                  item.publishedAt && <DateText key="d" date={item.publishedAt} />,
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
        <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)_16rem] xl:gap-12">
          <aside className="min-w-0">
            <Toc
              sections={item.sections}
              extra={[
                {
                  id: "references",
                  label: { ar: "المراجع والمصادر", en: "References and sources" },
                },
              ]}
            />
          </aside>

          <article className="min-w-0 max-w-3xl" data-article>
            {item.sections.length ? (
              <ArticleSections sections={item.sections} />
            ) : (
              <LibraryStateView
                kind="empty"
                title={{
                  ar: "لا أقسام لهذا البحث في المصدر",
                  en: "This research has no sections in the source",
                }}
              />
            )}
            <hr className="my-10 border-border/60" />
            <ReferencesList refs={item.references} />
          </article>

          <aside className="min-w-0 space-y-4" data-article-aside>
            <Panel icon={Layers} title={{ ar: "القطاع", en: "Sector" }}>
              {item.sectorSlug ? (
                <>
                  <L
                    t={item.sectorName}
                    className="block text-[13px] font-semibold"
                    empty={item.sectorSlug}
                  />
                  <Link
                    to="/preview/web-v1/research"
                    search={{ ...RESEARCH_DEFAULTS, sector: item.sectorSlug }}
                    className="mt-2 inline-block text-[12px] text-brand hover:underline"
                    data-sector-research
                  >
                    {t({ ar: "أبحاث هذا القطاع", en: "Research in this sector" })}
                  </Link>
                  <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                    {t({
                      ar: "قطاع بحسب محتوى الموقع، وليس تصنيف المحرك المستخدم في صفحات القطاعات.",
                      en: "Sector per the site content, not the engine classification used on the sector pages.",
                    })}
                  </p>
                </>
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  {t({ ar: "لا قطاع في المصدر.", en: "No sector in the source." })}
                </p>
              )}
            </Panel>
            <Panel icon={Building2} title={{ ar: "الشركات", en: "Companies" }}>
              <p
                className="text-[12px] leading-5 text-muted-foreground"
                data-company-link-state="none"
              >
                {t(LIBRARY_COPY.noCompanyLink)}
              </p>
            </Panel>
            {item.tags.length > 0 && (
              <Panel icon={Tag} title={{ ar: "الوسوم", en: "Tags" }}>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((x) => (
                    <Link
                      key={keyOf(x)}
                      to="/preview/web-v1/research"
                      search={{ ...RESEARCH_DEFAULTS, tag: keyOf(x) }}
                      className="rounded-md border border-border px-2 py-0.5 text-[12px] hover:border-brand/50"
                      data-tag-link={keyOf(x)}
                    >
                      <L t={x} />
                    </Link>
                  ))}
                </div>
              </Panel>
            )}
          </aside>
        </div>

        <section className="mt-14" data-related>
          <h2 className="mb-4 text-lg font-bold">
            {t({ ar: "أبحاث ذات صلة", en: "Related research" })}
          </h2>
          {related.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <ResearchCard r={r} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted-foreground" data-related-empty>
              {t({
                ar: "لا أبحاث أخرى في القطاع نفسه أو بوسم مشترك.",
                en: "No other research in the same sector or with a shared tag.",
              })}
            </p>
          )}
        </section>
      </PreviewContainer>
    </WebV1Shell>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Layers;
  title: LocalizedText;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-muted-foreground">
        <Icon className="size-4" />
        {t(title)}
      </div>
      {children}
    </div>
  );
}
