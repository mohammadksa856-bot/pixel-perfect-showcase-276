import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Database, Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { cn } from "@/lib/utils";
import type { CompanyPreview, Topic } from "@/lib/engine/company-preview";
import type { PeerTable } from "@/lib/engine/peer-comparison";
import { intelGroups, topicMatches, type IntelGroup } from "@/lib/web-v1/company-experience";
import { CompanyTopic, PageNotice } from "./company-template";
import { KeyFigures } from "./financial-explorer";
import { TOPIC_META } from "./primitives";
import { PreviewContainer } from "./shell";

/**
 * WEB-07 المستوى 2: تحليل الشركة. الموضوعات الثمانية عشر كاملة في المجموعات الخمس (model.ts)، بنفس مكوّن
 * العرض المستخدم في «بيانات معرفة» (CompanyTopic)، فالأرقام والحجب والمصادر واحدة في المستويين.
 * تنقل جانبي، وبحث داخل الموضوعات (لا يحذف موضوعًا، يخفيه فقط)، ورابط عميق: ?topic=…&focus=… يمرّر إلى
 * الموضوع ويُبرز البند ويفتح التفاصيل المطوية التي تحويه، وبجانب كل بند مصدره.
 */
export function CompanyIntelligence({
  p,
  peers,
  topic,
  focus,
  q: initialQ,
}: {
  p: CompanyPreview;
  peers: PeerTable | null;
  topic?: string | undefined;
  focus?: string | undefined;
  q?: string | undefined;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const groups = useMemo(() => intelGroups(p), [p]);
  const [q, setQ] = useState(initialQ ?? "");
  const matched = useMemo(
    () => new Set(p.topics.filter((x) => topicMatches(x, q)).map((x) => x.key)),
    [p, q],
  );
  const visible = groups.flatMap((g) => g.topics).filter((x) => matched.has(x.key)).length;

  // البحث في عنوان الصفحة (قابل للمشاركة) دون إعادة تحميل. لا يُكتب العنوان إلا إذا تغيّر البحث فعلًا،
  // فلا يمحو ?topic=&focus= عند فتح رابط عميق.
  const urlQ = initialQ ?? "";
  useEffect(() => {
    if (q === urlQ) return;
    const id = setTimeout(() => {
      void navigate({
        to: "/preview/web-v1/companies/$symbol/intelligence",
        params: { symbol: p.company.symbol },
        search: q ? { q } : {},
        replace: true,
        resetScroll: false,
      });
    }, 300);
    return () => clearTimeout(id);
  }, [q, urlQ, navigate, p.company.symbol]);

  // الرابط العميق: الموضوع ثم البند.
  useEffect(() => {
    if (!topic) return;
    // بعد أن ينهي الموجّه استعادة التمرير، وإلا أعاد الصفحة إلى أعلاها.
    const id = window.setTimeout(() => focusTarget(), 80);
    return () => window.clearTimeout(id);
  }, [topic, focus, p]); // eslint-disable-line react-hooks/exhaustive-deps

  function focusTarget() {
    const tp = p.topics.find((x) => x.key === topic);
    if (!tp) return;
    const section = document.getElementById(`topic-${tp.ordinal}`);
    if (!section) return;
    let target: HTMLElement = section;
    for (const el of document.querySelectorAll("[data-focused]"))
      el.removeAttribute("data-focused");
    if (focus) {
      const all = [
        ...section.querySelectorAll<HTMLElement>(
          `[data-metric="${focus}"], [data-row="${focus}"], [data-fact="${focus}"]`,
        ),
      ];
      const isShown = (el: HTMLElement) => el.offsetParent !== null;
      // الأولوية لصف جدول القوائم الظاهر (الخلية نفسها التي في «نظرة عامة»)، ثم البند في جداول الموضوع.
      let shown = all.find((el) => el.hasAttribute("data-row") && isShown(el)) ?? all.find(isShown);
      if (!shown) {
        // البند داخل تفاصيل مطوية: افتحها، ثم اختر أول نسخة ظاهرة (جدول الكمبيوتر أو قائمة الجوال).
        for (const el of all) {
          let d = el.closest("details");
          while (d) {
            d.open = true;
            d = d.parentElement?.closest("details") ?? null;
          }
        }
        shown = all.find(isShown);
      }
      if (shown) {
        shown.setAttribute("data-focused", "true");
        target = shown;
      }
    }
    target.setAttribute("tabindex", "-1");
    target.scrollIntoView({ block: focus ? "center" : "start" });
    target.focus({ preventScroll: true });
  }

  return (
    <PreviewContainer className="py-8" data-company-intelligence>
      <PageNotice p={p} />
      <KeyFigures figures={p.keyFigures} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="min-w-0" data-intel-nav>
          <div className="lg:sticky lg:top-24">
            <SearchBox q={q} setQ={setQ} visible={visible} total={p.topics.length} />
            {/* الجوال: فهرس قابل للطي؛ الكمبيوتر: فهرس ثابت مفتوح */}
            <details
              className="group mt-3 rounded-xl border border-border/70 bg-card lg:hidden"
              data-intel-nav-mobile
            >
              <summary className="cursor-pointer px-3.5 py-2.5 text-[13px] font-semibold">
                {t({ ar: "فهرس الموضوعات", en: "Topic index" })}{" "}
                <span className="num font-normal text-muted-foreground">({iso(visible)})</span>
              </summary>
              <div className="border-t border-border/60 px-3.5 py-3">
                <TopicIndex groups={groups} matched={matched} />
              </div>
            </details>
            <nav
              className="mt-4 hidden max-h-[calc(100vh-12rem)] overflow-y-auto pe-1 lg:block"
              aria-label={t({ ar: "فهرس الموضوعات", en: "Topic index" })}
            >
              <TopicIndex groups={groups} matched={matched} />
            </nav>
          </div>
        </aside>

        <div
          className="min-w-0 [&_[data-focused=true]]:bg-brand/10 [&_[data-focused=true]]:outline [&_[data-focused=true]]:outline-2 [&_[data-focused=true]]:outline-brand"
          data-intel-content
        >
          {visible === 0 && (
            <div
              className="rounded-2xl border border-dashed border-border p-8 text-center"
              data-intel-empty
              role="status"
            >
              <p className="text-[14px] font-semibold">
                {t({ ar: `لا موضوع يطابق «${q}»`, en: `No topic matches “${q}”` })}
              </p>
              <button
                type="button"
                onClick={() => setQ("")}
                className="mt-2 text-[13px] text-brand hover:underline"
              >
                {t({ ar: "عرض كل الموضوعات", en: "Show all topics" })}
              </button>
            </div>
          )}
          {groups.map((g) => {
            const shown = g.topics.filter((x) => matched.has(x.key));
            return (
              <section
                key={g.id}
                className="mb-10"
                hidden={shown.length === 0}
                data-intel-group={g.id}
                aria-labelledby={`intel-group-${g.id}`}
              >
                <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4">
                  <div className="min-w-0">
                    <h2 id={`intel-group-${g.id}`} className="text-xl font-bold tracking-tight">
                      {t(g.title)}
                    </h2>
                    <p className="mt-1 text-[13px] text-muted-foreground">{t(g.question)}</p>
                  </div>
                  <Link
                    to="/preview/web-v1/companies/$symbol"
                    params={{ symbol: p.company.symbol }}
                    search={{ tab: g.id }}
                    className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                    data-intel-data-link={g.id}
                  >
                    <Database className="size-3.5 text-brand" aria-hidden />
                    {t({ ar: "في بيانات معرفة", en: "In Marefa Data" })}
                  </Link>
                </header>
                {g.topics.map((x) => (
                  <div key={x.key} hidden={!matched.has(x.key)} data-intel-topic={x.key}>
                    <CompanyTopic
                      topic={x}
                      p={p}
                      peers={peers}
                      focusRow={x.key === topic ? focus : undefined}
                    />
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </PreviewContainer>
  );
}

function SearchBox({
  q,
  setQ,
  visible,
  total,
}: {
  q: string;
  setQ: (v: string) => void;
  visible: number;
  total: number;
}) {
  const { t } = useI18n();
  return (
    <div>
      <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 focus-within:border-brand/60">
        <Search className="size-4 shrink-0 text-brand" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t({ ar: "ابحث داخل الموضوعات", en: "Search within topics" })}
          aria-label={t({ ar: "ابحث داخل موضوعات الشركة", en: "Search the company's topics" })}
          className="h-full w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          data-intel-search
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label={t({ ar: "مسح البحث", en: "Clear search" })}
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        )}
      </label>
      <p
        className="mt-1.5 text-[12px] text-muted-foreground"
        role="status"
        data-intel-count={visible}
      >
        {t({
          ar: `${iso(visible)} من ${iso(total)} موضوعًا`,
          en: `${visible} of ${total} topics`,
        })}
      </p>
    </div>
  );
}

function TopicIndex({ groups, matched }: { groups: IntelGroup[]; matched: Set<string> }) {
  const { t } = useI18n();
  return (
    <ol className="space-y-4">
      {groups.map((g) => {
        const topics = g.topics.filter((x) => matched.has(x.key));
        if (!topics.length) return null;
        return (
          <li key={g.id}>
            <a
              href={`#intel-group-${g.id}`}
              className="text-[12px] font-semibold text-foreground hover:text-brand"
            >
              {t(g.title)}
            </a>
            <ol className="mt-1.5 space-y-0.5 border-s border-border ps-3">
              {topics.map((x) => (
                <TopicIndexItem key={x.key} x={x} />
              ))}
            </ol>
          </li>
        );
      })}
    </ol>
  );
}

function TopicIndexItem({ x }: { x: Topic }) {
  const { t } = useI18n();
  const empty = x.shownCount === 0;
  return (
    <li>
      <a
        href={`#topic-${x.ordinal}`}
        className={cn(
          "flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-[12px] hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand",
          empty ? "text-muted-foreground" : "text-foreground/90",
        )}
        data-intel-index={x.key}
      >
        <span className="min-w-0">
          <span className="num me-1.5 text-muted-foreground">{x.ordinal}</span>
          {t(x.title)}
        </span>
        <span
          className="num shrink-0 text-[11px] text-muted-foreground"
          data-intel-index-count={x.shownCount}
        >
          {empty
            ? t({ ar: "لا بيانات", en: "No data" })
            : x.status !== "not_measured"
              ? t(TOPIC_META[x.status].label)
              : t({ ar: `${iso(x.shownCount)} قيمة`, en: `${x.shownCount} values` })}
        </span>
      </a>
    </li>
  );
}
