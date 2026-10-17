/**
 * WEB-08B04 — مخرجات الحزمة في review-delivery/WEB08B04/ (حتمية). `--check` يتحقق من المطابقة دون كتابة.
 *   bun research-evidence/aramco-research-pack/build.ts [--check]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { loadContext, type EvidenceContext, type ResolvedRef } from "./evidence";
import {
  compilePack,
  gapRegister,
  metricLink,
  type MetricLink,
  topicMap,
  type CompiledParagraph,
  type Pack,
} from "./pack";
import { STATUS_OF_KIND, type Kind, type Topic } from "./schema";

const OUT = new URL("../../review-delivery/WEB08B04/", import.meta.url);

const KIND_AR: Record<Kind, string> = {
  reported_record: "سجل المحرك",
  management_plan: "خطة إدارة",
  research_interpretation: "تفسير بحثي",
  assumption: "افتراض",
  scenario: "سيناريو نوعي",
  methodology: "طريقة تحليل",
  gap: "فجوة",
};
const KIND_EN: Record<Kind, string> = {
  reported_record: "Engine record",
  management_plan: "Management plan",
  research_interpretation: "Research interpretation",
  assumption: "Assumption",
  scenario: "Qualitative scenario",
  methodology: "Methodology",
  gap: "Gap",
};
const INPUT_AR: Record<string, string> = {
  B02_WITHHELD_INPUT: "محجوب ضمن الـ142",
  UNREVIEWED_ENGINE_FACT: "حقيقة محرك غير مراجَعة",
  UNAPPROVED_DERIVED_METRIC: "مشتق غير معتمد",
  NOT_IN_SNAPSHOT: "غير موجود في اللقطة",
};

const linkCell = (l: MetricLink, ar: boolean) =>
  l.status === "NOT_RENDERED"
    ? ar
      ? "غير معروض في تحليل الشركة"
      : "Not rendered in Company Intelligence"
    : `[${ar ? "تحليل" : "intelligence"}](${l.intelligence})${l.status === "CHART_ONLY_NOT_FOCUSABLE" ? (ar ? " (منحنى، دون تركيز)" : " (chart, no focus)") : ""} · [${ar ? "بيانات" : "data"}](${l.data})`;
const refKey = (r: ResolvedRef) => JSON.stringify(r.ref);
const refLine = (r: ResolvedRef) => {
  const src = r.source;
  const where = [
    src.url ? src.url.split("/").pop() : null,
    src.filedAt ? `filed ${src.filedAt}` : null,
    src.page !== null ? `engine p.${src.page}` : null,
    src.table,
    r.periods?.length ? `periods ${r.periods.join(" ")}` : null,
    r.unit ? `unit ${r.unit}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return `${r.label} — ${r.status}${where ? ` — ${where}` : ""}`;
};

function renderParagraph(p: CompiledParagraph, index: Map<string, number>, lang: "ar" | "en") {
  const nums = p.refs.map((r) => `E${index.get(refKey(r))}`).join(", ");
  const body =
    lang === "ar" ? p.ar : (p.en ?? "_[Translation pending — Arabic is the primary text.]_");
  const tag = lang === "ar" ? KIND_AR[p.kind] : KIND_EN[p.kind];
  return `<a id="${p.id}"></a>**[${tag} · ${p.status}]** ${body.replace(/\n/g, "\n\n")}\n\n<sub>${p.id} · ${lang === "ar" ? "الأدلة" : "Evidence"}: ${nums} · ${lang === "ar" ? "الموضوعات" : "Topics"}: ${p.topics.join(", ")}</sub>\n`;
}

export function renderDraft(pack: Pack, lang: "ar" | "en"): string {
  const index = new Map<string, number>();
  const refs: ResolvedRef[] = [];
  for (const p of pack.paragraphs)
    for (const r of p.refs)
      if (!index.has(refKey(r))) {
        index.set(refKey(r), refs.length + 1);
        refs.push(r);
      }
  const ar = lang === "ar";
  const out: string[] = [];
  out.push(
    ar
      ? `# أرامكو السعودية (2222) — حزمة بحث استثماري متعمق\n\n> **مسودة بحث غير معتمدة — WITHHELD — لا تُنشر.** كل الفقرات بحالة غير «معتمد». لا أرقام مالية من المحرك؛ الأرقام في Marefa Data عبر الروابط. الأساس: لقطة ${pack.basis.snapshotGeneratedAt}، وB03 \`${pack.basis.b03Implementation.slice(0, 7)}\` (قبول هندسي \`${pack.basis.b03Accept.slice(0, 7)}\`).\n`
      : `# Saudi Aramco (2222) — In-depth investment research pack\n\n> **Unapproved research draft — WITHHELD — not for publication.** No paragraph is approved. No engine financial figures; figures are in Marefa Data via links. Basis: snapshot ${pack.basis.snapshotGeneratedAt}, B03 \`${pack.basis.b03Implementation.slice(0, 7)}\` (engineering accept \`${pack.basis.b03Accept.slice(0, 7)}\`). Arabic is the primary text; untranslated paragraphs are marked.\n`,
  );
  out.push(
    ar
      ? `| النوع | الحالة | العدد |\n|---|---|---|\n${(Object.keys(STATUS_OF_KIND) as Kind[]).map((k) => `| ${KIND_AR[k]} | ${STATUS_OF_KIND[k]} | ${pack.counts[`kind:${k}`]} |`).join("\n")}\n| تحليلات كمية | BLOCKED | ${pack.analyses.length} |\n`
      : `| Kind | Status | Count |\n|---|---|---|\n${(Object.keys(STATUS_OF_KIND) as Kind[]).map((k) => `| ${KIND_EN[k]} | ${STATUS_OF_KIND[k]} | ${pack.counts[`kind:${k}`]} |`).join("\n")}\n| Quantitative analyses | BLOCKED | ${pack.analyses.length} |\n`,
  );
  for (const s of pack.sections) {
    out.push(`\n## ${ar ? s.title.ar : s.title.en}\n`);
    for (const p of pack.paragraphs.filter((x) => x.section === s.id && x.role === "body"))
      out.push(renderParagraph(p, index, lang));
    for (const pr of pack.projects.filter(() => s.id === "projects-growth")) {
      const byId = (id: string) => pack.paragraphs.find((p) => p.id === id)!;
      out.push(
        `\n### ${ar ? "مشروع" : "Project"}: \`${pr.id}\`\n\n| ${ar ? "الحالة في B03" : "B03 status"} | ${ar ? "السعة" : "Capacity"} | ${ar ? "التوقيت" : "Timing"} | ${ar ? "التكلفة" : "Cost"} | ${ar ? "التأهيل" : "Qualification"} |\n|---|---|---|---|---|\n| ${pr.b03.executionStatus} | ${pr.b03.capacity} | ${pr.b03.timing} | ${pr.b03.cost} | ${pr.b03.qualification} |\n`,
      );
      for (const [h, ids] of [
        [ar ? "الطبيعة والحالة" : "Nature and status", [pr.nature]],
        [ar ? "الغرض الاقتصادي" : "Economic purpose", [pr.purpose]],
        [ar ? "المخاطر" : "Risks", pr.risks],
        [ar ? "الفجوات" : "Gaps", pr.gaps],
      ] as const) {
        out.push(`**${h}**\n`);
        for (const id of ids) out.push(renderParagraph(byId(id), index, lang));
      }
    }
    for (const a of pack.analyses.filter(() => s.id === "financial-drivers")) {
      out.push(
        `\n### ${ar ? a.title.ar : a.title.en} — BLOCKED\n\n**${ar ? "التعريف" : "Definition"} (${a.definition.basis}):** ${ar ? a.definition.ar : "_[Translation pending]_"}\n\n**${ar ? "الموانع" : "Blockers"}:** ${a.blockers.join(", ")}\n\n| ${ar ? "المدخل" : "Input"} | ${ar ? "السلة" : "Bucket"} | ${ar ? "الفترات المتاحة" : "Periods available"} | ${ar ? "الحالة" : "Status"} | Marefa Data |\n|---|---|---|---|---|\n${a.inputs.map((i) => `| \`${i.key}\`${i.dims ? ` ${Object.values(i.dims).join("/")}` : ""} | ${i.bucket} | ${i.periods.join(" ")} | ${ar ? INPUT_AR[i.status] : i.status} | ${linkCell(i.links, ar)} |`).join("\n")}\n\n${ar ? "مدخلات B02 المحجوبة" : "B02 withheld inputs"}: ${a.b02Inputs.map((b) => `\`${b.metric}\` (${b.observations})`).join(", ")}\n\n**${ar ? "أسئلة البحث" : "Research questions"}:**\n${ar ? a.questions.map((q) => `- ${q}`).join("\n") : "- _[Translation pending]_"}\n\n**${ar ? "المحركات" : "Drivers"}:**\n`,
      );
      for (const d of a.drivers)
        out.push(
          renderParagraph(
            pack.paragraphs.find((p) => p.id === d)!,
            index,
            lang,
          ),
        );
    }
  }
  out.push(
    `\n## ${ar ? "فهرس الأدلة" : "Evidence index"}\n\n${refs.map((r, i) => `- **E${i + 1}** ${refLine(r)}`).join("\n")}\n`,
  );
  return out.join("\n");
}

export function deliverables(pack: Pack, ctx: EvidenceContext): Record<string, string> {
  const json = (v: unknown) => JSON.stringify(v, null, 1) + "\n";
  const head = {
    status: pack.status,
    publication: pack.publication,
    company: pack.company,
    basis: pack.basis,
  };
  const metricLinks = new Map<string, { key: string; topics: Set<string> }>();
  for (const p of pack.paragraphs)
    for (const r of p.refs)
      if (r.ref.t === "engine_metric") {
        const e = metricLinks.get(r.ref.key) ?? { key: r.ref.key, topics: new Set<string>() };
        p.topics.forEach((t) => e.topics.add(t));
        metricLinks.set(r.ref.key, e);
      }
  for (const a of pack.analyses)
    for (const i of a.inputs) {
      const e = metricLinks.get(i.key) ?? { key: i.key, topics: new Set<string>() };
      a.topics.forEach((t) => e.topics.add(t));
      metricLinks.set(i.key, e);
    }
  return {
    "RESEARCH-DRAFT_AR.md": renderDraft(pack, "ar"),
    "RESEARCH-DRAFT_EN.md": renderDraft(pack, "en"),
    "EVIDENCE-MAP.json": json({
      ...head,
      note: "Per paragraph: kind, status, topics and resolved evidence (identities only, no metric values).",
      counts: pack.counts,
      paragraphs: pack.paragraphs.map((p) => ({
        id: p.id,
        section: p.section,
        role: p.role,
        parent: p.parent,
        kind: p.kind,
        status: p.status,
        topics: p.topics,
        hasEnglish: p.en !== null,
        evidence: p.refs.map((r) => ({
          ref: r.ref,
          label: r.label,
          status: r.status,
          source: r.source,
          periods: r.periods ?? null,
        })),
      })),
    }),
    "FINANCIAL-STRUCTURE.json": json({
      ...head,
      note: "Defined quantitative analyses. All BLOCKED: no qualified input exists. Inputs are identities; values live in Marefa Data.",
      analyses: pack.analyses,
    }),
    "GAP-REGISTER.json": json({ ...head, gaps: gapRegister(pack, ctx) }),
    "TOPIC-MAP.json": json({ ...head, topics: topicMap(pack) }),
    "MAREFA-DATA-LINKS.json": json({
      ...head,
      note: "Links only, built from each metric's actual placement in the accepted company experience (buildCompanyPreview over the frozen snapshot). FOCUSABLE = topic + focus on the rendered element; CHART_ONLY_NOT_FOCUSABLE = shown as a history chart, topic link without focus; NOT_RENDERED = not shown in Company Intelligence, no link. No figure is copied.",
      metrics: [...metricLinks.values()]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((m) => ({
          ...metricLink(m.key, [...m.topics].sort() as Topic[]),
          researchTopics: [...m.topics].sort(),
        })),
    }),
    "PROJECTS.json": json({ ...head, projects: pack.projects }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ctx = loadContext();
  const files = deliverables(compilePack(ctx), ctx);
  const check = process.argv.includes("--check");
  let bad = 0;
  for (const [name, content] of Object.entries(files)) {
    const url = new URL(name, OUT);
    if (check) {
      let cur = "";
      try {
        cur = readFileSync(url, "utf8");
      } catch {
        cur = "";
      }
      const same = cur === content;
      if (!same) bad++;
      console.log(`${same ? "same" : "DIFF"} ${name}`);
    } else {
      writeFileSync(url, content);
      console.log(`wrote ${name}`);
    }
  }
  if (bad) process.exit(1);
}
