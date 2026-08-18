import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel } from "@/components/cards";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { PricePoint } from "@/data/types";

type RangeKey = "1m" | "6m" | "1y" | "all";

const ranges: { key: RangeKey; label: { ar: string; en: string }; points: number }[] = [
  { key: "1m", label: { ar: "شهر", en: "1M" }, points: 22 },
  { key: "6m", label: { ar: "6 أشهر", en: "6M" }, points: 130 },
  { key: "1y", label: { ar: "سنة", en: "1Y" }, points: 260 },
  { key: "all", label: { ar: "الكل", en: "All" }, points: Infinity },
];

export function PriceChart({ data }: { data: PricePoint[] }) {
  const { t, locale } = useI18n();
  const [range, setRange] = useState<RangeKey>("1y");

  const points = useMemo(() => {
    const cfg = ranges.find((r) => r.key === range);
    if (!cfg || cfg.points === Infinity) return data;
    return data.slice(-cfg.points);
  }, [data, range]);

  if (data.length < 2) return null;

  const first = points[0]?.price ?? 0;
  const last = points[points.length - 1]?.price ?? 0;
  const changePct = first ? ((last - first) / first) * 100 : 0;
  const positive = changePct >= 0;

  // اللون يتبع اتجاه السعر بالفترة المختارة
  const lineColor = positive ? "var(--tone-emerald)" : "var(--tone-rose)";

  return (
    <Panel title={t({ ar: "سعر السهم", en: "Share price" })}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-lg font-semibold" dir="ltr">
            {last.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span
            className={cn(
              "text-sm font-semibold",
              positive ? "text-tone-emerald" : "text-tone-rose",
            )}
            dir="ltr"
          >
            {positive ? "+" : ""}
            {changePct.toFixed(1)}%
          </span>
        </div>

        <div className="flex gap-1">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                range === r.key
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t(r.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                fontSize: "12px",
                boxShadow: "var(--shadow-card, 0 4px 12px rgba(0,0,0,.08))",
              }}
              labelStyle={{ color: "var(--muted-foreground)", fontSize: "11px" }}
              formatter={(v: number) => [v.toFixed(2), t({ ar: "السعر", en: "Price" })]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={lineColor}
              strokeWidth={2}
              fill="url(#priceFill)"
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        {t({
          ar: "بيانات تجريبية حالياً — ستُربط بمصدر أسعار مباشر.",
          en: "Demo data for now — will connect to a live price feed.",
        })}
      </p>
    </Panel>
  );
}
