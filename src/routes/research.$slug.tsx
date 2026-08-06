import { createFileRoute, notFound } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { PageShell, Container } from "@/components/page-shell";
import { Panel, ResearchCard, SectionHeading } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getRelatedResearch, getResearchItem } from "@/lib/content";
import type { Research } from "@/data/types";

export const Route = createFileRoute("/research/$slug")({
  loader: async ({ params }) => {
    const item = await getResearchItem(params.slug);
    if (!item) throw notFound();
    const related = await getRelatedResearch(item);
    return { item, related };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "البحث غير موجود | معرفة استثمار" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { item } = loaderData;
    const title = `${item.title.ar} | معرفة استثمار`;
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
  component: ResearchArticle,
});

function ResearchArticle() {
  const { item, related } = Route.useLoaderData() as { item: Research; related: Research[] };
  const { t } = useI18n();

  return (
    <PageShell>
      <section className="relative isolate overflow-hidden night-panel">
        <img
          src={item.image}
          alt={t(item.title)}
          className="absolute inset-0 -z-10 size-full object-cover opacity-35"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-night/70 to-night/95" />
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag.en}
                className="rounded-full border border-night-foreground/20 px-3 py-1 text-[11px]"
              >
                {t(tag)}
              </span>
            ))}
          </div>
          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t(item.title)}
          </h1>
          <p className="mt-4 text-sm leading-8 text-night-foreground/70">{t(item.summary)}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-night-foreground/60">
            <span>
              {t(ui.by)} {t(item.author)}
            </span>
            <span>{item.date}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {item.readingTime} {t(ui.readingTime)}
            </span>
          </div>
        </div>
      </section>

      <Container>
        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <Panel title={t(ui.tableOfContents)}>
              <ol className="space-y-3 text-sm">
                {item.sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {i + 1}. {t(s.heading)}
                    </a>
                  </li>
                ))}
              </ol>
            </Panel>

            <Panel className="mt-5">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-brand/15 text-sm font-bold text-brand">
                  {t(item.author).slice(0, 1)}
                </span>
                <div>
                  <div className="text-sm font-semibold">{t(item.author)}</div>
                  <div className="text-[11px] text-muted-foreground">{t(item.authorRole)}</div>
                </div>
              </div>
            </Panel>
          </aside>

          <article className="min-w-0">
            {item.sections.map((s) => (
              <section key={s.id} id={s.id} className="mb-10 scroll-mt-24">
                <h2 className="text-lg font-bold">{t(s.heading)}</h2>
                <p className="mt-3 text-sm leading-9 text-muted-foreground">{t(s.body)}</p>
              </section>
            ))}

            <Panel title={t({ ar: "رسم توضيحي", en: "Chart" })} className="mb-10">
              <div className="flex h-44 items-end gap-3">
                {[45, 62, 38, 74, 55, 88, 70].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-md bg-brand/70"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </Panel>

            <Panel title={t(ui.references)}>
              <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
                {item.references.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Panel>
          </article>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <SectionHeading title={t(ui.relatedResearch)} />
            <div className="grid gap-5 md:grid-cols-3">
              {related.map((r) => (
                <ResearchCard key={r.slug} item={r} />
              ))}
            </div>
          </div>
        )}
      </Container>
    </PageShell>
  );
}
