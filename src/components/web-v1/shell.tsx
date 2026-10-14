import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, Globe2, Home, Layers, LayoutGrid, Menu, Search, Star } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { SiteFooter } from "@/components/site-footer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { hasResults, SearchResults, useSiteSearch } from "./site-search";
import { SEARCH_COPY } from "@/lib/web-v1/catalog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ui, useI18n, type LocalizedText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { COMPANY_GROUPS, COVERAGE_TAB, type CompanyTab } from "@/lib/web-v1/model";

const NAV = [
  { to: "/preview/web-v1/markets", label: ui.markets, icon: Globe2 },
  { to: "/preview/web-v1/sectors", label: ui.sectors, icon: Layers },
  { to: "/preview/web-v1/companies", label: ui.companies, icon: Building2 },
  { to: "/knowledge", label: ui.knowledge, icon: LayoutGrid },
  { to: "/research", label: ui.research, icon: LayoutGrid },
] as const;

const OpenSearch = createContext<() => void>(() => {});
/** يفتح البحث الموحّد من أي مكان داخل الغلاف (مثل حقل البحث في الواجهة الرئيسية). */
export const useOpenSearch = () => useContext(OpenSearch);

export type SearchContext = {
  symbol: string;
  name: LocalizedText;
  topics: { ordinal: number; title: LocalizedText; group: CompanyTab }[];
};

/**
 * غلاف صفحات WEB-V1: رأس بتنقل رئيسي وبحث موحّد (⌘K / Ctrl+K)، وشريط سفلي على الجوال.
 * يعيد استخدام شعار الموقع وتذييله ورموز التصميم القائمة.
 */
export function WebV1Shell({
  children,
  searchContext,
}: {
  children: ReactNode;
  searchContext?: SearchContext;
}) {
  const { t, dir, locale, setLocale } = useI18n();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div dir={dir} className="relative flex min-h-screen flex-col bg-background pb-16 lg:pb-0">
      <div
        className="bg-status-warn/15 py-1.5 text-center text-[11px] font-medium text-status-warn"
        data-preview-banner
      >
        {t({
          ar: "معاينة تصميم • عينات تطوير مجمدة، ليست بيانات حية أو اعتمادًا ماليًا • الجاهزية غير مقاسة",
          en: "Design preview • frozen development samples, not live or financially accepted data • readiness not measured",
        })}
      </div>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/preview/web-v1" className="flex shrink-0 items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
              <LogoMark className="size-5" />
            </span>
            <span className="font-display text-[15px] font-bold">
              {t({ ar: "معرفة استثمار", en: "Marefa Invest" })}
            </span>
          </Link>
          <nav className="hidden items-center gap-0.5 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t(n.label)}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ms-auto hidden h-10 w-full max-w-sm items-center gap-2 rounded-xl border border-border bg-card px-3 text-[13px] text-muted-foreground transition-colors hover:border-brand/50 md:flex"
            data-search-trigger
          >
            <Search className="size-4" />
            <span className="flex-1 text-start">{t(SEARCH_COPY.short)}</span>
            <kbd className="rounded border border-border px-1.5 text-[10px]" dir="ltr">
              Ctrl K
            </kbd>
          </button>
          <div className="ms-auto flex items-center gap-1.5 md:ms-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex size-10 items-center justify-center rounded-xl border border-border md:hidden"
              aria-label={t(ui.search)}
            >
              <Search className="size-4" />
            </button>
            <Link
              to="/watchlist"
              className="hidden size-10 items-center justify-center rounded-xl border border-border hover:bg-muted md:flex"
              aria-label={t({ ar: "متابعتي", en: "Watchlist" })}
            >
              <Star className="size-4" />
            </Link>
            <button
              type="button"
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              className="h-10 rounded-xl border border-border px-3 text-[13px] font-medium hover:bg-muted"
              data-locale-toggle
            >
              {locale === "ar" ? "EN" : "ع"}
            </button>
          </div>
        </div>
      </header>

      <OpenSearch.Provider value={() => setSearchOpen(true)}>
        <main className="flex-1">{children}</main>
      </OpenSearch.Provider>
      <SiteFooter />

      {/* شريط الجوال السفلي */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
        data-mobile-tabbar
      >
        {[
          { label: ui.home, icon: Home, to: "/preview/web-v1" as const },
          { label: ui.markets, icon: Globe2, to: "/preview/web-v1/markets" as const },
          { label: ui.search, icon: Search, onClick: () => setSearchOpen(true) },
          { label: ui.companies, icon: Building2, to: "/preview/web-v1/companies" as const },
          {
            label: { ar: "المزيد", en: "More" },
            icon: Menu,
            onClick: () => setMenuOpen(true),
          },
        ].map((item) => {
          const inner = (
            <>
              <item.icon className="size-5" />
              <span className="text-[10px] font-medium">{t(item.label)}</span>
            </>
          );
          const cls =
            "flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground";
          return "to" in item && item.to ? (
            <Link key={item.label.en} to={item.to} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={item.label.en} type="button" onClick={item.onClick} className={cls}>
              {inner}
            </button>
          );
        })}
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{t({ ar: "التنقل", en: "Navigation" })}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 p-4">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm"
              >
                <n.icon className="size-4 text-muted-foreground" />
                {t(n.label)}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <UnifiedSearch open={searchOpen} onOpenChange={setSearchOpen} context={searchContext} />
    </div>
  );
}

