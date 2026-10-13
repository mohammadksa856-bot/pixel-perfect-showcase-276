import type { ReactNode } from "react";
import { Panel } from "@/components/cards";
import { DataTable } from "@/components/company-sections";
import { PeerComparisonPanel } from "@/components/peer-comparison-panel";
import { useI18n, type LocalizedText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  Block,
  CompanyPreview,
  HistorySeries,
  MetricGroup,
  Topic,
  TopicStatus,
  ValueCell,
  WithheldReason,
} from "@/lib/engine/company-preview";
import type { PeerTable } from "@/lib/engine/peer-comparison";
import type { Readiness, ReadinessState } from "@/lib/engine/readiness";
import { iso } from "@/lib/bidi";

/**
 * مكونات معاينة صفحة الشركة من المحرك (P02). تعرض نموذج العرض كما بُني على الخادم:
 * لا حساب ولا تقدير هنا، وكل رقم يظهر بفترته ووحدته ومصدره وحالة إثباته.
 */

const STATUS: Record<TopicStatus, { label: LocalizedText; icon: string; className: string }> = {
  available: {
    label: { ar: "مكتمل", en: "Complete" },
    icon: "✓",
    className: "text-tone-emerald border-tone-emerald/40",
  },
  partial: {
    label: { ar: "جزئي", en: "Partial" },
    icon: "◐",
    className: "text-tone-amber border-tone-amber/40",
  },
  unavailable: {
    label: { ar: "غير متوفر", en: "Unavailable" },
    icon: "✕",
    className: "text-tone-rose border-tone-rose/40",
  },
  not_measured: {
    label: { ar: "غير مقاس", en: "Not measured" },
    icon: "?",
    className: "text-muted-foreground border-border",
  },
};

const WITHHELD: Record<WithheldReason, LocalizedText> = {
  quality_flagged: { ar: "عليها علامة جودة سلبية", en: "Quality-flagged" },
  non_numeric_value: { ar: "قيمة غير رقمية", en: "Non-numeric value" },
  unit_conflict: { ar: "الوحدة لا تتسق مع معنى المقياس", en: "Unit inconsistent with the metric" },
  period_kind_mismatch: {
    ar: "فترة لا تخص هذا القسم",
    en: "Period does not belong to this section",
  },
  no_source: { ar: "بلا مصدر", en: "No source" },
  unsafe_source_url: { ar: "رابط مصدر غير صالح", en: "Invalid source link" },
  calculated_without_formula: {
    ar: "محسوبة دون معادلة مسجّلة",
    en: "Calculated without a recorded formula",
  },
  calculated_inputs_not_reproduced: {
    ar: "محسوبة، ولم يُعِد المحرك إنتاج مدخلاتها",
    en: "Calculated; the engine has not reproduced its inputs",
  },
};

const PEER_REASONS: Record<string, LocalizedText> = {
  no_other_peer_with_comparable_facts: {
    ar: "لا توجد في المحرك شركة من الصناعة نفسها ببيانات قابلة للمقارنة.",
    en: "The engine has no company in the same industry with comparable data.",
  },
  sector_fallback_not_comparable: {
    ar: "لا توجد شركة من الصناعة نفسها؛ المقارنة مع شركات قطاع أوسع بنموذج أعمال مختلف حُجبت.",
    en: "No company in the same industry; comparison against a broader sector with a different business model is withheld.",
  },
  too_few_companies: {
    ar: "عدد الشركات ذات البيانات المتطابقة الفترة أقل من الحد الأدنى.",
    en: "Too few companies with same-period data.",
  },
};

export function StatusChip({ status }: { status: TopicStatus }) {
  const { t } = useI18n();
  const s = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        s.className,
      )}
      data-status={status}
    >
      <span aria-hidden>{s.icon}</span>
      {t(s.label)}
    </span>
  );
}

function SourceLink({ href, children }: { href: string; children?: ReactNode }) {
  const { t } = useI18n();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
      {children ?? t({ ar: "المصدر", en: "Source" })}
      <span aria-hidden> ↗</span>
    </a>
  );
}

