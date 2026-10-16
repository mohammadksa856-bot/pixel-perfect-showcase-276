import { useMemo, useState } from "react";
import { ExternalLink, EyeOff } from "lucide-react";
import { useI18n, type LocalizedText } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { cn } from "@/lib/utils";
import { AMOUNT_UNITS, type CompanyKind, type WithheldReason } from "@/lib/engine/company-preview";
import type {
  KeyFigure,
  StatementMode,
  StatementRow,
  StatementSection,
  StatementView,
} from "@/lib/engine/statements";

/**
 * WEB-03: مستكشف القوائم المالية. جدول متعدد الفترات مع تبديل الفترة والمقياس، ورسم اتجاه للصف المختار.
 * يعرض فقط ما قبلته قواعد الثقة؛ المحجوب يظهر بسببه، والغائب «—». لا حساب ولا تقدير هنا.
 */

const MODES: { mode: StatementMode; label: LocalizedText }[] = [
  { mode: "annual", label: { ar: "سنوي", en: "Annual" } },
  { mode: "quarter", label: { ar: "ربعي", en: "Quarterly" } },
  { mode: "ytd", label: { ar: "منذ بداية السنة", en: "Year to date" } },
];
const SECTIONS: Record<StatementSection, LocalizedText> = {
  income: { ar: "قائمة الدخل", en: "Income statement" },
  balance: { ar: "المركز المالي (كما في نهاية الفترة)", en: "Financial position (period end)" },
  cash_flow: { ar: "التدفقات النقدية", en: "Cash flows" },
  per_share: { ar: "بيانات السهم", en: "Per share" },
  ratios: { ar: "النسب", en: "Ratios" },
};
const KIND_NOTE: Record<CompanyKind, LocalizedText> = {
  ordinary: {
    ar: "مقاييس الشركات غير المالية: الإيرادات والربحية والتدفق النقدي الحر.",
    en: "Non-financial company metrics: revenue, profitability and free cash flow.",
  },
  bank: {
    ar: "مقاييس البنوك: صافي دخل التمويل والودائع والقروض. التدفق النقدي الحر لا يُقارن للبنوك.",
    en: "Bank metrics: net financing income, deposits and loans. Free cash flow is not compared for banks.",
  },
  insurer: {
    ar: "مقاييس التأمين وفق IFRS 17: إيرادات التأمين ونتيجة خدمات التأمين.",
    en: "Insurance metrics under IFRS 17: insurance revenue and insurance service result.",
  },
};
const UNAVAILABLE: Record<string, LocalizedText> = {
  no_quarter_history: {
    ar: "لا توجد أرباع منفردة في المحرك لهذه الشركة.",
    en: "The engine has no single-quarter periods for this company.",
  },
  no_ytd_facts: {
    ar: "لا توجد أرقام منذ بداية السنة في المحرك لهذه الشركة.",
    en: "The engine has no year-to-date figures for this company.",
  },
  no_periods: { ar: "لا توجد فترات.", en: "No periods." },
};
const NO_PERIODS: LocalizedText = { ar: "لا توجد فترات.", en: "No periods." };
export const WITHHELD_TEXT: Record<WithheldReason, LocalizedText> = {
  period_end_mismatch: {
    ar: "تاريخ نهاية الفترة لا يطابق العمود",
    en: "Period end does not match the column",
  },
  currency_mismatch: {
    ar: "بعملة غير عملة التقارير؛ لا تحويل",
    en: "In a currency other than the reporting currency; not converted",
  },
  source_conflict: {
    ar: "مصدران للفترة نفسها بقيمتين مختلفتين",
    en: "Two sources disagree for the same period",
  },
  not_in_statement_table: {
    ar: "لا تطابق خلية في جدول القوائم (فترة أو عملة أو نطاق مختلف)",
    en: "Does not match a statement-table cell (different period, currency or scope)",
  },
  quality_flagged: { ar: "عليها علامة جودة سلبية", en: "Quality-flagged" },
  non_numeric_value: { ar: "قيمة غير رقمية", en: "Non-numeric value" },
  unit_conflict: { ar: "الوحدة لا تتسق مع المقياس", en: "Unit inconsistent with the metric" },
  period_kind_mismatch: { ar: "فترة لا تخص هذا العرض", en: "Period does not belong here" },
  no_source: { ar: "بلا مصدر", en: "No source" },
  unsafe_source_url: { ar: "رابط مصدر غير آمن", en: "Unsafe source link" },
  calculated_without_formula: {
    ar: "محسوبة دون معادلة مسجّلة",
    en: "Calculated without a recorded formula",
  },
  calculated_inputs_not_reproduced: {
    ar: "محسوبة، ولم يُعِد المحرك إنتاج مدخلاتها",
    en: "Calculated; the engine did not reproduce its inputs",
  },
};

