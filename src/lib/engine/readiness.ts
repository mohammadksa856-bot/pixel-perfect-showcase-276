/**
 * عقد الجاهزية في الواجهة (MAREFA-WEB-V1، WEB-01).
 *
 * نموذجان منفصلان تمامًا، ولا يُقرأ أحدهما من الآخر:
 * - `understanding` (18-categories-v1): موضوعات المستثمر الثمانية عشر.
 * - `factory_readiness` (factory_18_category_contract): الفئات التشغيلية الثماني عشرة،
 *   ولها هدف 95% خاص بها وحدود لكل فئة وبوابات صارمة.
 *
 * ثلاث حالات فقط: ready / not_ready / not_assessed. الواجهة لا تعيد حساب أي درجة.
 * القواعد:
 * - غياب البوابات ليس نجاحًا لها.
 * - لا درجة تُعرض دون تقييم صالح (النموذج الصحيح، الهدف 95، الفئات كاملة، بلا رصيد مجاني).
 * - فئة «غير منطبقة» لا تُعرض لها درجة، وإن حملت درجة يُحجب المجموع.
 * - «جاهز» للمصنع تتطلب إثبات كل الفئات الإلزامية وبواباتها من تقييم معتمد.
 */

export const READINESS_TARGET = 95;
/** هدف عقد المصنع. ثابت منفصل حتى لا يُقرأ من نموذج المستثمر ولا يُخلط به. */
export const FACTORY_TARGET = 95;
export const FACTORY_SCORING_MODEL = "factory_18_category_contract";

export type ReadinessState = "ready" | "not_ready" | "not_assessed";
export type ReadinessModel = "investor_topics" | "operational_categories";

export type Readiness = {
  model: ReadinessModel;
  state: ReadinessState;
  /** الدرجة كما أرسلها المحرك؛ null حين لا يوجد تقييم صالح. */
  score: number | null;
  target: 95;
  /** رموز السبب: من المحرك (blocking_reasons) أو من فحص الاتساق في الواجهة. */
  reasons: string[];
};

type RawGate = { status?: string | null; passed?: boolean | null } & Record<string, unknown>;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const dedupe = (xs: string[]) => [...new Set(xs)];
const gatePassed = (g: RawGate) => g.status === "passed" || g.passed === true;

// ───────────────────────── نموذج موضوعات المستثمر

export type RawInvestorReadiness = {
  readiness_state?: string | null;
  total_score?: string | number | null;
  target_score?: string | number | null;
  blocking_reasons?: string[] | null;
  hard_gates?: Record<string, RawGate> | null;
  categories?: { status?: string | null; score?: string | number | null }[] | null;
} | null;

export function normalizeInvestorReadiness(raw: RawInvestorReadiness | undefined): Readiness {
  const base = { model: "investor_topics", target: READINESS_TARGET } as const;
  if (!raw) return { ...base, state: "not_assessed", score: null, reasons: ["not_in_contract"] };

  const engine = raw.readiness_state ?? null;
  const score = num(raw.total_score);
  const reasons = [...(raw.blocking_reasons ?? [])];
  const out = (state: ReadinessState, s: number | null, extra: string[] = []) => ({
    ...base,
    state,
    score: s,
    reasons: dedupe([...reasons, ...extra]),
  });

  if (engine === null || engine === "not_assessed" || score === null)
    return out("not_assessed", null);
  if (num(raw.target_score) !== READINESS_TARGET)
    return out("not_assessed", null, ["target_not_95"]);
  if (engine !== "ready" && engine !== "not_ready")
    return out("not_assessed", null, ["unknown_state"]);

  // لا درجات مجانية: فئة «غير منطبقة» بدرجة موجبة تجعل المجموع غير صالح للعرض.
  const freeCredit = (raw.categories ?? []).some(
    (c) => c.status === "not_applicable" && (num(c.score) ?? 0) > 0,
  );
  if (freeCredit)
    return engine === "ready"
      ? out("not_assessed", null, ["not_applicable_scored"])
      : out("not_ready", null, ["not_applicable_scored"]);

  if (engine === "not_ready") return out("not_ready", score);

  // المحرك يقول «جاهز»: نطلب الدليل، ولا نعتبر غياب البوابات نجاحًا.
  const gates = Object.entries(raw.hard_gates ?? {});
  const extra: string[] = [];
  if (!gates.length) extra.push("hard_gates_missing");
  extra.push(...gates.filter(([, g]) => !gatePassed(g)).map(([k]) => k));
  if (score < READINESS_TARGET) extra.push("score_below_target");
  return extra.length
    ? out("not_ready", score, ["engine_ready_inconsistent", ...extra])
    : out("ready", score);
}

