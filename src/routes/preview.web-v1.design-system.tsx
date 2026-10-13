import { createFileRoute, notFound } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { getWebV1Enabled } from "@/lib/web-v1/flag.functions";
import { useI18n, type LocalizedText } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { LogoMark } from "@/components/logo-mark";
import { PreviewContainer, WebV1Shell } from "@/components/web-v1/shell";
import {
  CONDITION_META,
  FACTORY_META,
  GATE_META,
  Pill,
  READINESS_META,
  ScoreBar,
  TOPIC_META,
  WITHHELD_META,
} from "@/components/web-v1/primitives";

/** WEB-V1: مرجع نظام التصميم. يعرض الرموز الحيّة من styles.css والمكوّنات المستخدمة فعلًا. */
export const Route = createFileRoute("/preview/web-v1/design-system")({
  loader: async () => {
    if (!(await getWebV1Enabled())) throw notFound();
    return null;
  },
  head: () => ({
    meta: [
      { title: "نظام التصميم | معرفة استثمار" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DesignSystem,
});

const COLORS: { token: string; label: LocalizedText }[] = [
  { token: "background", label: { ar: "الخلفية", en: "Background" } },
  { token: "night", label: { ar: "الأقسام البارزة", en: "Hero / night" } },
  { token: "card", label: { ar: "البطاقات", en: "Card" } },
  { token: "muted", label: { ar: "سطح ثانوي", en: "Muted surface" } },
  { token: "foreground", label: { ar: "النص", en: "Text" } },
  { token: "muted-foreground", label: { ar: "نص ثانوي", en: "Secondary text" } },
  { token: "brand", label: { ar: "العلامة والإجراء", en: "Brand / action" } },
  { token: "gold", label: { ar: "علامة الهدف 95", en: "95 target marker" } },
];
const STATUS_COLORS: { token: string; label: LocalizedText }[] = [
  { token: "status-ok", label: { ar: "مكتمل / جاهز / نجح", en: "Complete / ready / passed" } },
  { token: "status-warn", label: { ar: "جزئي / غير جاهز", en: "Partial / not ready" } },
  { token: "status-bad", label: { ar: "مفقود / فشل", en: "Missing / failed" } },
  {
    token: "status-neutral",
    label: { ar: "لم يُقيَّم / غير معروف", en: "Not assessed / unknown" },
  },
  {
    token: "status-withheld",
    label: { ar: "محجوب بقاعدة جودة", en: "Withheld by a quality rule" },
  },
  {
    token: "status-excluded",
    label: { ar: "مستثنى بقاعدة مستشهد بها", en: "Excluded by a cited rule" },
  },
];

function DesignSystem() {
  const { t } = useI18n();
  return (
    <WebV1Shell>
      <section className="night-panel border-b border-border/40">
        <PreviewContainer className="py-12">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
              <LogoMark className="size-7" />
            </span>
            <div>
              <div className="font-display text-2xl font-bold">معرفة استثمار</div>
              <div className="text-[13px] text-night-foreground/60" dir="ltr">
                Marefa Invest
              </div>
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            {t({ ar: "نظام التصميم الموحّد", en: "Unified design system" })}
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-7 text-night-foreground/65">
            {t({
              ar: "امتداد للهوية القائمة: ثيم داكن بنمط منصات التداول، وأزرق للعلامة، وخطّا Cairo وIBM Plex Sans Arabic. الإضافة الأساسية لغة حالة موحّدة لكل ما يخص اكتمال البيانات وثقتها.",
              en: "An extension of the current identity: a dark trading-platform theme, a blue brand colour, and the Cairo and IBM Plex Sans Arabic typefaces. The main addition is one status language for data completeness and trust.",
            })}
          </p>
        </PreviewContainer>
      </section>

      <PreviewContainer className="space-y-14 py-12">
        <Block title={{ ar: "الألوان الأساسية", en: "Core colours" }}>
          <Swatches items={COLORS} />
        </Block>

        <Block
          title={{ ar: "ألوان الحالة", en: "Status colours" }}
          hint={{
            ar: "لون واحد لكل معنى في الموقع كله. اللون لا يُستخدم وحده أبدًا: معه رمز ونص.",
            en: "One colour per meaning across the whole site. Colour is never used alone: always with an icon and text.",
          }}
        >
          <Swatches items={STATUS_COLORS} />
        </Block>

        <Block title={{ ar: "الطباعة", en: "Typography" }}>
          <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-6">
            {[
              [
                "font-display text-4xl font-bold",
                { ar: "عنوان رئيسي · Cairo 700", en: "Display · Cairo 700" },
                "36/44",
              ],
              [
                "font-display text-2xl font-bold",
                { ar: "عنوان صفحة · Cairo 700", en: "Page title · Cairo 700" },
                "24/32",
              ],
              [
                "text-lg font-bold",
                { ar: "عنوان قسم · Plex 700", en: "Section title · Plex 700" },
                "18/28",
              ],
              ["text-[15px]", { ar: "نص أساسي · Plex 400", en: "Body · Plex 400" }, "15/28"],
              [
                "text-[13px] text-muted-foreground",
                { ar: "نص مساعد · Plex 400", en: "Supporting · Plex 400" },
                "13/24",
              ],
              [
                "text-[11px] text-muted-foreground",
                { ar: "تسمية صغيرة · Plex 500", en: "Caption · Plex 500" },
                "11/16",
              ],
            ].map(([cls, label, size]) => (
              <div
                key={size as string}
                className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3 last:border-0"
              >
                <span className={cls as string}>{t(label as LocalizedText)}</span>
                <code className="num shrink-0 text-[11px] text-muted-foreground" dir="ltr">
                  {size as string}
                </code>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4">
              <span className="num text-2xl font-bold">{iso("1,234,567.89")} SAR</span>
              <code className="text-[11px] text-muted-foreground" dir="ltr">
                .num · tabular · iso()
              </code>
            </div>
          </div>
        </Block>

        <Block
          title={{ ar: "مفردات الحالة", en: "Status vocabulary" }}
          hint={{
            ar: "لا توجد حالة «غير منطبق» عامة. الاستثناء لا يظهر إلا بقاعدة مستشهد بها، ولا تُعرض له درجة.",
            en: "There is no general “not applicable” state. An exclusion appears only with a cited rule, and never shows a score.",
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Row label={{ ar: "الجاهزية (3 حالات فقط)", en: "Readiness (3 states only)" }}>
              {Object.entries(READINESS_META).map(([k, m]) => (
                <Pill key={k} meta={m} />
              ))}
            </Row>
            <Row label={{ ar: "موضوعات المستثمر", en: "Investor topics" }}>
              {Object.entries(TOPIC_META).map(([k, m]) => (
                <Pill key={k} meta={m} />
              ))}
            </Row>
            <Row label={{ ar: "فئات المصنع", en: "Factory categories" }}>
              {Object.entries(FACTORY_META).map(([k, m]) => (
                <Pill key={k} meta={m} />
              ))}
            </Row>
            <Row label={{ ar: "البوابات والشروط", en: "Gates and conditions" }}>
              {Object.entries(GATE_META).map(([k, m]) => (
                <Pill key={k} meta={m} />
              ))}
              {Object.entries(CONDITION_META).map(([k, m]) => (
                <Pill key={`c-${k}`} meta={m} />
              ))}
            </Row>
            <Row label={{ ar: "القيم", en: "Values" }}>
              <Pill meta={WITHHELD_META} />
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {t({ ar: "منشور · ص 39", en: "Reported · p.39" })}
              </span>
              <span className="rounded bg-tone-teal/15 px-1.5 py-0.5 text-[10px] text-tone-teal">
                {t({ ar: "محسوب بمعادلة مسجّلة", en: "Calculated, formula recorded" })}
              </span>
            </Row>
          </div>
        </Block>

        <Block
          title={{ ar: "شريط الدرجة", en: "Score bar" }}
          hint={{
            ar: "العلامة الذهبية هي حد الفئة. لا يُرسم الشريط إلا لدرجة من تقييم صالح.",
            en: "The gold tick is the category threshold. The bar is drawn only for a score from a valid assessment.",
          }}
        >
          <div className="grid gap-4 rounded-2xl border border-border/70 bg-card p-6 md:grid-cols-3">
            <ScoreBar value={0.97} threshold={0.95} tone="ok" />
            <ScoreBar value={0.79} threshold={0.95} tone="warn" />
            <ScoreBar value={0.12} threshold={0.85} tone="bad" />
          </div>
        </Block>

        <Block title={{ ar: "قواعد اللغتين والجوال", en: "Bilingual and mobile rules" }}>
          <ul className="grid gap-3 text-[13px] leading-6 md:grid-cols-2">
            {[
              {
                ar: "العربية أولًا (RTL)، والإنجليزية بالتبديل نفسه دون إعادة تحميل.",
                en: "Arabic first (RTL); English via the same toggle, no reload.",
              },
              {
                ar: "الأرقام والرموز والتواريخ معزولة الاتجاه (iso) وبأرقام لاتينية متساوية العرض.",
                en: "Numbers, tickers and dates are direction-isolated (iso), tabular Latin digits.",
              },
              {
                ar: "نصوص المحرك الإنجليزية (شروط البوابات، أسماء الحقول) تُعرض LTR كما هي، مع تسمية عربية حولها.",
                en: "Engine English text (gate conditions, field names) is shown LTR as-is, wrapped in Arabic labels.",
              },
              {
                ar: "الجوال: شريط سفلي بخمسة أزرار، وتبويبات قابلة للتمرير، وجداول تتحول إلى قوائم.",
                en: "Mobile: five-button bottom bar, scrollable tabs, tables turn into lists.",
              },
              {
                ar: "نقاط الكسر: 640 / 768 / 1024 / 1280، وعرض المحتوى الأقصى 1280.",
                en: "Breakpoints 640 / 768 / 1024 / 1280; max content width 1280.",
              },
              {
                ar: "أهداف اللمس 40px على الأقل، والتركيز مرئي على كل عنصر تفاعلي.",
                en: "Touch targets at least 40px; visible focus on every interactive element.",
              },
            ].map((x) => (
              <li key={x.en} className="rounded-xl border border-border/70 bg-card p-4">
                {t(x)}
              </li>
            ))}
          </ul>
        </Block>
      </PreviewContainer>
    </WebV1Shell>
  );
}

function Block({
  title,
  hint,
  children,
}: {
  title: LocalizedText;
  hint?: LocalizedText;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section>
      <h2 className="text-lg font-bold tracking-tight">{t(title)}</h2>
      {hint && <p className="mt-1 text-[13px] text-muted-foreground">{t(hint)}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Swatches({ items }: { items: { token: string; label: LocalizedText }[] }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {items.map((c) => (
        <div key={c.token} className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <div className="h-14" style={{ background: `var(--${c.token})` }} />
          <div className="p-2.5">
            <div className="text-[12px] font-medium">{t(c.label)}</div>
            <code className="text-[10px] text-muted-foreground" dir="ltr">
              --{c.token}
            </code>
          </div>
        </div>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: LocalizedText; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="mb-3 text-[12px] text-muted-foreground">{t(label)}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
