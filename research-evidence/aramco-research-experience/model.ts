/**
 * WEB-08B05 — نموذج عرض تجربة بحث أرامكو، مبني من حزمة B04 المقبولة كما هي (قراءة فقط).
 *
 * - لا يعيد كتابة نص ولا يحسب رقمًا: الفقرات والتحليلات والمشاريع والفجوات من `compilePack`/`gapRegister`.
 * - لكل فقرة موضع أساسي واحد (`PLACEMENT`). أي فقرة بلا موضع، أو بموضعين، تفشل البناء.
 * - روابط المقاييس من سجل B04 المقبول (`MAREFA-DATA-LINKS.json`): 29 FOCUSABLE و43 NOT_RENDERED.
 * - علاقة المشروع بالمحرك أو الخطر تُشتق من هويات أدلة مشتركة تخص المشروع وحده، لا من اجتهاد.
 * - لا يُعرض نص الاقتباسات (`ResolvedRef.text`): قد تحمل أرقامًا مفصحًا عنها، وقاعدة B04 تمنع إعادة نشرها.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { buildCompanyPreview } from "../../src/lib/engine/company-preview";
import { COMPANY_GROUPS } from "../../src/lib/web-v1/model";
import {
  loadContext,
  type EvidenceContext,
  type ResolvedRef,
} from "../aramco-research-pack/evidence";
import {
  compilePack,
  gapRegister,
  topicMap,
  type CompiledAnalysis,
  type CompiledParagraph,
  type GapEntry,
  type MetricLink,
  type Pack,
  type TopicEntry,
} from "../aramco-research-pack/pack";
import type { Bi, Topic } from "../aramco-research-pack/schema";

const ROOT = new URL("../../", import.meta.url);
const read = (rel: string) => readFileSync(new URL(rel, ROOT), "utf8");

/** القبول المستقل لـB04 الذي تبني عليه هذه المرحلة (يُعرض في شريط الحالة، لا يُستنتج). */
export const BASIS = {
  b04Implementation: "946d7b48a06048e146b31825d88690aad93773e8",
  b04Delivery: "69714002f9279271be447b7bcf5fc12e0eb41a6a",
  b04Acceptance: "8c279250235f50bd9106b55a6314dce4edc6a08d",
  centralEvent: 110,
} as const;

// ── المواضع الأساسية
export type Slot =
  | "overview.intro"
  | "overview.scope"
  | "business.ownership"
  | "business.upstream"
  | "business.downstream"
  | "business.revenue"
  | "business.integration"
  | "business.drivers"
  | "projects.program"
  | `projects.${string}`
  | "financial.frame"
  | `financial.${string}`
  | "risks.disclosures"
  | "risks.guidance"
  | "risks.interpretations"
  | "risks.assumptions"
  | "risks.scenarios"
  | "risks.gaps";

const PREFIX_SLOT: [RegExp, Slot][] = [
  [/^bm-(identity|description)$/, "overview.intro"],
  [/^scope-/, "overview.scope"],
  [/^bm-/, "business.ownership"],
  [/^up-/, "business.upstream"],
  [/^dn-/, "business.downstream"],
  [/^rv-/, "business.revenue"],
  [/^in-/, "business.integration"],
  [/^dr-/, "business.drivers"],
  [/^pg-/, "projects.program"],
  [/^fin-/, "financial.frame"],
  [/^rk-disc-/, "risks.disclosures"],
  [/^rk-mgmt-/, "risks.guidance"],
  [/^rk-int-/, "risks.interpretations"],
  [/^rk-asm-/, "risks.assumptions"],
  [/^rk-sc-/, "risks.scenarios"],
  [/^cg-/, "risks.gaps"],
];

/** الموضع الأساسي لفقرة. الفقرات التابعة لمشروع أو تحليل تبقى تحت أصلها. */
export function slotOf(p: CompiledParagraph): Slot {
  if (p.role.startsWith("project_")) return `projects.${p.parent}`;
  if (p.role === "analysis_driver") return `financial.${p.parent}`;
  const hit = PREFIX_SLOT.find(([re]) => re.test(p.id));
  if (!hit) throw Error(`unplaced_paragraph:${p.id}`);
  return hit[1];
}

