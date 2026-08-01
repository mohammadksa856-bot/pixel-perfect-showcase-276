import { Link } from "@tanstack/react-router";
import { Moon } from "lucide-react";
import { navLinks } from "@/data/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="shrink-0 text-lg font-bold tracking-tight sm:text-xl">
          معرفة استثمار
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link, i) => (
            <span
              key={link.label}
              className={`relative cursor-pointer py-5 text-sm transition-colors hover:text-foreground ${
                i === 0 ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {link.label}
              {i === 0 && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-foreground" />
              )}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-lg border border-border text-xs font-medium">
            <button className="px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted">
              عربي
            </button>
            <span className="h-4 w-px bg-border" />
            <button className="bg-muted px-3 py-1.5 text-foreground">EN</button>
          </div>
          <button
            aria-label="تبديل المظهر"
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Moon className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
