import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, BookOpenText, Database, EyeOff } from "lucide-react";
import { useI18n, type LocalizedText } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { cn } from "@/lib/utils";
import type { CompanyPreview } from "@/lib/engine/company-preview";
import { safeSourceUrl } from "@/lib/engine/peer-comparison";
import {
  buildOverview,
  intelGroups,
  type IntelTarget,
  type OverviewFact,
} from "@/lib/web-v1/company-experience";
import { LanguageMark } from "./display-label";
import { WITHHELD_TEXT } from "./financial-explorer";
import { PageNotice } from "./company-template";
import { Pill, READINESS_META } from "./primitives";
import { PreviewContainer } from "./shell";

/**
 * WEB-07 المستوى 1: نظرة عامة. ملخص استثماري مبني من صفحة المحرك نفسها: كل قيمة هنا هي نفس الخلية
 * المعروضة في «تحليل الشركة» و«بيانات معرفة»، برابط إلى مصدرها ورابط عميق إلى تحليلها. لا سعر حي، ولا
 * مضاعفات، ولا توقعات، ولا نص تحليلي من عندنا؛ ما لا مصدر له يظهر حالةً صريحة.
 */
export function CompanyOverview({ p }: { p: CompanyPreview }) {
  const { t, locale } = useI18n();
  const o = buildOverview(p);
  const groups = intelGroups(p);
  const desc =
    (locale === "ar" ? o.description.ar : o.description.en) ?? o.description.ar ?? o.description.en;
  const other = desc === o.description.ar ? o.description.en : o.description.ar;
  const sym = p.company.symbol;

  return (
    <PreviewContainer className="py-8" data-company-overview>
      <PageNotice p={p} />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* نموذج العمل */}
        <Card
          className="lg:col-span-2"
          title={{ ar: "نموذج العمل", en: "Business model" }}
          more={<IntelLink p={p} target={{ topic: "business" }} />}
          data="business-model"
        >
          {desc ? (
            <div>
              <p className="text-[15px] leading-8" dir="auto" data-overview-description>
                {desc.text}
                <LanguageMark text={desc.text} />
              </p>
              <Meta asOf={desc.asOf} href={desc.sourceUrl} />
              {other && other !== desc && (
                <details className="mt-2 text-[12px]">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    {t({
                      ar: "الوصف بلغة المصدر الأخرى",
                      en: "Description in the other source language",
                    })}
                  </summary>
                  <p className="mt-2 leading-7 text-muted-foreground" dir="auto">
                    {other.text}
                  </p>
                </details>
              )}
            </div>
          ) : (
            <Empty
              text={{
                ar: "لا وصف للنشاط بمصدر في صفحة المحرك.",
                en: "No sourced business description on the engine page.",
              }}
            />
          )}
          {o.businessFacts.length > 0 && (
            <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-border/60 pt-5 sm:grid-cols-2">
              {o.businessFacts.map((f) => (
                <FactItem key={f.key} f={f} />
              ))}
            </dl>
          )}
        </Card>

        {/* المدخل البارز للتحليل الشامل */}
        <section
          className="flex flex-col rounded-2xl border border-brand/50 bg-brand/10 p-5"
          data-intel-cta
          aria-labelledby="intel-cta-title"
        >
          <BookOpenText className="size-6 text-brand" aria-hidden />
          <h2 id="intel-cta-title" className="mt-3 text-lg font-bold">
            {t({ ar: "التحليل الشامل للشركة", en: "Full company analysis" })}
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
            {t({
              ar: "الموضوعات الاستثمارية الثمانية عشر كاملة في خمس مجموعات، بالقوائم والرسوم والفترات والمصادر.",
              en: "All eighteen investor topics in five groups, with statements, charts, periods and sources.",
            })}
          </p>
          <ul className="mt-4 space-y-1.5 text-[13px]">
            {groups.map((g) => {
              const withData = g.topics.filter((x) => x.shownCount > 0).length;
              return (
                <li key={g.id} className="flex items-center justify-between gap-3">
                  <span>{t(g.title)}</span>
                  <span className="num shrink-0 text-[12px] text-muted-foreground">
                    {t({
                      ar: `${iso(withData)} من ${iso(g.topics.length)} ببيانات`,
                      en: `${withData} of ${g.topics.length} with data`,
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
          <Link
            to="/preview/web-v1/companies/$symbol/intelligence"
            params={{ symbol: sym }}
            search={{}}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-brand/20 px-4 py-2.5 text-[14px] font-semibold text-foreground ring-1 ring-inset ring-brand/70 hover:bg-brand/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            data-intel-cta-link
          >
            {t({ ar: "افتح تحليل الشركة", en: "Open Company Intelligence" })}
            <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
          </Link>
        </section>
      </div>

      {/* أهم المؤشرات المالية */}
      <Card
        className="mt-5"
        title={{ ar: "أهم المؤشرات المالية", en: "Key financial indicators" }}
        hint={{
          ar: "آخر سنة مالية منشورة، كما في جدول القوائم.",
          en: "Latest reported fiscal year, as in the statements table.",
        }}
        more={<IntelLink p={p} target={{ topic: "financials" }} />}
        data="key-figures"
      >
        <ul className="grid gap-px overflow-hidden rounded-xl bg-border/60 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {o.keyFigures.map((k) => (
            <li
              key={k.key}
              className="flex flex-col bg-card p-4"
              data-overview-figure={k.key}
              data-state={k.state}
            >
              <span className="text-[12px] text-muted-foreground">{t(k.label)}</span>
              {k.state === "value" ? (
                <>
                  <span className="num mt-1.5 text-[18px] font-bold leading-6">
                    {t(k.cell.display)}
                  </span>
                  <span className="mt-1 text-[11px] text-muted-foreground">
                    {t(k.period.label)}
                  </span>
                  <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[12px]">
                    <IntelLink p={p} target={k.target} compact />
                    <Source href={k.cell.proof.sourceUrl} />
                  </span>
                </>
              ) : (
                <>
                  <span className="mt-2">
                    {k.state === "withheld" ? (
                      // شارة محلية بتباين ≥ 4.5:1 (شارة WITHHELD_META المشتركة 3.89:1 على البطاقة).
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[12px] font-medium text-foreground"
                        data-overview-withheld-badge
                      >
                        <EyeOff className="size-3.5" aria-hidden />
                        {t({ ar: "محجوب", en: "Withheld" })}
                      </span>
                    ) : (
                      <span className="text-[13px] text-muted-foreground">
                        {t({ ar: "غير متوفر", en: "Not available" })}
                      </span>
                    )}
                  </span>
                  {k.state === "withheld" && (
                    <span className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                      {t(WITHHELD_TEXT[k.reason])}
                    </span>
                  )}
                  <span className="mt-auto pt-3 text-[12px]">
                    <IntelLink p={p} target={k.target} compact />
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* المؤشرات التشغيلية */}
        <Card
          title={{ ar: "أهم المؤشرات التشغيلية", en: "Key operating indicators" }}
          more={<IntelLink p={p} target={o.operations.target} />}
          data="operations"
        >
          {o.operations.cells.length ? (
            <CellList cells={o.operations.cells} p={p} />
          ) : (
            <Empty
              text={{ ar: "لا مؤشرات تشغيلية بمصدر.", en: "No sourced operating indicators." }}
            />
          )}
          <WithheldNote n={o.operations.withheld} />
        </Card>

        {/* مزيج الإيرادات */}
        <Card
          title={{ ar: "مصادر الإيرادات", en: "Where revenue comes from" }}
          hint={{
            ar: "كما أفصحت الشركة، دون نسب محسوبة.",
            en: "As disclosed, without computed shares.",
          }}
          more={<IntelLink p={p} target={{ topic: "business" }} />}
          data="revenue-mix"
        >
          {o.revenueMix.length ? (
            <div className="space-y-5">
              {o.revenueMix.map((m) => {
                const max = Math.max(...m.rows.map((r) => Math.abs(r.value)), 1);
                return (
                  <figure key={m.title.en} data-revenue-mix={m.title.en}>
                    <figcaption className="mb-2 flex items-center justify-between gap-2 text-[12px] font-semibold">
                      {t(m.title)}
                      <span className="font-normal text-muted-foreground">
                        {m.rows[0] ? t(m.rows[0].period.label) : ""}
                      </span>
                    </figcaption>
                    <ul className="space-y-2">
                      {m.rows.map((r) => (
                        <li key={r.segment}>
                          <div className="flex items-baseline justify-between gap-3 text-[13px]">
                            <span dir="auto" className="min-w-0 break-words">
                              {r.segment}
                              <LanguageMark text={r.segment} />
                            </span>
                            <span className="num shrink-0 font-semibold">{t(r.display)}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-muted" aria-hidden>
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{ width: `${(Math.abs(r.value) / max) * 100}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                    {m.rows[0] && <Meta href={m.rows[0].proof.sourceUrl} />}
                  </figure>
                );
              })}
            </div>
          ) : (
            <Empty text={{ ar: "لا تفصيل إيرادات بمصدر.", en: "No sourced revenue breakdown." }} />
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* المساهمون والعائد */}
        <Card
          title={{ ar: "العائد والملكية", en: "Returns and ownership" }}
          more={<IntelLink p={p} target={o.dividends.target} />}
          data="shareholders"
        >
          {o.dividends.cells.length > 0 && <CellList cells={o.dividends.cells} p={p} />}
          <WithheldNote n={o.dividends.withheld} />
          {o.ownership.rows.length > 0 && (
            <div className="mt-4 border-t border-border/60 pt-4" data-overview-ownership>
              <h3 className="mb-2 text-[12px] font-semibold text-muted-foreground">
                {t({ ar: "كبار الملاك", en: "Major holders" })}{" "}
                <span className="font-normal">· {iso(o.ownership.rows[0]!.asOf)}</span>
              </h3>
              <ul className="space-y-2 text-[13px]">
                {o.ownership.rows.slice(0, 4).map((r) => (
                  <li key={r.holder}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span dir="auto" className="min-w-0 break-words">
                        {r.holder}
                        <LanguageMark text={r.holder} />
                      </span>
                      <span className="num shrink-0 font-semibold" dir="ltr">
                        {(r.pct * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted" aria-hidden>
                      <div
                        className="h-full rounded-full bg-tone-indigo"
                        style={{ width: `${r.pct * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
                <IntelLink p={p} target={o.ownership.target} compact />
                <Source href={o.ownership.rows[0]!.sourceUrl} />
              </div>
            </div>
          )}
        </Card>

        {/* التطورات */}
        <Card
          title={{ ar: "آخر التطورات", en: "Latest developments" }}
          hint={{
            ar: "إجراءات الشركة وأحدث وثائقها المؤرشفة.",
            en: "Corporate actions and the latest archived documents.",
          }}
          more={<IntelLink p={p} target={o.developments.target} />}
          data="developments"
        >
          {o.developments.total === 0 ? (
            <Empty text={{ ar: "لا تطورات بمصدر.", en: "No sourced developments." }} />
          ) : (
            <ol className="space-y-3 text-[13px]">
              {o.developments.actions.map((a) => (
                <li key={`a-${a.title}`} data-development="action">
                  <div className="flex items-baseline gap-2">
                    <span className="num shrink-0 text-[11px] text-muted-foreground" dir="ltr">
                      {a.date ?? "—"}
                    </span>
                    <span dir="auto" className="min-w-0 break-words">
                      {a.title}
                      <LanguageMark text={a.title} />
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-muted-foreground">
                    {a.amount && <span className="num">{t(a.amount)}</span>}
                    <Source href={a.sourceUrl} />
                  </div>
                </li>
              ))}
              {o.developments.documents.map((d) => (
                <li key={`d-${d.title}-${d.date}`} data-development="document">
                  <div className="flex items-baseline gap-2">
                    <span className="num shrink-0 text-[11px] text-muted-foreground" dir="ltr">
                      {d.date ?? "—"}
                    </span>
                    <span dir="auto" className="min-w-0 break-words">
                      {d.title}
                      <LanguageMark text={d.title} />
                    </span>
                  </div>
                  <div className="mt-0.5 text-[12px]">
                    <Source href={d.sourceUrl} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* الإدارة والحوكمة */}
        <Card
          title={{ ar: "الإدارة والحوكمة", en: "Management and governance" }}
          more={<IntelLink p={p} target={{ topic: "governance" }} />}
          data="governance"
        >
          {o.governance.length ? (
            <dl className="space-y-3">
              {o.governance.map((f) => (
                <FactItem key={f.key} f={f} />
              ))}
            </dl>
          ) : (
            <Empty text={{ ar: "لا بيانات حوكمة بمصدر.", en: "No sourced governance data." }} />
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* التقييم */}
        <Card
          title={{ ar: "التقييم", en: "Valuation" }}
          more={<IntelLink p={p} target={o.valuation.target} />}
          data="valuation"
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[12px] text-muted-foreground">
                {t({ ar: "آخر إغلاق مسجّل", en: "Last recorded close" })}
              </dt>
              {o.valuation.quote ? (
                <dd>
                  <span className="num mt-1 block text-[18px] font-bold">
                    {t(o.valuation.quote.close)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {iso(o.valuation.quote.observedAt.slice(0, 10))} ·{" "}
                    {t({ ar: "ليس سعرًا حيًا", en: "not a live price" })}
                  </span>
                  <span className="mt-1 flex gap-3 text-[12px]">
                    <IntelLink p={p} target={{ topic: "trading" }} compact />
                    <Source href={o.valuation.quote.sourceUrl} />
                  </span>
                </dd>
              ) : (
                <dd className="mt-1 text-[13px] text-muted-foreground">
                  {t({ ar: "لا سعر بمصدر صالح", en: "No price with a valid source" })}
                </dd>
              )}
            </div>
            <div
              data-valuation-state={
                o.valuation.hasDocumentedValuation ? "documented" : "unavailable"
              }
            >
              <dt className="text-[12px] text-muted-foreground">
                {t({ ar: "مضاعفات التقييم", en: "Valuation multiples" })}
              </dt>
              <dd className="mt-1 text-[13px] leading-6">
                {o.valuation.hasDocumentedValuation
                  ? t({ ar: "موثقة في تحليل الشركة.", en: "Documented in Company Intelligence." })
                  : t({
                      ar: "لا بيانات تقييم موثقة في صفحة المحرك. لا نحسب مضاعفات من سعر الإغلاق ولا نعرض تقديرات.",
                      en: "No documented valuation data on the engine page. We do not compute multiples from the closing price or show estimates.",
                    })}
              </dd>
            </div>
          </dl>
          <ul className="mt-4 grid gap-2 border-t border-border/60 pt-4 text-[12px] sm:grid-cols-2">
            <StateRow
              ok={o.valuation.forecasts}
              label={{ ar: "التوجيهات والتوقعات", en: "Guidance and forecasts" }}
            />
            <StateRow
              ok={o.valuation.analysts}
              label={{ ar: "تغطية المحللين", en: "Analyst coverage" }}
            />
          </ul>
        </Card>

        {/* المخاطر والمحفزات */}
        <Card
          title={{ ar: "المخاطر والمحفزات", en: "Risks and catalysts" }}
          more={<IntelLink p={p} target={o.risks.target} />}
          data="risks"
        >
          <h3 className="text-[12px] font-semibold text-muted-foreground">
            {t({ ar: "المخاطر والتعرضات", en: "Risks and exposures" })}
          </h3>
          {o.risks.facts.length ? (
            <dl className="mt-2 space-y-3">
              {o.risks.facts.map((f) => (
                <FactItem key={f.key} f={f} />
              ))}
            </dl>
          ) : (
            <Empty text={{ ar: "لا مخاطر موثقة بمصدر.", en: "No sourced risk data." }} />
          )}
          <h3 className="mt-4 border-t border-border/60 pt-4 text-[12px] font-semibold text-muted-foreground">
            {t({ ar: "المحفزات", en: "Catalysts" })}
          </h3>
          <p
            className="mt-1 text-[13px] leading-6 text-muted-foreground"
            data-catalysts="not-documented"
          >
            {t({
              ar: "لا محفزات موثقة في صفحة المحرك. لا نستنتجها من الأخبار ولا نكتبها من عندنا؛ آخر الوثائق في «آخر التطورات».",
              en: "No documented catalysts on the engine page. We do not infer them from news or write our own; the latest documents are under “Latest developments”.",
            })}
          </p>
        </Card>
      </div>

      {/* حالة البيانات: موضوعات المستثمر والمصنع منفصلان، ولا نسبة إنجاز */}
      <section
        className="mt-5 grid gap-4 rounded-2xl border border-border/70 bg-card p-5 md:grid-cols-[1fr_auto]"
        data-overview-status
        aria-labelledby="overview-status-title"
      >
        <div>
          <h2 id="overview-status-title" className="text-[14px] font-bold">
            {t({ ar: "حالة البيانات", en: "Data status" })}
          </h2>
          <dl className="mt-3 grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-[12px] text-muted-foreground">
                {t({ ar: "موضوعات فيها بيانات معروضة", en: "Topics with shown data" })}
              </dt>
              <dd
                className="num mt-1 font-semibold"
                data-topics-with-data={o.status.topicsWithData}
              >
                {t({
                  ar: `${iso(o.status.topicsWithData)} من ${iso(o.status.topicsTotal)}`,
                  en: `${o.status.topicsWithData} of ${o.status.topicsTotal}`,
                })}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted-foreground">
                {t({ ar: "قيم معروضة / محجوبة", en: "Values shown / withheld" })}
              </dt>
              <dd className="num mt-1 font-semibold">
                {iso(o.status.shown)} / {iso(o.status.withheld)}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted-foreground">
                {t({ ar: "تقييم موضوعات المستثمر", en: "Investor-topic assessment" })}
              </dt>
              <dd className="mt-1">
                <Pill meta={READINESS_META[o.status.investorTopics.state]} />
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted-foreground">
                {t({
                  ar: "عقد مصنع البيانات (18 فئة تشغيلية)",
                  en: "Data factory contract (18 operational categories)",
                })}
              </dt>
              <dd className="mt-1">
                <Pill meta={READINESS_META[o.status.factory.state]} />
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] leading-6 text-muted-foreground">
            {t({
              ar: "«جاهز» يتطلب تقييمًا معتمدًا يبلغ الحد المطلوب؛ الحد شرط وليس نسبة إنجاز. فئات المصنع التشغيلية منفصلة عن موضوعات المستثمر ولا تُخلط درجاتهما.",
              en: "“Ready” requires an approved assessment that meets the required bar; the bar is a condition, not a completion rate. The factory's operational categories are separate from the investor topics and their scores are never mixed.",
            })}
          </p>
        </div>
        <div className="flex flex-col gap-2 self-start">
          <Link
            to="/preview/web-v1/companies/$symbol"
            params={{ symbol: sym }}
            search={{ tab: "coverage" }}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-[13px] hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            data-overview-data-link="coverage"
          >
            <Database className="size-4 text-brand" aria-hidden />
            {t({ ar: "تغطية المصنع في بيانات معرفة", en: "Factory coverage in Marefa Data" })}
          </Link>
          <Link
            to="/preview/web-v1/companies/$symbol"
            params={{ symbol: sym }}
            search={{ tab: "financials" }}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-[13px] hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            data-overview-data-link="financials"
          >
            <Database className="size-4 text-brand" aria-hidden />
            {t({
              ar: "القوائم والمصادر في بيانات معرفة",
              en: "Statements and sources in Marefa Data",
            })}
          </Link>
        </div>
      </section>
    </PreviewContainer>
  );
}

// ───────────────────────── أجزاء

function Card({
  title,
  hint,
  more,
  children,
  className,
  data,
}: {
  title: LocalizedText;
  hint?: LocalizedText;
  more?: ReactNode;
  children: ReactNode;
  className?: string;
  data: string;
}) {
  const { t } = useI18n();
  const id = `ov-${data}`;
  return (
    <section
      className={cn("min-w-0 rounded-2xl border border-border/70 bg-card p-5", className)}
      data-overview-card={data}
      aria-labelledby={id}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 id={id} className="text-[15px] font-bold">
            {t(title)}
          </h2>
          {hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{t(hint)}</p>}
        </div>
        {more && <div className="shrink-0 text-[12px]">{more}</div>}
      </header>
      {children}
    </section>
  );
}

/** رابط عميق إلى «تحليل الشركة»: الموضوع والمقياس إن وُجد؛ الصفحة الهدف تمرّر إليه وتبرزه. */
function IntelLink({
  p,
  target,
  compact = false,
}: {
  p: CompanyPreview;
  target: IntelTarget;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Link
      to="/preview/web-v1/companies/$symbol/intelligence"
      params={{ symbol: p.company.symbol }}
      search={target.focus ? { topic: target.topic, focus: target.focus } : { topic: target.topic }}
      className="inline-flex items-center gap-1 font-medium text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      data-intel-link={target.focus ? `${target.topic}:${target.focus}` : target.topic}
    >
      {compact
        ? t({ ar: "التحليل", en: "Analysis" })
        : t({ ar: "التحليل التفصيلي", en: "Detailed analysis" })}
      <ArrowLeft className="size-3.5 ltr:rotate-180" aria-hidden />
    </Link>
  );
}

function Source({ href }: { href: string }) {
  const { t } = useI18n();
  const safe = safeSourceUrl(href);
  if (!safe) return null;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground hover:underline"
      data-source-link
    >
      {t({ ar: "المصدر", en: "Source" })}
      <ArrowUpRight className="size-3" aria-hidden />
    </a>
  );
}

function Meta({ asOf, href }: { asOf?: string | null; href: string }) {
  const { t } = useI18n();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
      {asOf && (
        <span>
          {t({ ar: "كما في ", en: "As of " })}
          <span className="num">{iso(asOf)}</span>
        </span>
      )}
      <Source href={href} />
    </div>
  );
}

function FactItem({ f }: { f: OverviewFact }) {
  const { t } = useI18n();
  return (
    <div className="min-w-0" data-overview-fact={f.key}>
      <dt className="text-[12px] text-muted-foreground">{t(f.label)}</dt>
      <dd className="mt-0.5 text-[13px] leading-6 [overflow-wrap:anywhere]" dir="auto">
        {f.text}
        <LanguageMark text={f.text} />
      </dd>
      <Meta asOf={f.asOf} href={f.sourceUrl} />
    </div>
  );
}

function CellList({
  cells,
  p,
}: {
  cells: ReturnType<typeof buildOverview>["operations"]["cells"];
  p: CompanyPreview;
}) {
  const { t } = useI18n();
  return (
    <ul className="divide-y divide-border/60">
      {cells.map((c) => (
        <li key={c.key} className="py-2.5" data-overview-metric={c.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-[13px]">{t(c.label)}</span>
            <span className="num shrink-0 text-[14px] font-semibold">{t(c.display)}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
            <span>{t(c.period.label)}</span>
            <IntelLink p={p} target={c.target} compact />
            <Source href={c.proof.sourceUrl} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function WithheldNote({ n }: { n: number }) {
  const { t } = useI18n();
  if (!n) return null;
  return (
    <p
      className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground"
      data-overview-withheld={n}
    >
      <EyeOff className="size-3.5" aria-hidden />
      {t({
        ar: `${iso(n)} قيمة محجوبة لا تُعرض؛ السبب في التحليل التفصيلي.`,
        en: `${n} withheld value(s) not shown; the reason is in the detailed analysis.`,
      })}
    </p>
  );
}

function StateRow({ ok, label }: { ok: boolean; label: LocalizedText }) {
  const { t } = useI18n();
  return (
    <li className="flex items-center justify-between gap-2">
      <span>{t(label)}</span>
      <span className="text-muted-foreground">
        {ok
          ? t({ ar: "موثقة", en: "Documented" })
          : t({ ar: "لا بيانات موثقة", en: "No documented data" })}
      </span>
    </li>
  );
}

function Empty({ text }: { text: LocalizedText }) {
  const { t } = useI18n();
  return <p className="text-[13px] text-muted-foreground">{t(text)}</p>;
}
