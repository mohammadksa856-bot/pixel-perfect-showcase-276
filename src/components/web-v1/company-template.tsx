import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronLeft } from "lucide-react";
import { TopicSection } from "@/components/engine-preview";
import { useI18n } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { cn } from "@/lib/utils";
import type { CompanyPreview, Topic } from "@/lib/engine/company-preview";
import type { PeerTable } from "@/lib/engine/peer-comparison";
import {
  COMPANY_GROUPS,
  COVERAGE_TAB,
  FROZEN_SAMPLE_TOPIC_REASON_EN,
  TOPIC_DESIGN,
  type CompanyTab,
} from "@/lib/web-v1/model";
import { sectorSlug } from "@/lib/web-v1/catalog";
import { TABLE_DEFAULTS } from "@/lib/web-v1/markets";
import { TaxonomyLabel } from "./display-label";
import { FactoryPanel } from "./factory-panel";
import { FinancialExplorer, KeyFigures } from "./financial-explorer";
import { Pill, READINESS_META, TONE_BAR, TOPIC_META, WITHHELD_META } from "./primitives";
import { PreviewContainer } from "./shell";

const KIND = {
  ordinary: { ar: "شركة", en: "Company" },
  bank: { ar: "بنك", en: "Bank" },
  insurer: { ar: "تأمين", en: "Insurer" },
} as const;

/** WEB-06 (D3): أسباب عامة تُعرض في تنبيه الصفحة فقط. */
const PAGE_LEVEL_REASONS: ReadonlySet<string> = new Set([FROZEN_SAMPLE_TOPIC_REASON_EN]);

export function topicGroup(ordinal: number): CompanyTab {
  return COMPANY_GROUPS.find((g) => (g.topics as readonly number[]).includes(ordinal))!.id;
}

