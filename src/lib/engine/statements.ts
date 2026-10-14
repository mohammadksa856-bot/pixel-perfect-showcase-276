/**
 * WEB-03: القوائم المالية متعددة الفترات (سنوي / ربعي / منذ بداية السنة).
 *
 * تُبنى من سجل المحرك (`financials.history`) ومن لقطة YTD، بنفس قواعد الثقة في P02:
 * كل خلية تمر عبر `pickValue` (المصدر، الوحدة، نوع الفترة، علامات الجودة، إعادة إنتاج المشتقات).
 * لا تحسب الواجهة أي رقم، ولا تملأ فترة غائبة، ولا تحسب نسب التغيّر.
 */
import type { LocalizedText } from "@/lib/i18n";
import {
  AMOUNT_UNITS,
  BALANCE,
  CASH_FLOW,
  INCOME,
  RATIOS,
  labelOf,
  pickValue,
  type CompanyKind,
  type EngineMetricRow,
  type Pick_,
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
  /** عملة الجدول: عملة التقارير للشركة. أي خلية بعملة أخرى محجوبة (لا تحويل). */
  currency: string | null;
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

const isConsolidatedRow = (r: EngineMetricRow) =>
  (r.scope ?? "consolidated") === "consolidated" && Object.keys(r.dimensions ?? {}).length === 0;

/** هل الوحدة مقوّمة بعملة؟ مبالغ (SAR) أو لكل وحدة (SAR/share، USD/bbl). */
const currencyOfUnit = (unit: string | null | undefined): string | null => {
  if (!unit) return null;
  if (AMOUNT_UNITS.has(unit)) return unit;
  const m = /^([A-Z]{3})\//.exec(unit);
  return m ? m[1]! : null;
};

/** صف بعملة غير عملة التقارير، أو عملته تخالف وحدته. لا تحويل: يُحجب. */
function currencyMismatch(row: EngineMetricRow, currency: string | null): boolean {
  const unitCur = currencyOfUnit(row.unit);
  const field = row.currency?.trim() || null;
  if (unitCur && field && unitCur !== field) return true;
  const cur = unitCur ?? field;
  return cur !== null && cur !== currency;
}

/**
 * اختيار قيمة لعمود محدد: النطاق موحّد بلا أبعاد، وperiod_end = نهاية العمود، وperiod_kind المتوقع،
 * والعملة عملة التقارير، ثم بقية فحوص P02 (pickValue). أي صف لا يطابق العمود لا يُنقل إلى عمود آخر.
 */
function pickForColumn(
  key: string,
  rows: EngineMetricRow[] | undefined,
  expected: string,
  end: string,
  currency: string | null,
): Pick_ {
  const consolidated = (rows ?? []).filter(isConsolidatedRow);
  if (!consolidated.length) return { ok: "missing" };
  const sameEnd = consolidated.filter((r) => r.period_end === end);
  if (!sameEnd.length) return { ok: false, reason: "period_end_mismatch" };
  const sameCurrency = sameEnd.filter((r) => !currencyMismatch(r, currency));
  if (!sameCurrency.length) return { ok: false, reason: "currency_mismatch" };
  return pickValue(key, sameCurrency, expected);
}

function buildView(
  mode: StatementMode,
  kind: CompanyKind,
  sources: PeriodSource[][],
  unavailableReason: string | null,
  currency: string | null,
  /** لقطات تكمّل أعمدة قائمة فقط (لا تضيف فترة)، ولمفاتيح القوائم فقط. */
  merges: PeriodSource[] = [],
): StatementView {
  const byEnd = new Map<string, PeriodSource[]>();
  for (const list of sources)
    for (const p of list) byEnd.set(p.end, [...(byEnd.get(p.end) ?? []), p]);
  // الأحدث أولًا، كما في منصات المعلومات المالية.
  const ends = [...byEnd.keys()].sort((a, b) => b.localeCompare(a));
  if (!ends.length)
    return {
      mode,
      status: "unavailable",
      reason: unavailableReason ?? "no_periods",
      currency,
      periods: [],
      rows: [],
      sources: [],
    };
  const mergeKeys = new Set(statementKeys(kind));
  const mergeByEnd = new Map<string, PeriodSource[]>();
  for (const m of merges)
    if (byEnd.has(m.end)) mergeByEnd.set(m.end, [...(mergeByEnd.get(m.end) ?? []), m]);

  const keys = new Map<string, boolean>(); // key → من المركز المالي
  for (const end of ends) {
    for (const part of byEnd.get(end)!)
      for (const k of Object.keys(part.metrics))
        keys.set(k, keys.get(k) || part.expected === "instant");
    for (const part of mergeByEnd.get(end) ?? [])
      for (const k of Object.keys(part.metrics))
        if (mergeKeys.has(k)) keys.set(k, keys.get(k) || part.expected === "instant");
  }

  const periodLabels = new Map<string, LocalizedText>();
  const used = new Map<string, { url: string; filingType: string | null }>();
  const rows: StatementRow[] = [];
  for (const [key, position] of keys) {
    let unit: string | null = null;
    let label: LocalizedText | null = null;
    const cells: StatementCell[] = ends.map((end) => {
      const parts = byEnd.get(end)!.filter((x) => x.metrics[key]);
      const extra = (mergeByEnd.get(end) ?? []).filter((x) => mergeKeys.has(key) && x.metrics[key]);
      if (!parts.length && !extra.length) return { state: "missing" };
      const firstRow = (parts[0] ?? extra[0])!.metrics[key]?.[0];
      label ??= labelOf(key, firstRow);
      const pick = (list: PeriodSource[]): Pick_ => {
        let res: Pick_ = { ok: "missing" };
        for (const part of list) {
          res = pickForColumn(key, part.metrics[key], part.expected, end, currency);
          if (res.ok === true) return res;
        }
        return res;
      };
      const hist = parts.length ? pick(parts) : ({ ok: "missing" } as Pick_);
      const snap = extra.length ? pick(extra) : ({ ok: "missing" } as Pick_);
      // مصدران للفترة نفسها: يجب أن يتفقا، وإلا تُحجب الخلية.
      if (hist.ok === true && snap.ok === true && hist.cell.value !== snap.cell.value)
        return { state: "withheld", reason: "source_conflict" };
      const picked =
        hist.ok === true ? hist : snap.ok === true ? snap : hist.ok === false ? hist : snap;
      if (picked.ok === true) {
        unit ??= picked.cell.unit;
        const fromPosition = picked.cell.period.kind === "instant";
        if (!periodLabels.has(end) || !fromPosition)
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
      currency: currencyOfUnit(unit) ?? (unit ? null : currency),
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
    currency,
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
  const currency = page.company.currency ?? null;
  const hist = (x: typeof h.annual | undefined, expected: string): PeriodSource[] =>
    (x?.periods ?? []).map((p) => ({ end: p.period_end, metrics: p.metrics ?? {}, expected }));
  const snap = (x: typeof fin.annual | undefined, expected: string): PeriodSource[] =>
    x?.status !== "unavailable" && x?.period_end
      ? [{ end: x.period_end, metrics: x.metrics ?? {}, expected }]
      : [];

  const annual = buildView(
    "annual",
    kind,
    [hist(h?.annual, "fy"), hist(h?.annual_position, "instant")],
    h?.annual?.reason ?? null,
    currency,
    // آخر سنة مالية وآخر مركز مالي يكمّلان العمود المطابق لتاريخهما فقط (لمفاتيح القوائم وأرقام المفتاح).
    [...snap(fin.annual, "fy"), ...snap(fin.instant, "instant")],
  );
  const quarter = buildView(
    "quarter",
    kind,
    [hist(h?.quarter, "quarter")],
    h?.quarter?.reason ?? null,
    currency,
  );
  const ytdEnd = fin.ytd?.period_end ?? null;
  const ytd = buildView(
    "ytd",
    kind,
    fin.ytd?.status === "available" && ytdEnd
      ? [[{ end: ytdEnd, metrics: fin.ytd.metrics ?? {}, expected: "ytd" }]]
      : [],
    fin.ytd?.reason ?? null,
    currency,
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

/** المفاتيح التي يجوز للقطات أن تكمّل بها جدول السنوي: بنود القوائم وأرقام المفتاح لنوع الشركة. */
function statementKeys(kind: CompanyKind): string[] {
  return [...INCOME[kind], ...BALANCE[kind], ...CASH_FLOW, ...PER_SHARE, ...KEY_FIGURES[kind]];
}

export type KeyFigure =
  | {
      key: string;
      label: LocalizedText;
      state: "value";
      cell: SlimCell;
      unit: string | null;
      period: { end: string; label: LocalizedText };
    }
  | { key: string; label: LocalizedText; state: "withheld"; reason: WithheldReason }
  | { key: string; label: LocalizedText; state: "missing" };

/**
 * WEB-03 (إصلاح القبول): رقم البطاقة هو خلية جدول السنوي نفسها لآخر فترة (المفتاح، والفترة،
 * والنطاق، والوحدة، والعملة). لا مصدر ثانٍ ولا بديل: insurance_revenue لا يُستبدل بـ revenue.
 */
export function keyFigures(
  page: EnginePage,
  kind: CompanyKind,
  statements: StatementView[] = buildStatements(page, kind),
): KeyFigure[] {
  const annual = statements.find((v) => v.mode === "annual");
  const latest = annual?.periods[0];
  const fin = page.sections.financials;
  return KEY_FIGURES[kind].map((key): KeyFigure => {
    const rawRows = fin.annual?.metrics?.[key] ?? fin.instant?.metrics?.[key];
    const row = annual?.rows.find((r) => r.key === key);
    const label = row?.label ?? labelOf(key, rawRows?.[0]);
    if (!latest || !row)
      // للمقياس قيمة في المحرك لكنها لم تدخل الجدول (فترة أو عملة أو نطاق مختلف): تُحجب بوضوح.
      return rawRows?.length
        ? { key, label, state: "withheld", reason: "not_in_statement_table" }
        : { key, label, state: "missing" };
    const c = row.cells[0]!;
    if (c.state === "value")
      return { key, label, state: "value", cell: c.cell, unit: row.unit, period: latest };
    if (c.state === "withheld") return { key, label, state: "withheld", reason: c.reason };
    return { key, label, state: "missing" };
  });
}
