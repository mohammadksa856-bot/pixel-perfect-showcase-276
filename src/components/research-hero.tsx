import { Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowUpLeft, ArrowUpRight, Layers3 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SearchBox } from "./search-box";
import { LogoMark } from "./logo-mark";

/** The existing home route's hero. No alternate app, data loader or feature flag. */
export function ResearchHero() {
  const { t, dir } = useI18n();
  const arrow = dir === "rtl" ? <ArrowUpLeft size={18} /> : <ArrowUpRight size={18} />;
  return (
    <section className="border-b border-border/60 bg-night/30" data-current-home-hero>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.3fr_1fr] lg:gap-20 lg:py-20">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
            <span className="size-1.5 rounded-full bg-brand" />
            {t({ ar: "منصة البحث المالي والاستثماري", en: "FINANCIAL & INVESTMENT RESEARCH" })}
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.5] tracking-tight sm:text-5xl">
            {t({ ar: "تعلّم. ابحث. استكشف.", en: "Learn. Research. Explore." })}
            <br />
            <span className="text-brand">
              {t({ ar: "واستثمر بمعرفة.", en: "Invest with knowledge." })}
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-8 text-muted-foreground sm:text-base">
            {t({
              ar: "سواء جئت تتعلّم الاستثمار، تبحث عن بيانات شركة، أو تقرأ بحثًا: اختر بدايتك، ووصل للمعلومة مع سياقها ومصدرها وحدودها.",
              en: "Whether you want to learn investing, find company data or read research: choose your starting point and explore information with its context, sources and limitations.",
            })}
          </p>
          <div className="mt-7">
            <SearchBox
              placeholder={t({
                ar: "ابحث عن شركة، قطاع، أو موضوع…",
                en: "Search a company, sector or topic…",
              })}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span>{t({ ar: "ابدأ من", en: "Start with" })}</span>
            <Link to="/companies" className="hover:text-foreground">
              {t({ ar: "دليل الشركات", en: "Company directory" })}
            </Link>
            <span>·</span>
            <Link to="/sectors" className="hover:text-foreground">
              {t({ ar: "القطاعات", en: "Sectors" })}
            </Link>
            <span>·</span>
            <Link to="/knowledge" className="hover:text-foreground">
              {t({ ar: "مكتبة المعرفة", en: "Knowledge library" })}
            </Link>
          </div>
          <p className="mt-6 flex items-center gap-2 text-[11px] leading-6 text-muted-foreground">
            <ShieldCheck size={16} className="shrink-0 text-brand" />
            {t({
              ar: "وجود المعلومة أو مصدرها لا يعني تحققًا ماليًا مستقلًا.",
              en: "Available information or a source link does not imply independent financial verification.",
            })}
          </p>
        </div>
        <div className="self-center rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-center justify-between text-[10px] tracking-wider text-muted-foreground">
            <span>MAREFA / RESEARCH</span>
            <Layers3 size={16} />
          </div>
          <div className="relative my-7 flex h-32 items-center justify-center">
            <div className="absolute size-32 rounded-full border border-border outline outline-1 outline-offset-[18px] outline-border" />
            <span className="relative grid size-20 place-items-center rounded-2xl bg-brand text-brand-foreground">
              <LogoMark className="size-11" />
            </span>
          </div>
          <h2 className="text-xl font-bold">
            {t({ ar: "ابحث أبعد من سعر السهم", en: "Look beyond the share price" })}
          </h2>
          <p className="mt-3 text-xs leading-7 text-muted-foreground">
            {t({
              ar: "موضوعات المستثمر وجوانب الشركة في مسار واضح. جودة البيانات ودرجة جاهزيتها منفصلتان عن الرأي الاستثماري.",
              en: "Investor topics and company fundamentals in a clear research flow. Data quality and readiness are separate from investment opinion.",
            })}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-[11px] text-muted-foreground">
            <span>18 {t({ ar: "موضوعًا للمستثمر", en: "investor topics" })}</span>
            <span>18 {t({ ar: "فئة مصنع تشغيلية", en: "factory categories" })}</span>
          </div>
          <Link
            to="/companies"
            className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-brand"
          >
            {t({ ar: "استكشف الشركات", en: "Explore companies" })}
            {arrow}
          </Link>
        </div>
      </div>
    </section>
  );
}
