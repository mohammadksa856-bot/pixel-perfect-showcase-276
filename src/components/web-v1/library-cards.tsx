import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { hasText, type KnowledgeItem, type ResearchItem } from "@/lib/web-v1/library";
import { DateText, L, Meta, ReadingTime } from "./library-parts";

/** WEB-05C: بطاقتا البحث والمقال. كل حقل غائب في المصدر لا يظهر (لا مؤلف أو تاريخ أو صورة افتراضية). */
export function ResearchCard({ r }: { r: ResearchItem }) {
  return (
    <Link
      to="/preview/web-v1/research/$slug"
      params={{ slug: r.slug }}
      className="group flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-brand/50"
      data-research-card={r.slug}
    >
      <div className="flex items-start justify-between gap-3">
        <Meta
          items={[
            hasText(r.sectorName) && <L t={r.sectorName} className="font-medium text-brand" />,
            r.publishedAt && <DateText key="d" date={r.publishedAt} />,
          ]}
        />
        <ArrowUpRight className="size-4 shrink-0 text-brand opacity-60 group-hover:opacity-100" />
      </div>
      <L t={r.title} as="h2" className="mt-3 text-[16px] font-bold leading-7" />
      <L
        t={r.summary}
        as="p"
        className="mt-2 line-clamp-3 text-[13px] leading-6 text-muted-foreground"
      />
      <div className="mt-auto pt-4">
        <Meta
          items={[
            hasText(r.author) && <L t={r.author} />,
            r.readingTime && <ReadingTime minutes={r.readingTime} />,
          ]}
        />
      </div>
    </Link>
  );
}

export function KnowledgeCard({ k }: { k: KnowledgeItem }) {
  return (
    <Link
      to="/preview/web-v1/knowledge/$slug"
      params={{ slug: k.slug }}
      className="group flex h-full flex-col rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-brand/50"
      data-knowledge-card={k.slug}
    >
      <div className="flex items-start justify-between gap-3">
        <L t={k.title} as="h3" className="text-[15px] font-bold leading-7" />
        <ArrowUpRight className="mt-1 size-4 shrink-0 text-brand opacity-60 group-hover:opacity-100" />
      </div>
      <L
        t={k.summary}
        as="p"
        className="mt-1.5 line-clamp-2 text-[13px] leading-6 text-muted-foreground"
      />
      <div className="mt-auto pt-3">
        <Meta
          items={[
            hasText(k.level) && (
              <L t={k.level} className="rounded-md border border-border px-1.5 py-0.5" />
            ),
            k.readingTime && <ReadingTime minutes={k.readingTime} />,
          ]}
        />
      </div>
    </Link>
  );
}