// ───────────────────────── عقد المصنع: الفئات التشغيلية الـ18

/** ترتيب الفئات كما في config/factory/18-category-contract.json (contract_version 1.0.0). */
export const FACTORY_CATEGORIES = [
  { key: "company_profile", ar: "الملف التعريفي", en: "Company profile" },
  { key: "financial_statements", ar: "القوائم المالية", en: "Financial statements" },
  { key: "profitability", ar: "الربحية", en: "Profitability" },
  { key: "liquidity_solvency", ar: "السيولة والملاءة", en: "Liquidity and solvency" },
  { key: "efficiency", ar: "الكفاءة", en: "Efficiency" },
  { key: "growth", ar: "النمو", en: "Growth" },
  { key: "per_share", ar: "بيانات السهم", en: "Per-share data" },
  { key: "valuation", ar: "التقييم", en: "Valuation" },
  { key: "market_data", ar: "بيانات السوق", en: "Market data" },
  { key: "dividends", ar: "التوزيعات", en: "Dividends" },
  { key: "segments", ar: "القطاعات التشغيلية", en: "Segments" },
  { key: "ownership", ar: "الملكية", en: "Ownership" },
  { key: "corporate_actions", ar: "إجراءات الشركة", en: "Corporate actions" },
  { key: "announcements", ar: "الإعلانات", en: "Announcements" },
  { key: "operational_kpis", ar: "المؤشرات التشغيلية", en: "Operating KPIs" },
  { key: "sector_specific_fields", ar: "حقول القطاع", en: "Sector-specific fields" },
  { key: "calculated_smart_metrics", ar: "المقاييس المحسوبة", en: "Calculated metrics" },
  {
    key: "sources_lineage_freshness",
    ar: "المصادر والتسلسل والحداثة",
    en: "Sources, lineage and freshness",
  },
] as const;

export type FactoryCategoryStatus =
  | "complete"
  | "partial"
  | "missing"
  | "not_applicable_by_rule"
  | "not_applicable_without_rule"
  | "not_assessed";

export type FactoryGate = {
  id: string;
  condition: string;
  action: string;
  status: "passed" | "failed" | "not_evaluated";
  /** القيم الفعلية والمطلوبة كما أرسلها المحرك (مثلًا annual_periods = 7). */
  details: { key: string; value: string }[];
};

export type FactoryCategory = {
  key: string;
  ordinal: number;
  title: { ar: string; en: string };
  status: FactoryCategoryStatus;
  weight: number | null;
  threshold: number | null;
  /** null للفئة غير المنطبقة أو غير المقيّمة: لا درجة دون قياس. */
  score: number | null;
  thresholdPassed: boolean | null;
  gates: FactoryGate[];
  fieldGroups: string[];
  fields: {
    expected: number | null;
    populated: number | null;
    required: number | null;
    populatedRequired: number | null;
  };
  missingFields: { group: string; fields: string[] }[];
  notApplicableRule: { pack: string | null; rule: string | null; reason: string | null } | null;
  /** المصادر الرسمية للفئة. null = لم يسلّمها العقد بعد (لا نقرأ ملفات إعداد المحرك). */
  officialSources: string[] | null;
  reasons: string[];
};

export type ConditionState = "passed" | "failed" | "unknown";
export type FactoryCondition = {
  key:
    | "weighted_coverage_95"
    | "every_category_threshold"
    | "all_gates_evaluated"
    | "all_gates_passed"
    | "approved_assessment";
  state: ConditionState;
};

export type FactoryCoverage = {
  readiness: Readiness;
  categories: FactoryCategory[];
  conditions: FactoryCondition[];
  sectorPack: string | null;
  contractVersion: string | null;
  checkedAt: string | null;
};

type RawFactoryCategory = {
  category_key?: string;
  weight?: string | number | null;
  threshold?: string | number | null;
  score?: string | number | null;
  status?: string | null;
  threshold_passed?: boolean | null;
  hard_gates?: RawGate[] | null;
  official_sources?: string[] | null;
  evidence?: {
    field_groups?: string[];
    expected_fields?: number;
    populated_fields?: number;
    required_fields?: number;
    populated_required_fields?: number;
    missing_fields?: Record<string, string[]>;
    not_applicable?: { reason?: string; pack?: string; rule?: string } | null;
  } | null;
};

