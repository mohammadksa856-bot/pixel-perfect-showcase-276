import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Moon, Search, Sun, User, X } from "lucide-react";
import { ui, useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="shrink-0 text-lg font-bold tracking-tight sm:text-xl">
          {t(ui.heroTitle)}
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "!text-foreground font-semibold bg-muted" }}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <label className="hidden items-center gap-2 rounded-full border border-border bg-muted/50 px-3.5 py-2 md:flex">
            <Search className="size-4 text-muted-foreground" />
            <input
              type="search"
              placeholder={t(ui.search)}
              className="w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground lg:w-36"
            />
          </label>

          <div className="flex items-center overflow-hidden rounded-full border border-border text-xs font-medium">
            {(["ar", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={cn(
                  "px-3 py-1.5 transition-colors",
                  locale === l
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {l === "ar" ? "عربي" : "EN"}
              </button>
            ))}
          </div>

          <button
            onClick={toggleTheme}
            aria-label={t(ui.theme)}
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <button
            aria-label={t(ui.profile)}
            className="hidden size-9 items-center justify-center rounded-full bg-brand text-brand-foreground transition-transform hover:scale-105 sm:flex"
          >
            <User className="size-4" />
          </button>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="menu"
            className="flex size-9 items-center justify-center rounded-full border border-border lg:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="animate-in slide-in-from-top-2 border-t border-border bg-background px-4 pb-4 pt-2 lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted"
              activeProps={{ className: "!text-foreground font-semibold" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
