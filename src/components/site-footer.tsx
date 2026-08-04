import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
      { to: "/about", label: { ar: "من نحن", en: "About" } },
      { to: "/contact", label: { ar: "تواصل معنا", en: "Contact" } },
      { to: "/privacy", label: { ar: "سياسة الخصوصية", en: "Privacy" } },
      { to: "/terms", label: { ar: "الشروط والأحكام", en: "Terms" } },
    ],
  },
] as const;

export function SiteFooter() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.from("newsletter_subscribers").insert({ email });
      if (error) {
        if (error.code === "23505") {
          toast.info(t({ ar: "أنت مشترك بالفعل.", en: "You're already subscribed." }));
        } else {
          throw error;
        }
      } else {
        toast.success(t({ ar: "تم الاشتراك بنجاح.", en: "Subscribed successfully." }));
        setEmail("");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <footer className="night-panel mt-20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <h2 className="text-lg font-bold">{t(ui.heroTitle)}</h2>
            <p className="mt-3 max-w-xs text-sm leading-7 text-night-foreground/60">
              {t(ui.heroSubtitle)}
            </p>
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
              onSubmit={subscribe}
              className="mt-4 flex overflow-hidden rounded-xl border border-night-foreground/15 bg-night-foreground/5"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t(ui.emailPlaceholder)}
                className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-night-foreground/40"
              />
              <button
                type="submit"
                disabled={busy}
                className="shrink-0 bg-brand px-4 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
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
