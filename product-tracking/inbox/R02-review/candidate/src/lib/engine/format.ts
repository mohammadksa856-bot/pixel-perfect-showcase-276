/**
 * تنسيق القيم القادمة من المحرك للعرض فقط.
 *
 * قواعد ثابتة: لا تقريب يغيّر المعنى، ولا تحويل وحدة غير مؤكد. القيمة الأصلية
 * كما وصلت من الواجهة تبقى متاحة دائمًا (`raw`) لتظهر عند المرور عليها.
 * النسبة (unit = "ratio") لا تُعرض كنسبة مئوية إلا لمقاييس معناها نسبة مئوية
 * (الهوامش، العوائد، النمو، التوزيع...). أما المضاعفات مثل الدين إلى EBITDA
 * فتُعرض بعلامة ×.
 */

export interface Formatted {
  text: string;
  raw: string;
  negative: boolean;
}

const PERCENT_RATIO =
  /(margin|^return_on|^roace$|yield|growth|cagr|payout_ratio|tax_rate|^equity_ratio$|^liabilities_to_assets$|cost_to_income|loans_to_deposits|nonperforming_loans_ratio|^cost_of_risk$|_to_revenue$|^accrual_ratio$|^income_quality$)/;

const UNIT_LABELS: Record<string, string> = {
  mmboed: "مليون برميل مكافئ يوميًا",
  mmbpd: "مليون برميل يوميًا",
  bscfd: "مليار قدم مكعب يوميًا",
  "USD/boe": "دولار/برميل مكافئ",
  "USD/bbl": "دولار/برميل",
  million_tonnes: "مليون طن",
  million_tonnes_co2e: "مليون طن مكافئ CO₂",
  kg_co2e_per_boe: "كغ CO₂ مكافئ/برميل مكافئ",
  million_m3: "مليون م³",
  thousand_btu_per_boe: "ألف وحدة حرارية/برميل مكافئ",
  scf_per_boe: "قدم مكعب/برميل مكافئ",
  barrels: "برميل",
  tonnes: "طن",
  kilotonnes: "ألف طن",
  years: "سنة",
  score: "",
  count: "",
};

const CURRENCY_AR: Record<string, string> = { SAR: "ر.س", USD: "دولار" };

function grouped(value: number, digits: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function scaled(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${grouped(value / 1e9, 2)} مليار`;
  if (abs >= 1e6) return `${grouped(value / 1e6, 2)} مليون`;
  if (abs >= 1e3) return grouped(value, 0);
  return grouped(value, 2);
}

export function isPercentRatio(metricKey: string): boolean {
  return PERCENT_RATIO.test(metricKey);
}

/** يرجع null إن لم تكن القيمة رقمًا صالحًا — لا يخترع صفرًا. */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatValue(
  metricKey: string,
  value: unknown,
  unit: string,
  currency: string,
): Formatted | null {
  if (value === null || value === undefined) return null;
  const raw = String(value);
  const number = toNumber(value);
  if (number === null) return { text: raw, raw, negative: false };
  const negative = number < 0;
  const currencyLabel = CURRENCY_AR[currency] ?? currency;
  let text: string;
  if (unit === "ratio") {
    text = isPercentRatio(metricKey) ? `${grouped(number * 100, 1)}%` : `${grouped(number, 2)}×`;
  } else if (unit === "percent") {
    text = `${grouped(number, 1)}%`;
  } else if (unit === currency && currency) {
    text = `${scaled(number)} ${currencyLabel}`;
  } else if (unit.endsWith("/share")) {
    text = `${grouped(number, 2)} ${currencyLabel}/سهم`;
  } else if (unit === "shares") {
    text = `${scaled(number)} سهم`;
  } else {
    const label = UNIT_LABELS[unit] ?? unit;
    text = label
      ? `${grouped(number, Math.abs(number) >= 1000 ? 0 : 2)} ${label}`
      : grouped(number, 2);
  }
  return { text, raw, negative };
}

export function formatPercentShare(value: string | null): string | null {
  const number = toNumber(value);
  return number === null ? null : `${grouped(number * 100, 2)}%`;
}

export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}
