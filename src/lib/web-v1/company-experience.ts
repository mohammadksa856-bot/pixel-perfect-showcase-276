import type { LocalizedText } from "@/lib/i18n";
import type {
  ActionRow,
  Block,
  CompanyPreview,
  DocumentRow,
  MarketQuote,
  OwnershipRow,
  TextFact,
  Topic,
  ValueCell,
} from "@/lib/engine/company-preview";
import type { KeyFigure } from "@/lib/engine/statements";
import { COMPANY_GROUPS, type GroupId } from "./model";
import { normalize } from "./catalog";

/**
 * WEB-07: تجربة الشركة بثلاثة مستويات مترابطة داخل المعاينة نفسها.
 *   1. نظرة عامة (Overview): ملخص استثماري من بيانات الصفحة نفسها، دون أي رقم جديد.
 *   2. تحليل الشركة (Company Intelligence): الموضوعات الثمانية عشر كاملة في المجموعات الخمس.
 *   3. بيانات معرفة (Marefa Data): واجهة WEB-06 كما هي (القوائم، المصادر، الإثبات، المصنع، الحجب).
 *
 * قواعد هذا الملف:
 * - كل قيمة تُقرأ من CompanyPreview كما هي: لا حساب، ولا نسبة، ولا مضاعف، ولا توقع، ولا سعر جديد.
 * - موضوعات المستثمر الـ18 منفصلة عن فئات المصنع الـ18؛ لا يُقرأ هنا أي شيء من factory غير حالته.
 * - 95% هدف جاهزية، لا نسبة إنجاز؛ لا تُعرض هنا كرقم متحقق.
 */

/** الشركات التي بُنيت لها التجربة الجديدة. بقية الشركات تبقى على «بيانات معرفة». */
export const EXPERIENCE_SYMBOLS: readonly string[] = ["2222"];
export const hasExperience = (symbol: string) => EXPERIENCE_SYMBOLS.includes(symbol);

export type CompanyLevel = "overview" | "intelligence" | "data";

export const LEVELS: { id: CompanyLevel; title: LocalizedText; hint: LocalizedText }[] = [
  {
    id: "overview",
    title: { ar: "نظرة عامة", en: "Overview" },
    hint: { ar: "الملخص الاستثماري", en: "Investment summary" },
  },
  {
    id: "intelligence",
    title: { ar: "تحليل الشركة", en: "Company Intelligence" },
    hint: { ar: "الموضوعات الثمانية عشر", en: "All 18 topics" },
  },
  {
    id: "data",
    title: { ar: "بيانات معرفة", en: "Marefa Data" },
    hint: { ar: "القوائم والمصادر والمصنع", en: "Statements, sources, factory" },
  },
];

/** هدف رابط عميق داخل «تحليل الشركة»: موضوع (بالمفتاح) ومقياس اختياري يُبرز ويُمرَّر إليه. */
export type IntelTarget = { topic: string; focus?: string };

const topicByOrdinal = (p: CompanyPreview, o: number) => p.topics.find((t) => t.ordinal === o);
const blocksOf = <T extends Block["type"]>(t: Topic | undefined, type: T) =>
  (t?.blocks ?? []).filter((b): b is Extract<Block, { type: T }> => b.type === type);

// ───────────────────────── Overview

export type OverviewFact = TextFact & { target: IntelTarget };
export type OverviewCell = ValueCell & { target: IntelTarget };
export type OverviewKeyFigure = KeyFigure & { target: IntelTarget };

