import pages from "virtual:marefa-design-fixtures";
import { buildCompanyPreview, contractProblems, type EnginePage } from "../engine/company-preview";
import { normalizeFactoryCoverage } from "../engine/readiness";
import type { PreviewResult } from "../engine/company-preview.server";
import { applyPublicationGate, loadApprovals } from "../engine/publication-gate.server";

/** Explicit development source, not a network-error fallback. Never imports a production key. */
export function frozenDesignPreview(input: { market: string; symbol: string }): PreviewResult {
  if (input.market.toUpperCase() !== "SA" || !pages[input.symbol]) return { state: "not_found" };
  if (contractProblems(pages[input.symbol]).length)
    return { state: "engine_unavailable", reason: "design_fixture_contract_mismatch" };
  // Publication gate before anything is built. Only this frozen design-fixture path may use the accepted baseline
  // (identities of the sha-pinned fixtures); an explicit WITHHELD decision still removes a row.
  const raw = applyPublicationGate(pages[input.symbol] as EnginePage, loadApprovals(), {
    mode: "frozen_design_fixture",
  }).page;
  // Even a historical boolean lineage claim is insufficient for financial acceptance here.
  function withholdDerived(value: unknown): void {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(withholdDerived);
      return;
    }
    const row = value as Record<string, unknown>;
    if (row["is_calculated"] === true || row["is_calculated"] === 1) {
      row["quality_status"] = "withheld";
      row["quality_reasons"] = ["design_fixture_derivative_not_approved"];
    }
    Object.values(row).forEach(withholdDerived);
  }
  withholdDerived(raw);
  const preview = buildCompanyPreview(raw as EnginePage);
  preview.factory = normalizeFactoryCoverage(undefined);
  preview.readiness = {
    investorTopics: {
      model: "investor_topics",
      state: "not_assessed",
      score: null,
      target: 95,
      reasons: ["design_sample_not_approved"],
    },
    operationalCategories: preview.factory.readiness,
  };
  preview.topics.forEach((topic) => {
    topic.score = null;
    topic.status = "not_measured";
    topic.reasons.unshift({
      ar: "عينة تطوير مجمدة؛ لا تقييم معتمد أو تحقق مالي مستقل.",
      en: "Frozen development sample; no approved assessment or independent financial verification.",
    });
  });
  preview.dataNotices.unshift({
    ar: "عينات تطوير موثقة ومجمدة (حزمة 2026-10-13)، ليست بيانات حية أو معتمدة ماليًا. المشتقات غير المعتمدة محجوبة والدرجات غير مقاسة.",
    en: "Documented frozen development samples (2026-10-13 package), not live or financially accepted data. Unapproved derivatives are withheld; readiness is not measured.",
  });
  return { state: "ok", preview };
}
