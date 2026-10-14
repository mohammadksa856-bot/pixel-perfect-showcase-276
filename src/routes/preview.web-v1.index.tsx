import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, FileCheck2, Search, ShieldCheck, Target } from "lucide-react";
import { getCompanyPreview, PREVIEW_COMPANIES } from "@/lib/engine/company-preview.functions";
import type { CompanyPreview } from "@/lib/engine/company-preview";
import { getWebV1Enabled } from "@/lib/web-v1/flag.functions";
import { getListedSummary } from "@/lib/web-v1/catalog.functions";
import { DIRECTORY_DEFAULT_SEARCH, SEARCH_COPY } from "@/lib/web-v1/catalog";
import { COMPANY_GROUPS } from "@/lib/web-v1/model";
import { useI18n } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { cn } from "@/lib/utils";
import { PreviewContainer, useOpenSearch, WebV1Shell } from "@/components/web-v1/shell";
import {
  Eyebrow,
  Pill,
  READINESS_META,
  TONE_BAR,
  TOPIC_META,
  WITHHELD_META,
} from "@/components/web-v1/primitives";

/**
 * WEB-V1: تصميم الواجهة الرئيسية (البحث أولًا، ثم الشركات وجاهزيتها، ثم بنية صفحة الشركة).
 * لا تقرأ من Supabase؛ أقسام الأبحاث والمعرفة تُنقل كما هي عند التعميم.
 */