export type Overview = {
  /** وصف النشاط بلغتيه كما في المصدر (العربي إن وُجد، والإنجليزي)، لا ملخص مكتوب من عندنا. */
  description: { ar: OverviewFact | null; en: OverviewFact | null };
  businessFacts: OverviewFact[];
  revenueMix: {
    title: LocalizedText;
    rows: (ValueCell & { segment: string })[];
    target: IntelTarget;
  }[];
  keyFigures: OverviewKeyFigure[];
  operations: { cells: OverviewCell[]; withheld: number; target: IntelTarget };
  dividends: { cells: OverviewCell[]; withheld: number; target: IntelTarget };
  ownership: { rows: OwnershipRow[]; target: IntelTarget };
  governance: OverviewFact[];
  developments: {
    actions: ActionRow[];
    documents: DocumentRow[];
    total: number;
    target: IntelTarget;
  };
  valuation: {
    /** آخر إغلاق مسجّل كما في المحرك (ليس سعرًا حيًا)، أو null. */
    quote: MarketQuote | null;
    /** هل في موضوع التقييم (15) أي بيانات موثقة؟ لا نحسب مضاعفات بديلة. */
    hasDocumentedValuation: boolean;
    forecasts: boolean;
    analysts: boolean;
    target: IntelTarget;
  };
  risks: { facts: OverviewFact[]; target: IntelTarget };
  /** المحفزات: لا مصدر موثق لها في عقد الصفحة الحالي، فتُعرض حالة صريحة. */
  catalysts: { documented: false };
  status: {
    topicsWithData: number;
    topicsTotal: number;
    shown: number;
    withheld: number;
    investorTopics: CompanyPreview["readiness"]["investorTopics"];
    factory: CompanyPreview["readiness"]["operationalCategories"];
  };
};

const withTarget = <T>(x: T, target: IntelTarget) => ({ ...x, target });

export function buildOverview(p: CompanyPreview): Overview {
  const t = (o: number) => topicByOrdinal(p, o);
  const key = (o: number) => t(o)?.key ?? String(o);
  const facts = (o: number) => blocksOf(t(o), "facts").flatMap((b) => b.facts);
  const factTarget = (o: number) => (f: TextFact) => withTarget(f, { topic: key(o), focus: f.key });
  const bizFacts = facts(2);
  const desc = (k: string) => {
    const f = bizFacts.find((x) => x.key === k);
    return f ? factTarget(2)(f) : null;
  };
  const metricCells = (o: number, groupId: string) => {
    const groups = blocksOf(t(o), "metrics").filter((b) => b.group.id === groupId);
    return {
      cells: groups
        .flatMap((b) => b.group.cells)
        .map((c) => withTarget(c, { topic: key(o), focus: c.key })),
      withheld: groups.reduce((n, b) => n + b.group.withheld.length, 0),
      target: { topic: key(o) },
    };
  };
  const actions = blocksOf(t(9), "actions").flatMap((b) => b.rows);
  const documents = blocksOf(t(18), "documents").flatMap((b) => b.rows);
  const byDate = <R extends { date: string | null }>(a: R, b: R) =>
    (b.date ?? "").localeCompare(a.date ?? "");
  const quote = blocksOf(t(12), "market").find((b) => b.latest)?.latest ?? null;
  const hasData = (o: number) => (t(o)?.blocks ?? []).some((b) => b.type !== "peers");

  return {
    description: { ar: desc("business_description_ar"), en: desc("business_description") },
    businessFacts: bizFacts
      .filter((f) => !f.key.startsWith("business_description"))
      .map(factTarget(2)),
    revenueMix: blocksOf(t(2), "segments").map((b) => ({
      title: b.title,
      rows: b.rows,
      target: b.rows[0] ? { topic: key(2), focus: b.rows[0].key } : { topic: key(2) },
    })),
    keyFigures: p.keyFigures.map((k) => withTarget(k, { topic: key(5), focus: k.key })),
    operations: metricCells(8, "operations"),
    dividends: metricCells(9, "dividends"),
    ownership: {
      rows: blocksOf(t(4), "ownership")
        .flatMap((b) => b.rows)
        .sort((a, b) => b.pct - a.pct),
      target: { topic: key(4) },
    },
    governance: facts(3).map(factTarget(3)),
    developments: {
      actions: [...actions].sort(byDate).slice(0, 4),
      documents: [...documents].sort(byDate).slice(0, 5),
      total: actions.length + documents.length,
      target: { topic: key(18) },
    },
    valuation: {
      quote,
      hasDocumentedValuation: hasData(15),
      forecasts: hasData(13),
      analysts: hasData(14),
      target: { topic: key(15) },
    },
    risks: { facts: facts(16).map(factTarget(16)), target: { topic: key(16) } },
    catalysts: { documented: false },
    status: {
      topicsWithData: p.topics.filter((x) => x.shownCount > 0).length,
      topicsTotal: p.topics.length,
      shown: p.counts.shown,
      withheld: p.counts.withheld,
      investorTopics: p.readiness.investorTopics,
      factory: p.readiness.operationalCategories,
    },
  };
}

