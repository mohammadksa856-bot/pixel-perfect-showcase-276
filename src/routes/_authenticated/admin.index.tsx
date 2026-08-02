import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listRows, type CmsTable } from "@/lib/cms";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

const cards: { table: CmsTable; to: string; label: { ar: string; en: string } }[] = [
  { table: "sectors", to: "/admin/sectors", label: { ar: "القطاعات", en: "Sectors" } },
  { table: "companies", to: "/admin/companies", label: { ar: "الشركات", en: "Companies" } },
  { table: "research", to: "/admin/research", label: { ar: "الأبحاث", en: "Research" } },
  { table: "knowledge_articles", to: "/admin/knowledge", label: { ar: "المعرفة", en: "Knowledge" } },
  { table: "faqs", to: "/admin/faqs", label: { ar: "الأسئلة الشائعة", en: "FAQs" } },
];

function CountCard({ table, to, label }: (typeof cards)[number]) {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ["cms", table], queryFn: () => listRows(table) });
  return (
    <Link
      to={to as never}
      className="rounded-xl border border-border p-5 transition-colors hover:bg-muted/40"
    >
      <p className="text-xs text-muted-foreground">{t(label)}</p>
      <p className="mt-2 text-3xl font-bold">{q.data?.length ?? "—"}</p>
    </Link>
  );
}

function AdminOverview() {
  const { t } = useI18n();
  return (
    <div>
      <p className="mb-5 text-sm text-muted-foreground">
        {t({
          ar: "كل المحتوى محفوظ في قاعدة البيانات ويمكن نشره أو إبقاؤه كمسودة.",
          en: "All content lives in the database and can be published or kept as a draft.",
        })}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <CountCard key={c.table} {...c} />
        ))}
      </div>
    </div>
  );
}
