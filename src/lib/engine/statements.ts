/**
 * WEB-03: القوائم المالية متعددة الفترات (سنوي / ربعي / منذ بداية السنة).
 *
 * تُبنى من سجل المحرك (`financials.history`) ومن لقطة YTD، بنفس قواعد الثقة في P02:
 * كل مرشح لكل خلية يمر عبر فحوص P02 (`checkRow`: المصدر، الوحدة، نوع الفترة، علامات الجودة، إعادة إنتاج
 * المشتقات)، ثم تُقارن كل المرشحات قبل القبول (`decideCell`): لا اختيار لأول قيمة.
 * لا تحسب الواجهة أي رقم، ولا تملأ فترة غائبة، ولا تحسب نسب التغيّر.
 */
import type { LocalizedText } from "@/lib/i18n";
import {
  AMOUNT_UNITS,
  BALANCE,
  CASH_FLOW,
  INCOME,
  RATIOS,
  checkRow,
  labelOf,
  valueIdentity,
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
  /**
   * أدلة المراجعة (لـ Codex): كل خلية طُبقت عليها قاعدة تعارض أو رفض بين مرشحات متعددة.
   * لا تحمل أي قيمة رقمية: المصدر ورقم الصفحة والحكم فقط، فلا تتسرب القيمة المحجوبة.
   */
  review: ReviewEntry[];
};

export type CandidateOrigin = "history" | "snapshot";
/**
 * قواعد الاختيار والحجب لخلية لها أكثر من مرشح (WEB-03، إصلاح التعارض النهائي):
 * - contradictory_eligible_values: مرشحان مقبولان أو أكثر بهويات مختلفة (قيمة/وحدة/فترة) → source_conflict.
 * - rejection_not_overridden: مرشح موضوع لهذه الخلية يحمل رقمًا ورُفض لسبب يخص هوية الحقيقة (التاريخ،
 *   نوع الفترة، العملة، الوحدة، علامة الجودة) → تُحجب الخلية بسبب الرفض نفسه، ولا يعوّضها مرشح آخر
 *   (لقطة أو صف ثانٍ).
 * - accepted_unproven_candidate_ignored: مرشح لا يدّعي رقمًا (قيمة فارغة، ولو معزولًا) أو بلا إثبات (بلا مصدر،
 *   رابط غير آمن، مشتق بلا معادلة أو إعادة إنتاج) → يُتجاهل وتُقبل القيمة المثبتة، مع تسجيل ذلك هنا.
 */
export type ReviewRule =
  | "contradictory_eligible_values"
  | "rejection_not_overridden"
  | "accepted_unproven_candidate_ignored";
