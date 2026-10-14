import { useI18n, type LocalizedText } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { cn } from "@/lib/utils";
import {
  FACTORY_CATEGORIES,
  type FactoryCategory,
  type FactoryCoverage,
} from "@/lib/engine/readiness";
import { CONDITION_TEXT, readinessReason } from "@/lib/web-v1/model";
import {
  FACTORY_CONTRACT_SPEC,
  type FactoryCategorySpec,
} from "@/lib/web-v1/factory-contract.spec";
import {
  CONDITION_META,
  FACTORY_META,
  GATE_META,
  Pill,
  READINESS_META,
  ScoreBar,
  TONE_BAR,
  WITHHELD_META,
} from "./primitives";

const titleOf = (key: string): LocalizedText | undefined =>
  FACTORY_CATEGORIES.find((c) => c.key === key);
const specOf = (key: string): FactoryCategorySpec | undefined =>
  FACTORY_CONTRACT_SPEC.categories.find((c) => c.key === key);

const SOURCE_TYPES: Record<string, LocalizedText> = {
  issuer_audited_financial_statements: {
    ar: "القوائم المالية المدققة",
    en: "Audited financial statements",
  },
  issuer_annual_report: { ar: "التقرير السنوي", en: "Annual report" },
  issuer_investor_relations_site: { ar: "موقع علاقات المستثمرين", en: "Investor relations site" },
  issuer_investor_presentation: { ar: "عرض المستثمرين", en: "Investor presentation" },
  issuer_results_call_transcript: { ar: "نص مؤتمر النتائج", en: "Results call transcript" },
  exchange_disclosure_archive: { ar: "أرشيف إفصاحات السوق", en: "Exchange disclosure archive" },
  exchange_market_data_feed: { ar: "بيانات السوق من البورصة", en: "Exchange market data feed" },
  sector_regulator: { ar: "الجهة التنظيمية للقطاع", en: "Sector regulator" },
  company_registry: { ar: "السجل التجاري", en: "Company registry" },
  internal_computation: { ar: "حساب داخلي من مدخلات موثقة", en: "Internal computation" },
  licensed_data_vendor: { ar: "مزوّد بيانات مرخّص", en: "Licensed data vendor" },
};
const CADENCE: Record<string, LocalizedText> = {
  event_driven: { ar: "عند كل إفصاح جديد", en: "On each new filing" },
  periodic: { ar: "دوري", en: "Periodic" },
  continuous: { ar: "مستمر", en: "Continuous" },
  derived: { ar: "يتبع مدخلاته", en: "Follows its inputs" },
};

/**
 * WEB-04: لوحة عقد المصنع. الفئات التشغيلية الـ18 بتعريفاتها من العقد (الوزن، والحد، والمصادر، والبوابات،
 * والحداثة) وبقياساتها من تقييم المحرك فقط. لا تقرأ موضوعات المستثمر، ولا تعرض درجة دون تقييم صالح.
 */
