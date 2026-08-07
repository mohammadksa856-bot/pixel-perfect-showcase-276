import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Menu, Moon, Search, Star, Sun, X } from "lucide-react";

import { ui, useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo-mark";

const nav = [
  { to: "/", label: ui.home },
  { to: "/sectors", label: ui.sectors },
  { to: "/companies", label: ui.companies },
  { to: "/knowledge", label: ui.knowledge },
  { to: "/research", label: ui.research },
  { to: "/community", label: ui.community },
] as const;

export function SiteHeader() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";
  const navigate = useNavigate();
  const [headerQuery, setHeaderQuery] = useState("");

  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-5 px-6">
        {/* Logo */}

        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-lg">
            <LogoMark className="h-6 w-6" />
          </div>

          <div className="leading-tight">
            <div className="font-bold text-lg">معرفة استثمار</div>

            <div className="text-xs text-muted-foreground">Investment Intelligence</div>
          </div>
        </Link>

        {/* Navigation */}

        <nav className="hidden lg:flex items-center gap-1">
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
          <div className="hidden xl:flex flex-1 justify-center">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (headerQuery.trim())
                  navigate({ to: "/search", search: { q: headerQuery.trim() } });
              }}
              className="w-full max-w-md"
            >
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-all focus-within:ring-2 focus-within:ring-brand">
                <Search className="h-4 w-4 text-muted-foreground" />

                <input
                  type="search"
                  value={headerQuery}
                  onChange={(e) => setHeaderQuery(e.target.value)}
                  placeholder={t(ui.searchPlaceholder)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </label>
            </form>
          </div>
        ) : (
          <div className="hidden flex-1 xl:block" aria-hidden />
        )}

        {/* Right */}

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/watchlist"
            className="hidden md:flex items-center justify-center rounded-full border border-border p-2 hover:bg-muted transition"
            title={t({ ar: "متابعتي", en: "My watchlist" })}
          >
            <Star className="h-4 w-4" />
          </Link>
          <button
            className="hidden md:flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm hover:bg-muted transition"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          >
            {locale === "ar" ? "English" : "العربية"}

            <ChevronDown className="h-4 w-4" />
          </button>

          <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-muted transition"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {/* Mobile Menu */}

      {open && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5">
            {/* Mobile Search */}

            {!isHome && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (headerQuery.trim()) {
                    setOpen(false);
                    navigate({ to: "/search", search: { q: headerQuery.trim() } });
                  }
                }}
                className="mb-3"
              >
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                  <Search className="h-4 w-4 text-muted-foreground" />

                  <input
                    type="search"
                    value={headerQuery}
                    onChange={(e) => setHeaderQuery(e.target.value)}
                    placeholder={t(ui.searchPlaceholder)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </label>
              </form>
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

              <ChevronDown className="h-4 w-4" />
            </button>

            <button
              onClick={toggleTheme}
              className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-muted transition"
            >
              <span>{theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}</span>

              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
