/**
 * WEB-08B05 — مكونات تجربة البحث. تُعرض على الخادم فقط (renderToStaticMarkup)، بلا سكربت عميل:
 * التنقل بروابط المقاطع، والأدلة في <details> أصلية، ففتحها لا يشتت القارئ ولا يحتاج JavaScript.
 * الألوان والمسافات من رموز تصميم الموقع (src/styles.css) ومفرداته: حالة = لون + رمز + نص، لا لون وحده.
 */
import { createContext, useContext, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowDownRight,
  BookOpenText,
  CircleHelp,
  CircleSlash,
  Database,
  ExternalLink,
  FileSearch,
  GitBranch,
  Languages,
  Layers,
  Lightbulb,
  Link2,
  Lock,
  Ruler,
  ShieldAlert,
  Target,
  Unlink,
} from "lucide-react";
import { iso } from "../../src/lib/bidi";
import { cn } from "../../src/lib/utils";
import type { ResolvedRef } from "../aramco-research-pack/evidence";
import type { CompiledAnalysis, CompiledParagraph } from "../aramco-research-pack/pack";
import type { Bi, Kind } from "../aramco-research-pack/schema";
import {
  BASIS_LABEL,
  DIM,
  FIELD,
  GAP_KIND,
  INPUT_STATUS,
  KIND,
  PART_TITLE,
  REF_TYPE,
  RISK_CATEGORY,
  SLOT_SHORT,
  VIA,
  STATUS,
  SUB,
  UI,
  blockerLabel,
  type Lang,
  type Tone,
} from "./copy";
import {
  BASIS,
  DRIVERS,
  DRIVER_NAME,
  PARTS,
  type Experience,
  type LinkRecord,
  type ProjectView,
  type Slot,
  type TopicView,
} from "./model";

type Ctx = { x: Experience; l: Lang; base: string | null };
const C = createContext<Ctx | null>(null);
const useCtx = () => useContext(C)!;
const useT = () => {
  const { l } = useCtx();
  return (b: Bi) => b[l];
};

// ── المفردات البصرية
const TONE: Record<Tone, { chip: string; bar: string }> = {
  withheld: {
    chip: "xp-t-withheld border-status-withheld/40 bg-status-withheld/10",
    bar: "border-s-status-withheld",
  },
  target: {
    chip: "xp-t-target border-status-target/40 bg-status-target/10",
    bar: "border-s-status-target",
  },
  brand: { chip: "xp-t-brand border-brand/40 bg-brand/10", bar: "border-s-brand" },
  warn: {
    chip: "xp-t-warn border-status-warn/40 bg-status-warn/10",
    bar: "border-s-status-warn",
  },
  scenario: {
    chip: "xp-t-scenario border-tone-orange/40 bg-tone-orange/10",
    bar: "border-s-tone-orange",
  },
  neutral: {
    chip: "xp-t-neutral border-status-neutral/35 bg-status-neutral/5",
    bar: "border-s-status-neutral",
  },
  bad: {
    chip: "xp-t-bad border-status-bad/40 bg-status-bad/10",
    bar: "border-s-status-bad",
  },
  ok: { chip: "xp-t-ok border-status-ok/40 bg-status-ok/10", bar: "border-s-status-ok" },
};
const IC = "size-3.5 shrink-0";

/** الرموز تُرسم مرة واحدة كـ<symbol> وتُستدعى بـ<use>، فلا يتكرر رسمها في كل بطاقة. */
const ICONS = {
  "arrow-down-left": ArrowDownLeft,
  "arrow-down-right": ArrowDownRight,
  "book-open-text": BookOpenText,
  "circle-help": CircleHelp,
  "circle-slash": CircleSlash,
  database: Database,
  "external-link": ExternalLink,
  "file-search": FileSearch,
  "git-branch": GitBranch,
  languages: Languages,
  layers: Layers,
  lightbulb: Lightbulb,
  link2: Link2,
  lock: Lock,
  ruler: Ruler,
  "shield-alert": ShieldAlert,
  target: Target,
  unlink: Unlink,
} as const;
type IconName = keyof typeof ICONS;
function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={cn("lucide", className)} aria-hidden="true" focusable="false" data-icon={name}>
      <use href={`#i-${name}`} />
    </svg>
  );
}
function IconSprite() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="absolute size-0 overflow-hidden"
      aria-hidden="true"
      focusable="false"
      data-icon-sprite
    >
      {(Object.entries(ICONS) as [IconName, (typeof ICONS)[IconName]][]).map(([k, Cmp]) => (
        <symbol key={k} id={`i-${k}`} viewBox="0 0 24 24">
          <Cmp />
        </symbol>
      ))}
    </svg>
  );
}
const KIND_ICON: Record<Kind, ReactNode> = {
  reported_record: <Icon name="database" className={IC} />,
  management_plan: <Icon name="target" className={IC} />,
  research_interpretation: <Icon name="lightbulb" className={IC} />,
  assumption: <Icon name="circle-help" className={IC} />,
  scenario: <Icon name="git-branch" className={IC} />,
  methodology: <Icon name="ruler" className={IC} />,
  gap: <Icon name="circle-slash" className={IC} />,
};

function Pill({
  tone,
  icon,
  children,
  ...data
}: { tone: Tone; icon?: ReactNode; children: ReactNode } & {
  [k: `data-${string}`]: string;
}) {
  return (
    <span className={cn("xp-pill", TONE[tone].chip)} {...data}>
      {icon}
      {children}
    </span>
  );
}

export function KindBadge({ kind }: { kind: Kind }) {
  const t = useT();
  return (
    <Pill tone={KIND[kind].tone} icon={KIND_ICON[kind]} data-kind-badge={kind}>
      {t(KIND[kind].label)}
    </Pill>
  );
}

const n = (v: number) => iso(v);
const ltr = (s: string) => <bdi dir="ltr">{s}</bdi>;

// ── النص البحثي
function ResearchText({ ar, en }: { ar: string; en: string | null }) {
  const { l } = useCtx();
  const t = useT();
  const lines = (s: string) =>
    s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x, i) => (
        <p key={i} className="mt-2 first:mt-0">
          {x}
        </p>
      ));
  if (l === "ar")
    return <div className="text-[15px] leading-8 text-foreground/95">{lines(ar)}</div>;
  if (en)
    return (
      <div data-translation="author_draft">
        <p className="mb-1.5 inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
          <Icon name="languages" className="size-3.5" />
          {t(UI.englishDraft)}
        </p>
        <div lang="en" dir="ltr" className="text-[15px] leading-7 text-foreground/95">
          {lines(en)}
        </div>
      </div>
    );
  return (
    <div data-translation="pending">
      <p className="mb-1.5 inline-flex items-center gap-1 text-[11.5px] text-status-warn">
        <Icon name="languages" className="size-3.5" />
        {t(UI.arabicOriginal)}
      </p>
      <div
        lang="ar"
        dir="rtl"
        className="rounded-lg bg-muted/40 px-3 py-2 text-[15px] leading-8 text-foreground/95"
      >
        {lines(ar)}
      </div>
    </div>
  );
}

