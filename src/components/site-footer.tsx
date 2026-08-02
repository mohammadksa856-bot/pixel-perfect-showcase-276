import { Link } from "@tanstack/react-router";
import { Github, Linkedin, Twitter, Youtube } from "lucide-react";
import { ui, useI18n } from "@/lib/i18n";

const columns = [
  {
    title: { ar: "المنصة", en: "Platform" },
    links: [
      { to: "/sectors", label: ui.sectors },
      { to: "/companies", label: ui.companies },
      { to: "/research", label: ui.research },
      { to: "/knowledge", label: ui.knowledge },
      { to: "/community", label: ui.community },
    ],
  },
  {
    title: { ar: "عن المنصة", en: "Company" },
    links: [
      { to: "/", label: { ar: "من نحن", en: "About" } },
      { to: "/", label: { ar: "تواصل معنا", en: "Contact" } },
      { to: "/", label: { ar: "سياسة الخصوصية", en: "Privacy" } },
      { to: "/", label: { ar: "الشروط والأحكام", en: "Terms" } },
    ],
  },
] as const;

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="night-panel mt-20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <h2 className="text-lg font-bold">{t(ui.heroTitle)}</h2>
            <p className="mt-3 max-w-xs text-sm leading-7 text-night-foreground/60">
              {t(ui.heroSubtitle)}
            </p>
            <div className="mt-6 flex gap-4 text-night-foreground/55">
              {[Youtube, Linkedin, Twitter, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="social link"
                  className="transition-colors hover:text-night-foreground"
                >
                  <Icon className="size-5" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title.en}>
              <h3 className="text-sm font-semibold">{t(col.title)}</h3>
              <ul className="mt-4 space-y-3 text-sm text-night-foreground/60">
                {col.links.map((l, i) => (
                  <li key={i}>
                    <Link to={l.to} className="transition-colors hover:text-night-foreground">
                      {t(l.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-sm font-semibold">{t(ui.newsletter)}</h3>
            <p className="mt-4 text-sm leading-7 text-night-foreground/60">
              {t(ui.newsletterCopy)}
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-4 flex overflow-hidden rounded-xl border border-night-foreground/15 bg-night-foreground/5"
            >
              <input
                type="email"
                required
                placeholder={t(ui.emailPlaceholder)}
                className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-night-foreground/40"
              />
              <button className="shrink-0 bg-brand px-4 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90">
                {t(ui.subscribe)}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-14 border-t border-night-foreground/10 pt-6 text-center text-xs text-night-foreground/45">
          © {new Date().getFullYear()} {t(ui.heroTitle)} — All rights reserved.
        </div>
      </div>
    </footer>
  );
}
