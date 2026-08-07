import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { CompanyCard, Panel } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { getCompanies } from "@/lib/content";

export const Route = createFileRoute("/watchlist")({
  head: () => ({
    meta: [{ title: "قائمة متابعتي | معرفة استثمار" }, { name: "robots", content: "noindex" }],
  }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const { t } = useI18n();

  const watchlistQuery = useQuery({
    queryKey: ["watchlist"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("watchlist")
        .select("company_id")
        .eq("user_id", auth.user.id);
      if (error) throw error;
      const ids = new Set(data.map((w) => w.company_id));
      if (!ids.size) return [];
      const all = await getCompanies();
      return all.filter((c) => ids.has(c.id));
    },
  });

  return (
    <PageShell>
      <PageHero
        eyebrow={t({ ar: "متابعتي", en: "My watchlist" })}
        title={t({ ar: "الشركات اللي تتابعها", en: "Companies you're watching" })}
        description={t({
          ar: 'قائمة مخصصة تجمع كل الشركات اللي ضغطت "تابع" عليها.',
          en: "A personal list of every company you've marked as watching.",
        })}
      />
      <Container>
        {watchlistQuery.isLoading && (
          <p className="text-sm text-muted-foreground">{t({ ar: "يحمّل...", en: "Loading..." })}</p>
        )}

        {watchlistQuery.data && watchlistQuery.data.length === 0 && (
          <Panel className="text-center">
            <Star className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t({
                ar: 'ما تابعت أي شركة بعد. افتح أي صفحة شركة واضغط "تابع هذي الشركة".',
                en: 'You haven\'t watched any company yet. Open a company page and click "Watch this company".',
              })}
            </p>
            <Link to="/companies" className="mt-4 inline-block text-sm font-semibold text-brand">
              {t(ui.discoverCompanies)} ←
            </Link>
          </Panel>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {watchlistQuery.data?.map((c) => (
            <CompanyCard key={c.slug} company={c} />
          ))}
        </div>
      </Container>
    </PageShell>
  );
}
