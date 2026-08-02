import { createFileRoute, notFound } from "@tanstack/react-router";
import { Clock, PlayCircle } from "lucide-react";
import { PageShell, Container, PageHero } from "@/components/page-shell";
import { KnowledgeCard, Panel, SectionHeading } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getKnowledgeItem, getRelatedKnowledge } from "@/lib/content";
import type { KnowledgeArticle } from "@/data/types";

export const Route = createFileRoute("/knowledge/$slug")({
  loader: ({ params }) => {
    const item = getKnowledgeItem(params.slug);
    if (!item) throw notFound();
    return { item };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "المقال غير موجود | معرفة استثمار" }, { name: "robots", content: "noindex" }],
      };
    }
    const { item } = loaderData;
    const title = `${item.title.ar} | المعرفة — معرفة استثمار`;
    return {
      meta: [
        { title },
        { name: "description", content: item.summary.ar },
        { property: "og:title", content: title },
        { property: "og:description", content: item.summary.ar },
        { property: "og:type", content: "article" },
      ],
    };
  },
  component: KnowledgeArticlePage,
});

function KnowledgeArticlePage() {
  const { item } = Route.useLoaderData() as { item: KnowledgeArticle };
  const { t } = useI18n();
  const related = getRelatedKnowledge(item);

  return (
    <PageShell>
      <PageHero eyebrow={t(item.category)} title={t(item.title)} description={t(item.summary)}>
        <div className="mt-8 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full border border-night-foreground/15 px-4 py-2">
            {t(ui.difficulty)}: {t(item.level)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-night-foreground/15 px-4 py-2">
            <Clock className="size-3.5" />
            {item.readingTime} {t(ui.readingTime)}
          </span>
        </div>
      </PageHero>

      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <article className="min-w-0">
            {item.sections.map((s) => (
              <section key={s.heading.en} className="mb-10">
                <h2 className="text-lg font-bold">{t(s.heading)}</h2>
                <p className="mt-3 text-sm leading-9 text-muted-foreground">{t(s.body)}</p>
              </section>
            ))}
          </article>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <Panel title={t(ui.recommendedVideos)}>
              <ul className="space-y-4">
                {item.videos.map((v) => (
                  <li key={v.title.en} className="flex items-center gap-3">
                    <PlayCircle className="size-8 shrink-0 text-brand" strokeWidth={1.4} />
                    <div>
                      <div className="text-sm font-medium leading-6">{t(v.title)}</div>
                      <div className="text-[11px] text-muted-foreground">{v.duration}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="mt-14">
            <SectionHeading title={t(ui.relatedArticles)} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((k) => (
                <KnowledgeCard key={k.slug} item={k} />
              ))}
            </div>
          </div>
        )}
      </Container>
    </PageShell>
  );
}
