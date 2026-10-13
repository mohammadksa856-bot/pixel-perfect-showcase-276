import { Link } from "@tanstack/react-router";
import { BookOpen, FileText, Table2, ArrowUpLeft, ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const VISITOR_PATHWAYS = [
  {
    id: "investor",
    icon: BookOpen,
    title: { ar: "أفهم وأتعلّم", en: "Understand & learn" },
    question: { ar: "كيف أقرأ الشركة قبل الاستثمار؟", en: "How do I research a business?" },
    description: {
      ar: "ابدأ بالمفاهيم، ثم اقرأ الأبحاث واستكشف الشركة. مسار يساعدك على فهم الأسئلة، وليس توصية شراء.",
      en: "Start with concepts, read research, then explore a company. Learn what to ask, without a buy recommendation.",
    },
    primary: {
      to: "/knowledge",
      label: { ar: "ابدأ من مكتبة المعرفة", en: "Start in the knowledge library" },
    },
    secondary: {
      to: "/research",
      label: { ar: "اقرأ الأبحاث والتقارير", en: "Read research & reports" },
    },
    steps: { ar: "مفهوم ← بحث ← شركة", en: "Concept → research → company" },
  },
  {
    id: "data",
    icon: Table2,
    title: { ar: "أبحث عن بيانات", en: "Find company data" },
    question: { ar: "أين الأرقام وما مصدرها؟", en: "Where are the numbers and their sources?" },
    description: {
      ar: "اختر الشركة، وانتقل لقوائمها وفتراتها ومصادرها. راجع جودة البيانات قبل الاعتماد على رقم أو نسبة.",
      en: "Choose a company, inspect its statements, periods and sources. Check data quality before relying on a number or ratio.",
    },
    primary: {
      to: "/companies",
      label: { ar: "افتح دليل الشركات", en: "Open the company directory" },
    },
    secondary: { to: "/sectors", label: { ar: "ابحث حسب القطاع", en: "Browse by sector" } },
    steps: { ar: "شركة ← فترة ← مصدر", en: "Company → period → source" },
  },
  {
    id: "reader",
    icon: FileText,
    title: { ar: "أقرأ وأستكشف", en: "Read & explore" },
    question: { ar: "ما الذي يستحق القراءة اليوم؟", en: "What should I explore next?" },
    description: {
      ar: "تصفح الأبحاث والموضوعات والأسواق بالوتيرة التي تناسبك، دون الحاجة لبدء رحلة تحليل مالي كاملة.",
      en: "Browse research, topics and markets at your own pace, without starting a full financial analysis.",
    },
    primary: { to: "/research", label: { ar: "تصفح الأبحاث", en: "Browse research" } },
    secondary: { to: "/markets", label: { ar: "استكشف الأسواق", en: "Explore markets" } },
    steps: { ar: "موضوع ← قراءة ← استكشاف", en: "Topic → reading → exploration" },
  },
] as const;

/** Intent shortcuts into existing routes; no registration, fake data or new data API. */
export function VisitorPathways() {
  const { t, dir } = useI18n();
  const Arrow = dir === "rtl" ? ArrowUpLeft : ArrowUpRight;
  return (
    <section
      aria-labelledby="visitor-pathways-heading"
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14"
      data-visitor-pathways
    >
      <p className="text-xs font-medium text-brand">
        {t({ ar: "معرفة، بالطريقة التي تحتاجها", en: "Marefa, the way you need it" })}
      </p>
      <h2 id="visitor-pathways-heading" className="mt-2 text-2xl font-bold">
        {t({ ar: "وش ودّك تسوي اليوم؟", en: "What brings you here today?" })}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        {t({
          ar: "ثلاث بدايات، ومنصة واحدة. انتقل بينها في أي وقت؛ ما تحتاج تختار نوع حساب أو تتسجل.",
          en: "Three starting points, one platform. Move between them anytime—no account type or sign-up needed.",
        })}
      </p>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {VISITOR_PATHWAYS.map((path) => (
          <article
            key={path.id}
            data-visitor-path={path.id}
            className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-brand/50"
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
                <path.icon size={20} aria-hidden />
              </span>
              <h3 className="text-lg font-bold">{t(path.title)}</h3>
            </div>
            <p className="text-sm font-semibold">{t(path.question)}</p>
            <p className="mt-3 text-xs leading-7 text-muted-foreground">{t(path.description)}</p>
            <p className="mt-4 text-[11px] text-muted-foreground">{t(path.steps)}</p>
            <div className="mt-auto space-y-3 pt-6">
              <Link
                to={path.primary.to}
                className="flex items-center justify-between gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-semibold text-brand-foreground hover:opacity-90"
              >
                {t(path.primary.label)}
                <Arrow size={16} aria-hidden />
              </Link>
              <Link
                to={path.secondary.to}
                className="inline-flex py-1 text-xs font-medium text-brand hover:underline"
              >
                {t(path.secondary.label)}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