// ── الروابط إلى التطبيق
function AppLink({
  path,
  children,
  ...data
}: { path: string; children: ReactNode } & {
  [k: `data-${string}`]: string;
}) {
  const { base } = useCtx();
  const t = useT();
  if (!base)
    return (
      <span className="text-muted-foreground" data-link-disabled title={t(UI.appLinksDisabled)}>
        {children}
      </span>
    );
  return (
    <a href={base.replace(/\/$/, "") + path} className="xp-link" {...data}>
      {children}
    </a>
  );
}

/** حالة رابط المقياس من سجل B04 المقبول: FOCUSABLE رابط، NOT_RENDERED نص لا يُنقر. */
export function MetricLinkState({ metric }: { metric: string }) {
  const { x } = useCtx();
  const t = useT();
  const rec: LinkRecord | undefined = x.links.get(metric);
  if (!rec)
    return (
      <span className="text-[12px] text-muted-foreground" data-metric-link-state="NOT_IN_REGISTER">
        {t(UI.notInRegister)}
      </span>
    );
  if (rec.status === "NOT_RENDERED" || !rec.intelligence)
    return (
      <span
        className="inline-flex items-center gap-1 text-[12px] text-muted-foreground"
        data-metric-link-state="NOT_RENDERED"
        data-metric={metric}
      >
        <Icon name="unlink" className="size-3.5" />
        {t(UI.notRendered)}
      </span>
    );
  return (
    <span
      className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]"
      data-metric-link-state={rec.status}
    >
      <AppLink path={rec.intelligence} data-metric-link={metric}>
        <Icon name="link2" className="size-3.5" />
        {t(UI.inIntelligence)}
        {rec.status === "CHART_ONLY_NOT_FOCUSABLE" && (
          <span className="text-muted-foreground"> · {t(UI.chartOnly)}</span>
        )}
      </AppLink>
      {rec.data && (
        <AppLink path={rec.data} data-metric-data-link={metric}>
          <Icon name="database" className="size-3.5" />
          {t(UI.inData)}
        </AppLink>
      )}
    </span>
  );
}

// ── الأدلة
function EvidenceItem({ r }: { r: ResolvedRef }) {
  const t = useT();
  const src = r.source;
  const host = src.url ? new URL(src.url).hostname : null;
  return (
    <li className="xp-ev" data-evidence-ref={r.ref.t}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="xp-ev-type">{t(REF_TYPE[r.ref.t] ?? { ar: r.ref.t, en: r.ref.t })}</span>
        <code className="xp-ev-code" dir="ltr">
          {r.label}
        </code>
        <Pill
          tone={r.status === "REVIEW_RECORD_NOT_APPROVAL" ? "neutral" : "withheld"}
          icon={<Icon name="lock" className="size-3" />}
        >
          {t(STATUS[r.status] ?? { ar: r.status, en: r.status })}
        </Pill>
      </div>
      <dl className="xp-ev-dl">
        {host && (
          <div className="min-w-0">
            <dt className="sr-only">URL</dt>
            <dd className="truncate">
              <a
                href={src.url!}
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <Icon name="external-link" className="size-3" />
                {ltr(host)}
              </a>
            </dd>
          </div>
        )}
        {src.page !== null && (
          <div>
            <dt className="inline">{t(UI.sourcePage)}: </dt>
            <dd className="num inline">{n(src.page)}</dd>
          </div>
        )}
        {src.table && (
          <div className="min-w-0">
            <dt className="inline">{t(UI.table)}: </dt>
            <dd className="inline break-all">{ltr(src.table)}</dd>
          </div>
        )}
        {src.filedAt && (
          <div>
            <dt className="inline">{t(UI.filed)}: </dt>
            <dd className="num inline">{ltr(src.filedAt)}</dd>
          </div>
        )}
        {r.periods && r.periods.length > 0 && (
          <div className="min-w-0 sm:col-span-2">
            <dt className="inline">{t(UI.periods)}: </dt>
            <dd className="num inline break-words">{ltr(r.periods.join(" · "))}</dd>
          </div>
        )}
        {(r.sourceCount ?? 1) > 1 && (
          <div className="sm:col-span-2">
            <dt className="sr-only">{t(UI.sources)}</dt>
            <dd>{t(UI.multiSource)}</dd>
          </div>
        )}
      </dl>
      {r.ref.t === "engine_metric" && (
        <div className="mt-1.5">
          <MetricLinkState metric={r.ref.key} />
        </div>
      )}
    </li>
  );
}

function Evidence({ p }: { p: CompiledParagraph }) {
  const t = useT();
  return (
    <details
      className="group mt-3 rounded-xl border border-border/60 bg-muted/20"
      data-evidence={p.id}
    >
      <summary className="xp-evsum">
        <Icon name="file-search" className="size-3.5 text-brand" />
        {t(UI.evidence)} <span className="num font-normal">({n(p.refs.length)})</span>
        <span className="ms-auto font-normal" aria-hidden>
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>
      <ul className="space-y-2 px-3 pb-3" data-evidence-list={p.id}>
        {p.refs.map((r, i) => (
          <EvidenceItem key={i} r={r} />
        ))}
      </ul>
    </details>
  );
}

// ── بطاقة الفقرة (موضعها الأساسي الوحيد)
export function ParagraphCard({ p, extra }: { p: CompiledParagraph; extra?: ReactNode }) {
  const { x } = useCtx();
  const t = useT();
  const titleOf = (k: string) => x.topics.find((y) => y.topic === k)?.title;
  return (
    <article
      id={`p-${p.id}`}
      className={cn("xp-card", TONE[KIND[p.kind].tone].bar)}
      data-paragraph={p.id}
      data-kind={p.kind}
      data-status={p.status}
      data-slot={x.slotOf.get(p.id)}
      aria-label={`${t(KIND[p.kind].label)} · ${p.id}`}
    >
      <header className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <KindBadge kind={p.kind} />
        <span className="text-[11.5px] text-muted-foreground" data-status-label>
          {t(STATUS[p.status]!)}
        </span>
        {extra}
        <span className="ms-auto flex flex-wrap items-center gap-1 text-[11.5px]">
          {p.topics.map((k, i) => (
            <a
              key={k}
              href={`#topic-${k}`}
              className={cn(
                "xp-topic",
                i === 0 ? "bg-muted/60 font-semibold text-foreground/90" : "text-muted-foreground",
              )}
              data-topic-link={k}
              data-topic-primary={i === 0 ? "true" : "false"}
              title={i === 0 ? t(UI.primaryTopic) : t(UI.alsoTopics)}
            >
              {titleOf(k) ? t(titleOf(k)!) : k}
            </a>
          ))}
        </span>
      </header>
      <ResearchText ar={p.ar} en={p.en} />
      <Evidence p={p} />
      <p className="mt-2 text-[11px] text-muted-foreground" dir="ltr">
        {p.id}
      </p>
    </article>
  );
}

