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

/**
 * لوحة تغطية المصنع: الفئات التشغيلية الـ18 بحدودها وبواباتها وحقولها وأسبابها.
 * لا تقرأ درجة موضوعات المستثمر إطلاقًا. الدرجة تظهر فقط حين يكون التقييم صالحًا.
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
  const counts = factory.categories.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});
  const firstFailing =
    openKey ??
    factory.categories.find((c) => c.gates.some((g) => g.status === "failed"))?.key ??
    undefined;

  return (
    <div className="space-y-6" data-factory-panel data-factory-state={r.state}>
      {/* الملخص */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-border/70 bg-card p-5 lg:col-span-2">
          <div className="text-[12px] text-muted-foreground">
            {t({ ar: "جاهزية عقد المصنع", en: "Factory contract readiness" })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Pill meta={READINESS_META[r.state]} size="md" data-state={r.state} />
            {r.score !== null ? (
              <span className="num text-3xl font-bold tracking-tight" dir="ltr" data-factory-score>
                {iso(r.score.toFixed(1))}
                <span className="text-base font-medium text-muted-foreground">
                  {" "}
                  / {iso(r.target)}
                </span>
              </span>
            ) : (
              r.state !== "not_assessed" && <Pill meta={WITHHELD_META} size="md" />
            )}
          </div>
          {r.score !== null && (
            <div className="mt-4">
              <ScoreBar value={r.score / 100} threshold={r.target / 100} tone="warn" />
            </div>
          )}
          <p className="mt-4 text-[12px] leading-6 text-muted-foreground">
            {t({
              ar: "متوسط موزون للفئات الثماني عشرة، لكنه لا يكفي وحده: كل فئة يجب أن تبلغ حدّها، وكل بوابة صارمة يجب أن تنجح، والتقييم يجب أن يُعتمد. هذا المقياس منفصل عن تغطية موضوعات المستثمر.",
              en: "A weighted average of the 18 categories, but it is not enough on its own: every category must meet its threshold, every hard gate must pass and the assessment must be approved. This measure is separate from investor-topic coverage.",
            })}
          </p>
          {factory.sectorPack && (
            <p className="mt-2 text-[12px] text-muted-foreground">
              {t({ ar: "حزمة القطاع: ", en: "Sector pack: " })}
              <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5">
                {factory.sectorPack}
              </code>
            </p>
          )}
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

      {/* توزيع الحالات */}
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

      {/* الفئات الـ18 */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="hidden grid-cols-[2.5rem_minmax(10rem,1.6fr)_4rem_minmax(9rem,1.4fr)_7.5rem_8rem] items-center gap-3 border-b border-border px-4 py-2.5 text-[11px] text-muted-foreground md:grid">
          <span>#</span>
          <span>{t({ ar: "الفئة", en: "Category" })}</span>
          <span>{t({ ar: "الوزن", en: "Weight" })}</span>
          <span>
            {t({ ar: "الدرجة مقابل الحد", en: "Score vs threshold" })}
            <span className="ms-1 inline-block h-2.5 w-0.5 rounded bg-status-target align-middle" />
          </span>
          <span>{t({ ar: "الحالة", en: "Status" })}</span>
          <span>{t({ ar: "البوابات", en: "Gates" })}</span>
        </div>
        <ol className="divide-y divide-border/60">
          {factory.categories.map((c) => (
            <CategoryRow key={c.key} c={c} open={c.key === firstFailing} />
          ))}
        </ol>
      </div>
      <p className="text-[12px] leading-6 text-muted-foreground">
        {t({
          ar: "الفئة المستثناة بقاعدة قطاعية لا تُعرض لها درجة ولا تُحسب مكتملة. نصوص الشروط والحقول كما يرسلها المحرك بالإنجليزية.",
          en: "A category excluded by a sector rule shows no score and never counts as complete. Condition texts and field names are shown as the engine sends them, in English.",
        })}
      </p>
    </div>
  );
}

