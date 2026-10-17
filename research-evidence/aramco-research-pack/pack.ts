/**
 * WEB-08B04 — تجميع الحزمة والتحقق منها. أي مخالفة تُفشل البناء:
 * - كل مرجع يُحل، وكل فقرة لها مرجع واحد على الأقل، والحالة مشتقة من النوع.
 * - الخطة لا تستند إلى ادعاء واقعة فقط، والسجل لا يستند إلى ادعاء خطة.
 * - الأرقام في النص: سنوات وتواريخ صالحة، أو أعداد الحزمة المعلنة، أو أرقام واردة حرفيًا في الدليل المستشهد به.
 * - الافتراض والسيناريو بلا أرقام. السجل لا يحمل سنة بعد سنة اللقطة.
 * - كل تحليل كمي BLOCKED، ومدخلاته بحالة غير «مؤهل».
 */
import { TOPICS } from "../v1/contract";
import { groupOfTopic, isCivilDate } from "../aramco-disclosures/register";
import { BUSINESS, SCOPE } from "./content-business";
import { FINANCIAL } from "./content-financial";
import { GROWTH } from "./content-growth";
import { COVERAGE_GAPS, RISKS } from "./content-risks";
import {
  inputStatus,
  loadContext,
  resolveRef,
  type EvidenceContext,
  type InputStatus,
  type ResolvedRef,
} from "./evidence";
import {
  AMBIGUOUS,
  DATE,
  FORMAT_CONTROL,
  NON_ASCII_NUMBER,
  analyseNumbers,
  numberTokens,
} from "./numeric-guard";
import { metricPlacements, type Placement } from "./placement";
import { STATUS_OF_KIND, type Analysis, type Paragraph, type Section, type Topic } from "./schema";

export const SECTIONS: Section[] = [SCOPE, BUSINESS, GROWTH, FINANCIAL, RISKS, COVERAGE_GAPS];

const SYMBOL = "2222";
export const intelligenceLink = (topic: Topic, focus?: string) =>
  `/preview/web-v1/companies/${SYMBOL}/intelligence?topic=${topic}${focus ? `&focus=${encodeURIComponent(focus)}` : ""}`;
/**
 * رابط مقياس محدد (LINK-01): يُبنى من موضعه الفعلي في تجربة الشركة، لا من موضوع الفقرة.
 * - FOCUSABLE: الموضوع الذي يعرض المقياس + focus على عنصره.
 * - CHART_ONLY_NOT_FOCUSABLE: يظهر منحنى تاريخيًا فقط؛ رابط الموضوع دون focus.
 * - NOT_RENDERED: لا يظهر في تحليل الشركة؛ لا رابط، والحالة معلنة.
 */
export type MetricLink = {
  key: string;
  status: "FOCUSABLE" | "CHART_ONLY_NOT_FOCUSABLE" | "NOT_RENDERED";
  topic: Topic | null;
  mode: Placement["mode"] | null;
  intelligence: string | null;
  data: string | null;
  shownPeriods: string[];
  placements: Placement[];
};
export function metricLink(key: string, prefer: readonly Topic[] = []): MetricLink {
  const all = metricPlacements().get(key) ?? [];
  const rank = (x: Placement) =>
    (x.mode === "chart_only" ? 10 : 0) +
    (prefer.includes(x.topic) ? 0 : 1) +
    (x.mode === "focus_statement_row" ? 0.5 : 0);
  const best = [...all].sort((a, b) => rank(a) - rank(b) || a.topic.localeCompare(b.topic))[0];
  if (!best)
    return {
      key,
      status: "NOT_RENDERED",
      topic: null,
      mode: null,
      intelligence: null,
      data: null,
      shownPeriods: [],
      placements: [],
    };
  const focusable = best.mode !== "chart_only";
  return {
    key,
    status: focusable ? "FOCUSABLE" : "CHART_ONLY_NOT_FOCUSABLE",
    topic: best.topic,
    mode: best.mode,
    intelligence: intelligenceLink(best.topic, focusable ? key : undefined),
    data: dataLink(best.topic),
    shownPeriods: best.shownPeriods,
    placements: all,
  };
}
export const dataLink = (topic: Topic) =>
  `/preview/web-v1/companies/${SYMBOL}?tab=${groupOfTopic(topic)}`;