export type ReviewEntry = {
  key: string;
  periodEnd: string;
  /** سبب الحجب المعروض، أو null إن قُبلت القيمة. */
  reason: WithheldReason | null;
  rule: ReviewRule;
  /** عدد الهويات المختلفة بين المرشحات المقبولة (القيم نفسها لا تُنشر). */
  distinctValues: number;
  candidates: {
    origin: CandidateOrigin;
    /** نوع الفترة الذي يُنتظر في هذا المصدر (fy، instant، quarter، ytd). */
    expected: string;
    verdict: "eligible" | WithheldReason;
    /** رابط المصدر الآمن للمرشح المقبول فقط. */
    sourceUrl: string | null;
    page: number | null;
  }[];
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

/** رفض يعني أن الصف يدّعي حقيقة مختلفة عن العمود: لا يجوز لمرشح آخر أن يعوّضه بصمت. */
const IDENTITY_REJECTIONS = new Set<WithheldReason>([
  "period_end_mismatch",
  "period_kind_mismatch",
  "currency_mismatch",
  "unit_conflict",
  "quality_flagged",
]);
/** عند غياب أي مرشح مقبول: السبب الأبعد في سلسلة الفحص (كما في P02: تاريخ ← عملة ← بقية الفحوص). */
const rejectionRank = (r: WithheldReason) =>
  r === "period_end_mismatch" ? 0 : r === "currency_mismatch" ? 1 : 2;

/** الصف يدّعي رقمًا فعلًا. صف معزول بلا قيمة لا يدّعي شيئًا فلا يحجب قيمة مقبولة (قاعدة Codex في P02). */
const claimsNumber = (r: EngineMetricRow) =>
  r.value !== null && r.value !== "" && Number.isFinite(Number(r.value));

type CellSource = { origin: CandidateOrigin; part: PeriodSource };

/**
 * خلية عمود محدد: تُجمع كل الصفوف الموحّدة (بلا أبعاد) من كل المصادر قبل أي اختيار، ويُحكم على كل صف:
 * period_end = نهاية العمود، والعملة عملة التقارير، ثم فحوص P02 (checkRow) بنوع فترة المصدر.
 * لا "الأول يفوز": القبول يتطلب ألا يُرفض أي مرشح لسبب هوية، وأن تتفق كل المرشحات المقبولة.
 */
function decideCell(
  key: string,
  end: string,
  currency: string | null,
  sources: CellSource[],
): { pick: Pick_; review: ReviewEntry | null } {
  const cands = sources.flatMap(({ origin, part }) =>
    (part.metrics[key] ?? []).filter(isConsolidatedRow).map((row) => {
      const verdict: ValueCell | WithheldReason =
        row.period_end !== end
          ? "period_end_mismatch"
          : currencyMismatch(row, currency)
            ? "currency_mismatch"
            : checkRow(key, row, part.expected);
      return { origin, expected: part.expected, row, verdict };
    }),
  );
  if (!cands.length) return { pick: { ok: "missing" }, review: null };
  const eligible = cands.flatMap((c) => (typeof c.verdict === "string" ? [] : [c.verdict]));
  if (!eligible.length) {
    let reason = cands[0]!.verdict as WithheldReason;
    for (const c of cands)
      if (rejectionRank(c.verdict as WithheldReason) > rejectionRank(reason))
        reason = c.verdict as WithheldReason;
    return { pick: { ok: false, reason }, review: null };
  }
  const distinctValues = new Set(eligible.map(valueIdentity)).size;
  const review = (rule: ReviewRule, reason: WithheldReason | null): ReviewEntry => ({
    key,
    periodEnd: end,
    reason,
    rule,
    distinctValues,
    candidates: cands.map((c) => {
      const pageRaw = c.row.provenance?.extraction?.page;
      const page =
        pageRaw === null || pageRaw === undefined || pageRaw === "" ? NaN : Number(pageRaw);
      return {
        origin: c.origin,
        expected: c.expected,
        verdict: typeof c.verdict === "string" ? c.verdict : "eligible",
        sourceUrl: typeof c.verdict === "string" ? null : c.verdict.proof.sourceUrl,
        page: Number.isFinite(page) ? page : null,
      };
    }),
  });
  const blocking = cands.find(
    (c) =>
      typeof c.verdict === "string" && IDENTITY_REJECTIONS.has(c.verdict) && claimsNumber(c.row),
  );
  if (blocking) {
    const reason = blocking.verdict as WithheldReason;
    return { pick: { ok: false, reason }, review: review("rejection_not_overridden", reason) };
  }
  if (distinctValues > 1)
    return {
      pick: { ok: false, reason: "source_conflict" },
      review: review("contradictory_eligible_values", "source_conflict"),
    };
  // كل المرشحات المقبولة متطابقة: الإثبات من أول مرشح (السجل قبل اللقطة) — القيمة نفسها أيًّا كان.
  return {
    pick: { ok: true, cell: eligible[0]! },
    review:
      eligible.length < cands.length ? review("accepted_unproven_candidate_ignored", null) : null,
  };
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
      review: [],
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
  const review: ReviewEntry[] = [];
  for (const [key, position] of keys) {
    let unit: string | null = null;
    let label: LocalizedText | null = null;
    const cells: StatementCell[] = ends.map((end) => {
      const parts = byEnd.get(end)!.filter((x) => x.metrics[key]);
      const extra = (mergeByEnd.get(end) ?? []).filter((x) => mergeKeys.has(key) && x.metrics[key]);
      if (!parts.length && !extra.length) return { state: "missing" };
      const firstRow = (parts[0] ?? extra[0])!.metrics[key]?.[0];
      label ??= labelOf(key, firstRow);
      const { pick: picked, review: entry } = decideCell(key, end, currency, [
        ...parts.map((part) => ({ origin: "history" as const, part })),
        ...extra.map((part) => ({ origin: "snapshot" as const, part })),
      ]);
      if (entry) review.push(entry);
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
    review,
  };
}

/**
 * تقويم السنة المالية: نهاية السنة "MM-DD" صالحة فقط إن كان اليوم نهاية ذلك الشهر (فبراير: 28 أو 29).
 * يعيد شهر نهاية السنة، أو null (فشل مغلق: لا فصل ممكن بين أرصدة الأرباع وأرصدة نهاية السنة).
 */
export function fiscalYearEndMonth(fiscalYearEnd: string | null | undefined): number | null {
  const m = /^(\d{2})-(\d{2})$/.exec(fiscalYearEnd ?? "");
  if (!m) return null;
  const [mo, d] = [Number(m[1]), Number(m[2])];
  if (mo < 1 || mo > 12) return null;
  const last = new Date(Date.UTC(2001, mo, 0)).getUTCDate(); // سنة غير كبيسة
  return d === last || (mo === 2 && d === 29) ? mo : null;
}

/**
 * يصنّف تاريخًا حسب تقويم الشركة: "fy_end" نهاية السنة المالية، "quarter_end" نهاية ربع آخر، أو null.
 * التاريخ يجب أن يكون تاريخًا تقويميًا حقيقيًا وفي آخر يوم من شهره الفعلي (29 فبراير في السنة الكبيسة).
 */
export function fiscalDateKind(date: string, fyMonth: number): "fy_end" | "quarter_end" | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d !== new Date(Date.UTC(y, mo, 0)).getUTCDate()) return null;
  if (mo === fyMonth) return "fy_end";
  return [3, 6, 9].some((k) => ((fyMonth + k - 1) % 12) + 1 === mo) ? "quarter_end" : null;
}

type PeriodList =
  { periods?: { period_end: string; metrics?: Record<string, EngineMetricRow[]> }[] } | undefined;
const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));

