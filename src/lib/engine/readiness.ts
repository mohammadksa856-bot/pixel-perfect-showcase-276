/**
 * عقد الجاهزية في الواجهة (MAREFA-WEB-V1).
 *
 * المحرك يرسل نموذجين منفصلين، ولا يُخلط بينهما في العرض:
 * - `understanding` (18-categories-v1): موضوعات المستثمر الثمانية عشر.
 * - `factory_readiness` (factory_18_category_contract): الفئات التشغيلية الثماني عشرة.
 *
 * ثلاث حالات فقط: ready / not_ready / not_assessed. الواجهة لا تعيد حساب الدرجة،
 * لكنها لا تعرض «جاهز» إلا إذا قالها المحرك واتسقت معها الدرجة والبوابات والهدف 95.
 * ما لم يُقَس يبقى «لم يُقيَّم»، ولا يُعرض صفرًا ولا مكتملًا.
 */

export const READINESS_TARGET = 95;

export type ReadinessState = "ready" | "not_ready" | "not_assessed";
export type ReadinessModel = "investor_topics" | "operational_categories";

export type RawReadiness = {
  readiness_state?: string | null;
  total_score?: string | number | null;
  target_score?: string | number | null;
  blocking_reasons?: string[] | null;
  hard_gates?: Record<string, { passed: boolean }> | null;
  categories?: { status?: string | null; score?: string | number | null }[] | null;
} | null;

export type Readiness = {
  model: ReadinessModel;
  state: ReadinessState;
  /** الدرجة كما أرسلها المحرك؛ null حين لا يوجد قياس. */
  score: number | null;
  target: typeof READINESS_TARGET;
  /** رموز السبب: من المحرك (blocking_reasons) أو من فحص الاتساق في الواجهة. */
  reasons: string[];
};

const num = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function normalizeReadiness(
  raw: RawReadiness | undefined,
  model: ReadinessModel,
): Readiness {
  const base = { model, target: READINESS_TARGET } as const;
  if (!raw) return { ...base, state: "not_assessed", score: null, reasons: ["not_in_contract"] };

  const engine = raw.readiness_state ?? null;
  const score = num(raw.total_score);
  const target = num(raw.target_score);
  const reasons = [...(raw.blocking_reasons ?? [])];

  // معيار 95% ثابت: هدف مختلف أو غائب يعني أن النتيجة لا تُقرأ بمعيارنا.
  if (target !== READINESS_TARGET) reasons.push("target_not_95");
  // لا درجات مجانية: فئة «غير منطبقة» تحمل درجة موجبة تجعل المجموع غير موثوق.
  if ((raw.categories ?? []).some((c) => c.status === "not_applicable" && (num(c.score) ?? 0) > 0))
    reasons.push("not_applicable_scored");

  if (engine === "not_assessed" || engine === null || score === null)
    return { ...base, state: "not_assessed", score: null, reasons: dedupe(reasons) };
  if (target !== READINESS_TARGET || reasons.includes("not_applicable_scored"))
    return { ...base, state: "not_assessed", score, reasons: dedupe(reasons) };
  if (engine === "ready") {
    const gatesFailed = Object.entries(raw.hard_gates ?? {})
      .filter(([, g]) => !g.passed)
      .map(([k]) => k);
    if (score < READINESS_TARGET || gatesFailed.length)
      return {
        ...base,
        state: "not_ready",
        score,
        reasons: dedupe([...reasons, "engine_ready_inconsistent", ...gatesFailed]),
      };
    return { ...base, state: "ready", score, reasons: dedupe(reasons) };
  }
  if (engine === "not_ready")
    return { ...base, state: "not_ready", score, reasons: dedupe(reasons) };
  // حالة لا يعرفها العقد: لا نخمّن معناها.
  return {
    ...base,
    state: "not_assessed",
    score: null,
    reasons: dedupe([...reasons, "unknown_state"]),
  };
}

const dedupe = (xs: string[]) => [...new Set(xs)];
