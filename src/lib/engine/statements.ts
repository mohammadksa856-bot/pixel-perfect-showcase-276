/**
 * WEB-03: القوائم المالية متعددة الفترات (سنوي / ربعي / منذ بداية السنة).
 *
 * تُبنى من سجل المحرك (`financials.history`) ومن لقطة YTD، بنفس قواعد الثقة في P02:
 * كل خلية تمر عبر `pickValue` (المصدر، الوحدة، نوع الفترة، علامات الجودة، إعادة إنتاج المشتقات).
 * لا تحسب الواجهة أي رقم، ولا تملأ فترة غائبة، ولا تحسب نسب التغيّر.
 */
import type { LocalizedText } from "@/lib/i18n";
import {
  BALANCE,
  CASH_FLOW,
  INCOME,
  RATIOS,
  labelOf,
  pickValue,
  type CompanyKind,
  type EngineMetricRow,
  type EnginePage,
  type ValueCell,
  type WithheldReason,
} from "./company-preview";

export type StatementMode = "annual" | "quarter" | "ytd";
export type StatementSection = "income" | "balance" | "cash_flow" | "per_share" | "ratios";

/** خلية مختصرة: القيمة والعرض والإثبات فقط (التسمية والفترة في رأس الجدول). */
export type SlimCell = {
  value: number;
  display: LocalizedText;
  proof: Pick<ValueCell["proof"], "kind" | "page" | "sourceUrl" | "document">;
};
const slim = (c: ValueCell): SlimCell => ({
  value: c.value,
  display: c.display,
  proof: {
    kind: c.proof.kind,
    page: c.proof.page,
    sourceUrl: c.proof.sourceUrl,
    document: c.proof.document,
  },
});

export type StatementCell =
  | { state: "value"; cell: SlimCell }
  | { state: "withheld"; reason: WithheldReason }
  | { state: "missing" };

export type StatementRow = {
  key: string;
  label: LocalizedText;
  section: StatementSection;
  /** وحدة الصف كما في أول قيمة مقبولة (SAR، SAR/share، ratio…). null إن لم تُقبل أي قيمة. */
  unit: string | null;
  currency: string | null;
  cells: StatementCell[];
};

export type StatementView = {
  mode: StatementMode;
  status: "available" | "unavailable";
  /** سبب عدم التوفر كما يرسله المحرك أو من الواجهة (لا فترات). */
  reason: string | null;
  periods: { end: string; label: LocalizedText }[];
  rows: StatementRow[];
  /** المصادر المستخدمة فعليًا في الخلايا المقبولة، لكل فترة. */
  sources: { periodEnd: string; url: string; filingType: string | null }[];
};

const PER_SHARE = new Set([
  "basic_eps",
  "eps_diluted",
  "dividends_per_share",
  "book_value_per_share",
]);
const isRatio = (k: string) =>
  /(_margin|_ratio|^return_on_|_growth$|_cagr|_coverage$|turnover$)/.test(k) ||
  RATIOS.ordinary.includes(k);

function sectionOf(key: string, kind: CompanyKind, position: boolean): StatementSection {
  if (PER_SHARE.has(key)) return "per_share";
  if (isRatio(key)) return "ratios";
  if (position || BALANCE[kind].includes(key)) return "balance";
  if (CASH_FLOW.includes(key) || /cash_flow|capex/.test(key)) return "cash_flow";
  return "income";
}

const SECTION_ORDER: StatementSection[] = ["income", "balance", "cash_flow", "per_share", "ratios"];

function orderKey(key: string, kind: CompanyKind): number {
  const lists = [INCOME[kind], BALANCE[kind], CASH_FLOW, [...PER_SHARE], RATIOS[kind]];
  let base = 0;
  for (const l of lists) {
    const i = l.indexOf(key);
    if (i >= 0) return base + i;
    base += 100;
  }
  return 1000;
}

type PeriodSource = { end: string; metrics: Record<string, EngineMetricRow[]>; expected: string };