/**
 * البحث الموحّد (WEB-05A): نتائج مجمّعة من الخادم (الشركات، القطاعات، الأبحاث، المعرفة) بحالات تحميل
 * وفراغ وخطأ صريحة، وداخل صفحة الشركة مجموعات الصفحة وموضوعاتها. Enter يفتح صفحة النتائج الكاملة.
 */
export function UnifiedSearch({
  open,
  onOpenChange,
  context,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  context?: SearchContext | undefined;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const status = useSiteSearch(q);
  const close = () => onOpenChange(false);
  const nq = q.trim().toLowerCase();
  const inCompany = context
    ? [
        ...COMPANY_GROUPS.map((g) => ({
          key: g.id,
          title: g.title,
          tab: g.id as CompanyTab,
          hash: undefined as string | undefined,
        })),
        {
          key: "coverage",
          title: COVERAGE_TAB.title,
          tab: "coverage" as CompanyTab,
          hash: undefined,
        },
        ...context.topics.map((tp) => ({
          key: `t${tp.ordinal}`,
          title: tp.title,
          tab: tp.group,
          hash: `topic-${tp.ordinal}`,
        })),
      ].filter((x) => !nq || x.title.ar.includes(q.trim()) || x.title.en.toLowerCase().includes(nq))
    : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[12%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
        data-search-dialog
      >
        <DialogTitle className="sr-only">{t(ui.search)}</DialogTitle>
        <form
          className="flex items-center gap-2 border-b border-border px-4 pe-12"
          onSubmit={(e) => {
            e.preventDefault();
            if (!q.trim()) return;
            close();
            navigate({ to: "/preview/web-v1/search", search: { q: q.trim() } });
          }}
        >
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t(SEARCH_COPY.dialog)}
            className="h-12 w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
            aria-label={t(ui.search)}
            data-search-input
          />
        </form>
        <div className="max-h-[60vh] overflow-y-auto">
          {inCompany.length > 0 && (
            <section className="border-b border-border/60 py-2" data-search-group="in-company">
              <h3 className="px-4 py-1.5 text-[11px] font-semibold text-muted-foreground">
                {t({ ar: "داخل", en: "In" })} {t(context!.name)}
              </h3>
              <ul className="flex flex-wrap gap-1.5 px-4 pb-1">
                {inCompany.slice(0, nq ? 8 : 6).map((x) => (
                  <li key={x.key}>
                    <Link
                      to="/preview/web-v1/companies/$symbol"
                      params={{ symbol: context!.symbol }}
                      search={{ tab: x.tab }}
                      {...(x.hash ? { hash: x.hash } : {})}
                      onClick={close}
                      className="block rounded-lg border border-border px-2.5 py-1 text-[12px] hover:border-brand/50"
                    >
                      {t(x.title)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!(inCompany.length > 0 && status.state === "done" && !hasResults(status.response)) && (
            <SearchResults status={status} onNavigate={close} compact />
          )}
        </div>
        {q.trim() && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            <span>
              {status.state === "done" &&
                (status.response.source === "frozen_catalog"
                  ? t({
                      ar: "المصدر: دليل الشركات (عينة المعاينة)",
                      en: "Source: company directory (preview sample)",
                    })
                  : t({
                      ar: "المصدر: الدليل ومحتوى الموقع",
                      en: "Source: directory and site content",
                    }))}
            </span>
            <span>
              <kbd className="rounded border border-border px-1">Enter</kbd>{" "}
              {t({ ar: "كل النتائج", en: "all results" })}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PreviewContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto max-w-7xl px-4 sm:px-6", className)}>{children}</div>;
}