export const Route = createFileRoute("/preview/web-v1/")({
  loader: async () => {
    if (!(await getWebV1Enabled())) throw notFound();
    const results = await Promise.all(
      PREVIEW_COMPANIES.map((c) =>
        getCompanyPreview({ data: { market: "SA", symbol: c.symbol } }).catch(() => null),
      ),
    );
    const summary = await getListedSummary();
    return {
      summary,
      companies: PREVIEW_COMPANIES.map((c, i) => {
        const r = results[i];
        return { ...c, preview: r && r.state === "ok" ? slim(r.preview) : null };
      }),
    };
  },
  head: () => ({
    meta: [
      { title: "معرفة استثمار | معاينة تصميم WEB-V1" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HomePage,
});

/** ما تحتاجه البطاقة فقط، حتى لا تُرسل صفحة الشركة كاملة إلى المتصفح. */
function slim(p: CompanyPreview) {
  return {
    sector: p.company.sector,
    industry: p.company.industry,
    latestFiling: p.company.latestFiling,
    readiness: p.readiness,
    topics: p.topics.map((t) => ({ ordinal: t.ordinal, title: t.title, status: t.status })),
  };
}

function HomePage() {
  const { companies, summary } = Route.useLoaderData();
  return (
    <WebV1Shell>
      <Hero companies={companies} />
      {summary && <ExploreMarket summary={summary} />}
      <Principles />
      <Companies companies={companies} />
      <PageAnatomy topics={companies.find((c) => c.preview)?.preview?.topics ?? []} />
      <Browse />
    </WebV1Shell>
  );
}

type Card = (typeof PREVIEW_COMPANIES)[number] & { preview: ReturnType<typeof slim> | null };

function Hero({ companies }: { companies: Card[] }) {
  const { t } = useI18n();
  const openSearch = useOpenSearch();
  return (
    <section className="night-panel relative isolate overflow-hidden border-b border-border/40">
      <div className="chart-grid absolute inset-0 -z-10 opacity-40" />
      <PreviewContainer className="py-14 text-center sm:py-24">
        <Eyebrow>
          <ShieldCheck className="size-3.5" />
          {t({ ar: "كل رقم بمصدره وصفحته", en: "Every figure with its source and page" })}
        </Eyebrow>
        <h1 className="mx-auto mt-5 max-w-3xl text-[2rem] font-bold leading-tight tracking-tight sm:text-5xl">
          {t({
            ar: "افهم الشركة قبل أن تستثمر فيها",
            en: "Understand a company before you invest",
          })}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-8 text-night-foreground/70">
          {t({
            ar: "تحليل الشركات المدرجة من إفصاحاتها الرسمية، بثمانية عشر موضوعًا يحتاجها المستثمر، مع بيان واضح لما اكتمل وما لم يكتمل.",
            en: "Listed companies analysed from their official filings, across the eighteen topics an investor needs, with a clear account of what is complete and what is not.",
          })}
        </p>
        <button
          type="button"
          onClick={openSearch}
          className="mx-auto mt-8 flex h-14 w-full max-w-xl items-center gap-3 rounded-2xl border border-night-foreground/15 bg-card px-4 text-start text-[15px] text-muted-foreground shadow-panel transition-colors hover:border-brand/60"
          data-hero-search
        >
          <Search className="size-5 text-brand" />
          <span className="flex-1">
            {t({
              ar: `${SEARCH_COPY.placeholder.ar}، مثل 2222`,
              en: `${SEARCH_COPY.placeholder.en.replace(/\.$/, "")}, e.g. 2222`,
            })}
          </span>
          <kbd
            className="hidden rounded border border-border px-1.5 text-[11px] sm:inline"
            dir="ltr"
          >
            Ctrl K
          </kbd>
        </button>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {companies.map((c) => (
            <Link
              key={c.symbol}
              to="/preview/web-v1/companies/$symbol"
              params={{ symbol: c.symbol }}
              search={{ tab: "business" }}
              className="rounded-full border border-night-foreground/15 px-3 py-1.5 text-[12px] text-night-foreground/80 hover:border-brand/60"
            >
              {t(c.name)} <span className="num text-night-foreground/50">{c.symbol}</span>
            </Link>
          ))}
        </div>
      </PreviewContainer>
    </section>
  );
}

function ExploreMarket({
  summary,
}: {
  summary: NonNullable<Awaited<ReturnType<typeof getListedSummary>>>;
}) {
  const { t } = useI18n();
  const tiles = [
    {
      label: { ar: "كل الشركات المدرجة", en: "All listed companies" },
      n: summary.total,
      search: {},
    },
    {
      label: { ar: "السوق الرئيسية", en: "Main Market" },
      n: summary.main,
      search: { board: "main" as const },
    },
    {
      label: { ar: "نمو (السوق الموازية)", en: "Nomu (Parallel Market)" },
      n: summary.nomu,
      search: { board: "nomu" as const },
    },
    {
      label: { ar: "بصفحة بيانات من المحرك", en: "With an engine data page" },
      n: summary.withPages,
      search: { data: "engine_page" as const },
    },
  ];
  return (
    <PreviewContainer className="pt-12" data-explore-market>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {t({ ar: "دليل الشركات", en: "Company directory" })}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t({
              ar: "كل الشركات المدرجة في السوق المالية السعودية، بالاسم العربي والرمز والسوق. العدد من قائمة السوق المالية، دون أسعار أو أرقام مالية.",
              en: "Every company listed on the Saudi Exchange, by Arabic name, ticker and market. Counts from the exchange list, with no prices or financial figures.",
            })}
          </p>
        </div>
        <Link
          to="/preview/web-v1/companies"
          search={DIRECTORY_DEFAULT_SEARCH}
          className="inline-flex items-center gap-1 text-[13px] text-brand"
        >
          {t({ ar: "افتح الدليل", en: "Open the directory" })}
          <ArrowLeft className="size-4 ltr:rotate-180" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((x) => (
          <Link
            key={x.label.en}
            to="/preview/web-v1/companies"
            search={{ ...DIRECTORY_DEFAULT_SEARCH, ...x.search }}
            className="rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-brand/50"
            data-market-tile
          >
            <div className="num text-2xl font-bold">{iso(x.n)}</div>
            <div className="mt-1 text-[12px] text-muted-foreground">{t(x.label)}</div>
          </Link>
        ))}
      </div>
    </PreviewContainer>
  );
}

function Principles() {
  const { t } = useI18n();
  const items = [
    {
      icon: FileCheck2,
      title: { ar: "المصدر قبل الرقم", en: "Source before figure" },
      body: {
        ar: "يظهر كل رقم مع فترته ووحدته ومستنده وصفحته. وجود المصدر لا يعني تحققًا مستقلًا، ونقول ذلك صراحة.",
        en: "Every figure shows its period, unit, document and page. A source is not independent verification, and we say so.",
      },
    },
    {
      icon: ShieldCheck,
      title: { ar: "الحجب بدل التقدير", en: "Withhold, never estimate" },
      body: {
        ar: "القيمة التي لا تجتاز الفحص تُحجب ويُذكر سببها، ولا تُستبدل برقم تقديري.",
        en: "A value that fails a check is withheld with its reason, never replaced with an estimate.",
      },
    },
    {
      icon: Target,
      title: { ar: "جاهزية عند 95% فقط", en: "Ready only at 95%" },
      body: {
        ar: "لا نصف شركة بأنها جاهزة إلا عند 95% وبعد أن تنجح كل البوابات ويُعتمد التقييم. ما لم يُقَس يبقى «لم يُقيَّم».",
        en: "A company is called ready only at 95%, after every gate passes and the assessment is approved. Anything unmeasured stays “not assessed”.",
      },
    },
  ];
  return (
    <PreviewContainer className="py-12">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((it) => (
          <div key={it.title.en} className="rounded-2xl border border-border/70 bg-card p-5">
            <it.icon className="size-5 text-brand" />
            <h3 className="mt-3 text-[15px] font-bold">{t(it.title)}</h3>
            <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">{t(it.body)}</p>
          </div>
        ))}
      </div>
    </PreviewContainer>
  );
}

function Companies({ companies }: { companies: Card[] }) {
  const { t } = useI18n();
  return (
    <PreviewContainer className="pb-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {t({ ar: "شركات بصفحات من المحرك", en: "Companies with engine pages" })}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t({
              ar: "ثلاثة نماذج أعمال: طاقة وبنك وتأمين. الحالة كما يقيسها المحرك، دون تقريب.",
              en: "Three business models: energy, a bank and an insurer. Status as the engine measures it, unrounded.",
            })}
          </p>
        </div>
        <Link to="/companies" className="hidden items-center gap-1 text-[13px] text-brand sm:flex">
          {t({ ar: "كل الشركات", en: "All companies" })}
          <ArrowLeft className="size-4 ltr:rotate-180" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {companies.map((c) => (
          <Link
            key={c.symbol}
            to="/preview/web-v1/companies/$symbol"
            params={{ symbol: c.symbol }}
            search={{ tab: "business" }}
            className="group rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-brand/50"
            data-company-card={c.symbol}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[16px] font-bold">{t(c.name)}</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {t(c.kind)}
                  {c.preview?.industry ? ` · ${c.preview.industry}` : ""}
                </div>
              </div>
              <code dir="ltr" className="rounded-md bg-muted px-2 py-0.5 text-[12px] font-semibold">
                {c.symbol}
              </code>
            </div>
            {c.preview ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                  {(
                    [
                      [
                        { ar: "موضوعات المستثمر", en: "Investor topics" },
                        c.preview.readiness.investorTopics,
                      ],
                      [
                        { ar: "عقد المصنع", en: "Factory contract" },
                        c.preview.readiness.operationalCategories,
                      ],
                    ] as const
                  ).map(([label, r]) => (
                    <div key={label.en} className="rounded-xl bg-muted/50 p-2.5">
                      <div className="text-muted-foreground">{t(label)}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Pill meta={READINESS_META[r.state]} />
                        {r.score === null && r.state !== "not_assessed" && (
                          <Pill meta={WITHHELD_META} />
                        )}
                        {r.score !== null && (
                          <span className="num font-semibold">{iso(r.score.toFixed(1))}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>{t({ ar: "الموضوعات الثمانية عشر", en: "The eighteen topics" })}</span>
                    <span className="num">
                      {t({ ar: "آخر إفصاح ", en: "Latest filing " })}
                      {iso(c.preview.latestFiling ?? "—")}
                    </span>
                  </div>
                  <div
                    className="grid gap-0.5"
                    style={{ gridTemplateColumns: "repeat(18, minmax(0, 1fr))" }}
                  >
                    {c.preview.topics.map((tp) => (
                      <span
                        key={tp.ordinal}
                        title={`${tp.ordinal}. ${t(tp.title)}: ${t(TOPIC_META[tp.status].label)}`}
                        className={cn("h-2 rounded-sm", TONE_BAR[TOPIC_META[tp.status].tone])}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-4 text-[12px] text-muted-foreground">
                {t({
                  ar: "بيانات المحرك غير متاحة الآن.",
                  en: "Engine data is not available right now.",
                })}
              </p>
            )}
          </Link>
        ))}
      </div>
      <Legend />
    </PreviewContainer>
  );
}

function Legend() {
  const { t } = useI18n();
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
      {(Object.keys(TOPIC_META) as (keyof typeof TOPIC_META)[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2 rounded-sm", TONE_BAR[TOPIC_META[k].tone])} />
          {t(TOPIC_META[k].label)}
        </span>
      ))}
    </div>
  );
}

function PageAnatomy({
  topics,
}: {
  topics: { ordinal: number; title: { ar: string; en: string } }[];
}) {
  const { t } = useI18n();
  const title = (o: number) => topics.find((x) => x.ordinal === o)?.title;
  return (
    <section className="border-y border-border/60 bg-card/40">
      <PreviewContainer className="py-12">
        <h2 className="text-xl font-bold tracking-tight">
          {t({
            ar: "صفحة كل شركة: خمس مجموعات، ثمانية عشر موضوعًا",
            en: "Every company page: five groups, eighteen topics",
          })}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {t({
            ar: "كل موضوع في مجموعة واحدة، وتغطية البيانات في تبويب مستقل لا يختلط بالموضوعات.",
            en: "Each topic lives in exactly one group; data coverage has its own tab and never mixes with the topics.",
          })}
        </p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {COMPANY_GROUPS.map((g, i) => (
            <li key={g.id} className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="num text-[11px] text-brand">{iso(i + 1)}</div>
              <h3 className="mt-1 text-[14px] font-bold">{t(g.title)}</h3>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{t(g.question)}</p>
              <ul className="mt-3 space-y-1 text-[12px]">
                {(g.topics as readonly number[]).map((o) => (
                  <li key={o} className="flex gap-2">
                    <span className="num w-4 text-muted-foreground">{o}</span>
                    {title(o) ? t(title(o)) : "—"}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </PreviewContainer>
    </section>
  );
}

function Browse() {
  const { t } = useI18n();
  const tiles = [
    {
      to: "/markets/saudi",
      title: { ar: "السوق السعودي", en: "Saudi market" },
      hint: { ar: "تاسي ونمو", en: "TASI and Nomu" },
    },
    {
      to: "/sectors",
      title: { ar: "القطاعات", en: "Sectors" },
      hint: { ar: "تصنيف الشركات حسب النشاط", en: "Companies by activity" },
    },
    {
      to: "/research",
      title: { ar: "الأبحاث", en: "Research" },
      hint: { ar: "تحليلات معمّقة", en: "In-depth analysis" },
    },
    {
      to: "/knowledge",
      title: { ar: "المعرفة", en: "Knowledge" },
      hint: { ar: "مفاهيم الاستثمار بالعربية", en: "Investing concepts" },
    },
  ] as const;
  return (
    <PreviewContainer className="py-12">
      <h2 className="text-xl font-bold tracking-tight">
        {t({ ar: "الأسواق والقطاعات والمكتبة", en: "Markets, sectors and library" })}
      </h2>
      <p className="mb-5 mt-1 text-[13px] text-muted-foreground">
        {t({
          ar: "تفتح هذه الأقسام صفحات الموقع الحالية بمحتواها المنشور. إعادة تصميمها في دفعة لاحقة.",
          en: "These open the current site pages with their published content. Their redesign comes in a later batch.",
        })}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((x) => (
          <Link
            key={x.to}
            to={x.to}
            className="rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-brand/50"
          >
            <div className="text-[14px] font-bold">{t(x.title)}</div>
            <div className="mt-1 text-[12px] text-muted-foreground">{t(x.hint)}</div>
          </Link>
        ))}
      </div>
    </PreviewContainer>
  );
}