function ProofBadge({ cell }: { cell: ValueCell }) {
  const { t } = useI18n();
  const p = cell.proof;
  const calculated = p.kind === "calculated_inputs_reproduced";
  const importOnly = p.document === "import_file_only";
  const text = importOnly
    ? p.page
      ? {
          ar: `ملف إدخال · ص ${iso(p.page)} · الأصل غير مؤرشف`,
          en: `Import file · p. ${p.page} · original not archived`,
        }
      : { ar: "ملف إدخال · الأصل غير مؤرشف", en: "Import file · original not archived" }
    : calculated
      ? { ar: "محسوب · مدخلاته مُعاد إنتاجها", en: "Calculated · inputs reproduced" }
      : p.kind === "reported_extracted"
        ? p.page
          ? { ar: `منشور · ص ${iso(p.page)}`, en: `Reported · p. ${p.page}` }
          : { ar: "منشور · مستخرج", en: "Reported · extracted" }
        : { ar: "منشور · من بيان مراجَع", en: "Reported · reviewed manifest" };
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px]",
        importOnly
          ? "bg-tone-amber/10 text-tone-amber"
          : calculated
            ? "bg-tone-indigo/10 text-tone-indigo"
            : "bg-muted text-muted-foreground",
      )}
      title={p.formula ?? undefined}
      data-proof={p.kind}
      data-document={p.document}
    >
      {t(text)}
    </span>
  );
}

