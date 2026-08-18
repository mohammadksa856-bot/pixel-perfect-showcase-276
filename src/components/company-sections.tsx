import type { ReactNode } from "react";
import { Panel } from "@/components/cards";
import { useI18n, type LocalizedText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Company } from "@/data/types";

/** رأس فصل مرقّم — يقسّم صفحة الشركة الطويلة لسبعة فصول واضحة */
export function ChapterHead({
  num,
  title,
  subtitle,
  id,
}: {
  num: number;
  title: LocalizedText;
  subtitle: LocalizedText;
  id: string;
}) {
  const { t } = useI18n();
  return (
    <div id={id} className="mb-6 mt-14 flex items-center gap-3 border-b border-border pb-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-brand-foreground">
        {num}
      </span>
      <div>
        <h2 className="text-lg font-bold">{t(title)}</h2>
        <p className="text-[11px] text-muted-foreground">{t(subtitle)}</p>
      </div>
    </div>
  );
}

const readingClass = (r?: string) =>
  r === "good"
    ? "text-tone-emerald"
    : r === "warning"
      ? "text-tone-amber"
      : r === "bad"
        ? "text-tone-rose"
        : "";

/** بطاقة مقياس صغيرة (مربع رمادي فيه عنوان وقيمة) */
export function Metric({
  label,
  value,
  reading,
  hint,
}: {
  label: string;
  value: string;
  reading?: string | undefined;
  hint?: string | undefined;
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-lg font-semibold", readingClass(reading))} dir="auto">
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** صف "عنوان ← قيمة" بسيط */
export function Row({
  label,
  value,
  reading,
}: {
  label: string;
  value: string;
  reading?: string | undefined;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", readingClass(reading))}>{value}</span>
    </div>
  );
}

/** شريط نسبة أفقي */
export function PercentBar({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/** جدول عام بثيم المنصة */
export function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-start text-sm">
        <thead className="text-[11px] text-muted-foreground">
          <tr>
            {headers.map((h) => (
              <th key={h} className="border-b border-border pb-2.5 text-start font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** رسم أعمدة مصغّر */
export function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-20 items-end gap-1.5">
      {values.map((v, i) => (
        <div
          key={i}
          className={cn("flex-1 rounded-t", i === values.length - 1 ? "bg-brand" : "bg-brand/30")}
          style={{ height: `${Math.max((v / max) * 100, 6)}%` }}
        />
      ))}
    </div>
  );
}

const statusIcon = (s: string) => (s === "good" ? "✓" : s === "warning" ? "!" : "✕");
const statusClass = (s: string) =>
  s === "good"
    ? "bg-tone-emerald/15 text-tone-emerald"
    : s === "warning"
      ? "bg-tone-amber/15 text-tone-amber"
      : "bg-tone-rose/15 text-tone-rose";

/** قائمة نقاط بحالة ملوّنة */
export function StatusList({ items }: { items: { status: string; text: LocalizedText }[] }) {
  const { t } = useI18n();
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm">
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
              statusClass(item.status),
            )}
          >
            {statusIcon(item.status)}
          </span>
          <span className="text-muted-foreground">{t(item.text)}</span>
        </li>
      ))}
    </ul>
  );
}

/* ─────────── أقسام الفصول ─────────── */