// ───────────────────────── Intelligence: البحث داخل الموضوعات

/** كل النصوص المعروضة في موضوع (عنوانه بلغتيه، وتسميات بنوده، وأسماء القطاعات والإجراءات والوثائق). */
export function topicSearchText(topic: Topic): string {
  const parts: string[] = [topic.title.ar, topic.title.en, topic.key];
  for (const b of topic.blocks) {
    switch (b.type) {
      case "metrics":
        parts.push(b.group.title.ar, b.group.title.en);
        for (const c of b.group.cells) parts.push(c.label.ar, c.label.en, c.key);
        for (const w of [...b.group.withheld, ...b.group.missing])
          parts.push(w.label.ar, w.label.en);
        break;
      case "facts":
        for (const f of b.facts) parts.push(f.label.ar, f.label.en, f.text);
        break;
      case "segments":
        parts.push(b.title.ar, b.title.en, ...b.rows.map((r) => r.segment));
        break;
      case "history":
        for (const s of b.series) parts.push(s.label.ar, s.label.en);
        break;
      case "ownership":
        parts.push(...b.rows.map((r) => r.holder));
        break;
      case "actions":
        parts.push(...b.rows.map((r) => r.title));
        break;
      case "documents":
        parts.push(...b.rows.map((r) => r.title));
        break;
      default:
        break;
    }
  }
  return normalize(parts.join(" "));
}

/** تطابق كل كلمات البحث (بعد التطبيع) مع نص الموضوع. البحث الفارغ يطابق كل شيء. */
export function topicMatches(topic: Topic, q: string): boolean {
  const words = normalize(q).split(" ").filter(Boolean);
  if (!words.length) return true;
  const hay = topicSearchText(topic);
  return words.every((w) => hay.includes(w));
}

export type IntelGroup = {
  id: GroupId;
  title: LocalizedText;
  question: LocalizedText;
  topics: Topic[];
};

/** المجموعات الخمس بترتيبها، وموضوعات كل مجموعة بترتيب model.ts. لا يُحذف موضوع. */
export function intelGroups(p: CompanyPreview): IntelGroup[] {
  return COMPANY_GROUPS.map((g) => ({
    id: g.id,
    title: g.title,
    question: g.question,
    topics: (g.topics as readonly number[])
      .map((o) => topicByOrdinal(p, o))
      .filter((x): x is Topic => !!x),
  }));
}

/** مفتاح الموضوع → المجموعة (لروابط «بيانات معرفة» من التحليل). */
export function groupOfTopicKey(p: CompanyPreview, topicKey: string): GroupId | null {
  const t = p.topics.find((x) => x.key === topicKey);
  if (!t) return null;
  return (
    COMPANY_GROUPS.find((g) => (g.topics as readonly number[]).includes(t.ordinal))?.id ?? null
  );
}

/** قيم بحث صالحة لرابط «تحليل الشركة». */
export function intelSearch(s: Record<string, unknown>): {
  topic?: string;
  focus?: string;
  q?: string;
} {
  const ok = (v: unknown, re: RegExp) => typeof v === "string" && re.test(v);
  return {
    ...(ok(s["topic"], /^[a-z_]{1,40}$/) ? { topic: s["topic"] as string } : {}),
    ...(ok(s["focus"], /^[a-z0-9_]{1,60}$/) ? { focus: s["focus"] as string } : {}),
    ...(typeof s["q"] === "string" && s["q"].length <= 80 ? { q: s["q"] } : {}),
  };
}