const slot = (x: Experience, s: Slot) => x.slots.get(s) ?? [];
/** تسمية قصيرة لموضع فقرة: اسم المشروع أو عنوان التحليل أو القسم الفرعي. */
function slotLabel(x: Experience, id: string): Bi {
  const s = x.slotOf.get(id)!;
  if (s.startsWith("projects.") && s !== "projects.program")
    return x.projects.find((p) => p.id === s.slice("projects.".length))!.name;
  if (s.startsWith("financial.") && s !== "financial.frame")
    return x.analyses.find((a) => a.id === s.slice("financial.".length))!.title;
  return SLOT_SHORT[s]!;
}
function Cards({ s }: { s: Slot }) {
  const { x } = useCtx();
  return (
    <div className="grid gap-3">
      {slot(x, s).map((p) => (
        <ParagraphCard key={p.id} p={p} />
      ))}
    </div>
  );
}

function Sub({
  id,
  title,
  children,
  hint,
}: {
  id: string;
  title: Bi;
  children: ReactNode;
  hint?: ReactNode;
}) {
  const t = useT();
  return (
    <section id={id} className="mt-10 scroll-mt-28" aria-labelledby={`${id}-h`} data-sub={id}>
      <h3 id={`${id}-h`} className="text-[17px] font-bold tracking-tight">
        {t(title)}
      </h3>
      {hint && <div className="mt-1 text-[13px] text-muted-foreground">{hint}</div>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Part({
  id,
  children,
  lead,
}: {
  id: (typeof PARTS)[number];
  children: ReactNode;
  lead?: ReactNode;
}) {
  const t = useT();
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-border/60 pt-10 first:border-t-0 first:pt-0"
      aria-labelledby={`${id}-title`}
      data-part={id}
    >
      <h2 id={`${id}-title`} className="section-title">
        {t(PART_TITLE[id]!)}
      </h2>
      {lead && (
        <div className="mt-2 max-w-3xl text-[14px] leading-7 text-muted-foreground">{lead}</div>
      )}
      {children}
    </section>
  );
}

// ── الرأس وحالة البحث
function Masthead() {
  const { l } = useCtx();
  const t = useT();
  return (
    <header
      className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur"
      data-masthead
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <span className="inline-flex items-center gap-2 font-display text-[15px] font-bold">
          <Icon name="book-open-text" className="size-5 text-brand" />
          {t(UI.brand)}
        </span>
        <span className="hidden text-[12px] text-muted-foreground sm:inline">
          {t(UI.privateReader)}
        </span>
        <Pill
          tone="withheld"
          icon={<Icon name="shield-alert" className="size-3.5" />}
          data-draft-chip="true"
        >
          {l === "ar" ? "مسودة محجوبة" : "Withheld draft"}
        </Pill>
        <a
          href={`?lang=${l === "ar" ? "en" : "ar"}`}
          className="ms-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[12.5px] hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          lang={l === "ar" ? "en" : "ar"}
          aria-label={t(UI.languageLabel)}
          data-lang-toggle
        >
          <Icon name="languages" className="size-4" />
          {t(UI.language)}
        </a>
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  tone,
  ...data
}: { label: Bi; value: ReactNode; tone: Tone } & { [k: `data-${string}`]: string }) {
  const t = useT();
  return (
    <div className="rounded-xl border border-border/70 bg-card/70 px-3 py-2.5" {...data}>
      <div className="text-[11.5px] text-muted-foreground">{t(label)}</div>
      <div className={cn("num mt-0.5 text-[17px] font-bold", TONE[tone].chip.split(" ")[0])}>
        {value}
      </div>
    </div>
  );
}

function Hero() {
  const { x, l } = useCtx();
  const t = useT();
  const h = x.holds;
  const kinds = Object.keys(KIND) as Kind[];
  return (
    <div className="night-panel rounded-3xl border border-border/60 px-5 py-7 sm:px-8" data-hero>
      <div
        className="mb-5 flex flex-wrap items-start gap-2 rounded-xl border border-status-withheld/40 bg-status-withheld/10 px-3.5 py-2.5"
        role="note"
        data-banner
      >
        <Icon name="shield-alert" className="mt-0.5 size-4 shrink-0 text-status-withheld" />
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-status-withheld">{t(UI.draftBanner)}</p>
          <p className="mt-0.5 text-[12.5px] leading-6 text-muted-foreground">
            {t(UI.draftDetail)}
          </p>
        </div>
      </div>
      <h1 className="font-display text-[28px] font-extrabold leading-tight sm:text-[34px]">
        {t(UI.title)}
      </h1>
      <p className="mt-2 max-w-3xl text-[14.5px] leading-7 text-muted-foreground">
        {t(UI.subtitle)}
      </p>
      <div
        className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6"
        data-status-panel
      >
        <Stat label={UI.snapshot} value={ltr(x.snapshotDate)} tone="neutral" data-stat="snapshot" />
        <Stat
          label={UI.researchStatus}
          value={<span className="text-[14px]">{t(UI.researchStatusValue)}</span>}
          tone="warn"
          data-stat="research"
        />
        <Stat
          label={UI.analysesBlocked}
          value={
            <>
              {n(h.analysesBlocked)}
              <span className="text-[12px] font-normal text-muted-foreground">
                {" "}
                / {n(h.analyses)}
              </span>
            </>
          }
          tone="bad"
          data-stat="analyses-blocked"
        />
        <Stat
          label={UI.claimsWithheld}
          value={n(h.claimsWithheld)}
          tone="withheld"
          data-stat="claims-withheld"
        />
        <Stat
          label={UI.inputsWithheld}
          value={n(h.inputsWithheld)}
          tone="withheld"
          data-stat="inputs-withheld"
        />
        <Stat
          label={UI.qualified}
          value={n(h.financiallyQualified)}
          tone="neutral"
          data-stat="qualified"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
        <span>
          {t(UI.engineering)}: <code dir="ltr">{BASIS.b04Implementation.slice(0, 7)}</code> ·{" "}
          {l === "ar" ? "القبول المستقل" : "independent acceptance"}{" "}
          <code dir="ltr">{BASIS.b04Acceptance.slice(0, 7)}</code> ·{" "}
          {l === "ar" ? "الحدث المركزي" : "central event"}{" "}
          <span className="num">{n(BASIS.centralEvent)}</span>
        </span>
      </div>
      <div className="mt-4" data-kind-legend>
        <p className="mb-1.5 text-[12px] font-semibold text-muted-foreground">
          {t(UI.kinds)} <span className="num font-normal">({n(x.pack.paragraphs.length)})</span>
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {kinds.map((k) => (
            <li key={k} className="inline-flex items-center gap-1" title={t(KIND[k].hint)}>
              <KindBadge kind={k} />
              <span className="num text-[11.5px] text-muted-foreground">
                {n(x.pack.counts[`kind:${k}`] ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── الفهرس
const TOC: { id: string; part: (typeof PARTS)[number]; subs: [string, Bi][] }[] = [
  {
    id: "overview",
    part: "overview",
    subs: [
      ["overview-intro", SUB["overview.intro"]!],
      ["overview-map", SUB["overview.map"]!],
      ["overview-drivers", SUB["overview.drivers"]!],
      ["overview-projects", SUB["overview.projects"]!],
      ["overview-risks", SUB["overview.risks"]!],
      ["overview-scope", SUB["overview.scope"]!],
    ],
  },
  {
    id: "business",
    part: "business",
    subs: [
      ["business-ownership", SUB["business.ownership"]!],
      ["business-upstream", SUB["business.upstream"]!],
      ["business-downstream", SUB["business.downstream"]!],
      ["business-revenue", SUB["business.revenue"]!],
      ["business-integration", SUB["business.integration"]!],
      ["business-drivers", SUB["business.drivers"]!],
    ],
  },
  {
    id: "projects",
    part: "projects",
    subs: [
      ["projects-program", SUB["projects.program"]!],
      ["projects-reported", SUB["projects.reported"]!],
      ["projects-targets", SUB["projects.targets"]!],
      ["projects-relations", SUB["projects.relations"]!],
    ],
  },
  { id: "financial", part: "financial", subs: [["financial-frame", SUB["financial.frame"]!]] },
  {
    id: "risks",
    part: "risks",
    subs: [
      ["risks-disclosures", SUB["risks.disclosures"]!],
      ["risks-guidance", SUB["risks.guidance"]!],
      ["risks-interpretations", SUB["risks.interpretations"]!],
      ["risks-assumptions", SUB["risks.assumptions"]!],
      ["risks-scenarios", SUB["risks.scenarios"]!],
      ["risks-gaps", SUB["risks.gaps"]!],
    ],
  },
  { id: "topics", part: "topics", subs: [] },
];

function TocList({ variant }: { variant: "desktop" | "mobile" }) {
  const { x } = useCtx();
  const t = useT();
  return (
    <ol className="space-y-3.5" data-toc={variant}>
      {TOC.map((g) => (
        <li key={g.id}>
          <a
            href={`#${g.id}`}
            className="text-[13px] font-semibold text-foreground hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            data-toc-link={g.id}
          >
            {t(PART_TITLE[g.part]!)}
          </a>
          {(g.subs.length > 0 || g.id === "financial") && (
            <ol className="mt-1.5 space-y-0.5 border-s border-border ps-3">
              {g.subs.map(([id, title]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="block rounded-md px-1.5 py-0.5 text-[12px] text-foreground/80 hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                    data-toc-link={id}
                  >
                    {t(title)}
                  </a>
                </li>
              ))}
              {g.id === "financial" &&
                x.analyses.map((a) => (
                  <li key={a.id}>
                    <a
                      href={`#analysis-${a.id}`}
                      className="block rounded-md px-1.5 py-0.5 text-[12px] text-foreground/80 hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                      data-toc-link={`analysis-${a.id}`}
                    >
                      {t(a.title)}
                    </a>
                  </li>
                ))}
            </ol>
          )}
        </li>
      ))}
    </ol>
  );
}

function Toc() {
  const t = useT();
  return (
    <aside className="min-w-0" data-toc-aside>
      <details className="rounded-xl border border-border/70 bg-card lg:hidden" data-toc-mobile>
        <summary className="cursor-pointer px-3.5 py-2.5 text-[13px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
          {t(UI.contents)}
        </summary>
        <div className="border-t border-border/60 px-3.5 py-3">
          <TocList variant="mobile" />
        </div>
      </details>
      <nav
        className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto pe-1 lg:block"
        aria-label={t(UI.contents)}
      >
        <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t(UI.contents)}
        </p>
        <TocList variant="desktop" />
      </nav>
    </aside>
  );
}

// ── نظرة عامة
function MapNode({
  href,
  children,
  sub,
  ...data
}: { href: string; children: ReactNode; sub?: ReactNode } & { [k: `data-${string}`]: string }) {
  return (
    <a
      href={href}
      className="block min-w-0 rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-[13px] font-semibold hover:border-brand/60 hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
      {...data}
    >
      {children}
      {sub && (
        <span className="mt-0.5 block text-[11.5px] font-normal text-muted-foreground">{sub}</span>
      )}
    </a>
  );
}

function dimsOf(x: Experience, paragraph: string, dim: string): string[] {
  const p = x.paragraphs.get(paragraph)!;
  return [
    ...new Set(
      p.refs.flatMap((r) =>
        r.ref.t === "engine_metric" && r.ref.dims?.[dim] ? [r.ref.dims[dim]!] : [],
      ),
    ),
  ];
}

function BusinessMap() {
  const { x, l } = useCtx();
  const t = useT();
  const label = (s: string) => (DIM[s] ? t(DIM[s]!) : s);
  const segments = dimsOf(x, "rv-segments", "segment");
  const products = dimsOf(x, "rv-product", "product");
  const geos = dimsOf(x, "rv-geography", "geography");
  const arrow = l === "ar" ? "arrow-down-left" : "arrow-down-right";
  return (
    <figure
      className="rounded-2xl border border-border/70 bg-card p-4"
      data-business-map
      aria-labelledby="overview-map-cap"
    >
      <figcaption
        id="overview-map-cap"
        className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground"
      >
        <Icon name="layers" className="size-4 text-brand" />
        {t(UI.mapNote)}
      </figcaption>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
        <div className="space-y-2" data-map-column="segments">
          <p className="xp-ev-type">{t(UI.segments)}</p>
          {segments.map((s) => (
            <MapNode
              key={s}
              href={
                s === "Upstream"
                  ? "#business-upstream"
                  : s === "Downstream"
                    ? "#business-downstream"
                    : "#p-rv-segments"
              }
              data-map-node={s}
            >
              {label(s)}
            </MapNode>
          ))}
          <MapNode href="#p-in-interseg" data-map-node="intersegment" sub={t(UI.interSegment)}>
            ⇄
          </MapNode>
        </div>
        <Icon
          name={arrow}
          className="mx-auto hidden size-5 self-center text-muted-foreground md:block"
        />
        <div className="space-y-2" data-map-column="products">
          <p className="xp-ev-type">{t(UI.productStreams)}</p>
          {products.map((s) => (
            <MapNode key={s} href="#p-rv-product" data-map-node={s}>
              {label(s)}
            </MapNode>
          ))}
        </div>
        <Icon
          name={arrow}
          className="mx-auto hidden size-5 self-center text-muted-foreground md:block"
        />
        <div className="space-y-2" data-map-column="geography">
          <p className="xp-ev-type">{t(UI.geography)}</p>
          {geos.map((s) => (
            <MapNode key={s} href="#p-rv-geography" data-map-node={s}>
              {label(s)}
            </MapNode>
          ))}
          <MapNode
            href="#p-rv-geography-reading"
            data-map-node="geography-reading"
            sub={t(KIND.research_interpretation.label)}
          >
            {l === "ar" ? "قراءة التقسيم" : "Reading the split"}
          </MapNode>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-6 text-muted-foreground" data-chemicals-note>
        {t(UI.chemicalsNote)}{" "}
        <a className="text-brand underline underline-offset-2" href="#p-dn-scope">
          dn-scope
        </a>
      </p>
    </figure>
  );
}

function relatedProjects(x: Experience, paragraph: string) {
  return x.relations
    .filter((r) => r.paragraph === paragraph)
    .map((r) => x.projects.find((p) => p.id === r.project)!);
}

function DriverTiles() {
  const { x } = useCtx();
  const t = useT();
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-driver-tiles>
      {DRIVERS.map((d) => {
        const p = x.paragraphs.get(d)!;
        const rel = relatedProjects(x, d);
        return (
          <li key={d} className="rounded-2xl border border-border/70 bg-card p-4" data-driver={d}>
            <div className="flex items-center justify-between gap-2">
              <a
                href={`#p-${d}`}
                className="text-[15px] font-bold hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                {t(DRIVER_NAME[d])}
              </a>
              <KindBadge kind={p.kind} />
            </div>
            <p className="mt-2 text-[11.5px] text-muted-foreground">{t(UI.relatedProjects)}</p>
            <ul className="mt-1 flex flex-wrap gap-1">
              {rel.length ? (
                rel.map((pr) => (
                  <li key={pr.id}>
                    <a
                      href={`#project-${pr.id}`}
                      className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[12px] hover:bg-muted"
                    >
                      {t(pr.name)}
                    </a>
                  </li>
                ))
              ) : (
                <li className="text-[12px] text-muted-foreground">{t(UI.noRelation)}</li>
              )}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

function TrackPill({ pr }: { pr: ProjectView }) {
  const t = useT();
  return pr.track === "reported_milestone" ? (
    <Pill
      tone="withheld"
      icon={<Icon name="database" className={IC} />}
      data-track="reported_milestone"
    >
      {t(UI.milestone)}
    </Pill>
  ) : (
    <Pill tone="target" icon={<Icon name="target" className={IC} />} data-track="management_target">
      {t(UI.target)}
    </Pill>
  );
}

function ProjectsSummary() {
  const { x } = useCtx();
  const t = useT();
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border/70 bg-card"
      data-projects-summary
    >
      <ul className="divide-y divide-border/60">
        {x.projects.map((pr) => (
          <li
            key={pr.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3"
            data-project-summary={pr.id}
          >
            <a
              href={`#project-${pr.id}`}
              className="min-w-0 text-[14px] font-semibold hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              {t(pr.name)}
            </a>
            <TrackPill pr={pr} />
            <span className="ms-auto text-[12px] text-muted-foreground">
              {t(FIELD[pr.b03.executionStatus]!)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RiskSummary() {
  const { x } = useCtx();
  const t = useT();
  const groups: [string, Slot, Bi][] = [
    ["risks-disclosures", "risks.disclosures", SUB["risks.disclosures"]!],
    ["risks-guidance", "risks.guidance", SUB["risks.guidance"]!],
    ["risks-interpretations", "risks.interpretations", SUB["risks.interpretations"]!],
    ["risks-assumptions", "risks.assumptions", SUB["risks.assumptions"]!],
    ["risks-scenarios", "risks.scenarios", SUB["risks.scenarios"]!],
    ["risks-gaps", "risks.gaps", SUB["risks.gaps"]!],
  ];
  const gapTopics = x.topics.filter((y) => y.declaredGap);
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <ul className="grid gap-2 sm:grid-cols-2" data-risk-summary>
        {groups.map(([id, s, title]) => {
          const ps = slot(x, s);
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                className="flex h-full items-center justify-between gap-2 rounded-xl border border-border/70 bg-card px-3.5 py-2.5 hover:border-brand/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                data-risk-summary-group={id}
              >
                <span className="min-w-0 text-[13px] font-semibold">{t(title)}</span>
                <span className="flex items-center gap-1.5">
                  <KindBadge kind={ps[0]!.kind} />
                  <span className="num text-[12px] text-muted-foreground">{n(ps.length)}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      <div className="rounded-2xl border border-border/70 bg-card p-4" data-gap-summary>
        <p className="text-[13px] font-semibold">
          {t(SUB["risks.register"]!)}{" "}
          <span className="num font-normal text-muted-foreground">({n(x.gaps.length)})</span>
        </p>
        <ul className="mt-2 space-y-1 text-[12.5px]">
          {Object.keys(GAP_KIND).map((k) => (
            <li key={k} className="flex justify-between gap-2" data-gap-kind={k}>
              <span className="text-muted-foreground">{t(GAP_KIND[k]!)}</span>
              <span className="num">{n(x.gaps.filter((g) => g.kind === k).length)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] font-semibold text-muted-foreground">{t(UI.declaredGap)}</p>
        <ul className="mt-1 flex flex-wrap gap-1">
          {gapTopics.map((g) => (
            <li key={g.topic}>
              <a
                href={`#topic-${g.topic}`}
                className="rounded-md border border-status-bad/40 bg-status-bad/10 px-1.5 py-0.5 text-[12px] xp-t-bad"
              >
                {t(g.title)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Overview() {
  const { x } = useCtx();
  const t = useT();
  return (
    <Part id="overview">
      <Sub id="overview-intro" title={SUB["overview.intro"]!}>
        <Cards s="overview.intro" />
      </Sub>
      <Sub id="overview-map" title={SUB["overview.map"]!}>
        <BusinessMap />
      </Sub>
      <Sub id="overview-drivers" title={SUB["overview.drivers"]!}>
        <DriverTiles />
      </Sub>
      <Sub id="overview-projects" title={SUB["overview.projects"]!}>
        <ProjectsSummary />
      </Sub>
      <Sub id="overview-risks" title={SUB["overview.risks"]!}>
        <RiskSummary />
      </Sub>
      <Sub
        id="overview-scope"
        title={SUB["overview.scope"]!}
        hint={
          <span data-translation-summary>
            {t(UI.translationNote)}{" "}
            <span className="num">
              {t(UI.englishDrafts)}: {n(x.pack.paragraphs.filter((p) => p.en).length)} /{" "}
              {n(x.pack.paragraphs.length)}
            </span>
          </span>
        }
      >
        <Cards s="overview.scope" />
      </Sub>
    </Part>
  );
}

// ── نموذج الأعمال
function Business() {
  const t = useT();
  return (
    <Part id="business">
      <Sub id="business-ownership" title={SUB["business.ownership"]!}>
        <Cards s="business.ownership" />
      </Sub>
      <Sub id="business-upstream" title={SUB["business.upstream"]!}>
        <Cards s="business.upstream" />
      </Sub>
      <Sub id="business-downstream" title={SUB["business.downstream"]!} hint={t(UI.chemicalsNote)}>
        <Cards s="business.downstream" />
      </Sub>
      <Sub id="business-revenue" title={SUB["business.revenue"]!}>
        <Cards s="business.revenue" />
      </Sub>
      <Sub id="business-integration" title={SUB["business.integration"]!}>
        <Cards s="business.integration" />
      </Sub>
      <Sub id="business-drivers" title={SUB["business.drivers"]!}>
        <Cards s="business.drivers" />
      </Sub>
    </Part>
  );
}

// ── المشاريع
function ProjectCard({ pr }: { pr: ProjectView }) {
  const { x } = useCtx();
  const t = useT();
  const fields: [Bi, string][] = [
    [UI.projectStatus, pr.b03.executionStatus],
    [UI.capacity, pr.b03.capacity],
    [UI.timing, pr.b03.timing],
    [UI.cost, pr.b03.cost],
  ];
  return (
    <section
      id={`project-${pr.id}`}
      className="min-w-0 scroll-mt-28 rounded-3xl border border-border/70 bg-card/60 p-4 sm:p-5"
      data-project={pr.id}
      data-track={pr.track}
      aria-labelledby={`project-${pr.id}-h`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h4 id={`project-${pr.id}-h`} className="text-[17px] font-bold">
          {t(pr.name)}
        </h4>
        <TrackPill pr={pr} />
        <Pill tone="withheld" icon={<Icon name="lock" className="size-3" />}>
          {t(
            STATUS[pr.b03.qualification] ?? { ar: pr.b03.qualification, en: pr.b03.qualification },
          )}
        </Pill>
      </header>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2" data-project-fields>
        {fields.map(([label, code]) => (
          <div
            key={t(label)}
            className="rounded-xl border border-border/60 bg-background/40 px-3 py-2"
            data-field-status={code}
          >
            <dt className="text-[11.5px] text-muted-foreground">{t(label)}</dt>
            <dd className="mt-0.5 text-[13px]">{t(FIELD[code] ?? { ar: code, en: code })}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid gap-3">
        {pr.paragraphs.map((id) => (
          <ParagraphCard key={id} p={x.paragraphs.get(id)!} />
        ))}
      </div>
    </section>
  );
}

function RelationMatrix() {
  const { x } = useCtx();
  const t = useT();
  const others = (pr: string) =>
    x.relations.filter(
      (r) => r.project === pr && x.slotOf.get(r.paragraph)?.startsWith("risks.") === true,
    );
  return (
    <div data-relation-matrix>
      <p className="mb-3 max-w-3xl text-[12.5px] leading-6 text-muted-foreground">
        {t(UI.relationRule)}
      </p>
      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card">
        <table className="w-full min-w-[40rem] text-[12.5px]">
          <caption className="sr-only">{t(SUB["projects.relations"]!)}</caption>
          <thead>
            <tr className="border-b border-border/70 text-muted-foreground">
              <th scope="col" className="px-3 py-2 text-start font-semibold"></th>
              {DRIVERS.map((d) => (
                <th key={d} scope="col" className="px-3 py-2 text-start font-semibold">
                  <a href={`#p-${d}`} className="hover:text-foreground">
                    {t(DRIVER_NAME[d])}
                  </a>
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-start font-semibold">
                {t(UI.otherLinked)}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {x.projects.map((pr) => (
              <tr key={pr.id} data-relation-row={pr.id}>
                <th scope="row" className="px-3 py-2.5 text-start font-semibold">
                  <a href={`#project-${pr.id}`} className="hover:text-brand">
                    {t(pr.name)}
                  </a>
                </th>
                {DRIVERS.map((d) => {
                  const r = x.relations.find((y) => y.project === pr.id && y.paragraph === d);
                  return (
                    <td
                      key={d}
                      className="px-3 py-2.5 align-top"
                      data-relation-cell={`${pr.id}|${d}`}
                      data-related={r ? "true" : "false"}
                    >
                      {r ? (
                        <span className="inline-flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 font-semibold text-brand">
                            <Icon name="link2" className="size-3.5" />
                            {t(UI.relatedVia)}
                          </span>
                          {r.via.map((v) => (
                            <span key={v} className="text-[11.5px]">
                              {t(VIA[v.split(":")[0]!]!)}
                              <code
                                dir="ltr"
                                className="block break-all text-[10.5px] text-muted-foreground"
                              >
                                {v.split(":")[1]}
                              </code>
                            </span>
                          ))}
                        </span>
                      ) : (
                        <>
                          <span className="text-muted-foreground" aria-hidden="true">
                            —
                          </span>
                          <span className="sr-only">{t(UI.noRelation)}</span>
                        </>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 align-top">
                  <ul className="flex flex-wrap gap-1">
                    {others(pr.id).length ? (
                      others(pr.id).map((r) => (
                        <li key={r.paragraph} data-relation-link={`${pr.id}|${r.paragraph}`}>
                          <ParaChip id={r.paragraph} />
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">{t(UI.none)}</li>
                    )}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Projects() {
  const { x } = useCtx();
  return (
    <Part id="projects">
      <Sub id="projects-program" title={SUB["projects.program"]!}>
        <Cards s="projects.program" />
      </Sub>
      <Sub id="projects-reported" title={SUB["projects.reported"]!}>
        <div className="grid gap-4">
          {x.projects
            .filter((p) => p.track === "reported_milestone")
            .map((pr) => (
              <ProjectCard key={pr.id} pr={pr} />
            ))}
        </div>
      </Sub>
      <Sub id="projects-targets" title={SUB["projects.targets"]!}>
        <div className="grid gap-4">
          {x.projects
            .filter((p) => p.track === "management_target")
            .map((pr) => (
              <ProjectCard key={pr.id} pr={pr} />
            ))}
        </div>
      </Sub>
      <Sub id="projects-relations" title={SUB["projects.relations"]!}>
        <RelationMatrix />
      </Sub>
    </Part>
  );
}

// ── المحركات المالية
function ArabicOnly({ children }: { children: ReactNode }) {
  const { l } = useCtx();
  const t = useT();
  if (l === "ar") return <>{children}</>;
  return (
    <div data-translation="pending">
      <p className="mb-1 inline-flex items-center gap-1 text-[11.5px] text-status-warn">
        <Icon name="languages" className="size-3.5" />
        {t(UI.arabicOriginal)}
      </p>
      <div lang="ar" dir="rtl" className="rounded-lg bg-muted/40 px-3 py-2">
        {children}
      </div>
    </div>
  );
}

function AnalysisCard({ a }: { a: CompiledAnalysis }) {
  const { x, l } = useCtx();
  const t = useT();
  const drivers = slot(x, `financial.${a.id}`);
  return (
    <article
      id={`analysis-${a.id}`}
      className="min-w-0 scroll-mt-28 rounded-3xl border border-border/70 bg-card/60 p-4 sm:p-5"
      data-analysis={a.id}
      data-status={a.status}
      aria-labelledby={`analysis-${a.id}-h`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h4 id={`analysis-${a.id}-h`} className="text-[17px] font-bold">
          {t(a.title)}
        </h4>
        <Pill tone="bad" icon={<Icon name="lock" className="size-3" />} data-blocked="true">
          BLOCKED · {t(STATUS["BLOCKED"]!)}
        </Pill>
        <span className="text-[12px] text-muted-foreground">
          {t(UI.basis)}: {t(BASIS_LABEL[a.definition.basis]!)}
        </span>
      </header>
      <p className="mt-2 text-[12.5px] text-muted-foreground">{t(UI.blockedNote)}</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section aria-labelledby={`analysis-${a.id}-m`}>
          <h5 id={`analysis-${a.id}-m`} className="text-[13px] font-bold">
            {t(UI.measures)}
          </h5>
          <div className="mt-1.5 text-[14px] leading-7">
            <ArabicOnly>
              <p>{a.definition.ar}</p>
            </ArabicOnly>
          </div>
        </section>
        <section aria-labelledby={`analysis-${a.id}-q`}>
          <h5 id={`analysis-${a.id}-q`} className="text-[13px] font-bold">
            {t(UI.investorQuestions)}
          </h5>
          <div className="mt-1.5 text-[14px] leading-7">
            <ArabicOnly>
              <ul className="list-disc space-y-1 ps-5">
                {a.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </ArabicOnly>
          </div>
        </section>
      </div>

      <section className="mt-5" aria-labelledby={`analysis-${a.id}-d`}>
        <h5 id={`analysis-${a.id}-d`} className="text-[13px] font-bold">
          {t(UI.drivers)}
        </h5>
        <div className="mt-2 grid gap-3">
          {drivers.map((p) => (
            <ParagraphCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      <section className="mt-5" aria-labelledby={`analysis-${a.id}-i`}>
        <h5 id={`analysis-${a.id}-i`} className="text-[13px] font-bold">
          {t(UI.inputs)}{" "}
          <span className="num font-normal text-muted-foreground">({n(a.inputs.length)})</span>
        </h5>
        <ul
          className="mt-2 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card"
          data-analysis-inputs={a.id}
        >
          {a.inputs.map((i, k) => (
            <li
              key={k}
              className="grid gap-1.5 px-3.5 py-2.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center"
              data-input={i.key}
              data-input-status={i.status}
              data-link-status={i.links.status}
            >
              <span className="min-w-0">
                <code dir="ltr" className="break-all text-[12.5px]">
                  {i.key}
                </code>
                {i.dims && (
                  <span className="ms-1.5 text-[11.5px] text-muted-foreground">
                    {Object.values(i.dims)
                      .map((v) => (DIM[v] ? t(DIM[v]!) : v))
                      .join(" / ")}
                  </span>
                )}
                {i.periods.length > 0 && (
                  <span className="num mt-0.5 block break-words text-[11px] text-muted-foreground">
                    {ltr(i.periods.join(" · "))}
                  </span>
                )}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {t(INPUT_STATUS[i.status] ?? { ar: i.status, en: i.status })}
              </span>
              <MetricLinkState metric={i.key} />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section aria-labelledby={`analysis-${a.id}-b`}>
          <h5 id={`analysis-${a.id}-b`} className="text-[13px] font-bold">
            {t(UI.whyBlocked)}
          </h5>
          <ul className="mt-2 space-y-1.5" data-analysis-blockers={a.id}>
            {a.blockers.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[13px]" data-blocker={b}>
                <Icon name="circle-slash" className="mt-1 size-3.5 shrink-0 text-status-bad" />
                <span className="min-w-0">
                  {blockerLabel(b, l)}
                  <code dir="ltr" className="ms-1.5 break-all text-[11px] text-muted-foreground">
                    {b}
                  </code>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby={`analysis-${a.id}-w`}>
          <h5 id={`analysis-${a.id}-w`} className="text-[13px] font-bold">
            {t(UI.b02Inputs)}{" "}
            <span className="num font-normal text-muted-foreground">({n(a.b02Inputs.length)})</span>
          </h5>
          <ul className="mt-2 flex flex-wrap gap-1.5" data-analysis-b02={a.id}>
            {a.b02Inputs.map((b) => (
              <li key={b.metric} className="max-w-full">
                <Pill tone="withheld" icon={<Icon name="lock" className="size-3" />}>
                  <code dir="ltr" className="break-all">
                    {b.metric}
                  </code>
                  <span className="num text-muted-foreground">
                    · {n(b.observations)} {t(UI.observations)}
                  </span>
                </Pill>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}

function Financial() {
  const { x } = useCtx();
  return (
    <Part id="financial">
      <Sub id="financial-frame" title={SUB["financial.frame"]!}>
        <Cards s="financial.frame" />
      </Sub>
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6">
        {x.analyses.map((a) => (
          <AnalysisCard key={a.id} a={a} />
        ))}
      </div>
    </Part>
  );
}

// ── المخاطر
function Risks() {
  const { x } = useCtx();
  const t = useT();
  const kinds = [...new Set(x.gaps.map((g) => g.kind))];
  return (
    <Part id="risks">
      <Sub
        id="risks-disclosures"
        title={SUB["risks.disclosures"]!}
        hint={t(KIND.reported_record.hint)}
      >
        <Cards s="risks.disclosures" />
      </Sub>
      <Sub id="risks-guidance" title={SUB["risks.guidance"]!} hint={t(KIND.management_plan.hint)}>
        <Cards s="risks.guidance" />
      </Sub>
      <Sub
        id="risks-interpretations"
        title={SUB["risks.interpretations"]!}
        hint={t(KIND.research_interpretation.hint)}
      >
        <div className="grid gap-3">
          {slot(x, "risks.interpretations").map((p) => (
            <ParagraphCard
              key={p.id}
              p={p}
              extra={
                RISK_CATEGORY[p.id] && (
                  <span
                    className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[11.5px] font-semibold"
                    data-risk-category={p.id}
                  >
                    {t(RISK_CATEGORY[p.id]!)}
                  </span>
                )
              }
            />
          ))}
        </div>
      </Sub>
      <Sub id="risks-assumptions" title={SUB["risks.assumptions"]!} hint={t(KIND.assumption.hint)}>
        <Cards s="risks.assumptions" />
      </Sub>
      <Sub id="risks-scenarios" title={SUB["risks.scenarios"]!} hint={t(KIND.scenario.hint)}>
        <Cards s="risks.scenarios" />
      </Sub>
      <Sub id="risks-gaps" title={SUB["risks.gaps"]!} hint={t(KIND.gap.hint)}>
        <Cards s="risks.gaps" />
        <details className="mt-4 rounded-2xl border border-border/70 bg-card" data-gap-register>
          <summary className="cursor-pointer px-4 py-3 text-[13px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
            {t(SUB["risks.register"]!)}{" "}
            <span className="num font-normal text-muted-foreground">({n(x.gaps.length)})</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-3">
            {kinds.map((k) => (
              <section key={k} aria-label={t(GAP_KIND[k] ?? { ar: k, en: k })}>
                <h5 className="text-[12.5px] font-bold text-muted-foreground">
                  {t(GAP_KIND[k] ?? { ar: k, en: k })}{" "}
                  <span className="num font-normal">
                    ({n(x.gaps.filter((g) => g.kind === k).length)})
                  </span>
                </h5>
                <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                  {x.gaps
                    .filter((g) => g.kind === k)
                    .map((g) => (
                      <li
                        key={g.id}
                        className="min-w-0 rounded-lg border border-border/60 px-2.5 py-1.5 text-[12px]"
                        data-gap={g.id}
                      >
                        <code dir="ltr" className="break-all">
                          {g.subject}
                        </code>{" "}
                        <span className="text-muted-foreground">· {g.status}</span>
                        {g.usedBy.length > 0 && (
                          <span className="mt-0.5 block break-words text-[11px] text-muted-foreground">
                            {t(UI.usedBy)}: {ltr(g.usedBy.join(", "))}
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        </details>
      </Sub>
    </Part>
  );
}

// ── الموضوعات
function ParaChip({ id }: { id: string }) {
  const { x } = useCtx();
  const t = useT();
  const p = x.paragraphs.get(id)!;
  return (
    <a
      href={`#p-${id}`}
      className="xp-chip"
      data-topic-paragraph={id}
      title={`${t(KIND[p.kind].label)} · ${id}`}
    >
      {KIND_ICON[p.kind]}
      <span>{t(slotLabel(x, id))}</span>
      <span dir="ltr" className="text-[10.5px] text-muted-foreground">
        {id}
      </span>
    </a>
  );
}

function TopicRow({ tp }: { tp: TopicView }) {
  const { x } = useCtx();
  const t = useT();
  return (
    <li
      id={`topic-${tp.topic}`}
      className="scroll-mt-28 rounded-2xl border border-border/70 bg-card p-4"
      data-topic={tp.topic}
      data-topic-status={tp.status}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="num text-[12px] text-muted-foreground">{n(tp.ordinal)}</span>
        <h4 className="text-[15px] font-bold">{t(tp.title)}</h4>
        {tp.declaredGap ? (
          <Pill
            tone="bad"
            icon={<Icon name="circle-slash" className={IC} />}
            data-declared-gap="true"
          >
            {t(UI.declaredGap)}
          </Pill>
        ) : (
          <Pill tone="ok" icon={<Icon name="book-open-text" className={IC} />}>
            {t(UI.researchContent)}
          </Pill>
        )}
        <span className="ms-auto flex flex-wrap gap-3 text-[12px]">
          <AppLink path={tp.links.intelligence} data-topic-app-link={tp.topic}>
            <Icon name="link2" className="size-3.5" />
            {t(UI.inIntelligence)}
          </AppLink>
          <AppLink path={tp.links.data} data-topic-data-link={tp.topic}>
            <Icon name="database" className="size-3.5" />
            {t(UI.inData)}
          </AppLink>
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-[12px]">
        <div>
          <p className="mb-1 text-muted-foreground">
            {t(UI.primaryParagraphs)} <span className="num">({n(tp.primary.length)})</span>
          </p>
          <div className="flex flex-wrap gap-1">
            {tp.primary.length ? (
              tp.primary.map((id) => <ParaChip key={id} id={id} />)
            ) : (
              <span className="text-muted-foreground">{t(UI.none)}</span>
            )}
          </div>
        </div>
        {tp.context.length > 0 && (
          <details data-topic-context={tp.topic}>
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              {t(UI.contextParagraphs)} <span className="num">({n(tp.context.length)})</span>
            </summary>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {tp.context.map((id) => (
                <ParaChip key={id} id={id} />
              ))}
            </div>
          </details>
        )}
        {tp.analyses.length > 0 && (
          <div>
            <p className="mb-1 text-muted-foreground">{t(UI.analysesFor)}</p>
            <div className="flex flex-wrap gap-1">
              {tp.analyses.map((a) => (
                <a
                  key={a}
                  href={`#analysis-${a}`}
                  className="inline-flex items-center gap-1 rounded-md border border-status-bad/40 bg-status-bad/10 px-1.5 py-0.5 text-[11.5px] xp-t-bad"
                  data-topic-analysis={a}
                >
                  <Icon name="lock" className="size-3" />
                  {t(x.analyses.find((y) => y.id === a)!.title)}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function Topics() {
  const { x } = useCtx();
  const t = useT();
  return (
    <Part id="topics" lead={t(UI.topicMapNote)}>
      {x.groups.map((g) => (
        <section key={g.id} className="mt-8" aria-labelledby={`tg-${g.id}`} data-topic-group={g.id}>
          <h3 id={`tg-${g.id}`} className="text-[16px] font-bold">
            {t(g.title)}
          </h3>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">{t(g.question)}</p>
          <ol className="mt-3 grid gap-3 lg:grid-cols-2">
            {g.topics.map((k) => (
              <TopicRow key={k} tp={x.topics.find((y) => y.topic === k)!} />
            ))}
          </ol>
        </section>
      ))}
    </Part>
  );
}

// ── الصفحة
export function ResearchExperience({ x, l, base }: Ctx) {
  const t = (b: Bi) => b[l];
  return (
    <C.Provider value={{ x, l, base }}>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-3 focus:py-2 focus:text-brand-foreground"
      >
        {t(UI.skip)}
      </a>
      <IconSprite />
      <Masthead />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Hero />
        {!base && (
          <p
            className="mt-4 rounded-xl border border-status-bad/40 bg-status-bad/10 px-3.5 py-2.5 text-[13px] text-status-bad"
            role="alert"
            data-app-base-rejected
          >
            {t(UI.appLinksDisabled)}
          </p>
        )}
        <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <Toc />
          <main id="content" className="min-w-0 space-y-12" tabIndex={-1}>
            <Overview />
            <Business />
            <Projects />
            <Financial />
            <Risks />
            <Topics />
          </main>
        </div>
        <footer
          className="mt-14 border-t border-border/60 pt-5 text-[12px] text-muted-foreground"
          data-footer
        >
          {t(UI.footer)}
        </footer>
      </div>
    </C.Provider>
  );
}