export function FactoryPanel({
  factory,
  openKey,
}: {
  factory: FactoryCoverage;
  openKey?: string | undefined;
}) {
  const { t } = useI18n();
  const r = factory.readiness;
  const assessed = factory.categories.some((c) => c.status !== "not_assessed");
  const counts = factory.categories.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});
  const firstFailing =
    openKey ?? factory.categories.find((c) => c.gates.some((g) => g.status === "failed"))?.key;
  const spec = FACTORY_CONTRACT_SPEC;

  return (
    <div className="space-y-6" data-factory-panel data-factory-state={r.state}>
      <div
        className="rounded-xl border border-status-excluded/30 bg-status-excluded/5 px-4 py-3 text-[12px] leading-6"
        data-separation-note
      >
        {t({
          ar: "هذه فئات عقد المصنع التشغيلية الـ18، وتقيس اكتمال البيانات ومصادرها. وهي ليست موضوعات المستثمر الـ18 المعروضة في التبويبات الأخرى، ولا تُخلط درجاتهما.",
          en: "These are the factory contract's 18 operational categories; they measure data completeness and sourcing. They are not the 18 investor topics in the other tabs, and their scores are never mixed.",
        })}
      </div>

      {/* الملخص والشروط */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-border/70 bg-card p-5 lg:col-span-2">
          <div className="text-[12px] text-muted-foreground">
            {t({ ar: "جاهزية عقد المصنع", en: "Factory contract readiness" })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Pill meta={READINESS_META[r.state]} size="md" data-state={r.state} />
            {r.score !== null ? (
              <span className="num text-3xl font-bold tracking-tight" dir="ltr" data-factory-score>
                {r.score.toFixed(1)}
                <span className="text-base font-medium text-muted-foreground"> / {r.target}</span>
              </span>
            ) : r.state !== "not_assessed" ? (
              <Pill meta={WITHHELD_META} size="md" />
            ) : (
              <span className="text-[13px] text-muted-foreground">
                {t({
                  ar: "لا درجة دون تقييم معتمد",
                  en: "No score without an approved assessment",
                })}
              </span>
            )}
          </div>
          {r.score !== null && (
            <div className="mt-4">
              <ScoreBar value={r.score / 100} threshold={r.target / 100} tone="warn" />
            </div>
          )}
          <dl
            className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px] text-muted-foreground"
            data-assessment-meta
          >
            <dt>{t({ ar: "العقد", en: "Contract" })}</dt>
            <dd dir="ltr" className="text-start text-foreground">
              v{spec.source.contract_version} · {spec.source.commit} ·{" "}
              {spec.source.sha256.slice(0, 12)}
            </dd>
            <dt>{t({ ar: "آخر تقييم", en: "Last assessment" })}</dt>
            <dd className="num text-foreground" data-checked-at>
              {factory.checkedAt
                ? iso(factory.checkedAt.slice(0, 16).replace("T", " "))
                : t({ ar: "لم يُشغَّل", en: "Not run" })}
            </dd>
            <dt>{t({ ar: "حزمة القطاع", en: "Sector pack" })}</dt>
            <dd dir="ltr" className="text-start text-foreground">
              {factory.sectorPack ?? "—"}
            </dd>
          </dl>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 lg:col-span-3">
          <div className="text-[12px] text-muted-foreground">
            {t({ ar: "شروط «جاهز» (كلها مطلوبة)", en: "Conditions for “ready” (all required)" })}
          </div>
          <ul className="mt-3 divide-y divide-border/60" data-conditions>
            {factory.conditions.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-[13px]">{t(CONDITION_TEXT[c.key])}</span>
                <Pill meta={CONDITION_META[c.state]} data-state={c.state} />
              </li>
            ))}
          </ul>
          {r.reasons.length > 0 && (
            <details className="mt-3 text-[12px]">
              <summary className="cursor-pointer text-muted-foreground">
                {t({ ar: "أسباب عدم الجاهزية", en: "Why it is not ready" })} (
                {iso(r.reasons.length)})
              </summary>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {r.reasons.map((code) => (
                  <li key={code}>• {t(readinessReason(code, titleOf))}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>

      {/* خريطة الفئات الـ18 */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[14px] font-bold">
            {t({
              ar: "الفئات الثماني عشرة بنظرة واحدة",
              en: "The eighteen categories at a glance",
            })}
          </h3>
          <div className="flex flex-wrap gap-2" data-status-counts>
            {(Object.keys(FACTORY_META) as (keyof typeof FACTORY_META)[])
              .filter((s) => counts[s])
              .map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 text-[12px]">
                  <Pill meta={FACTORY_META[s]} />
                  <span className="num text-muted-foreground">× {iso(counts[s]!)}</span>
                </span>
              ))}
          </div>
        </div>
        <ol className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-9" data-category-map>
          {factory.categories.map((c) => {
            const meta = FACTORY_META[c.status];
            const s = specOf(c.key);
            return (
              <li key={c.key}>
                <a
                  href={`#cat-${c.key}`}
                  className="flex h-full flex-col justify-between rounded-lg border border-border/70 bg-card p-2 hover:border-brand/50"
                  title={t(meta.label)}
                >
                  <span className="flex items-center justify-between gap-1">
                    <span className="num text-[10px] text-muted-foreground">{iso(c.ordinal)}</span>
                    <span className={cn("size-2 rounded-full", TONE_BAR[meta.tone])} />
                  </span>
                  <span className="mt-1 line-clamp-2 text-[11px] font-medium leading-4">
                    {t(c.title)}
                  </span>
                  <span className="num mt-1 text-[10px] text-muted-foreground" dir="ltr">
                    {c.score !== null ? (
                      <>
                        <span className="font-semibold text-foreground">
                          {(c.score * 100).toFixed(0)}%
                        </span>
                        {" ≥ "}
                        {((c.threshold ?? s?.threshold ?? 0) * 100).toFixed(0)}%
                      </>
                    ) : (
                      <span dir="auto">{t(meta.label)}</span>
                    )}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>

      {/* الجدول التفصيلي */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="hidden grid-cols-[2rem_minmax(11rem,1.5fr)_3.5rem_4rem_minmax(8rem,1.2fr)_8rem_6rem_7.5rem] items-center gap-3 border-b border-border px-4 py-2.5 text-[11px] text-muted-foreground lg:grid">
          <span>#</span>
          <span>{t({ ar: "الفئة", en: "Category" })}</span>
          <span>{t({ ar: "الوزن", en: "Weight" })}</span>
          <span>{t({ ar: "الحد الأدنى", en: "Minimum" })}</span>
          <span>{t({ ar: "الدرجة الفعلية", en: "Actual score" })}</span>
          <span>
            {t({ ar: "الحقول: مكتملة/متوقعة · ناقصة", en: "Fields: complete/expected · missing" })}
          </span>
          <span>{t({ ar: "البوابات", en: "Gates" })}</span>
          <span>{t({ ar: "الحالة", en: "Status" })}</span>
        </div>
        <ol className="divide-y divide-border/60">
          {factory.categories.map((c) => (
            <CategoryRow key={c.key} c={c} open={c.key === firstFailing} />
          ))}
        </ol>
      </div>
      <p className="text-[12px] leading-6 text-muted-foreground">
        {assessed
          ? t({
              ar: "الوزن والحد والمصادر وشروط البوابات من تعريف العقد؛ الدرجات والحقول وحالات البوابات من تقييم المحرك. الفئة المستثناة بقاعدة لا تُعرض لها درجة ولا تُحسب مكتملة.",
              en: "Weights, thresholds, sources and gate conditions come from the contract definition; scores, fields and gate states from the engine assessment. A category excluded by a rule shows no score and never counts as complete.",
            })
          : t({
              ar: "لم يُشغَّل تقييم المصنع لهذه الشركة. يظهر تعريف العقد (الوزن والحد والمصادر والبوابات) دون أي درجة أو عدد حقول.",
              en: "The factory assessment has not been run for this company. The contract definition (weight, threshold, sources, gates) is shown without any score or field count.",
            })}
      </p>
    </div>
  );
}

function CategoryRow({ c, open }: { c: FactoryCategory; open: boolean }) {
  const { t, locale } = useI18n();
  const meta = FACTORY_META[c.status];
  const s = specOf(c.key);
  const weight = c.weight ?? s?.weight ?? null;
  const threshold = c.threshold ?? s?.threshold ?? null;
  const mismatch =
    (c.weight !== null && s && c.weight !== s.weight) ||
    (c.threshold !== null && s && c.threshold !== s.threshold);
  const passed = c.gates.filter((g) => g.status === "passed").length;
  const failed = c.gates.filter((g) => g.status === "failed").length;
  const pending = c.gates.filter((g) => g.status === "not_evaluated").length;
  const missingCount = c.missingFields.reduce((n, g) => n + g.fields.length, 0);
  const f = c.fields;
  return (
    <li
      id={`cat-${c.key}`}
      className="scroll-mt-32"
      data-category={c.key}
      data-category-status={c.status}
    >
      <details open={open} className="group">
        <summary className="grid cursor-pointer list-none grid-cols-[2rem_1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 hover:bg-muted/40 lg:grid-cols-[2rem_minmax(11rem,1.5fr)_3.5rem_4rem_minmax(8rem,1.2fr)_8rem_6rem_7.5rem]">
          <span className="num text-[12px] text-muted-foreground">{iso(c.ordinal)}</span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold">{c.title[locale]}</span>
            <span
              className="block truncate text-[11px] text-muted-foreground"
              dir={locale === "ar" ? "ltr" : "rtl"}
            >
              {c.title[locale === "ar" ? "en" : "ar"]}
            </span>
          </span>
          <span className="num hidden text-[12px] lg:inline" data-weight>
            {weight !== null ? iso(weight) : "—"}
          </span>
          <span className="num hidden text-[12px] lg:inline" data-threshold>
            {threshold !== null ? iso(`${(threshold * 100).toFixed(0)}%`) : "—"}
          </span>
          <span className="col-span-3 lg:col-span-1">
            {c.score !== null ? (
              <span data-score-bar>
                <ScoreBar value={c.score} threshold={threshold} tone={meta.tone} />
              </span>
            ) : (
              <span className="text-[12px] text-muted-foreground">
                {c.status === "not_applicable_by_rule"
                  ? t({ ar: "لا درجة: مستثناة بقاعدة", en: "No score: excluded by rule" })
                  : t({ ar: "غير مقاسة", en: "Not measured" })}
              </span>
            )}
          </span>
          <span className="num col-span-2 text-[12px] lg:col-span-1" data-field-counts>
            {f.expected !== null && f.populated !== null ? (
              <>
                {iso(`${f.populated}/${f.expected}`)}
                <span className="text-muted-foreground"> · </span>
                <span className={missingCount ? "text-status-bad" : "text-muted-foreground"}>
                  {iso(missingCount)} {t({ ar: "ناقص", en: "missing" })}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </span>
          <span className="flex items-center gap-2 text-[12px]">
            {c.gates.length === 0 ? (
              <span className="text-muted-foreground">
                {s?.hard_gates.length
                  ? t({
                      ar: `${s.hard_gates.length} لم تُقيَّم`,
                      en: `${s.hard_gates.length} not evaluated`,
                    })
                  : "—"}
              </span>
            ) : (
              <>
                <GateCount n={passed} tone="ok" />
                <GateCount n={failed} tone="bad" />
                <GateCount n={pending} tone="neutral" />
              </>
            )}
          </span>
          <span className="col-start-3 row-start-1 lg:col-auto lg:row-auto">
            <Pill meta={meta} />
          </span>
        </summary>
        <CategoryDetails
          c={c}
          spec={s}
          weight={weight}
          threshold={threshold}
          mismatch={!!mismatch}
        />
      </details>
    </li>
  );
}

function GateCount({ n, tone }: { n: number; tone: "ok" | "bad" | "neutral" }) {
  if (!n) return null;
  return (
    <span className="num inline-flex items-center gap-1">
      <span className={cn("size-2 rounded-full", TONE_BAR[tone])} />
      {iso(n)}
    </span>
  );
}

function CategoryDetails({
  c,
  spec,
  weight,
  threshold,
  mismatch,
}: {
  c: FactoryCategory;
  spec: FactoryCategorySpec | undefined;
  weight: number | null;
  threshold: number | null;
  mismatch: boolean;
}) {
  const { t } = useI18n();
  const f = c.fields;
  const missing = c.missingFields.flatMap((g) => g.fields.map((x) => ({ g: g.group, x })));
  const sources = c.officialSources ?? spec?.official_sources ?? [];
  const gates =
    c.gates.length > 0
      ? c.gates.map((g) => ({
          id: g.id,
          condition: g.condition,
          status: g.status,
          details: g.details,
        }))
      : (spec?.hard_gates ?? []).map((condition, i) => ({
          id: `${c.key}:${i + 1}`,
          condition,
          status: "not_evaluated" as const,
          details: [],
        }));
  return (
    <div className="grid gap-5 border-t border-border/60 bg-background/40 px-4 py-4 text-[12px] md:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-2">
        <h4 className="font-semibold">
          {t({ ar: "التعريف والحد", en: "Definition and threshold" })}
        </h4>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
          <dt>{t({ ar: "الوزن في المجموع", en: "Weight in total" })}</dt>
          <dd className="num text-foreground">{weight !== null ? iso(`${weight} / 100`) : "—"}</dd>
          <dt>{t({ ar: "الحد الأدنى للفئة", en: "Category minimum" })}</dt>
          <dd className="num text-foreground">
            {threshold !== null ? iso(`${(threshold * 100).toFixed(0)}%`) : "—"}
          </dd>
          <dt>{t({ ar: "الدرجة الفعلية", en: "Actual score" })}</dt>
          <dd className="num text-foreground">
            {c.score !== null
              ? iso(`${(c.score * 100).toFixed(1)}%`)
              : t({ ar: "غير مقاسة", en: "Not measured" })}
          </dd>
          <dt>{t({ ar: "الحقول المكتملة", en: "Fields complete" })}</dt>
          <dd className="num text-foreground">
            {f.populated !== null && f.expected !== null
              ? iso(`${f.populated} / ${f.expected}`)
              : "—"}
          </dd>
          <dt>{t({ ar: "الإلزامية المكتملة", en: "Required complete" })}</dt>
          <dd className="num text-foreground">
            {f.populatedRequired !== null && f.required !== null
              ? iso(`${f.populatedRequired} / ${f.required}`)
              : "—"}
          </dd>
          <dt>{t({ ar: "الناقصة", en: "Missing" })}</dt>
          <dd className="num text-foreground">{f.expected !== null ? iso(missing.length) : "—"}</dd>
        </dl>
        {mismatch && (
          <p className="rounded-lg border border-status-bad/30 bg-status-bad/5 p-2 text-status-bad">
            {t({
              ar: "الوزن أو الحد في التقييم يخالف تعريف العقد.",
              en: "Weight or threshold in the assessment differs from the contract.",
            })}
          </p>
        )}
        {c.exclusionRule && (
          <p className="rounded-lg border border-status-excluded/30 bg-status-excluded/5 p-2">
            {t({ ar: "مستثناة بقاعدة: ", en: "Excluded by rule: " })}
            <code dir="ltr">
              {c.exclusionRule.pack} · {c.exclusionRule.rule}
            </code>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">{t({ ar: "بوابات الجودة", en: "Quality gates" })}</h4>
        {gates.length === 0 ? (
          <p className="text-muted-foreground">
            {t({
              ar: "لا بوابات، وهذا لا يُعد نجاحًا.",
              en: "No gates; this does not count as a pass.",
            })}
          </p>
        ) : (
          <ul className="space-y-2">
            {gates.map((g) => (
              <li
                key={g.id}
                className="rounded-lg border border-border/70 p-2"
                data-gate={g.status}
              >
                <div className="flex items-center justify-between gap-2">
                  <code dir="ltr" className="text-[11px] text-muted-foreground">
                    {g.id}
                  </code>
                  <Pill meta={GATE_META[g.status]} />
                </div>
                <p
                  dir="ltr"
                  className="mt-1 text-start text-[11px] leading-5 text-muted-foreground"
                >
                  {g.condition}
                </p>
                {g.details.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1" dir="ltr">
                    {g.details.map((d) => (
                      <code key={d.key} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                        {d.key}={d.value}
                      </code>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">
          {t({ ar: "المصادر والوثائق", en: "Sources and documents" })}
        </h4>
        <ul className="space-y-1" data-official-sources>
          {sources.map((src) => (
            <li key={src} className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-brand" />
              {t(SOURCE_TYPES[src] ?? { ar: src, en: src })}
            </li>
          ))}
        </ul>
        {spec && (
          <>
            <p className="text-muted-foreground">
              {t({ ar: "إثبات مطلوب لكل قيمة: ", en: "Proof required per value: " })}
              <span dir="ltr">{spec.provenance_fields.join(", ")}</span>
            </p>
            <h4 className="pt-1 font-semibold">
              {t({ ar: "التحديث والحداثة", en: "Update and freshness" })}
            </h4>
            <p className="text-muted-foreground" data-freshness>
              {t(
                CADENCE[spec.freshness.cadence_kind] ?? {
                  ar: spec.freshness.cadence_kind,
                  en: spec.freshness.cadence_kind,
                },
              )}
              {spec.freshness.max_age_before_stale_days !== null &&
                t({
                  ar: ` · تصبح قديمة بعد ${spec.freshness.max_age_before_stale_days} يومًا`,
                  en: ` · stale after ${spec.freshness.max_age_before_stale_days} days`,
                })}
              {spec.freshness.recheck_interval_days !== null &&
                t({
                  ar: ` · إعادة فحص كل ${spec.freshness.recheck_interval_days} يومًا`,
                  en: ` · recheck every ${spec.freshness.recheck_interval_days} days`,
                })}
            </p>
          </>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">
          {t({ ar: "الحقول الناقصة والأسباب", en: "Missing fields and reasons" })}{" "}
          <span className="num text-muted-foreground">
            ({f.expected !== null ? iso(missing.length) : "—"})
          </span>
        </h4>
        {(c.fieldGroups.length > 0 ? c.fieldGroups : (spec?.field_groups ?? [])).length > 0 && (
          <div className="flex flex-wrap gap-1" dir="ltr">
            {(c.fieldGroups.length > 0 ? c.fieldGroups : (spec?.field_groups ?? [])).map((g) => (
              <code key={g} className="rounded border border-border px-1.5 py-0.5 text-[10px]">
                {g}
              </code>
            ))}
          </div>
        )}
        {missing.length > 0 && (
          <div className="flex flex-wrap gap-1" dir="ltr">
            {missing.slice(0, 16).map(({ g, x }) => (
              <code key={`${g}.${x}`} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                {x}
              </code>
            ))}
            {missing.length > 16 && (
              <span className="text-[11px] text-muted-foreground">+{missing.length - 16}</span>
            )}
          </div>
        )}
        {c.reasons.length > 0 && (
          <ul className="space-y-1 text-muted-foreground">
            {c.reasons.map((code) => (
              <li key={code}>• {t(readinessReason(code, titleOf))}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