export type RawFactoryReadiness = {
  scoring_model?: string | null;
  contract_version?: string | null;
  legacy_understanding_score_included?: boolean | null;
  sector_pack?: string | null;
  readiness_state?: string | null;
  total_score?: string | number | null;
  target_score?: string | number | null;
  all_hard_gates_evaluated?: boolean | null;
  all_hard_gates_passed?: boolean | null;
  blocking_reasons?: string[] | null;
  checked_at?: string | null;
  /** مقترح (غير موجود في العقد بعد): اعتماد التقييم من مراجع مستقل. */
  assessment_approval?: { status?: string | null } | null;
  categories?: RawFactoryCategory[] | null;
} | null;

const GATE_META = new Set(["gate_id", "condition", "action", "status"]);

function factoryCategory(
  def: (typeof FACTORY_CATEGORIES)[number],
  ordinal: number,
  raw: RawFactoryCategory | undefined,
): FactoryCategory {
  const base = {
    key: def.key,
    ordinal,
    title: { ar: def.ar, en: def.en },
    officialSources: raw?.official_sources ?? null,
  };
  if (!raw)
    return {
      ...base,
      status: "not_assessed",
      weight: null,
      threshold: null,
      score: null,
      thresholdPassed: null,
      gates: [],
      fieldGroups: [],
      fields: { expected: null, populated: null, required: null, populatedRequired: null },
      missingFields: [],
      notApplicableRule: null,
      reasons: ["category_not_assessed"],
    };

  const ev = raw.evidence ?? {};
  const na = raw.status === "not_applicable";
  const rule = na ? (ev.not_applicable ?? null) : null;
  const status: FactoryCategoryStatus = na
    ? rule?.rule
      ? "not_applicable_by_rule"
      : "not_applicable_without_rule"
    : raw.status === "complete" || raw.status === "partial" || raw.status === "missing"
      ? raw.status
      : "not_assessed";
  const gates: FactoryGate[] = (raw.hard_gates ?? []).map((g, i) => ({
    id: String(g["gate_id"] ?? `${def.key}:${i + 1}`),
    condition: String(g["condition"] ?? ""),
    action: String(g["action"] ?? ""),
    status: g.status === "passed" || g.status === "failed" ? g.status : "not_evaluated",
    details: Object.entries(g)
      .filter(([k]) => !GATE_META.has(k))
      .map(([key, value]) => ({
        key,
        value: typeof value === "string" ? value : JSON.stringify(value),
      })),
  }));
  const reasons: string[] = [];
  if (status === "not_applicable_without_rule") reasons.push("not_applicable_without_cited_rule");
  if (na && (num(raw.score) ?? 0) > 0) reasons.push("not_applicable_scored");
  if (!gates.length) reasons.push("hard_gates_missing");
  return {
    ...base,
    status,
    weight: num(raw.weight),
    threshold: num(raw.threshold),
    score: na || status === "not_assessed" ? null : num(raw.score),
    thresholdPassed: na ? null : (raw.threshold_passed ?? null),
    gates,
    fieldGroups: ev.field_groups ?? [],
    fields: {
      expected: ev.expected_fields ?? null,
      populated: ev.populated_fields ?? null,
      required: ev.required_fields ?? null,
      populatedRequired: ev.populated_required_fields ?? null,
    },
    missingFields: Object.entries(ev.missing_fields ?? {}).map(([group, fields]) => ({
      group,
      fields,
    })),
    notApplicableRule: rule
      ? { pack: rule.pack ?? null, rule: rule.rule ?? null, reason: rule.reason ?? null }
      : null,
    reasons,
  };
}