type Scale = 1e6 | 1e9;
const isAmount = (r: StatementRow) => r.unit !== null && AMOUNT_UNITS.has(r.unit);
const fmt = (n: number, digits: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function FinancialExplorer({
  views,
  kind,
  focusRow,
}: {
  views: StatementView[];
  kind: CompanyKind;
  /** WEB-07: رابط عميق إلى بند؛ تُفتح القائمة التي تحويه بدل الأولى. دونه السلوك كما في WEB-06. */
  focusRow?: string | undefined;
}) {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<StatementMode>(
    views.find((v) => v.status === "available")?.mode ?? "annual",
  );
  const view = views.find((v) => v.mode === mode)!;
  const amounts = view.rows.filter(isAmount);
  const maxAbs = Math.max(
    0,
    ...amounts.flatMap((r) =>
      r.cells.map((c) => (c.state === "value" ? Math.abs(c.cell.value) : 0)),
    ),
  );
  const [scale, setScale] = useState<Scale>(maxAbs >= 1e11 ? 1e9 : 1e6);
  const firstChartable = view.rows.find(
    (r) => isAmount(r) && r.cells.filter((c) => c.state === "value").length >= 2,
  );
  const [picked, setPicked] = useState<string | null>(null);
  // WEB-06 (D6): قائمة واحدة معروضة في كل مرة (تبويب)، وعرض مختصر افتراضي على الجوال.
  const [sectionPick, setSectionPick] = useState<StatementSection | null>(
    () => (focusRow && view.rows.find((r) => r.key === focusRow)?.section) || null,
  );
  const [allRows, setAllRows] = useState(false);
  const chartRow = view.rows.find((r) => r.key === picked) ?? firstChartable ?? null;
  // عملة الجدول من عقد الصفحة (عملة التقارير)؛ الخلايا بعملة أخرى محجوبة في نموذج العرض.
  const currency = view.currency ?? "SAR";
  const scaleLabel = (s: Scale): LocalizedText =>
    s === 1e9
      ? { ar: `مليار ${currency === "SAR" ? "ريال" : currency}`, en: `${currency} bn` }
      : { ar: `مليون ${currency === "SAR" ? "ريال" : currency}`, en: `${currency} m` };

  const sections = useMemo(() => {
    const m = new Map<StatementSection, StatementRow[]>();
    for (const r of view.rows) m.set(r.section, [...(m.get(r.section) ?? []), r]);
    return [...m.entries()];
  }, [view]);
  const section: StatementSection | null =
    sections.find(([s]) => s === sectionPick)?.[0] ?? sections[0]?.[0] ?? null;
  const sectionRows = sections.find(([s]) => s === section)?.[1] ?? [];
  // بند «مؤهل للعرض المختصر»: له قيمة معروضة واحدة على الأقل في نموذج العرض. لا حساب ولا ملء.
  const hasValue = (r: StatementRow) => r.cells.some((c) => c.state === "value");
  const condensedCount = sectionRows.filter(hasValue).length;
  const condensed = !allRows && condensedCount < sectionRows.length;
  const counts = view.rows.reduce(
    (acc, r) => {
      for (const c of r.cells) acc[c.state]++;
      return acc;
    },
    { value: 0, withheld: 0, missing: 0 },
  );

  return (
    <section
      className="rounded-2xl border border-border/70 bg-card"
      data-financial-explorer
      data-mode={mode}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 p-4">
        <div role="tablist" className="flex rounded-xl bg-muted p-1" data-period-tabs>
          {MODES.map((m) => {
            const v = views.find((x) => x.mode === m.mode)!;
            const off = v.status !== "available";
            return (
              <button
                key={m.mode}
                type="button"
                role="tab"
                aria-selected={mode === m.mode}
                disabled={off}
                onClick={() => {
                  setMode(m.mode);
                  setPicked(null);
                }}
                title={off ? t(UNAVAILABLE[v.reason ?? "no_periods"] ?? NO_PERIODS) : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                  mode === m.mode ? "bg-card text-foreground shadow-card" : "text-muted-foreground",
                  off && "cursor-not-allowed opacity-40",
                )}
              >
                {t(m.label)}
                {!off && (
                  <span className="num ms-1 text-muted-foreground">{iso(v.periods.length)}</span>
                )}
              </button>
            );
          })}
        </div>
        {amounts.length > 0 && (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            {t({ ar: "المبالغ بـ", en: "Amounts in" })}
            <div className="flex rounded-lg border border-border p-0.5" data-scale>
              {([1e6, 1e9] as Scale[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScale(s)}
                  className={cn(
                    "rounded-md px-2 py-1",
                    scale === s ? "bg-brand text-brand-foreground" : "hover:text-foreground",
                  )}
                >
                  {t(scaleLabel(s))}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="px-4 pt-3 text-[12px] text-muted-foreground">{t(KIND_NOTE[kind])}</p>

      {view.status !== "available" ? (
        <p className="p-4 text-sm text-muted-foreground" data-period-unavailable>
          {t(UNAVAILABLE[view.reason ?? "no_periods"] ?? NO_PERIODS)}
        </p>
      ) : (
        <>
          {chartRow && (
            <TrendChart
              row={chartRow}
              periods={view.periods.map((p) =>
                mode === "annual" ? p.end.slice(0, 4) : p.end.slice(0, 7),
              )}
              scale={scale}
              unitLabel={t(scaleLabel(scale))}
            />
          )}
          {sections.length > 1 && (
            <div
              role="tablist"
              aria-label={t({ ar: "القوائم", en: "Statements" })}
              className="scrollbar-none flex gap-1 overflow-x-auto border-b border-border/70 px-4 py-2"
              data-section-tabs
            >
              {sections.map(([s, rows]) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={s === section}
                  onClick={() => {
                    setSectionPick(s);
                    setAllRows(false);
                  }}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand",
                    // D11: المحدد نص فاتح على خلفية مظللة بإطار، لا أبيض على الأزرق (3.46:1).
                    s === section
                      ? "bg-brand/15 font-semibold text-foreground ring-1 ring-brand/60"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  data-section-tab={s}
                >
                  {t(SECTIONS[s])}
                  <span className="num ms-1">{iso(rows.length)}</span>
                </button>
              ))}
            </div>
          )}
          {condensedCount < sectionRows.length && (
            <div
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-2 text-[12px] sm:hidden"
              data-condensed-note={condensed ? "condensed" : "all"}
            >
              <span className="text-muted-foreground">
                {condensed
                  ? t({
                      ar: `عرض مختصر: ${iso(condensedCount)} من ${iso(sectionRows.length)} بندًا (البنود التي لها قيمة معروضة)`,
                      en: `Condensed view: ${condensedCount} of ${sectionRows.length} items (items with a shown value)`,
                    })
                  : t({
                      ar: `جميع البنود: ${iso(sectionRows.length)}`,
                      en: `All items: ${sectionRows.length}`,
                    })}
              </span>
              <button
                type="button"
                onClick={() => setAllRows((v) => !v)}
                aria-expanded={!condensed}
                className="rounded-lg border border-border px-2.5 py-1 font-medium hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                data-show-all-rows
              >
                {condensed
                  ? t({ ar: "عرض جميع البنود", en: "Show all items" })
                  : t({ ar: "عرض مختصر", en: "Condensed view" })}
              </button>
            </div>
          )}
          <div className="overflow-x-auto" data-statement-table>
            <table
              className="w-full border-separate border-spacing-0 text-[13px]"
              style={{ minWidth: 160 + view.periods.length * 104 }}
            >
              <thead>
                <tr className="text-[11px] text-muted-foreground">
                  <th className="sticky start-0 z-10 min-w-[9.5rem] bg-card px-4 py-2.5 text-start font-medium sm:min-w-[13rem]">
                    {t({ ar: "البند", en: "Line item" })}
                  </th>
                  {view.periods.map((p) => (
                    <th
                      key={p.end}
                      className="num px-3 py-2.5 text-end font-medium whitespace-nowrap"
                    >
                      {t(p.label)}
                    </th>
                  ))}
                </tr>
              </thead>
              {sections.map(([sec, rows]) => (
                // القوائم غير المختارة تبقى في الصفحة مخفية (hidden)، فلا يُحذف أي بند.
                <tbody key={sec} hidden={sec !== section} data-section={sec}>
                  <tr>
                    <th
                      colSpan={view.periods.length + 1}
                      className="sticky start-0 border-t border-border/70 bg-muted/40 px-4 py-2 text-start text-[11px] font-semibold text-muted-foreground"
                    >
                      {t(SECTIONS[sec])}
                    </th>
                  </tr>
                  {rows.map((r) => (
                    <tr
                      key={r.key}
                      data-row={r.key}
                      data-condensed-hidden={(condensed && !hasValue(r)) || undefined}
                      onClick={() => isAmount(r) && setPicked(r.key)}
                      className={cn(
                        "group",
                        condensed && !hasValue(r) && "max-sm:hidden",
                        isAmount(r) && "cursor-pointer",
                        chartRow?.key === r.key && "bg-brand/5",
                      )}
                    >
                      <th
                        scope="row"
                        className="sticky start-0 z-10 border-t border-border/50 bg-card px-4 py-2 text-start font-normal group-hover:bg-muted/30"
                      >
                        {t(r.label)}
                        {!isAmount(r) && r.unit && (
                          <span className="ms-1 text-[10px] text-muted-foreground" dir="ltr">
                            ({r.unit === "ratio" ? "%" : r.unit})
                          </span>
                        )}
                      </th>
                      {r.cells.map((c, i) => (
                        <td
                          key={view.periods[i]!.end}
                          className="num border-t border-border/50 px-3 py-2 text-end whitespace-nowrap"
                          data-cell={c.state}
                        >
                          {c.state === "value" ? (
                            <a
                              href={c.cell.proof.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-brand"
                              title={
                                (c.cell.proof.kind === "calculated_inputs_reproduced"
                                  ? t({
                                      ar: "محسوب بمعادلة مسجّلة",
                                      en: "Calculated, formula recorded",
                                    })
                                  : t({ ar: "منشور", en: "Reported" })) +
                                (c.cell.proof.page
                                  ? ` · ${locale === "ar" ? "ص" : "p."} ${c.cell.proof.page}`
                                  : "")
                              }
                            >
                              {isAmount(r)
                                ? iso(
                                    (c.cell.value < 0 ? "−" : "") +
                                      fmt(Math.abs(c.cell.value) / scale, 2),
                                  )
                                : t(c.cell.display)}
                            </a>
                          ) : c.state === "withheld" ? (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] text-status-withheld"
                              title={t(WITHHELD_TEXT[c.reason])}
                            >
                              <EyeOff className="size-3" />
                              {t({ ar: "محجوب", en: "Withheld" })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
          <footer className="space-y-2 border-t border-border/70 p-4 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="num">
                {t({ ar: "قيم معروضة", en: "Shown" })} {iso(counts.value)}
              </span>
              <span className="num text-status-withheld">
                {t({ ar: "محجوبة", en: "Withheld" })} {iso(counts.withheld)}
              </span>
              <span className="num">
                {t({ ar: "غير متوفرة", en: "Not available" })} {iso(counts.missing)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1" data-statement-sources>
              {t({ ar: "المصادر:", en: "Sources:" })}
              {view.sources.map((s) => (
                <a
                  key={s.periodEnd}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand hover:underline"
                >
                  <span className="num">{iso(s.periodEnd)}</span>
                  {s.filingType && <span dir="ltr">({s.filingType})</span>}
                  <ExternalLink className="size-3" />
                </a>
              ))}
            </div>
            <p>
              {t({
                ar: "اضغط على صف مبلغ لرسم اتجاهه. وجود المصدر لا يعني تحققًا مستقلًا. لا تُحسب نسب تغيّر في الواجهة.",
                en: "Click an amount row to chart it. A source is not independent verification. No change ratios are computed in the interface.",
              })}
            </p>
          </footer>
        </>
      )}
    </section>
  );
}

/** رسم أعمدة للصف المختار. المحور الزمني من اليسار (الأقدم) إلى اليمين في اللغتين، كعادة الرسوم المالية. */
function TrendChart({
  row,
  periods,
  scale,
  unitLabel,
}: {
  row: StatementRow;
  periods: string[];
  scale: number;
  unitLabel: string;
}) {
  const { t } = useI18n();
  const pts = row.cells.map((c, i) => ({ c, label: periods[i]! })).reverse(); // الأقدم أولًا
  const vals = pts.map((p) => (p.c.state === "value" ? p.c.cell.value / scale : null));
  const max = Math.max(0, ...vals.map((v) => v ?? 0));
  const min = Math.min(0, ...vals.map((v) => v ?? 0));
  const span = max - min || 1;
  const H = 150;
  const zero = (max / span) * H;
  return (
    <figure className="border-b border-border/70 px-4 py-4" data-trend-chart={row.key}>
      <figcaption className="mb-3 flex items-baseline justify-between gap-3 text-[12px]">
        <span className="font-semibold">{t(row.label)}</span>
        <span className="text-muted-foreground">{unitLabel}</span>
      </figcaption>
      <div dir="ltr" className="flex items-end gap-3" style={{ height: H + 36 }}>
        {pts.map((p, i) => {
          const v = vals[i] ?? null;
          const h = v === null ? 0 : (Math.abs(v) / span) * H;
          return (
            <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="relative w-full" style={{ height: H }}>
                {v === null ? (
                  <div
                    className="absolute inset-x-[18%] flex items-end justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground"
                    style={{ top: H - zero - 28, height: 28 }}
                  >
                    {p.c.state === "withheld" ? t({ ar: "محجوب", en: "withheld" }) : "—"}
                  </div>
                ) : (
                  <>
                    <div
                      className={cn(
                        "absolute inset-x-[18%] rounded-t-md",
                        v < 0 ? "bg-status-bad/80" : "bg-brand",
                      )}
                      style={v < 0 ? { top: zero, height: h } : { top: zero - h, height: h }}
                    />
                    <span
                      className="num absolute inset-x-0 text-center text-[11px] font-semibold"
                      style={{ top: v < 0 ? zero + h + 2 : Math.max(0, zero - h - 16) }}
                    >
                      {fmt(v, Math.abs(v) >= 100 ? 0 : 1)}
                    </span>
                  </>
                )}
              </div>
              <span className="num mt-2 truncate text-[11px] text-muted-foreground">{p.label}</span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

export function KeyFigures({ figures }: { figures: KeyFigure[] }) {
  const { t } = useI18n();
  return (
    <div
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60 sm:grid-cols-3 lg:grid-cols-6"
      data-key-figures
    >
      {figures.map((f) => (
        <div key={f.key} className="bg-card px-4 py-3" data-key-figure={f.key} data-state={f.state}>
          <div className="truncate text-[11px] text-muted-foreground">{t(f.label)}</div>
          {f.state === "value" ? (
            <>
              <a
                href={f.cell.proof.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="num mt-1 block truncate text-[15px] font-bold hover:text-brand"
              >
                {t(f.cell.display)}
              </a>
              <div className="num truncate text-[10px] text-muted-foreground">
                {t(f.period.label)}
                {f.cell.proof.page ? ` · ${t({ ar: "ص", en: "p." })} ${f.cell.proof.page}` : ""}
              </div>
            </>
          ) : f.state === "withheld" ? (
            <div
              className="mt-1 inline-flex items-center gap-1 text-[12px] text-status-withheld"
              title={t(WITHHELD_TEXT[f.reason])}
            >
              <EyeOff className="size-3.5" />
              {t({ ar: "محجوب", en: "Withheld" })}
            </div>
          ) : (
            <div className="mt-1 text-[12px] text-muted-foreground">
              {t({ ar: "غير متوفر", en: "Not available" })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
