import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { BookOpen, Building2, FileText, HelpCircle, LayoutGrid, Layers } from "lucide-react";
import { PageShell, Container } from "@/components/page-shell";
import { useAuth, useIsContentManager } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم | معرفة استثمار" },
      { name: "description", content: "إدارة القطاعات والشركات والأبحاث والمقالات والأسئلة الشائعة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const links: { to: string; label: { ar: string; en: string }; icon: typeof LayoutGrid; exact?: boolean }[] = [
  { to: "/admin", label: { ar: "نظرة عامة", en: "Overview" }, icon: LayoutGrid, exact: true },
  { to: "/admin/sectors", label: { ar: "القطاعات", en: "Sectors" }, icon: Layers },
  { to: "/admin/companies", label: { ar: "الشركات", en: "Companies" }, icon: Building2 },
  { to: "/admin/research", label: { ar: "الأبحاث", en: "Research" }, icon: FileText },
  { to: "/admin/knowledge", label: { ar: "المعرفة", en: "Knowledge" }, icon: BookOpen },
  { to: "/admin/faqs", label: { ar: "الأسئلة الشائعة", en: "FAQs" }, icon: HelpCircle },
];

function AdminLayout() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { loading, allowed } = useIsContentManager(user?.id);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <PageShell>
      <Container>
        <h1 className="text-2xl font-bold tracking-tight">
          {t({ ar: "لوحة إدارة المحتوى", en: "Content admin" })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t({
            ar: "أضف وحرر محتوى المنصة بدون كتابة كود.",
            en: "Create and edit platform content without touching code.",
          })}
        </p>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">
            {t({ ar: "جارِ التحقق من الصلاحيات…", en: "Checking permissions…" })}
          </p>
        ) : !allowed ? (
          <div className="mt-10 rounded-xl border border-border p-10 text-sm text-muted-foreground">
            {t({
              ar: "هذا الحساب لا يملك صلاحية إدارة المحتوى. اطلب من المشرف منحك دور admin أو editor.",
              en: "This account has no content permissions. Ask an admin to grant you the admin or editor role.",
            })}
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
            <nav className="flex flex-wrap gap-1 lg:flex-col">
              {links.map((l) => {
                const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
                return (
                  <Link
                    key={l.to}
                    to={l.to as never}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted",
                      active && "bg-muted font-semibold text-foreground",
                    )}
                  >
                    <l.icon className="size-4" />
                    {t(l.label)}
                  </Link>
                );
              })}
            </nav>
            <div className="min-w-0">
              <Outlet />
            </div>
          </div>
        )}
      </Container>
    </PageShell>
  );
}
