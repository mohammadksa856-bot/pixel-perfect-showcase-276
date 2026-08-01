import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Brain,
  Building2,
  Calculator,
  Clock,
  Cpu,
  FileText,
  Globe,
  Heart,
  Landmark,
  Laptop,
  BookOpen,
  Factory,
  PieChart,
  Rocket,
  Search,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import heroSpace from "@/assets/hero-space.jpg";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { companies, research, sectors, topics } from "@/data/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "معرفة استثمار — منصة المعرفة والأبحاث الاستثمارية" },
      {
        name: "description",
        content:
          "منصة عربية تجمع المعرفة والتحليل والأبحاث حول الشركات والقطاعات لمساعدتك على اتخاذ قرارات استثمارية أفضل.",
      },
      { property: "og:title", content: "معرفة استثمار — استثمر بفهم، لا بتوقع" },
      {
        property: "og:description",
        content: "أبحاث وتحليلات وشروحات استثمارية بالعربية عن الشركات والقطاعات العالمية.",
      },
    ],
  }),
  component: Index,
});

const sectorIcons = {
  zap: Zap,
  rocket: Rocket,
  shield: Shield,
  laptop: Laptop,
  brain: Brain,
  landmark: Landmark,
  factory: Factory,
  heart: Heart,
} as const;

const topicIcons = {
  chart: BarChart3,
  globe: Globe,
  search: Search,
  activity: Activity,
  calculator: Calculator,
  file: FileText,
  trending: TrendingUp,
  pie: PieChart,
} as const;

function SectionHead({ title }: { title: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="section-title">{title}</h2>
      <a
        href="#"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-tone-sky transition-opacity hover:opacity-75"
      >
        عرض الكل
        <ArrowLeft className="size-3.5" />
      </a>
    </div>
  );
}

function Index() {
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden night-panel">
          <img
            src={heroSpace}
            alt=""
            width={1920}
            height={900}
            className="absolute inset-0 -z-10 size-full object-cover opacity-70"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-night/70 via-night/40 to-night/85" />

          <div className="mx-auto max-w-3xl px-4 pb-32 pt-20 text-center sm:px-6 sm:pt-24">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">معرفة استثمار</h1>
            <p className="mt-5 text-base font-medium text-night-foreground/85 sm:text-lg">
              استثمر بفهم، لا بتوقع.
            </p>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-night-foreground/65">
              منصة عربية تجمع المعرفة، التحليل، والأبحاث لمساعدتك على اتخاذ قرارات استثمارية
              أفضل.
            </p>

            <label className="mt-9 flex items-center gap-3 rounded-xl bg-card px-4 py-3.5 shadow-panel">
              <Search className="size-5 shrink-0 text-muted-foreground" />
              <input
                type="search"
                placeholder="ابحث عن شركة، قطاع، مفهوم، أو بحث..."
                className="w-full bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>
        </section>

        {/* Stats */}
        <div className="mx-auto -mt-20 max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 divide-border rounded-2xl bg-card px-6 py-7 shadow-panel sm:grid-cols-4 sm:divide-x sm:divide-x-reverse">
            {[
              { value: "8", label: "قطاعات", Icon: PieChart, tone: "text-tone-orange" },
              { value: "45", label: "شركة", Icon: Building2, tone: "text-tone-violet" },
              { value: "120", label: "مقال", Icon: BookOpen, tone: "text-tone-sky" },
              { value: "32", label: "بحث", Icon: FileText, tone: "text-tone-emerald" },
            ].map(({ value, label, Icon, tone }) => (
              <div key={label} className="flex items-center justify-center gap-3 py-3">
                <Icon className={`size-7 ${tone}`} strokeWidth={1.6} />
                <div className="text-right">
                  <div className={`text-2xl font-bold ${tone}`}>{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-7xl space-y-14 px-4 py-16 sm:px-6">
          {/* Sectors */}
          <section>
            <SectionHead title="استكشف القطاعات" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              {sectors.map((s) => {
                const Icon = sectorIcons[s.icon];
                return (
                  <button
                    key={s.label}
                    className="group flex flex-col items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
                  >
                    <span
                      className="flex size-12 items-center justify-center rounded-full"
                      style={{ backgroundColor: `color-mix(in oklch, var(--${s.tone}) 14%, transparent)` }}
                    >
                      <Icon className="size-6" style={{ color: `var(--${s.tone})` }} strokeWidth={1.8} />
                    </span>
                    <span className="text-xs font-semibold">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Companies */}
          <section>
            <SectionHead title="اكتشف الشركات" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              {companies.map((c) => (
                <button
                  key={c.name}
                  className="group flex flex-col items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-muted text-[11px] font-bold tracking-tight text-foreground">
                    {c.ticker}
                  </span>
                  <span className="text-xs font-semibold" dir="ltr">
                    {c.name}
                  </span>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-tone-sky">
                    {c.sector}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Research */}
          <section>
            <SectionHead title="أحدث الأبحاث" />
            <div className="grid gap-5 md:grid-cols-3">
              {research.map((r) => (
                <article
                  key={r.title}
                  className="group overflow-hidden rounded-xl border border-border/70 bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="flex gap-4 p-3 md:block md:p-0">
                    <img
                      src={r.image}
                      alt={r.title}
                      loading="lazy"
                      width={900}
                      height={600}
                      className="h-24 w-28 shrink-0 rounded-lg object-cover md:h-44 md:w-full md:rounded-none"
                    />
                    <div className="md:p-5">
                      <h3 className="text-sm font-bold leading-6">{r.title}</h3>
                      <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted-foreground">
                        {r.excerpt}
                      </p>
                      <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
                        <span>{r.date}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" />
                          {r.readTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Knowledge topics */}
          <section>
            <SectionHead title="المعرفة" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              {topics.map((t) => {
                const Icon = topicIcons[t.icon];
                return (
                  <button
                    key={t.label}
                    className="flex flex-col items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
                  >
                    <Icon className="size-6 text-muted-foreground" strokeWidth={1.6} />
                    <span className="text-xs font-semibold">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* CTA */}
          <section className="night-panel relative isolate overflow-hidden rounded-2xl px-6 py-10 sm:px-10">
            <Cpu className="absolute -left-6 -top-6 size-40 text-night-foreground/5" strokeWidth={0.7} />
            <div className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-right">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">ابدأ رحلتك الاستثمارية الآن</h2>
                <p className="mt-2 text-sm text-night-foreground/65">
                  استكشف آلاف الشركات والأبحاث والمقالات في مكان واحد.
                </p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-transform hover:scale-[1.03]">
                استكشف المنصة
                <ArrowLeft className="size-4" />
              </button>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