// حارس الأرقام في numeric-guard.ts: مسار واحد مرتب، والاستثناءات في checkText بعده.
export { AMBIGUOUS, numberTokens, type NumberToken } from "./numeric-guard";
const codePoint = (c: string) =>
  `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
const isYear = (n: string) => /^(19|20)\d{2}$/.test(n);
/** كمية مسموحة في السجل والخطة فقط، وفي غيرهما ممنوعة. */
const QUANTITY_KINDS = new Set(["reported_record", "management_plan"]);

export type CompiledParagraph = Omit<Paragraph, "refs"> & {
  section: string;
  status: (typeof STATUS_OF_KIND)[keyof typeof STATUS_OF_KIND];
  refs: ResolvedRef[];
  role:
    | "body"
    | "analysis_driver"
    | "project_nature"
    | "project_purpose"
    | "project_risk"
    | "project_gap";
  parent: string | null;
};
export type CompiledInput = {
  key: string;
  bucket: string;
  dims: Record<string, string> | null;
  status: InputStatus;
  periods: string[];
  unit: string | null;
  page: number | null;
  table: string | null;
  links: MetricLink;
};
export type CompiledAnalysis = Omit<Analysis, "drivers" | "inputs" | "b02Inputs"> & {
  status: "BLOCKED";
  blockers: string[];
  inputs: CompiledInput[];
  b02Inputs: { metric: string; observations: number; status: "B02_WITHHELD_INPUT" }[];
  drivers: string[];
  links: { intelligence: string; data: string };
};
export type CompiledProject = {
  id: string;
  b03: {
    executionStatus: string;
    capacity: string;
    timing: string;
    cost: string;
    qualification: string;
  };
  nature: string;
  purpose: string;
  risks: string[];
  gaps: string[];
};

export type Pack = {
  schema: "marefa-aramco-research-pack/1";
  status: "UNAPPROVED_RESEARCH_DRAFT — WITHHELD";
  publication: "not_for_public_display";
  company: { id: string; market: string; symbol: string };
  basis: { snapshotGeneratedAt: string; b03Implementation: string; b03Accept: string };
  sections: { id: string; title: { ar: string; en: string } }[];
  paragraphs: CompiledParagraph[];
  analyses: CompiledAnalysis[];
  projects: CompiledProject[];
  counts: Record<string, number>;
};

export function compilePack(
  ctx: EvidenceContext = loadContext(),
  sections: Section[] = SECTIONS,
): Pack {
  const META: Record<string, number> = {
    "22": ctx.register.claims.length,
    "142": ctx.b02Withheld.length,
    "18": TOPICS.length,
  };
  const snapshotYear = Number(ctx.register.snapshot.generatedAt.slice(0, 4));
  const ids = new Set<string>();
  const paragraphs: CompiledParagraph[] = [];

  const asOfDate = ctx.register.snapshot.generatedAt.slice(0, 10);
  /**
   * حارس الأرقام والتواريخ (ENG-03/04):
   * - الكمية (رقم + وحدة) تُقبل في السجل والخطة فقط، وبشرط ورود الرقم نفسه بأصناف الوحدة نفسها في دليل مستشهد به.
   *   شكل السنة أو رمز السهم لا يعفي الكمية («2025 ريال» كمية).
   * - الرقم المجرد: سنة، أو رمز السهم، أو عدد معلن للحزمة، أو رقم مجرد وارد في الدليل.
   * - التاريخ تقويمي صالح؛ والسجل لا يحمل تاريخًا أو سنة بعد تاريخ اللقطة.
   * تطابق الرقم ليس إثباتًا لصحة التفسير؛ لذلك تُمنع الكميات في التفسير والافتراض والسيناريو والتعريفات.
   */
  const checkText = (
    where: string,
    text: string,
    evidence: string[],
    meta: string[] = [],
    kind?: string,
  ) => {
    // 0. النص الخام قبل أي تنظيف.
    const nonAscii = NON_ASCII_NUMBER.exec(text);
    if (nonAscii) throw Error(`non_latin_digits:${where}:${codePoint(nonAscii[0])}`);
    // محرف التنسيق يُرفض هنا حتمًا، قبل الحجب ودون الاعتماد على بقاء رقم بعده: رقم يقع كله في تاريخ
    // أو كود أو ترقيم قائمة يُحجب، فلا يصل سبب format_control إلى حلقة الأرقام.
    const control = FORMAT_CONTROL.exec(text);
    if (control) {
      const rawDigits = /[0-9]+/.exec(text)?.[0];
      throw Error(
        rawDigits
          ? `ambiguous_number_format:${where}:${rawDigits}:format_control`
          : `format_control:${where}:${codePoint(control[0])}`,
      );
    }
    for (const d of text.match(DATE) ?? []) {
      if (!isCivilDate(d)) throw Error(`invalid_date:${where}:${d}`);
      if (kind === "reported_record" && d > asOfDate)
        throw Error(`future_date_in_record:${where}:${d}`);
    }
    const ev = evidence.flatMap(numberTokens);
    const evBare = new Set(ev.map((t) => t.n));
    // 1–3. كل رقم: ملتبس ← كمية ← رقم مجرد. الاستثناءات بعد ذلك فقط.
    for (const t of analyseNumbers(text)) {
      if (t.classes.includes(AMBIGUOUS) || t.reasons?.length)
        throw Error(`ambiguous_number_format:${where}:${t.n}:${t.reasons!.join("+")}`);
      if (t.classes.length) {
        if (!kind || !QUANTITY_KINDS.has(kind))
          throw Error(`quantity_in_${kind ?? "definition"}:${where}:${t.n} ${t.classes.join("+")}`);
        const ok = ev.some((e) => e.n === t.n && t.classes.every((c) => e.classes.includes(c)));
        if (!ok) throw Error(`unsupported_quantity:${where}:${t.n} ${t.classes.join("+")}`);
        continue;
      }
      if (t.n === ctx.register.company.symbol) continue;
      if (isYear(t.n)) {
        if (kind === "reported_record" && Number(t.n) > snapshotYear)
          throw Error(`future_year_in_record:${where}:${t.n}`);
        continue;
      }
      if (kind === "assumption" || kind === "scenario")
        throw Error(`number_in_${kind}:${where}:${t.n}`);
      if (meta.includes(t.n)) continue;
      if (!evBare.has(t.n)) throw Error(`unsupported_number:${where}:${t.n}`);
    }
  };

  const compile = (
    p: Paragraph,
    section: string,
    role: CompiledParagraph["role"],
    parent: string | null,
  ) => {
    if (ids.has(p.id)) throw Error(`duplicate_id:${p.id}`);
    ids.add(p.id);
    if (!p.refs.length) throw Error(`no_evidence:${p.id}`);
    if (!p.topics.length || p.topics.some((t) => !(TOPICS as readonly string[]).includes(t)))
      throw Error(`invalid_topic:${p.id}`);
    const refs = p.refs.map((r) => resolveRef(r, ctx));
    for (const m of p.metaNumbers ?? [])
      if (!(m in META)) throw Error(`unknown_meta_number:${p.id}:${m}`);
    const evidenceText = refs.map((r) => r.text ?? "");
    checkText(p.id, p.ar, evidenceText, p.metaNumbers, p.kind);
    if (p.en) checkText(`${p.id}:en`, p.en, evidenceText, p.metaNumbers, p.kind);
    // الفصل بين الواقعة والخطة على مستوى الأدلة
    const cats = p.refs
      .filter((r) => r.t === "b03_claim")
      .map((r) => ctx.register.claims.find((c) => c.id === (r as { id: string }).id)!.category);
    if (p.kind === "management_plan" && !cats.includes("management_plan"))
      throw Error(`plan_without_plan_evidence:${p.id}`);
    if (p.kind === "management_plan" && cats.includes("official_fact"))
      throw Error(`plan_cites_fact_claim:${p.id}`);
    if (p.kind === "reported_record" && cats.includes("management_plan"))
      throw Error(`record_cites_plan_claim:${p.id}`);
    paragraphs.push({ ...p, section, status: STATUS_OF_KIND[p.kind], refs, role, parent });
  };

  const analyses: CompiledAnalysis[] = [];
  const projects: CompiledProject[] = [];
  for (const s of sections) {
    for (const p of s.paragraphs) compile(p, s.id, "body", null);
    for (const a of s.analyses ?? []) {
      if (ids.has(a.id)) throw Error(`duplicate_id:${a.id}`);
      ids.add(a.id);
      for (const t of [a.definition.ar, ...a.questions, a.title.ar, a.title.en])
        checkText(a.id, t, []);
      const inputs: CompiledInput[] = a.inputs.map((i) => {
        const r = resolveRef(
          { t: "engine_metric", key: i.key, bucket: i.bucket, ...(i.dims ? { dims: i.dims } : {}) },
          ctx,
        );
        return {
          key: i.key,
          bucket: i.bucket,
          dims: i.dims ?? null,
          status: inputStatus(i.key, i.bucket, ctx, i.dims),
          periods: r.periods ?? [],
          unit: r.unit ?? null,
          page: r.source.page,
          table: r.source.table,
          links: metricLink(i.key, a.topics),
        };
      });
      const b02Inputs = a.b02Inputs.map((m) => {
        resolveRef({ t: "b02_withheld", metric: m }, ctx);
        return {
          metric: m,
          observations: ctx.b02Withheld.filter((x) => x.metric === m).length,
          status: "B02_WITHHELD_INPUT" as const,
        };
      });
      const blockers = [
        ...new Set([
          ...inputs.map((i) => i.status),
          ...(b02Inputs.length ? (["B02_WITHHELD_INPUT"] as const) : []),
          ...(a.definition.basis === "issuer_non_ifrs" ? ["ISSUER_DEFINITION_NOT_BOUND"] : []),
          ...(a.gates ?? []).map((g) => `OUTPUT_DEFINITION_NOT_BOUND:${g}`),
          "NO_FINANCIAL_REVIEW",
        ]),
      ].sort();
      for (const d of a.drivers) compile(d, s.id, "analysis_driver", a.id);
      analyses.push({
        id: a.id,
        title: a.title,
        topics: a.topics,
        definition: a.definition,
        questions: a.questions,
        status: "BLOCKED",
        blockers,
        inputs,
        b02Inputs,
        drivers: a.drivers.map((d) => d.id),
        links: { intelligence: intelligenceLink(a.topics[0]!), data: dataLink(a.topics[0]!) },
      });
    }
    for (const pr of s.projects ?? []) {
      const b = ctx.register.projects.find((x) => x.id === pr.b03ProjectId);
      if (!b) throw Error(`unknown_b03_project:${pr.b03ProjectId}`);
      compile(pr.nature, s.id, "project_nature", b.id);
      compile(pr.purpose, s.id, "project_purpose", b.id);
      pr.risks.forEach((x) => compile(x, s.id, "project_risk", b.id));
      pr.gaps.forEach((x) => compile(x, s.id, "project_gap", b.id));
      projects.push({
        id: b.id,
        b03: {
          executionStatus: b.executionStatus.state,
          capacity: b.capacity.status,
          timing: b.timing.status,
          cost: b.cost.status,
          qualification: b.qualification,
        },
        nature: pr.nature.id,
        purpose: pr.purpose.id,
        risks: pr.risks.map((x) => x.id),
        gaps: pr.gaps.map((x) => x.id),
      });
    }
  }
  for (const p of ctx.register.projects)
    if (!projects.some((x) => x.id === p.id)) throw Error(`b03_project_not_covered:${p.id}`);

  const counts: Record<string, number> = {
    paragraphs: paragraphs.length,
    analyses: analyses.length,
    projects: projects.length,
  };
  for (const k of Object.keys(STATUS_OF_KIND))
    counts[`kind:${k}`] = paragraphs.filter((p) => p.kind === k).length;

  return {
    schema: "marefa-aramco-research-pack/1",
    status: "UNAPPROVED_RESEARCH_DRAFT — WITHHELD",
    publication: "not_for_public_display",
    company: ctx.register.company,
    basis: {
      snapshotGeneratedAt: ctx.register.snapshot.generatedAt,
      b03Implementation: "1735609abafa85ee6e101ab7e3640496f0e43088",
      b03Accept: "4f7145e6927ff98559ccf82dfb6103b6953c3892",
    },
    sections: sections.map((s) => ({ id: s.id, title: s.title })),
    paragraphs,
    analyses,
    projects,
    counts,
  };
}

export type TopicEntry = {
  topic: Topic;
  paragraphs: string[];
  analyses: string[];
  status: "research_content" | "methodology_or_gap_only";
  links: { intelligence: string; data: string };
};
export function topicMap(pack: Pack): TopicEntry[] {
  return (TOPICS as readonly Topic[]).map((topic) => {
    const ps = pack.paragraphs.filter((p) => p.topics.includes(topic));
    const as = pack.analyses.filter((a) => a.topics.includes(topic));
    const substantive = as.length || ps.some((p) => !["gap", "methodology"].includes(p.kind));
    return {
      topic,
      paragraphs: ps.map((p) => p.id),
      analyses: as.map((a) => a.id),
      status: substantive ? "research_content" : "methodology_or_gap_only",
      links: { intelligence: intelligenceLink(topic), data: dataLink(topic) },
    };
  });
}

export type GapEntry = {
  id: string;
  kind: "financial_input" | "issuer_definition" | "source" | "coverage" | "claim_qualification";
  subject: string;
  status: string;
  detail: string;
  usedBy: string[];
};
export function gapRegister(pack: Pack, ctx: EvidenceContext): GapEntry[] {
  const out: GapEntry[] = [];
  const inputs = new Map<string, GapEntry>();
  for (const a of pack.analyses) {
    for (const i of a.inputs) {
      const k = `${i.key}|${i.bucket}|${JSON.stringify(i.dims ?? {})}`;
      const e =
        inputs.get(k) ??
        ({
          id: `gap-input:${i.key}:${i.bucket}${i.dims ? `:${Object.values(i.dims).join("/")}` : ""}`,
          kind: "financial_input",
          subject: i.key,
          status: i.status,
          detail: `periods ${i.periods.join(" ") || "none"}; unit ${i.unit ?? "?"}; engine page ${i.page ?? "none"}${i.table ? ` (${i.table})` : ""}`,
          usedBy: [],
        } satisfies GapEntry);
      e.usedBy.push(a.id);
      inputs.set(k, e);
    }
    for (const b of a.b02Inputs) {
      const k = `b02|${b.metric}`;
      const e =
        inputs.get(k) ??
        ({
          id: `gap-b02:${b.metric}`,
          kind: "financial_input",
          subject: b.metric,
          status: "B02_WITHHELD_INPUT",
          detail: `${b.observations} withheld observation identities in WEB-08B02; values not copied`,
          usedBy: [],
        } satisfies GapEntry);
      e.usedBy.push(a.id);
      inputs.set(k, e);
    }
    if (a.definition.basis === "issuer_non_ifrs")
      out.push({
        id: `gap-definition:${a.id}`,
        kind: "issuer_definition",
        subject: a.title.en,
        status: "ISSUER_DEFINITION_NOT_BOUND",
        detail:
          "Issuer non-IFRS definition must be bound to an original locator before any calculation.",
        usedBy: [a.id],
      });
  }
  out.push(...inputs.values());
  for (const p of pack.paragraphs.filter((x) => x.kind === "gap"))
    out.push({
      id: `gap-text:${p.id}`,
      kind: p.section === "coverage-gaps" ? "coverage" : "source",
      subject: p.id,
      status: "OPEN_GAP",
      detail: p.ar,
      usedBy: [p.parent ?? p.section],
    });
  const cited = new Set(
    pack.paragraphs.flatMap((p) =>
      p.refs.filter((r) => r.ref.t === "b03_claim").map((r) => (r.ref as { id: string }).id),
    ),
  );
  for (const c of ctx.register.claims.filter((x) => cited.has(x.id)))
    out.push({
      id: `gap-claim:${c.id}`,
      kind: "claim_qualification",
      subject: c.id,
      status: c.qualification.status,
      detail: c.qualification.gaps.join(", "),
      usedBy: pack.paragraphs
        .filter((p) =>
          p.refs.some((r) => r.ref.t === "b03_claim" && (r.ref as { id: string }).id === c.id),
        )
        .map((p) => p.id),
    });
  return out;
}