function buildView(
  mode: StatementMode,
  kind: CompanyKind,
  sources: PeriodSource[][],
  unavailableReason: string | null,
): StatementView {
  const byEnd = new Map<
    string,
    { metrics: Record<string, EngineMetricRow[]>; expected: string }[]
  >();
  for (const list of sources)
    for (const p of list)
      byEnd.set(p.end, [...(byEnd.get(p.end) ?? []), { metrics: p.metrics, expected: p.expected }]);
  // الأحدث أولًا، كما في منصات المعلومات المالية.
  const ends = [...byEnd.keys()].sort((a, b) => b.localeCompare(a));
  if (!ends.length)
    return {
      mode,
      status: "unavailable",
      reason: unavailableReason ?? "no_periods",
      periods: [],
      rows: [],
      sources: [],
    };

  const keys = new Map<string, boolean>(); // key → from position history
  for (const end of ends)
    for (const part of byEnd.get(end)!)
      for (const k of Object.keys(part.metrics))
        keys.set(k, keys.get(k) || part.expected === "instant");

  const periodLabels = new Map<string, LocalizedText>();
  const used = new Map<string, { url: string; filingType: string | null }>();
  const rows: StatementRow[] = [];
  for (const [key, position] of keys) {
    let unit: string | null = null;
    let currency: string | null = null;
    let label: LocalizedText | null = null;
    const cells: StatementCell[] = ends.map((end) => {
      const part = byEnd.get(end)!.find((x) => x.metrics[key]);
      if (!part) return { state: "missing" };
      const rows = part.metrics[key];
      label ??= labelOf(key, rows?.[0]);
      const picked = pickValue(key, rows, part.expected);
      if (picked.ok === true) {
        unit ??= picked.cell.unit;
        currency ??= rows?.[0]?.currency ?? null;
        if (!periodLabels.has(end) || part.expected !== "instant")
          periodLabels.set(end, picked.cell.period.label);
        if (!used.has(end))
          used.set(end, {
            url: picked.cell.proof.sourceUrl,
            filingType: picked.cell.proof.filingType,
          });
        return { state: "value", cell: slim(picked.cell) };
      }
      if (picked.ok === false) return { state: "withheld", reason: picked.reason };
      return { state: "missing" };
    });
    if (cells.every((c) => c.state === "missing")) continue;
    rows.push({
      key,
      label: label ?? labelOf(key),
      section: sectionOf(key, kind, position),
      unit,
      currency,
      cells,
    });
  }
  rows.sort(
    (a, b) =>
      SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section) ||
      orderKey(a.key, kind) - orderKey(b.key, kind),
  );
  return {
    mode,
    status: "available",
    reason: null,
    periods: ends.map((end) => ({
      end,
      label: periodLabels.get(end) ?? { ar: end, en: end },
    })),
    rows,
    sources: ends.filter((e) => used.has(e)).map((e) => ({ periodEnd: e, ...used.get(e)! })),
  };
}

export function buildStatements(page: EnginePage, kind: CompanyKind): StatementView[] {
  const fin = page.sections.financials;
  const h = fin.history;
  const hist = (x: typeof h.annual | undefined, expected: string): PeriodSource[] =>
    (x?.periods ?? []).map((p) => ({ end: p.period_end, metrics: p.metrics ?? {}, expected }));

  const annual = buildView(
    "annual",
    kind,
    [hist(h?.annual, "fy"), hist(h?.annual_position, "instant")],
    h?.annual?.reason ?? null,
  );
  const quarter = buildView(
    "quarter",
    kind,
    [hist(h?.quarter, "quarter")],
    h?.quarter?.reason ?? null,
  );
  const ytdEnd = fin.ytd?.period_end ?? null;
  const ytd = buildView(
    "ytd",
    kind,
    fin.ytd?.status === "available" && ytdEnd
      ? [[{ end: ytdEnd, metrics: fin.ytd.metrics ?? {}, expected: "ytd" }]]
      : [],
    fin.ytd?.reason ?? null,
  );
  return [annual, quarter, ytd];
}

/** أرقام المفتاح أعلى الصفحة: من آخر سنة مالية فقط، ومن الخلايا المقبولة فقط. */
const KEY_FIGURES: Record<CompanyKind, string[]> = {
  ordinary: [
    "revenue",
    "net_income",
    "total_assets",
    "total_equity",
    "basic_eps",
    "dividends_per_share",
  ],
  bank: [
    "net_financing_income",
    "total_operating_income",
    "net_income_parent",
    "total_assets",
    "customer_deposits",
    "total_equity",
  ],
  insurer: [
    "insurance_revenue",
    "insurance_service_result",
    "net_income",
    "total_assets",
    "total_equity",
    "insurance_contract_liabilities",
  ],
};

export type KeyFigure =
  | { key: string; label: LocalizedText; state: "value"; cell: ValueCell }
  | { key: string; label: LocalizedText; state: "withheld"; reason: WithheldReason }
  | { key: string; label: LocalizedText; state: "missing" };

export function keyFigures(page: EnginePage, kind: CompanyKind): KeyFigure[] {
  const fin = page.sections.financials;
  return KEY_FIGURES[kind].map((key) => {
    const position = BALANCE[kind].includes(key) || ["total_assets", "total_equity"].includes(key);
    const snap = position ? fin.instant : fin.annual;
    const rows = snap?.metrics?.[key];
    const label = labelOf(key, rows?.[0]);
    const picked = pickValue(key, rows, position ? "instant" : "fy");
    if (picked.ok === true) return { key, label, state: "value", cell: picked.cell };
    if (picked.ok === false) return { key, label, state: "withheld", reason: picked.reason };
    return { key, label, state: "missing" };
  });
}