function CategoryRow({ c, open }: { c: FactoryCategory; open: boolean }) {
  const { t } = useI18n();
  const meta = FACTORY_META[c.status];
  const passed = c.gates.filter((g) => g.status === "passed").length;
  const failed = c.gates.filter((g) => g.status === "failed").length;
  const pending = c.gates.filter((g) => g.status === "not_evaluated").length;
  return (
    <li data-category={c.key} data-category-status={c.status}>
      <details open={open} className="group">
        <summary className="grid cursor-pointer list-none grid-cols-[2rem_1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 hover:bg-muted/40 md:grid-cols-[2.5rem_minmax(10rem,1.6fr)_4rem_minmax(9rem,1.4fr)_7.5rem_8rem]">
          <span className="num text-[12px] text-muted-foreground">{iso(c.ordinal)}</span>
          <span className="text-[13px] font-semibold">{t(c.title)}</span>
          <span className="num hidden text-[12px] text-muted-foreground md:inline">
            {c.weight !== null ? iso(c.weight) : "—"}
          </span>
          <span className="col-span-3 md:col-span-1">
            {c.score !== null ? (
              <ScoreBar value={c.score} threshold={c.threshold} tone={meta.tone} />
            ) : (
              <span className="text-[12px] text-muted-foreground">
                {c.status === "not_applicable_by_rule"
                  ? t({ ar: "لا درجة: مستثناة بقاعدة", en: "No score: excluded by rule" })
                  : t({ ar: "لا درجة دون تقييم", en: "No score without an assessment" })}
              </span>
            )}
          </span>
          <span className="col-start-3 row-start-1 md:col-auto md:row-auto">
            <Pill meta={meta} />
          </span>
          <span className="col-span-3 flex items-center gap-2 text-[12px] md:col-span-1">
            {c.gates.length === 0 ? (
              <span className="text-muted-foreground">
                {t({ ar: "لا بوابات", en: "No gates" })}
              </span>
            ) : (
              <>
                <GateCount n={passed} tone="ok" />
                <GateCount n={failed} tone="bad" />
                <GateCount n={pending} tone="neutral" />
              </>
            )}
          </span>
        </summary>
        <CategoryDetails c={c} />
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

function CategoryDetails({ c }: { c: FactoryCategory }) {
  const { t } = useI18n();
  const f = c.fields;
  const missing = c.missingFields.flatMap((g) => g.fields.map((x) => ({ g: g.group, x })));
  return (
    <div className="grid gap-4 border-t border-border/60 bg-background/40 px-4 py-4 text-[12px] md:grid-cols-3">
      <div className="space-y-2">
        <h4 className="font-semibold">{t({ ar: "الحد والحقول", en: "Threshold and fields" })}</h4>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
          <dt>{t({ ar: "حد الفئة", en: "Category threshold" })}</dt>
          <dd className="num text-foreground">
            {c.threshold !== null ? iso(`${(c.threshold * 100).toFixed(0)}%`) : "—"}
          </dd>
          <dt>{t({ ar: "الحقول المعبأة", en: "Fields populated" })}</dt>
          <dd className="num text-foreground">
            {f.populated !== null && f.expected !== null
              ? iso(`${f.populated} / ${f.expected}`)
              : "—"}
          </dd>
          <dt>{t({ ar: "الحقول الإلزامية", en: "Required fields" })}</dt>
          <dd className="num text-foreground">
            {f.populatedRequired !== null && f.required !== null
              ? iso(`${f.populatedRequired} / ${f.required}`)
              : "—"}
          </dd>
        </dl>
        {c.fieldGroups.length > 0 && (
          <div className="flex flex-wrap gap-1" dir="ltr">
            {c.fieldGroups.map((g) => (
              <code key={g} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                {g}
              </code>
            ))}
          </div>
        )}
        {c.exclusionRule && (
          <p className="rounded-lg border border-status-excluded/30 bg-status-excluded/5 p-2">
            {t({ ar: "مستثناة بقاعدة: ", en: "Excluded by rule: " })}
            <code dir="ltr">
              {c.exclusionRule.pack} · {c.exclusionRule.rule}
            </code>
          </p>
        )}
        <p className="text-muted-foreground">
          {t({ ar: "المصادر الرسمية: ", en: "Official sources: " })}
          {c.officialSources?.length ? (
            <span dir="ltr">{c.officialSources.join(", ")}</span>
          ) : (
            t({ ar: "لم يسلّمها عقد الصفحة بعد", en: "not delivered by the page contract yet" })
          )}
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">{t({ ar: "البوابات الصارمة", en: "Hard gates" })}</h4>
        {c.gates.length === 0 ? (
          <p className="text-muted-foreground">
            {t({
              ar: "لا بوابات في التقييم، وهذا لا يُعد نجاحًا.",
              en: "No gates in the assessment; this does not count as a pass.",
            })}
          </p>
        ) : (
          <ul className="space-y-2">
            {c.gates.map((g) => (
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
          {t({ ar: "الحقول الناقصة", en: "Missing fields" })}{" "}
          <span className="num text-muted-foreground">({iso(missing.length)})</span>
        </h4>
        {missing.length === 0 ? (
          <p className="text-muted-foreground">—</p>
        ) : (
          <div className="flex flex-wrap gap-1" dir="ltr">
            {missing.slice(0, 18).map(({ g, x }) => (
              <code key={`${g}.${x}`} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                {x}
              </code>
            ))}
            {missing.length > 18 && (
              <span className="text-[11px] text-muted-foreground">+{missing.length - 18}</span>
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