/** بطاقة القرار السريع — شريط مضغوط يظهر أعلى صفحة الشركة فور فتحها */
export function DecisionCard({ company }: { company: Company }) {
  const { t } = useI18n();
  if (!company.decisionCard.length) return null;
  return (
    <div className="mt-6 border-t border-night-foreground/10 pt-4">
      <div className="mb-2 text-[10px] font-medium text-night-foreground/50">
        {t({ ar: "القرار السريع", en: "Quick decision" })}
      </div>
      <div className="flex flex-wrap gap-2">
        {company.decisionCard.map((d, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 rounded-lg border border-night-foreground/10 bg-night-foreground/5 px-2.5 py-1.5"
          >
            <span className="text-[10px] text-night-foreground/50">{t(d.label)}</span>
            <span
              className={cn("text-[12px] font-semibold", readingClass(d.reading))}
              dir="auto"
            >
              {t(d.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SegmentProfit({ company }: { company: Company }) {
  const { t } = useI18n();
  if (!company.segmentProfit.length) return null;
  return (
    <Panel title={t({ ar: "ربحية كل قطاع", en: "Profit by segment" })}>
      <p className="mb-3 text-[11px] text-muted-foreground">
        {t({
          ar: "الإيراد وحده مضلل — القطاع الأكبر مو دائماً الأربح",
          en: "Revenue alone misleads — the biggest segment isn't always the most profitable",
        })}
      </p>
      <DataTable
        headers={[
          t({ ar: "القطاع", en: "Segment" }),
          t({ ar: "من الإيراد", en: "of revenue" }),
          t({ ar: "من الربح", en: "of profit" }),
        ]}
      >
        {company.segmentProfit.map((s, i) => (
          <tr key={i} className="border-b border-border/50 last:border-0">
            <td className="py-2.5">{t(s.label)}</td>
            <td className="py-2.5 text-start" dir="ltr">
              {s.revenueShare}
            </td>
            <td className="py-2.5 text-start font-semibold" dir="ltr">
              {s.profitShare}
            </td>
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}

export function ManagementTeam({ company }: { company: Company }) {
  const { t } = useI18n();
  if (!company.managementTeam.length) return null;
  return (
    <Panel title={t({ ar: "الإدارة والحوكمة", en: "Management" })}>
      <DataTable
        headers={[
          t({ ar: "المنصب", en: "Role" }),
          t({ ar: "الاسم", en: "Name" }),
          t({ ar: "المدة", en: "Tenure" }),
        ]}
      >
        {company.managementTeam.map((m, i) => (
          <tr key={i} className="border-b border-border/50 last:border-0">
            <td className="py-2.5 text-muted-foreground">{t(m.role)}</td>
            <td className="py-2.5 font-medium">{t(m.name)}</td>
            <td className="py-2.5">{t(m.tenure)}</td>
          </tr>
        ))}
      </DataTable>
      {company.insiderOwnership && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {t({ ar: "ملكية الإدارة بالأسهم", en: "Insider ownership" })}: {company.insiderOwnership}
        </p>
      )}
    </Panel>
  );
}

export function QuarterlyResults({ company }: { company: Company }) {
  const { t } = useI18n();
  if (!company.quarterlyResults.length) return null;
  return (
    <Panel title={t({ ar: "الأداء الربعي", en: "Quarterly results" })}>
      <p className="mb-3 text-[11px] text-muted-foreground">
        {t({
          ar: "السنوية تخفي الزخم — الربعية تكشف الاتجاه الحالي",
          en: "Annual data hides momentum — quarterly reveals the current trend",
        })}
      </p>
      <DataTable
        headers={[
          t({ ar: "الربع", en: "Quarter" }),
          t({ ar: "الإيراد", en: "Revenue" }),
          t({ ar: "الربح", en: "Profit" }),
          t({ ar: "مقابل التوقعات", en: "vs estimate" }),
        ]}
      >
        {company.quarterlyResults.map((q, i) => (
          <tr key={i} className="border-b border-border/50 last:border-0">
            <td className="py-2.5 font-medium" dir="ltr">
              {q.quarter}
            </td>
            <td className="py-2.5" dir="ltr">
              {q.revenue}
            </td>
            <td className="py-2.5" dir="ltr">
              {q.profit}
            </td>
            <td className={cn("py-2.5 font-semibold", readingClass(q.reading))}>
              {t(q.vsEstimate)}
            </td>
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}

export function ShareCountPanel({ company }: { company: Company }) {
  const { t } = useI18n();
  const sc = company.shareCount;
  if (!sc.count) return null;
  return (
    <Panel title={t({ ar: "عدد الأسهم والتخفيف", en: "Share count & dilution" })}>
      <p className="mb-3 text-[11px] text-muted-foreground">
        {t({ ar: "هل تتآكل حصتك بصمت؟", en: "Is your stake being quietly diluted?" })}
      </p>
      <Row label={t({ ar: "عدد الأسهم", en: "Shares outstanding" })} value={sc.count} />
      <Row
        label={t({ ar: "التغير السنوي", en: "Yearly change" })}
        value={sc.yearChange}
        reading={
          sc.yearChange.startsWith("-") || sc.yearChange.startsWith("0") ? "good" : "warning"
        }
      />
      {sc.buyback.ar && (
        <Row label={t({ ar: "إعادة الشراء", en: "Buybacks" })} value={t(sc.buyback)} />
      )}
    </Panel>
  );
}

export function HistoricalValuation({ company }: { company: Company }) {
  const { t } = useI18n();
  if (!company.historicalValuation.length) return null;
  return (
    <Panel title={t({ ar: "التقييم التاريخي", en: "Historical valuation" })}>
      <p className="mb-3 text-[11px] text-muted-foreground">
        {t({
          ar: "هل السهم أغلى أو أرخص من متوسطه؟",
          en: "Is the stock rich or cheap vs its own history?",
        })}
      </p>
      <DataTable
        headers={[
          t({ ar: "المؤشر", en: "Metric" }),
          t({ ar: "الحالي", en: "Current" }),
          t({ ar: "متوسط 5 سنوات", en: "5y average" }),
          t({ ar: "القراءة", en: "Reading" }),
        ]}
      >
        {company.historicalValuation.map((h, i) => (
          <tr key={i} className="border-b border-border/50 last:border-0">
            <td className="py-2.5">{t(h.label)}</td>
            <td className="py-2.5" dir="ltr">
              {h.current}
            </td>
            <td className="py-2.5 text-muted-foreground" dir="ltr">
              {h.avg5y}
            </td>
            <td className={cn("py-2.5 font-semibold", readingClass(h.reading))}>
              {t(h.readingText)}
            </td>
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}

export function ValuationScenariosPanel({ company }: { company: Company }) {
  const { t } = useI18n();
  const s = company.valuationScenarios;
  if (!s.base.price) return null;
  return (
    <Panel title={t({ ar: "سيناريوهات التقييم", en: "Valuation scenarios" })}>
      <div className="grid grid-cols-3 gap-3">
        <Metric
          label={t({ ar: "متشائم", en: "Bear" })}
          value={s.bear.price}
          reading="bad"
          hint={s.bear.change}
        />
        <Metric label={t({ ar: "أساسي", en: "Base" })} value={s.base.price} hint={s.base.change} />
        <Metric
          label={t({ ar: "متفائل", en: "Bull" })}
          value={s.bull.price}
          reading="good"
          hint={s.bull.change}
        />
      </div>
    </Panel>
  );
}

export function RiskItems({ company }: { company: Company }) {
  const { t } = useI18n();
  if (!company.riskItems.length) return null;
  const kindClass = (k: string) =>
    k === "operational"
      ? "bg-tone-rose/15 text-tone-rose"
      : k === "regulatory"
        ? "bg-tone-amber/15 text-tone-amber"
        : k === "financial"
          ? "bg-tone-violet/15 text-tone-violet"
          : "bg-tone-sky/15 text-tone-sky";
  return (
    <Panel title={t({ ar: "المخاطر", en: "Risks" })}>
      <ul className="space-y-3">
        {company.riskItems.map((r, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <span
              className={cn(
                "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium",
                kindClass(r.kind),
              )}
            >
              {t(r.category)}
            </span>
            <span className="text-muted-foreground">{t(r.text)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