/** المقاطع (anchors) الرئيسية للصفحة، بترتيب القراءة. */
export const PARTS = ["overview", "business", "projects", "financial", "risks", "topics"] as const;
export type Part = (typeof PARTS)[number];

// ── المشاريع
export type ProjectView = {
  id: string;
  name: Bi;
  /** تحقق في فترة تقرير 2025 بحسب سجل المحرك (WITHHELD)، أم هدف إدارة لا نتيجة. */
  track: "reported_milestone" | "management_target";
  b03: Pack["projects"][number]["b03"];
  paragraphs: string[];
  /** هويات الأدلة التي تخص هذا المشروع وحده (سجل المشروع في B03 ووصفه غير المركّب). */
  identities: string[];
};
const PROJECT_NAME: Record<string, Bi> = {
  jafurah: { ar: "جافورة", en: "Jafurah" },
  tanajib: { ar: "تناجيب", en: "Tanajib" },
  "marjan-increment": { ar: "زيادة مرجان", en: "Marjan increment" },
  "sales-gas-growth-2030": { ar: "برنامج نمو سعة الغاز للبيع", en: "Sales gas capacity growth" },
  "msc-12mbd": { ar: "السعة القصوى المستدامة للخام", en: "Maximum sustainable crude capacity" },
};
const MILESTONE = new Set(["commenced_production", "commenced_operations", "onstream"]);

// ── المحركات
export const DRIVERS = ["dr-price", "dr-volume", "dr-margin", "dr-capacity"] as const;
export const DRIVER_NAME: Record<(typeof DRIVERS)[number], Bi> = {
  "dr-price": { ar: "السعر", en: "Price" },
  "dr-volume": { ar: "الكمية", en: "Volume" },
  "dr-margin": { ar: "الهامش", en: "Margin" },
  "dr-capacity": { ar: "الطاقة (سيناريو)", en: "Capacity (scenario)" },
};

export type Relation = { project: string; paragraph: string; via: string[] };

// ── الموضوعات
export type TopicView = TopicEntry & {
  ordinal: number;
  title: Bi;
  group: string;
  /** الفقرات التي موضوعها الأول هو هذا الموضوع (الموضع الدلالي الأساسي). */
  primary: string[];
  /** فقرات تمس الموضوع وموضوعها الأول غيره: روابط سياقية لا تكرار. */
  context: string[];
  declaredGap: boolean;
};

export type LinkRecord = MetricLink & { researchTopics: Topic[] };

export type Experience = {
  pack: Pack;
  paragraphs: Map<string, CompiledParagraph>;
  slots: Map<Slot, CompiledParagraph[]>;
  slotOf: Map<string, Slot>;
  projects: ProjectView[];
  relations: Relation[];
  analyses: CompiledAnalysis[];
  topics: TopicView[];
  groups: { id: string; title: Bi; question: Bi; topics: Topic[] }[];
  gaps: GapEntry[];
  links: Map<string, LinkRecord>;
  holds: {
    analysesBlocked: number;
    analyses: number;
    claimsWithheld: number;
    claims: number;
    inputsWithheld: number;
    financiallyQualified: number;
  };
  snapshotDate: string;
};

let cached: Experience | null = null;

