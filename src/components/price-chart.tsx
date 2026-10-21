import { Panel } from "@/components/cards";
import { useI18n } from "@/lib/i18n";
import type { PricePoint } from "@/data/types";

// Stored series have no provider/time contract. Never combine them with a
// separately refreshed quote, even when fixture points are present.
export function PriceChart(_props: { data: PricePoint[] }) {
  const { t } = useI18n();
  return (
    <Panel title={t({ ar: "السجل السعري", en: "Price history" })}>
      <p className="text-sm leading-7 text-muted-foreground" data-content-status="unavailable">
        {t({
          ar: "الرسم السعري ونسبة التغير غير متاحين لعدم توفر سلسلة موثقة المصدر والتوقيت. لا تُعرض سلسلة تجريبية بدلًا منهما.",
          en: "The price chart and change are unavailable without a sourced, timestamped series. No demo series is substituted.",
        })}
      </p>
    </Panel>
  );
}