/**
 * أرصدة جدول الأرباع (مقترح العقد quarter_position)، بهوية instant (checkRow بنوع "instant"):
 * - نهايات Q1–Q3 من quarter_position فقط؛ أي تاريخ في نهاية السنة المالية أو ليس نهاية ربع يُستبعد منه.
 * - رصيد Q4 من annual_position (رصيد نهاية السنة نفسه)، مصدر واحد فلا ازدواج، ضمن نطاق أعمدة الأرباع.
 * لا تدفقات سنوية (history.annual لا يدخل)، ولا يمس آخر رصيد (fin.instant). بلا quarter_position لا تغيير.
 */
function quarterBalanceSources(
  quarterPositions: PeriodList,
  annualPositions: PeriodList,
  quarterFlows: PeriodList,
  fiscalYearEnd: string | null | undefined,
): PeriodSource[] {
  const fyMonth = fiscalYearEndMonth(fiscalYearEnd);
  if (!fyMonth || !quarterPositions) return [];
  const q = (quarterPositions.periods ?? [])
    .filter((p) => fiscalDateKind(p.period_end, fyMonth) === "quarter_end")
    .map((p) => ({ end: p.period_end, metrics: p.metrics ?? {}, expected: "instant" }));
  const ends = [
    ...q.map((p) => p.end),
    ...(quarterFlows?.periods ?? []).map((p) => p.period_end),
  ].filter((e) => fiscalDateKind(e, fyMonth) !== null);
  if (!ends.length) return q;
  const lo = Math.min(...ends.map(monthIndex)) - 3;
  const hi = Math.max(...ends.map(monthIndex));
  const q4 = (annualPositions?.periods ?? [])
    .filter(
      (p) =>
        fiscalDateKind(p.period_end, fyMonth) === "fy_end" &&
        monthIndex(p.period_end) >= lo &&
        monthIndex(p.period_end) <= hi,
    )
    .map((p) => ({ end: p.period_end, metrics: p.metrics ?? {}, expected: "instant" }));
  return [...q, ...q4];
}

export function buildStatements(page: EnginePage, kind: CompanyKind): StatementView[] {
  const fin = page.sections.financials;
  const h = fin.history;
  const currency = page.company?.currency ?? null;
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
    [
      hist(h?.quarter, "quarter"),
      quarterBalanceSources(
        h?.quarter_position,
        h?.annual_position,
        h?.quarter,
        page.company?.fiscal_year_end,
      ),
    ],
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