function MetricTable({ group }: { group: MetricGroup }) {
  const { t } = useI18n();
  return (
    <Panel title={t(group.title)}>
      {group.cells.length > 0 && (
        // الهاتف: بطاقات متراصة بدل جدول من أربعة أعمدة.
        <ul className="divide-y divide-border/60 sm:hidden" data-mobile-list>
          {group.cells.map((c) => (
            <li key={c.key} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px]">{t(c.label)}</span>
                <span className="shrink-0 text-[14px] font-semibold tabular-nums">
                  {t(c.display)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>{t(c.period.label)}</span>
                <ProofBadge cell={c} />
                <SourceLink href={c.proof.sourceUrl} />
              </div>
              {c.proof.formula && (
                <div
                  className="mt-1 break-all font-mono text-[10px] text-muted-foreground"
                  dir="ltr"
                >
                  {c.proof.formula}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {group.cells.length > 0 && (
        <div className="hidden sm:block">
          <DataTable
            headers={[
              t({ ar: "البند", en: "Item" }),
              t({ ar: "القيمة", en: "Value" }),
              t({ ar: "الفترة", en: "Period" }),
              t({ ar: "الإثبات", en: "Proof" }),
            ]}
          >
            {group.cells.map((c) => (
              <tr
                key={c.key}
                className="border-b border-border/60 align-top"
                data-metric={c.key}
                data-period-kind={c.period.kind}
              >
                <td className="py-2.5 pe-3">{t(c.label)}</td>
                <td className="py-2.5 pe-3 font-semibold tabular-nums">{t(c.display)}</td>
                <td className="py-2.5 pe-3 text-[12px] text-muted-foreground">
                  {t(c.period.label)}
                </td>
                <td className="py-2.5 pe-3 text-[12px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <ProofBadge cell={c} />
                    <SourceLink href={c.proof.sourceUrl} />
                  </div>
                  {c.proof.formula && (
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground" dir="ltr">
                      {c.proof.formula}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
      {group.withheld.length > 0 && (
        <div
          className="mt-4 rounded-xl border border-tone-rose/30 bg-tone-rose/5 p-3 text-[12px]"
          data-withheld
        >
          <div className="font-semibold">
            {t({ ar: "قيم محجوبة لا تُعرض", en: "Withheld values (not shown)" })}
          </div>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {group.withheld.map((w) => (
              <li key={w.key}>
                {t(w.label)}: {t(WITHHELD[w.reason])}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/** عمود واحد لكل مقياس، خط أساس عند الصفر، وتسمية أول قيمة وآخرها فقط. */
function HistoryChart({ series }: { series: HistorySeries }) {
  const { t, dir } = useI18n();
  const values = series.points.map((p) => p.value);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;
  const H = 160;
  const zeroY = (max / span) * H;
  const last = series.points.length - 1;
  return (
    <figure className="rounded-xl bg-muted/40 p-4" data-chart={series.key}>
      <figcaption className="mb-3 text-[12px] font-semibold">
        {t(series.label)}{" "}
        <span className="font-normal text-muted-foreground">
          · {t({ ar: "سنوي", en: "Annual" })}
        </span>
      </figcaption>
      <div className="flex items-stretch gap-2" style={{ height: H }} dir="ltr">
        {series.points.map((p, i) => {
          const h = (Math.abs(p.value) / span) * H;
          const top = p.value >= 0 ? zeroY - h : zeroY;
          return (
            <div
              key={p.periodEnd}
              className="group relative flex-1"
              aria-label={`${t(p.label)}: ${t(p.display)}`}
              role="img"
            >
              <div
                className={cn(
                  "absolute inset-x-1",
                  p.value >= 0 ? "rounded-t-[4px] bg-brand" : "rounded-b-[4px] bg-tone-rose",
                )}
                style={{ top, height: Math.max(h, 1) }}
              />
              {(i === 0 || i === last) && (
                <div
                  dir={dir}
                  className="absolute inset-x-0 text-center text-[10px] font-semibold tabular-nums"
                  style={{ top: p.value >= 0 ? Math.max(top - 16, 0) : top + h + 2 }}
                >
                  {t(p.display)}
                </div>
              )}
              <div
                dir={dir}
                className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[11px] shadow group-hover:block"
              >
                {t(p.label)}: {t(p.display)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 border-t border-border" />
      <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground" dir="ltr">
        {series.points.map((p) => (
          <div key={p.periodEnd} className="flex-1 text-center">
            {p.periodEnd.slice(0, 4)}
          </div>
        ))}
      </div>
      <details className="mt-3 text-[12px]">
        <summary className="cursor-pointer text-muted-foreground">
          {t({ ar: "عرض كجدول", en: "Show as table" })}
        </summary>
        <table className="mt-2 w-full">
          <tbody>
            {series.points.map((p) => (
              <tr key={p.periodEnd} className="border-b border-border/50">
                <td className="py-1">{t(p.label)}</td>
                <td className="py-1 tabular-nums">{t(p.display)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function BlockView({
  block,
  preview,
  peers,
}: {
  block: Block;
  preview: CompanyPreview;
  peers: PeerTable | null;
}) {
  const { t } = useI18n();
  switch (block.type) {
    case "metrics":
      return <MetricTable group={block.group} />;
    case "facts":
      return (
        <Panel>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {block.facts.map((f) => (
              <div key={f.key} data-fact={f.key}>
                <dt className="text-[11px] text-muted-foreground">{t(f.label)}</dt>
                <dd className="mt-0.5 text-sm leading-6" dir="auto">
                  {f.text}
                </dd>
                <dd className="text-[10px] text-muted-foreground">
                  {f.asOf && t({ ar: `كما في ${iso(f.asOf)} · `, en: `As of ${f.asOf} · ` })}
                  <SourceLink href={f.sourceUrl} />
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      );
    case "segments": {
      const max = Math.max(...block.rows.map((r) => Math.abs(r.value)));
      return (
        <Panel title={t(block.title)}>
          <ul className="space-y-3">
            {block.rows.map((r) => (
              <li key={r.segment} data-segment>
                <div className="flex justify-between gap-3 text-sm">
                  <span dir="auto">{r.segment}</span>
                  <span className="font-semibold tabular-nums">{t(r.display)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-brand"
                    style={{ width: `${(Math.abs(r.value) / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {t(block.rows[0]!.period.label)} · <SourceLink href={block.rows[0]!.proof.sourceUrl} />
          </p>
        </Panel>
      );
    }
    case "history":
      return (
        <Panel title={t({ ar: "التاريخ السنوي", en: "Annual history" })}>
          {block.series.length ? (
            <div className={cn("grid gap-4", block.series.length > 1 && "md:grid-cols-2")}>
              {block.series.map((s) => (
                <HistoryChart key={s.key} series={s} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" data-history-empty>
              {t({
                ar: "لا تكفي السنوات المالية المتاحة لرسم اتجاه (يلزم عامان صالحان على الأقل).",
                en: "Not enough annual periods to draw a trend (at least two valid years are needed).",
              })}
            </p>
          )}
        </Panel>
      );
    case "ownership":
      return (
        <Panel title={t({ ar: "كبار الملاك", en: "Major holders" })}>
          <DataTable
            headers={[
              t({ ar: "المالك", en: "Holder" }),
              t({ ar: "النسبة", en: "Stake" }),
              t({ ar: "كما في", en: "As of" }),
              "",
            ]}
          >
            {block.rows.map((r) => (
              <tr key={r.holder} className="border-b border-border/60">
                <td className="py-2.5 pe-3" dir="auto">
                  {r.holder}
                </td>
                <td className="py-2.5 pe-3 font-semibold tabular-nums" dir="ltr">
                  {(r.pct * 100).toFixed(2)}%
                </td>
                <td className="py-2.5 pe-3 text-[12px] text-muted-foreground">{r.asOf}</td>
                <td className="py-2.5 text-[12px]">
                  <SourceLink href={r.sourceUrl} />
                </td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      );
    case "actions":
      return (
        <Panel title={t({ ar: "إجراءات الشركة", en: "Corporate actions" })}>
          <DataTable
            headers={[
              t({ ar: "الإجراء", en: "Action" }),
              t({ ar: "المبلغ", en: "Amount" }),
              t({ ar: "التاريخ", en: "Date" }),
              "",
            ]}
          >
            {block.rows.map((r, i) => (
              <tr key={`${r.title}-${i}`} className="border-b border-border/60">
                <td className="py-2.5 pe-3" dir="auto">
                  {r.title}
                </td>
                <td className="py-2.5 pe-3 tabular-nums">{r.amount ? t(r.amount) : "—"}</td>
                <td className="py-2.5 pe-3 text-[12px] text-muted-foreground">{r.date ?? "—"}</td>
                <td className="py-2.5 text-[12px]">
                  <SourceLink href={r.sourceUrl} />
                </td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      );
    case "documents":
      return (
        <Panel
          title={t({ ar: "مستندات وإفصاحات رسمية", en: "Official documents and disclosures" })}
        >
          <ul className="divide-y divide-border/60">
            {block.rows.slice(0, 15).map((d, i) => (
              <li
                key={`${d.sourceUrl}-${i}`}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span dir="auto">{d.title}</span>
                <span className="shrink-0 text-[12px] text-muted-foreground">
                  {d.date ?? ""} · <SourceLink href={d.sourceUrl} />
                </span>
              </li>
            ))}
          </ul>
          {block.rows.length > 15 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t({
                ar: `يُعرض ${iso(15)} من ${iso(block.rows.length)}`,
                en: `Showing 15 of ${block.rows.length}`,
              })}
            </p>
          )}
        </Panel>
      );
    case "market":
      return (
        <Panel title={t({ ar: "آخر سعر إغلاق مسجّل", en: "Latest recorded close" })}>
          {block.latest ? (
            <div data-market>
              <div className="text-2xl font-bold tabular-nums">{t(block.latest.close)}</div>
              <div className="mt-1 text-[12px] text-muted-foreground">
                {t({
                  ar: `جلسة ${iso(block.latest.observedAt)} · `,
                  en: `Session ${block.latest.observedAt} · `,
                })}
                <SourceLink href={block.latest.sourceUrl} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t({
                  ar: `سعر تاريخي وليس سعرًا حيًا. سجل الأسعار لدى المحرك جزئي (${iso(block.historyCount)} جلسة).`,
                  en: `Historical close, not a live price. The engine's price history is partial (${block.historyCount} sessions).`,
                })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t({
                ar: "لا يوجد سعر مسجّل بمصدر صالح.",
                en: "No recorded price with a valid source.",
              })}
            </p>
          )}
        </Panel>
      );
    case "peers":
      return peers && peers.status === "available" ? (
        <PeerComparisonPanel table={peers} />
      ) : (
        <Panel>
          <p className="text-sm text-muted-foreground" data-peers-off>
            {peers
              ? t(
                  PEER_REASONS[peers.reason ?? ""] ?? {
                    ar: "لا تتوفر مقارنة موثوقة لهذه الشركة.",
                    en: "No reliable comparison is available for this company.",
                  },
                )
              : t({
                  ar: "مقارنة الشركات معطّلة في هذه البيئة.",
                  en: "Company comparison is disabled in this environment.",
                })}
          </p>
        </Panel>
      );
  }
}

export function TopicSection({
  topic,
  preview,
  peers,
}: {
  topic: Topic;
  preview: CompanyPreview;
  peers: PeerTable | null;
}) {
  const { t } = useI18n();
  return (
    <section
      id={`topic-${topic.ordinal}`}
      className="scroll-mt-24"
      data-topic={topic.key}
      data-topic-status={topic.status}
    >
      <div className="mb-4 mt-12 flex flex-wrap items-center gap-3 border-b border-border pb-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-brand-foreground">
          {topic.ordinal}
        </span>
        <h2 className="text-lg font-bold">{t(topic.title)}</h2>
        <StatusChip status={topic.status} />
        {topic.score !== null && (
          <span className="text-[11px] text-muted-foreground">
            {t({
              ar: `تغطية الموضوع في المحرك ${iso((topic.score * 100).toFixed(0) + "%")}`,
              en: `Engine topic coverage ${(topic.score * 100).toFixed(0)}%`,
            })}
          </span>
        )}
      </div>
      {topic.reasons.length > 0 && (
        <ul className="mb-4 space-y-1 text-[12px] text-muted-foreground" data-reasons>
          {topic.reasons.map((r) => (
            <li key={r.en}>• {t(r)}</li>
          ))}
        </ul>
      )}
      {topic.blocks.length === 0 ? (
        <p
          className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground"
          data-empty
        >
          {t({ ar: "لا تُعرض بيانات لهذا الموضوع.", en: "No data is shown for this topic." })}
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {topic.blocks.map((b, i) => (
            <div
              key={i}
              className={cn(
                "min-w-0",
                (b.type === "metrics" || b.type === "history" || b.type === "peers") &&
                  "lg:col-span-2",
              )}
            >
              <BlockView block={b} preview={preview} peers={peers} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function TopicOverview({ topics }: { topics: Topic[] }) {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t({ ar: "موضوعات المستثمر", en: "Investor topics" })}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
    >
      {topics.map((topic) => (
        <a
          key={topic.key}
          href={`#topic-${topic.ordinal}`}
          className="rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-brand/50"
        >
          <div className="text-[10px] text-muted-foreground">{topic.ordinal}</div>
          <div className="mt-0.5 text-[12px] font-semibold leading-5">{t(topic.title)}</div>
          <div className="mt-2">
            <StatusChip status={topic.status} />
          </div>
        </a>
      ))}
    </nav>
  );
}

const READINESS: Record<ReadinessState, { label: LocalizedText; className: string }> = {
  ready: {
    label: { ar: "جاهز", en: "Ready" },
    className: "text-tone-emerald border-tone-emerald/40",
  },
  not_ready: {
    label: { ar: "غير جاهز", en: "Not ready" },
    className: "text-tone-amber border-tone-amber/40",
  },
  not_assessed: {
    label: { ar: "لم يُقيَّم", en: "Not assessed" },
    className: "text-night-foreground/60 border-night-foreground/30",
  },
};

const READINESS_MODEL: Record<Readiness["model"], LocalizedText> = {
  investor_topics: { ar: "جاهزية موضوعات المستثمر (18)", en: "Investor topics readiness (18)" },
  operational_categories: {
    ar: "جاهزية الفئات التشغيلية (18)",
    en: "Operational categories readiness (18)",
  },
};

/**
 * بطاقة جاهزية لنموذج واحد. «لم يُقيَّم» لا تُعرض معها درجة ولا شريط تقدّم،
 * و«جاهز» لا تظهر إلا كما طبّعها `normalizeReadiness` (المعيار 95 ثابت).
 */
export function ReadinessCard({ readiness }: { readiness: Readiness }) {
  const { t } = useI18n();
  const s = READINESS[readiness.state];
  return (
    <div
      className="bg-night px-3.5 py-3"
      data-readiness-model={readiness.model}
      data-readiness-state={readiness.state}
    >
      <div className="text-[10px] text-night-foreground/50">
        {t(READINESS_MODEL[readiness.model])}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
            s.className,
          )}
        >
          {t(s.label)}
        </span>
        {readiness.state !== "not_assessed" && readiness.score !== null && (
          <span className="text-[13px] font-semibold tabular-nums">
            {t({
              ar: `${iso(readiness.score.toFixed(1))} من ${iso(readiness.target)}`,
              en: `${readiness.score.toFixed(1)} of ${readiness.target}`,
            })}
          </span>
        )}
      </div>
    </div>
  );
}