export function normalizeFactoryCoverage(raw: RawFactoryReadiness | undefined): FactoryCoverage {
  const byKey = new Map((raw?.categories ?? []).map((c) => [c.category_key, c]));
  const categories = FACTORY_CATEGORIES.map((def, i) =>
    factoryCategory(def, i + 1, byKey.get(def.key)),
  );
  const meta = {
    categories,
    sectorPack: raw?.sector_pack ?? null,
    contractVersion: raw?.contract_version ?? null,
    checkedAt: raw?.checked_at ?? null,
  };
  const base = { model: "operational_categories", target: FACTORY_TARGET } as const;
  const engineReasons = [...(raw?.blocking_reasons ?? [])];
  const result = (
    state: ReadinessState,
    score: number | null,
    extra: string[],
    conditions: FactoryCondition[],
  ): FactoryCoverage => ({
    ...meta,
    readiness: { ...base, state, score, reasons: dedupe([...engineReasons, ...extra]) },
    conditions,
  });
  const unknown: FactoryCondition[] = (
    [
      "weighted_coverage_95",
      "every_category_threshold",
      "all_gates_evaluated",
      "all_gates_passed",
      "approved_assessment",
    ] as const
  ).map((key) => ({ key, state: "unknown" }));

  if (!raw) return result("not_assessed", null, ["not_in_contract"], unknown);
  const engine = raw.readiness_state ?? null;
  const total = num(raw.total_score);
  if (engine === null || engine === "not_assessed" || total === null)
    return result("not_assessed", null, [], unknown);

  // تقييم غير صالح للعرض: نموذج آخر، أو درجة المستثمر مدموجة، أو هدف غير 95، أو حالة مجهولة.
  const invalid: string[] = [];
  if (raw.scoring_model !== FACTORY_SCORING_MODEL) invalid.push("scoring_model_mismatch");
  if (raw.legacy_understanding_score_included !== false)
    invalid.push("investor_score_not_excluded");
  if (num(raw.target_score) !== FACTORY_TARGET) invalid.push("target_not_95");
  if (engine !== "ready" && engine !== "not_ready") invalid.push("unknown_state");
  const missingCats = categories.filter((c) => c.status === "not_assessed").length;
  if (missingCats) invalid.push("categories_incomplete");
  if (invalid.length) return result("not_assessed", null, invalid, unknown);

  const scored = categories.filter(
    (c) => c.status !== "not_applicable_by_rule" && c.status !== "not_applicable_without_rule",
  );
  const allGates = categories.flatMap((c) => c.gates);
  const conditions: FactoryCondition[] = [
    { key: "weighted_coverage_95", state: total >= FACTORY_TARGET ? "passed" : "failed" },
    {
      key: "every_category_threshold",
      state: scored.every(
        (c) =>
          c.thresholdPassed === true &&
          c.score !== null &&
          c.threshold !== null &&
          c.score >= c.threshold,
      )
        ? "passed"
        : "failed",
    },
    {
      key: "all_gates_evaluated",
      state:
        raw.all_hard_gates_evaluated === true &&
        categories.every((c) => c.gates.length > 0) &&
        allGates.every((g) => g.status !== "not_evaluated")
          ? "passed"
          : "failed",
    },
    {
      key: "all_gates_passed",
      state:
        raw.all_hard_gates_passed === true &&
        categories.every((c) => c.gates.length > 0) &&
        allGates.every((g) => g.status === "passed")
          ? "passed"
          : "failed",
    },
    {
      key: "approved_assessment",
      state:
        raw.assessment_approval?.status === "approved"
          ? "passed"
          : raw.assessment_approval
            ? "failed"
            : "unknown",
    },
  ];

  // لا درجات مجانية: رصيد فئة «غير منطبقة» داخل المجموع يحجب المجموع.
  const freeCredit = categories.some((c) => c.reasons.includes("not_applicable_scored"));
  const score = freeCredit ? null : total;
  const extra = freeCredit ? ["total_includes_not_applicable_credit"] : [];

  const allPassed = conditions.every((c) => c.state === "passed");
  if (engine === "ready" && allPassed && !freeCredit)
    return result("ready", score, extra, conditions);
  if (engine === "ready") {
    // المحرك يقول «جاهز» دون إثبات كامل: لا نعرضه جاهزًا.
    const unapprovedOnly = conditions.every(
      (c) => c.state === "passed" || c.key === "approved_assessment",
    );
    const approval = conditions.find((c) => c.key === "approved_assessment")!.state;
    return unapprovedOnly || freeCredit
      ? result(
          "not_assessed",
          null,
          [...extra, ...(approval === "passed" ? [] : ["approved_assessment_missing"])],
          conditions,
        )
      : result("not_ready", score, [...extra, "engine_ready_inconsistent"], conditions);
  }
  return result("not_ready", score, extra, conditions);
}