export function buildExperience(ctx: EvidenceContext = loadContext()): Experience {
  if (cached) return cached;
  const pack = compilePack(ctx);
  const paragraphs = new Map(pack.paragraphs.map((p) => [p.id, p]));

  // موضع واحد لكل فقرة.
  const slots = new Map<Slot, CompiledParagraph[]>();
  const slotById = new Map<string, Slot>();
  for (const p of pack.paragraphs) {
    const s = slotOf(p);
    if (slotById.has(p.id)) throw Error(`duplicate_placement:${p.id}`);
    slotById.set(p.id, s);
    slots.set(s, [...(slots.get(s) ?? []), p]);
  }

  // المشاريع وهوياتها الخاصة.
  const regProjects = new Map(ctx.register.projects.map((x) => [x.id, x]));
  const claimUse = new Map<string, number>();
  for (const x of ctx.register.projects)
    for (const d of x.description) claimUse.set(d.claimId, (claimUse.get(d.claimId) ?? 0) + 1);
  const projects: ProjectView[] = pack.projects.map((pr) => {
    const reg = regProjects.get(pr.id);
    if (!reg) throw Error(`unknown_b03_project:${pr.id}`);
    const own = reg.description.map((d) => d.claimId).filter((c) => claimUse.get(c) === 1);
    return {
      id: pr.id,
      name: PROJECT_NAME[pr.id] ?? { ar: reg.name, en: reg.name },
      track: MILESTONE.has(pr.b03.executionStatus) ? "reported_milestone" : "management_target",
      b03: pr.b03,
      paragraphs: [pr.nature, pr.purpose, ...pr.risks, ...pr.gaps],
      identities: [`b03_project:${pr.id}`, ...own.map((c) => `b03_claim:${c}`)],
    };
  });
  const idOf = (r: ResolvedRef) =>
    r.ref.t === "b03_project"
      ? `b03_project:${r.ref.id}`
      : r.ref.t === "b03_claim"
        ? `b03_claim:${r.ref.id}`
        : null;
  const relations: Relation[] = [];
  for (const p of pack.paragraphs) {
    if (p.role.startsWith("project_")) continue;
    const ids = new Set(p.refs.map(idOf).filter((x): x is string => !!x));
    for (const pr of projects) {
      const via = pr.identities.filter((i) => ids.has(i));
      if (via.length) relations.push({ project: pr.id, paragraph: p.id, via });
    }
  }

  // الموضوعات بترتيب التطبيق ومجموعاته.
  const raw = JSON.parse(
    gunzipSync(
      readFileSync(new URL("tests/fixtures/codex-20261013/2222-page.json.gz", ROOT)),
    ).toString(),
  );
  const preview = buildCompanyPreview(raw);
  const appTopic = new Map(preview.topics.map((t) => [t.key as Topic, t]));
  const entries = topicMap(pack);
  const topics: TopicView[] = entries.map((e) => {
    const t = appTopic.get(e.topic);
    if (!t) throw Error(`unknown_topic:${e.topic}`);
    const primary = e.paragraphs.filter((id) => paragraphs.get(id)!.topics[0] === e.topic);
    const context = e.paragraphs.filter((id) => paragraphs.get(id)!.topics[0] !== e.topic);
    const group = COMPANY_GROUPS.find((g) => (g.topics as readonly number[]).includes(t.ordinal));
    if (!group) throw Error(`topic_without_group:${e.topic}`);
    return {
      ...e,
      ordinal: t.ordinal,
      title: t.title,
      group: group.id,
      primary,
      context,
      declaredGap: e.status === "methodology_or_gap_only",
    };
  });
  const groups = COMPANY_GROUPS.map((g) => ({
    id: g.id,
    title: g.title,
    question: g.question,
    topics: g.topics.map((n) => topics.find((x) => x.ordinal === n)!.topic),
  }));

  // سجل الروابط المقبول.
  const linkFile = JSON.parse(read("review-delivery/WEB08B04/MAREFA-DATA-LINKS.json")) as {
    metrics: LinkRecord[];
  };
  const links = new Map(linkFile.metrics.map((m) => [m.key, m]));

  const b02 = JSON.parse(
    read("review-delivery/WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json"),
  );
  cached = {
    pack,
    paragraphs,
    slots,
    slotOf: slotById,
    projects,
    relations,
    analyses: pack.analyses,
    topics,
    groups,
    gaps: gapRegister(pack, ctx),
    links,
    holds: {
      analysesBlocked: pack.analyses.filter((a) => a.status === "BLOCKED").length,
      analyses: pack.analyses.length,
      claimsWithheld: ctx.register.claims.filter((c) => c.qualification.status === "WITHHELD")
        .length,
      claims: ctx.register.claims.length,
      inputsWithheld: b02.results.length,
      financiallyQualified: b02.qualified_for_research,
    },
    snapshotDate: pack.basis.snapshotGeneratedAt.slice(0, 10),
  };
  return cached;
}

/** للاختبار: نموذج جديد دون الذاكرة المؤقتة. */
export const resetExperience = () => {
  cached = null;
};
