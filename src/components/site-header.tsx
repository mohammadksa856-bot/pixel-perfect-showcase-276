import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Star, X } from "lucide-react";

import { ui, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo-mark";
import { SearchBox } from "@/components/search-box";

const nav = [
  { to: "/", label: ui.home },
  { to: "/markets", label: ui.markets },
  { to: "/sectors", label: ui.sectors },
  { to: "/companies", label: ui.companies },
  { to: "/knowledge", label: ui.knowledge },
  { to: "/research", label: ui.research },
  { to: "/community", label: ui.community },
] as const;

export function SiteHeader() {
  const { t, locale, setLocale } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";

  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-3 px-4 sm:gap-5 sm:px-6">
        {/* Logo */}

        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-lg">
            <LogoMark className="h-6 w-6" />
          </div>

          <div className="leading-tight">
            <div className="font-bold text-base sm:text-lg">
              {t({ ar: "معرفة استثمار", en: "Marefa Investment" })}
            </div>
            <div className="mt-1 text-[9px] font-normal text-muted-foreground">
              {t({ ar: "استثمر بمعرفة", en: "Invest with knowledge" })}
            </div>
          </div>
        </Link>

        {/* Navigation */}

        <nav
          aria-label={t({ ar: "التنقل الرئيسي", en: "Main navigation" })}
          className="hidden lg:flex items-center gap-1"
        >
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{
                className: "!bg-brand !text-white shadow-md",
              }}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        {/* Search */}

        {!isHome ? (
          <div className="hidden min-w-0 flex-1 justify-center 2xl:flex">
            <SearchBox placeholder={t(ui.searchPlaceholder)} className="w-full max-w-xs" />
          </div>
        ) : (
          <div className="hidden flex-1 xl:block" aria-hidden />
        )}

        {/* Right */}

        <div className="ms-auto flex shrink-0 items-center gap-2">
          <Link
            to="/watchlist"
            className="hidden md:flex items-center justify-center rounded-full border border-border p-2 hover:bg-muted transition"
            title={t({ ar: "متابعتي", en: "My watchlist" })}
          >
            <Star className="h-4 w-4" />
          </Link>
          <button
            className="flex items-center gap-2 rounded-full border border-border px-2.5 py-2 text-xs hover:bg-muted transition"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          >
            {locale === "ar" ? "EN" : "العربية"}
          </button>

          <button
            onClick={() => setOpen(!open)}
            aria-label={t({ ar: "قائمة التنقل", en: "Navigation menu" })}
            aria-expanded={open}
            aria-controls="site-mobile-navigation"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {/* Mobile Menu */}

      {open && (
        <div
          id="site-mobile-navigation"
          className="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5">
            {/* Mobile Search */}

            {!isHome && (
              <div className="mb-3">
                <SearchBox
                  placeholder={t(ui.searchPlaceholder)}
                  onNavigate={() => setOpen(false)}
                />
              </div>
            )}

            {/* Mobile Navigation */}

            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{
                  className: "!bg-brand !text-white",
                }}
                className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted"
              >
                {t(item.label)}
              </Link>
            ))}

            <div className="my-2 border-t border-border" />

            {/* Mobile Actions */}

            <button
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-muted transition"
            >
              <span>{locale === "ar" ? "English" : "العربية"}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
