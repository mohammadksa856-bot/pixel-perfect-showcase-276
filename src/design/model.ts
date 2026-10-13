import type { Topic } from "../lib/engine/company-preview";
export function financialPeriodView(topic: Topic, period: string): Topic {
  if (topic.ordinal !== 5) return topic;
  const blocks = topic.blocks.filter((block) =>
    block.type === "metrics"
      ? block.group.expectedPeriod === (period === "annual" ? "fy" : period)
      : block.type === "history" || block.type === "segments"
        ? period === "annual"
        : true,
  );
  const shownCount = blocks.reduce(
    (n, b) =>
      n +
      (b.type === "metrics"
        ? b.group.cells.length
        : b.type === "history"
          ? b.series.reduce((s, x) => s + x.points.length, 0)
          : b.type === "segments"
            ? b.rows.length
            : 0),
    0,
  );
  return { ...topic, blocks, shownCount };
}
export const GROUPS = [
  { id: "foundation", ar: "الشركة وأعمالها", en: "Company & business", ordinals: [1, 2, 3, 4] },
  {
    id: "performance",
    ar: "الأداء المالي",
    en: "Financial performance",
    ordinals: [5, 6, 7, 8, 9],
  },
  { id: "context", ar: "السوق والمنافسة", en: "Market & competition", ordinals: [10, 11, 12] },
  { id: "forward", ar: "المستقبل والتقييم", en: "Outlook & valuation", ordinals: [13, 14, 15] },
  { id: "disclosure", ar: "المخاطر والإفصاحات", en: "Risk & disclosure", ordinals: [16, 17, 18] },
] as const;
export const QUALITY_LABELS: Record<string, { ar: string; en: string }> = {
  company_profile: { ar: "الملف التعريفي", en: "Company profile" },
  financial_statements: { ar: "القوائم المالية", en: "Financial statements" },
  profitability: { ar: "الربحية", en: "Profitability" },
  liquidity_solvency: { ar: "السيولة والملاءة", en: "Liquidity & solvency" },
  efficiency: { ar: "الكفاءة", en: "Efficiency" },
  growth: { ar: "النمو", en: "Growth" },
  per_share: { ar: "قيم السهم", en: "Per-share metrics" },
  valuation: { ar: "التقييم", en: "Valuation" },
  market_data: { ar: "بيانات السوق", en: "Market data" },
  dividends: { ar: "التوزيعات", en: "Dividends" },
  segments: { ar: "القطاعات التشغيلية", en: "Operating segments" },
  ownership: { ar: "الملكية", en: "Ownership" },
  corporate_actions: { ar: "إجراءات الشركات", en: "Corporate actions" },
  announcements: { ar: "الإعلانات", en: "Announcements" },
  operational_kpis: { ar: "المؤشرات التشغيلية", en: "Operational KPIs" },
  sector_specific_fields: { ar: "حقول القطاع", en: "Sector-specific fields" },
  calculated_smart_metrics: { ar: "المقاييس المحسوبة", en: "Calculated metrics" },
  sources_lineage_freshness: { ar: "المصادر والتتبع والحداثة", en: "Sources, lineage & freshness" },
};
