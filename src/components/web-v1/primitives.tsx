import type { ReactNode } from "react";
import { Check, CircleDashed, EyeOff, Minus, X, CircleHelp, CircleDot } from "lucide-react";
import { useI18n, type LocalizedText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { iso } from "@/lib/bidi";
import type {
  ConditionState,
  FactoryCategoryStatus,
  FactoryGate,
  ReadinessState,
} from "@/lib/engine/readiness";
import type { TopicStatus } from "@/lib/engine/company-preview";

/**
 * مفردات الحالة في WEB-V1. كل حالة: لون دلالي + رمز + نص. لا يُعتمد على اللون وحده،
 * ولا توجد حالة «غير منطبق» دون قاعدة مستشهد بها.
 */
export type Tone = "ok" | "warn" | "bad" | "neutral" | "withheld" | "excluded";

const TONE_CLASS: Record<Tone, string> = {
  ok: "text-status-ok border-status-ok/40 bg-status-ok/10",
  warn: "text-status-warn border-status-warn/40 bg-status-warn/10",
  bad: "text-status-bad border-status-bad/40 bg-status-bad/10",
  neutral: "text-status-neutral border-status-neutral/35 bg-status-neutral/5",
  withheld: "text-status-withheld border-status-withheld/40 bg-status-withheld/10",
  excluded: "text-status-excluded border-status-excluded/40 bg-status-excluded/10",
};
export const TONE_BAR: Record<Tone, string> = {
  ok: "bg-status-ok",
  warn: "bg-status-warn",
  bad: "bg-status-bad",
  neutral: "bg-status-neutral/50",
  withheld: "bg-status-withheld",
  excluded: "bg-status-excluded",
};

type Meta = { tone: Tone; icon: ReactNode; label: LocalizedText };
const I = "size-3.5 shrink-0";

export const READINESS_META: Record<ReadinessState, Meta> = {
  ready: { tone: "ok", icon: <Check className={I} />, label: { ar: "جاهز", en: "Ready" } },
  not_ready: {
    tone: "warn",
    icon: <CircleDot className={I} />,
    label: { ar: "غير جاهز", en: "Not ready" },
  },
  not_assessed: {
    tone: "neutral",
    icon: <CircleDashed className={I} />,
    label: { ar: "لم يُقيَّم", en: "Not assessed" },
  },
};

export const TOPIC_META: Record<TopicStatus, Meta> = {
  available: { tone: "ok", icon: <Check className={I} />, label: { ar: "مكتمل", en: "Complete" } },
  partial: {
    tone: "warn",
    icon: <CircleDot className={I} />,
    label: { ar: "جزئي", en: "Partial" },
  },
  unavailable: {
    tone: "bad",
    icon: <X className={I} />,
    label: { ar: "غير متوفر", en: "Unavailable" },
  },
  not_measured: {
    tone: "neutral",
    icon: <CircleDashed className={I} />,
    label: { ar: "غير مقاس", en: "Not measured" },
  },
};

export const FACTORY_META: Record<FactoryCategoryStatus, Meta> = {
  complete: { tone: "ok", icon: <Check className={I} />, label: { ar: "مكتملة", en: "Complete" } },
  partial: {
    tone: "warn",
    icon: <CircleDot className={I} />,
    label: { ar: "جزئية", en: "Partial" },
  },
  missing: { tone: "bad", icon: <X className={I} />, label: { ar: "مفقودة", en: "Missing" } },
  not_applicable_by_rule: {
    tone: "excluded",
    icon: <Minus className={I} />,
    label: { ar: "مستثناة بقاعدة", en: "Excluded by rule" },
  },
  not_applicable_without_rule: {
    tone: "neutral",
    icon: <CircleHelp className={I} />,
    label: { ar: "استثناء بلا قاعدة", en: "Exclusion without a rule" },
  },
  not_assessed: {
    tone: "neutral",
    icon: <CircleDashed className={I} />,
    label: { ar: "لم تُقيَّم", en: "Not assessed" },
  },
};

export const GATE_META: Record<FactoryGate["status"], Meta> = {
  passed: { tone: "ok", icon: <Check className={I} />, label: { ar: "نجحت", en: "Passed" } },
  failed: { tone: "bad", icon: <X className={I} />, label: { ar: "فشلت", en: "Failed" } },
  not_evaluated: {
    tone: "neutral",
    icon: <CircleDashed className={I} />,
    label: { ar: "لم تُقيَّم", en: "Not evaluated" },
  },
};

export const CONDITION_META: Record<ConditionState, Meta> = {
  passed: { tone: "ok", icon: <Check className={I} />, label: { ar: "محقق", en: "Met" } },
  failed: { tone: "bad", icon: <X className={I} />, label: { ar: "غير محقق", en: "Not met" } },
  unknown: {
    tone: "neutral",
    icon: <CircleDashed className={I} />,
    label: { ar: "غير معروف", en: "Unknown" },
  },
};

export const WITHHELD_META: Meta = {
  tone: "withheld",
  icon: <EyeOff className={I} />,
  label: { ar: "محجوب", en: "Withheld" },
};

export function Pill({
  meta,
  size = "sm",
  className,
  "data-state": dataState,
}: {
  meta: Meta;
  size?: "sm" | "md";
  className?: string;
  "data-state"?: string;
}) {
  const { t } = useI18n();
  return (
    <span
      data-state={dataState}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        TONE_CLASS[meta.tone],
        className,
      )}
    >
      {meta.icon}
      {t(meta.label)}
    </span>
  );
}

/**
 * شريط درجة مع علامة الحد. لا يُرسم إلا لدرجة صالحة؛ دونها يُعرض نص الحالة بدل الشريط.
 * value و threshold بين 0 و1.
 */
export function ScoreBar({
  value,
  threshold,
  tone,
  label,
}: {
  value: number;
  threshold: number | null;
  tone: Tone;
  label?: string;
}) {
  const { locale } = useI18n();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <div className="relative h-2 min-w-16 flex-1 rounded-full bg-muted">
        <div
          className={cn("absolute inset-y-0 start-0 rounded-full", TONE_BAR[tone])}
          style={{ width: `${pct}%` }}
        />
        {threshold !== null && (
          <div
            className="absolute -inset-y-1 w-0.5 rounded bg-status-target"
            style={{ insetInlineStart: `calc(${threshold * 100}% - 1px)` }}
            title={locale === "ar" ? "الحد" : "Threshold"}
          />
        )}
      </div>
      <span className="num w-10 shrink-0 text-end text-[12px] font-semibold">
        {iso(`${pct.toFixed(0)}%`)}
      </span>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-night-foreground/15 px-2.5 py-1 text-[11px] font-medium text-night-foreground/70">
      {children}
    </span>
  );
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
      {hint && <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{hint}</p>}
    </div>
  );
}
