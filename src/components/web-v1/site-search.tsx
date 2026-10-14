import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  FileText,
  Layers,
  Library,
  Loader2,
  SearchX,
} from "lucide-react";
import { useI18n, type LocalizedText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { searchSite } from "@/lib/web-v1/catalog.functions";
import {
  DIRECTORY_DEFAULT_SEARCH,
  isLatinQuery,
  SEARCH_COPY,
  SEARCH_GROUP_TEXT,
  type SearchGroupState,
  type SearchItem,
  type SearchResponse,
} from "@/lib/web-v1/catalog";

/**
 * WEB-05A: البحث الموحد. حالات صريحة: خامل، تحميل، نتائج، لا نتائج، خطأ.
 * يُستعمل في نافذة البحث (Ctrl+K) وفي صفحة نتائج البحث بالمكوّن نفسه.
 */
export type SearchStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "done"; response: SearchResponse }
  | { state: "error" };

export function useSiteSearch(query: string, delay = 200): SearchStatus {
  const [status, setStatus] = useState<SearchStatus>({ state: "idle" });
  const seq = useRef(0);
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setStatus({ state: "idle" });
      return;
    }
    const id = ++seq.current;
    setStatus({ state: "loading" });
    const timer = setTimeout(() => {
      searchSite({ data: { q } })
        .then((response) => {
          if (id !== seq.current) return; // نتيجة قديمة: طلب أحدث أُرسل بعدها
          setStatus(response ? { state: "done", response } : { state: "error" });
        })
        .catch(() => id === seq.current && setStatus({ state: "error" }));
    }, delay);
    return () => clearTimeout(timer);
  }, [query, delay]);
  return status;
}

const ICON = { companies: Building2, sectors: Layers, research: FileText, knowledge: Library };
type GroupKey = keyof SearchResponse["groups"];
const ORDER: GroupKey[] = ["companies", "sectors", "research", "knowledge"];

export function hasResults(r: SearchResponse) {
  return ORDER.some((k) => r.groups[k].state === "results");
}

/** قائمة النتائج المجمّعة. onNavigate لإغلاق النافذة عند الاختيار. */
export function SearchResults({
  status,
  onNavigate,
  compact = false,
}: {
  status: SearchStatus;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  if (status.state === "idle")
    return (
      <p
        className="px-4 py-6 text-center text-[13px] text-muted-foreground"
        data-search-state="idle"
      >
        {t(SEARCH_COPY.idle)}
      </p>
    );
  if (status.state === "loading")
    return (
      <p
        className="flex items-center justify-center gap-2 px-4 py-6 text-[13px] text-muted-foreground"
        data-search-state="loading"
        role="status"
      >
        <Loader2 className="size-4 animate-spin" />
        {t({ ar: "جارٍ البحث…", en: "Searching…" })}
      </p>
    );
  if (status.state === "error")
    return (
      <p
        className="flex items-center justify-center gap-2 px-4 py-6 text-[13px] text-status-bad"
        data-search-state="error"
        role="alert"
      >
        <AlertTriangle className="size-4" />
        {t({ ar: "تعذّر البحث الآن. حاول مرة أخرى.", en: "Search failed. Please try again." })}
      </p>
    );
  const r = status.response;
  if (!hasResults(r))
    return (
      <div className="px-4 py-6 text-center" data-search-state="empty">
        <SearchX className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-2 text-[13px]">
          {t({ ar: `لا نتائج لـ «${r.query}»`, en: `No results for “${r.query}”` })}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {t(isLatinQuery(r.query) ? SEARCH_COPY.latinEmpty : SEARCH_COPY.empty)}
        </p>
        <Link
          to="/preview/web-v1/companies"
          search={DIRECTORY_DEFAULT_SEARCH}
          onClick={onNavigate}
          className="mt-3 inline-block text-[13px] text-brand hover:underline"
        >
          {t({ ar: "دليل الشركات", en: "Company directory" })}
        </Link>
      </div>
    );
  // WEB-06 (D12): حين تكون الأبحاث والمعرفة كلتاهما «غير متاحة» تُدمجان في رسالة واحدة قصيرة.
  // الخطأ لا يُدمج: يبقى لكل قسم حالته (خطأ ≠ غير متاح ≠ لا نتائج).
  const libraryUnavailable =
    r.groups.research.state === "unavailable" && r.groups.knowledge.state === "unavailable";
  return (
    <div className="divide-y divide-border/60" data-search-state="results">
      {ORDER.filter((k) => !(libraryUnavailable && LIBRARY_GROUPS.includes(k))).map((k) => (
        <SearchGroup key={k} k={k} g={r.groups[k]} onNavigate={onNavigate} compact={compact} />
      ))}
      {libraryUnavailable && (
        <p
          className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-muted-foreground"
          data-search-group="library"
          data-merged-groups="research knowledge"
          data-group-state="unavailable"
        >
          <Library className="size-3.5 shrink-0" />
          {t({
            ar: "الأبحاث والمعرفة غير مشمولة في بحث عينة المعاينة.",
            en: "Research and knowledge are not included in the preview sample search.",
          })}
        </p>
      )}
    </div>
  );
}

const LIBRARY_GROUPS: readonly GroupKey[] = ["research", "knowledge"];

function SearchGroup({
  k,
  g,
  onNavigate,
  compact,
}: {
  k: GroupKey;
  g: SearchGroupState;
  onNavigate: (() => void) | undefined;
  compact: boolean;
}) {
  const { t } = useI18n();
  const Icon = ICON[k];
  if (compact && g.state === "empty") return null;
  return (
    <section className="py-2" data-search-group={k} data-group-state={g.state}>
      <h3 className="flex items-center gap-2 px-4 py-1.5 text-[11px] font-semibold text-muted-foreground">
        <Icon className="size-3.5" />
        {t(SEARCH_GROUP_TEXT[k])}
        {g.state === "results" && <span className="num">({g.items.length})</span>}
      </h3>
      {g.state === "results" ? (
        <ul>
          {g.items.map((item) => (
            <li key={item.id}>
              <ResultRow item={item} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={cn(
            "px-4 pb-1 text-[12px]",
            g.state === "error" ? "text-status-bad" : "text-muted-foreground",
          )}
        >
          {g.state === "empty"
            ? t({ ar: "لا نتائج في هذا القسم.", en: "No results in this section." })
            : t(g.reason)}
        </p>
      )}
    </section>
  );
}

function ResultRow({
  item,
  onNavigate,
}: {
  item: SearchItem;
  onNavigate: (() => void) | undefined;
}) {
  const { t } = useI18n();
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{t(item.title)}</span>
        {item.subtitle && (
          <span className="block truncate text-[11px] text-muted-foreground">
            {t(item.subtitle as LocalizedText)}
          </span>
        )}
      </span>
      {item.badge && (
        <code dir="ltr" className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px]">
          {item.badge}
        </code>
      )}
      {!item.href && (
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {t({ ar: "بلا صفحة بعد", en: "No page yet" })}
        </span>
      )}
    </>
  );
  const cls = "flex items-center gap-3 px-4 py-2";
  return item.href ? (
    <a
      href={item.href}
      onClick={onNavigate}
      className={cn(cls, "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none")}
      data-result={item.id}
    >
      {body}
    </a>
  ) : (
    <div className={cn(cls, "opacity-80")} data-result={item.id}>
      {body}
    </div>
  );
}