export function CompanyHero({ p }: { p: CompanyPreview }) {
  const { t } = useI18n();
  const c = p.company;
  const quote = p.topics.flatMap((x) => x.blocks).find((b) => b.type === "market" && b.latest) as
    Extract<CompanyPreview["topics"][number]["blocks"][number], { type: "market" }> | undefined;
  const measured = p.topics.filter((x) => x.status !== "not_measured").length;
  const inv = p.readiness.investorTopics;
  const fac = p.readiness.operationalCategories;
  return (
    <section className="night-panel border-b border-border/40" data-company-hero>
      <PreviewContainer className="py-7 sm:py-9">
        <nav className="flex items-center gap-1 text-[12px] text-night-foreground/55">
          <Link
            to="/preview/web-v1/markets/saudi"
            className="hover:text-night-foreground"
            data-crumb-market
          >
            {t({ ar: "السوق السعودي", en: "Saudi market" })}
          </Link>
          <ChevronLeft className="size-3.5 ltr:rotate-180" />
          {/* WEB-06 (D9): القطاع والصناعة من صفحة المحرك نفسها، إلى صفحة القطاع في المعاينة (والصناعة مصفّاة). */}
          {c.sector ? (
            <Link
              to="/preview/web-v1/sectors/$slug"
              params={{ slug: sectorSlug(c.sector) }}
              search={TABLE_DEFAULTS}
              className="hover:text-night-foreground"
              data-crumb-sector={sectorSlug(c.sector)}
            >
              <TaxonomyLabel raw={c.sector} />
            </Link>
          ) : (
            <span>—</span>
          )}
          <ChevronLeft className="size-3.5 ltr:rotate-180" />
          {c.sector && c.industry ? (
            <Link
              to="/preview/web-v1/sectors/$slug"
              params={{ slug: sectorSlug(c.sector) }}
              search={{ ...TABLE_DEFAULTS, industry: c.industry }}
              className="hover:text-night-foreground"
              data-crumb-industry={c.industry}
            >
              <TaxonomyLabel raw={c.industry} />
            </Link>
          ) : (
            <span>{c.industry ?? "—"}</span>
          )}
        </nav>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <code
                dir="ltr"
                className="rounded-md bg-night-foreground/10 px-2 py-0.5 text-[12px] font-semibold"
              >
                {c.market}:{c.symbol}
              </code>
              <span className="rounded-md border border-night-foreground/20 px-2 py-0.5 text-[11px]">
                {t(KIND[p.kind])}
              </span>
              {c.exchange && (
                <span className="text-[12px] text-night-foreground/70">
                  <TaxonomyLabel raw={c.exchange} />
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-[2rem]" dir="auto">
              {t(c.name)}
            </h1>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-night-foreground/65">
              <div className="flex gap-1.5">
                <dt>{t({ ar: "آخر إفصاح", en: "Latest filing" })}</dt>
                <dd className="num text-night-foreground">{iso(c.latestFiling ?? "—")}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt>{t({ ar: "عملة التقارير", en: "Reporting currency" })}</dt>
                <dd className="text-night-foreground">{c.currency ?? "—"}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt>{t({ ar: "نهاية السنة المالية", en: "Fiscal year end" })}</dt>
                <dd className="num text-night-foreground">{iso(c.fiscalYearEnd ?? "—")}</dd>
              </div>
            </dl>
          </div>
          <div className="grid shrink-0 grid-cols-1 gap-px overflow-hidden rounded-xl bg-night-foreground/10 sm:grid-cols-3">
            <div className="bg-night px-4 py-3">
              <div className="text-[11px] text-night-foreground/55">
                {t({ ar: "آخر إغلاق مسجّل", en: "Last recorded close" })}
              </div>
              {quote?.latest ? (
                <>
                  <div className="num mt-1 text-lg font-bold">{t(quote.latest.close)}</div>
                  <div className="num text-[11px] text-night-foreground/55">
                    {iso(quote.latest.observedAt.slice(0, 10))} ·{" "}
                    {t({ ar: "ليس سعرًا حيًا", en: "not live" })}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-[13px] text-night-foreground/60">
                  {t({ ar: "لا سعر بمصدر صالح", en: "No price with a valid source" })}
                </div>
              )}
            </div>
            <Link
              to="/preview/web-v1/companies/$symbol"
              params={{ symbol: c.symbol }}
              search={{ tab: "business" }}
              className="block bg-night px-4 py-3 hover:bg-night/70"
              data-hero-readiness="investor_topics"
            >
              <div className="text-[11px] text-night-foreground/55">
                {t({ ar: "موضوعات المستثمر", en: "Investor topics" })}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Pill meta={READINESS_META[inv.state]} />
                {inv.score === null && inv.state !== "not_assessed" && (
                  <Pill meta={WITHHELD_META} />
                )}
                {inv.score !== null && (
                  <span className="num text-[13px] font-semibold">
                    {iso(`${inv.score.toFixed(1)} / ${inv.target}`)}
                  </span>
                )}
              </div>
              <div className="num mt-1 text-[11px] text-night-foreground/55">
                {t({
                  ar: `${iso(measured)} من 18 موضوعًا مقاسة`,
                  en: `${measured} of 18 topics measured`,
                })}
              </div>
            </Link>
            <Link
              to="/preview/web-v1/companies/$symbol"
              params={{ symbol: c.symbol }}
              search={{ tab: "coverage" }}
              className="block bg-night px-4 py-3 hover:bg-night/70"
              data-hero-readiness="operational_categories"
            >
              <div className="text-[11px] text-night-foreground/55">
                {t({ ar: "عقد المصنع (18 فئة)", en: "Factory contract (18)" })}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Pill meta={READINESS_META[fac.state]} />
                {fac.score === null && fac.state !== "not_assessed" && (
                  <Pill meta={WITHHELD_META} />
                )}
                {fac.score !== null && (
                  <span className="num text-[13px] font-semibold">
                    {iso(`${fac.score.toFixed(1)} / ${fac.target}`)}
                  </span>
                )}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-night-foreground/55">
                {t({ ar: "التفاصيل", en: "Details" })}
                <ArrowUpRight className="size-3" />
              </div>
            </Link>
          </div>
        </div>
      </PreviewContainer>
    </section>
  );
}

export function CompanyTabs({ p, tab }: { p: CompanyPreview; tab: CompanyTab }) {
  const { t } = useI18n();
  const byOrdinal = new Map(p.topics.map((x) => [x.ordinal, x]));
  return (
    <div className="sticky top-16 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <PreviewContainer>
        <nav className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto py-2" data-company-tabs>
          {[
            ...COMPANY_GROUPS,
            { id: "coverage" as const, title: COVERAGE_TAB.title, topics: [] },
          ].map((g) => {
            const active = g.id === tab;
            return (
              <Link
                key={g.id}
                to="."
                search={{ tab: g.id }}
                data-tab={g.id}
                data-active={active || undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  // WEB-06 D11: النشط نص فاتح على خلفية مظللة بإطار (لا أبيض على الأزرق 3.44:1).
                  // الإطار علامة شكلية لا تعتمد على اللون وحده.
                  active
                    ? "bg-brand/15 text-foreground ring-1 ring-inset ring-brand/70"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  g.id === "coverage" && "ms-auto",
                )}
              >
                {t(g.title)}
                {g.topics.length > 0 && (
                  <span className="flex gap-0.5" aria-hidden>
                    {(g.topics as readonly number[]).map((o) => {
                      const st = byOrdinal.get(o)?.status ?? "not_measured";
                      return (
                        <span
                          key={o}
                          className={cn("size-1.5 rounded-full", TONE_BAR[TOPIC_META[st].tone])}
                        />
                      );
                    })}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </PreviewContainer>
    </div>
  );
}

export function GroupView({
  p,
  tab,
  peers,
}: {
  p: CompanyPreview;
  tab: Exclude<CompanyTab, "coverage">;
  peers: PeerTable | null;
}) {
  const { t } = useI18n();
  const g = COMPANY_GROUPS.find((x) => x.id === tab)!;
  const topics = (g.topics as readonly number[])
    .map((o) => p.topics.find((x) => x.ordinal === o))
    .filter(Boolean) as Topic[];
  return (
    <div data-group={g.id}>
      <PreviewContainer className="py-8">
        {p.dataNotices.length > 0 && (
          // WEB-06 (D3): تنبيه واحد للصفحة بدل تكرار الرسالة العامة داخل كل موضوع.
          <div
            className="mb-6 rounded-xl border border-status-warn/40 bg-status-warn/5 px-4 py-3 text-[13px] leading-6"
            role="note"
            data-page-notice
          >
            {p.dataNotices.map((n) => (
              <p key={n.en}>{t(n)}</p>
            ))}
          </div>
        )}
        <KeyFigures figures={p.keyFigures} />
        <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden lg:block" data-topic-rail>
            <nav className="sticky top-32 space-y-5">
              {COMPANY_GROUPS.map((grp) => (
                <div key={grp.id}>
                  <Link
                    to="."
                    search={{ tab: grp.id }}
                    className={cn(
                      "text-[12px] font-semibold",
                      grp.id === g.id
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(grp.title)}
                  </Link>
                  {grp.id === g.id && (
                    <ol className="mt-2 space-y-1 border-s border-border ps-3">
                      {topics.map((x) => (
                        <li key={x.ordinal}>
                          <a
                            href={`#topic-${x.ordinal}`}
                            className="flex items-center justify-between gap-2 rounded-md py-1 text-[12px] text-muted-foreground hover:text-foreground"
                          >
                            <span className="truncate">
                              <span className="num me-1.5">{x.ordinal}</span>
                              {t(x.title)}
                            </span>
                            <span
                              className={cn(
                                "size-2 shrink-0 rounded-full",
                                TONE_BAR[TOPIC_META[x.status].tone],
                              )}
                              title={t(TOPIC_META[x.status].label)}
                            />
                          </a>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </nav>
          </aside>
          <div className="min-w-0">
            <div className="border-b border-border/60 pb-5">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t(g.title)}</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">{t(g.question)}</p>
              <ol className="scrollbar-none mt-4 flex gap-2 overflow-x-auto lg:hidden">
                {topics.map((x) => (
                  <li key={x.ordinal} className="shrink-0">
                    <a
                      href={`#topic-${x.ordinal}`}
                      className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-[12px]"
                    >
                      <span className="num text-muted-foreground">{x.ordinal}</span>
                      {t(x.title)}
                      <Pill meta={TOPIC_META[x.status]} />
                    </a>
                  </li>
                ))}
              </ol>
            </div>
            {topics.map((x) => (
              <CompanyTopic key={x.key} topic={x} p={p} peers={peers} />
            ))}
          </div>
        </div>
      </PreviewContainer>
    </div>
  );
}

/**
 * موضوع واحد كما يُعرض في «بيانات معرفة» (WEB-06) وفي «تحليل الشركة» (WEB-07): الموضوع 5 مع مستكشف القوائم،
 * وبقية الموضوعات بتصميمها. مصدر واحد للعرض حتى لا يختلف المستويان في الأرقام أو الحجب.
 */
export function CompanyTopic({
  topic,
  p,
  peers,
  focusRow,
}: {
  topic: Topic;
  p: CompanyPreview;
  peers: PeerTable | null;
  /** WEB-07: بند مستهدف برابط عميق (يفتح قائمته في مستكشف القوائم). */
  focusRow?: string | undefined;
}) {
  return topic.ordinal === 5 ? (
    <TopicSection
      topic={{ ...topic, blocks: topic.blocks.filter((b) => b.type !== "history") }}
      preview={p}
      peers={peers}
      before={<FinancialExplorer views={p.statements} kind={p.kind} focusRow={focusRow} />}
      hideReasons={PAGE_LEVEL_REASONS}
      collapse={{
        ar: "كل بنود آخر سنة مالية وآخر ربع (تفصيلي)",
        en: "All line items for the latest fiscal year and quarter (detail)",
      }}
    />
  ) : (
    <TopicSection
      topic={topic}
      preview={p}
      peers={peers}
      design={TOPIC_DESIGN[topic.ordinal]}
      hideReasons={PAGE_LEVEL_REASONS}
    />
  );
}

/** تنبيه الصفحة الواحد (WEB-06 D3)، مشترك بين المستويات. */
export function PageNotice({ p }: { p: CompanyPreview }) {
  const { t } = useI18n();
  if (!p.dataNotices.length) return null;
  return (
    <div
      className="mb-6 rounded-xl border border-status-warn/40 bg-status-warn/5 px-4 py-3 text-[13px] leading-6"
      role="note"
      data-page-notice
    >
      {p.dataNotices.map((n) => (
        <p key={n.en}>{t(n)}</p>
      ))}
    </div>
  );
}

export function CoverageView({ p, open }: { p: CompanyPreview; open?: string | undefined }) {
  const { t } = useI18n();
  return (
    <PreviewContainer className="py-8">
      <div className="mb-6 border-b border-border/60 pb-6">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t(COVERAGE_TAB.title)}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">{t(COVERAGE_TAB.question)}</p>
      </div>
      <FactoryPanel factory={p.factory} openKey={open} />
    </PreviewContainer>
  );
}
