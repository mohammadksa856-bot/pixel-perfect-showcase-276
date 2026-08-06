import { createFileRoute } from "@tanstack/react-router";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { KnowledgeCard } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getKnowledge } from "@/lib/content";

export const Route = createFileRoute("/knowledge/")({
  loader: async () => ({ items: await getKnowledge() }),
  head: () => ({
    meta: [
      { title: "المعرفة | معرفة استثمار" },
      {
        name: "description",
        content:
          "مكتبة معرفية في الاستثمار والاقتصاد والقوائم المالية والتقييم والمحاسبة وإدارة المخاطر بمستويات متدرجة.",
      },
      { property: "og:title", content: "المعرفة — معرفة استثمار" },
      {
        property: "og:description",
        content: "دروس ومقالات تعليمية متدرجة المستوى في الاستثمار والتحليل المالي.",
      },
    ],
  }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const { t } = useI18n();
  const { items } = Route.useLoaderData();
  const categories = Array.from(new Set(items.map((i) => i.category.en)));

  return (
    <PageShell>
      <PageHero
        eyebrow={t(ui.knowledge)}
        title={t(ui.knowledgeLibrary)}
        description={t({
          ar: "محتوى تعليمي مرتب حسب المستوى والفئة، من الأساسيات حتى التقييم المتقدم.",
          en: "Educational content organised by level and category, from foundations to advanced valuation.",
        })}
      />
      <Container>
        {categories.map((cat) => (
          <section key={cat} className="mb-14">
            <h2 className="mb-6 text-lg font-bold">
              {t(items.find((i) => i.category.en === cat)!.category)}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items
                .filter((i) => i.category.en === cat)
                .map((i) => (
                  <KnowledgeCard key={i.slug} item={i} />
                ))}
            </div>
          </section>
        ))}
      </Container>
    </PageShell>
  );
}
