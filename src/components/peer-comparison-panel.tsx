import { Panel } from "@/components/cards";
import { DataTable } from "@/components/company-sections";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { PeerTable } from "@/lib/engine/peer-comparison";

/**
 * لوحة مقارنة النظراء (P01-15). لا تعرض شيئًا إن لم تكن البيانات متاحة:
 * لا نص بديل ولا أرقام تقديرية.
 */
export function PeerComparisonPanel({ table }: { table: PeerTable | null }) {
  const { t } = useI18n();
  if (!table || table.status !== "available" || !table.columns.length) return null;

  const periods = [...new Set(table.columns.map((c) => c.periodEnd))].join("، ");
  return (
    <section data-data-origin="engine-api">
      <Panel title={t({ ar: "مقارنة مع شركات مماثلة", en: "Comparison with similar companies" })}>
        <p className="mb-2 text-[11px] text-muted-foreground">
          {t({
            ar: "مصدر هذه اللوحة: API المحرك فقط؛ لا تستخدم بيانات الموقع التجريبية ولا تُعد تحققاً مستقلاً من الأرقام.",
            en: "Panel source: engine API only; no demonstration site values or independent numerical verification.",
          })}
        </p>
        <p className="mb-4 text-[11px] text-muted-foreground">
          {t({
            ar: `شركات من التصنيف نفسه (${table.scopeLabel ?? "—"}) اختارها المحرك آليًا، وليست بالضرورة منافسين أعلنتهم الشركة. الفترة: ${periods}.`,
            en: `Companies from the same classification (${table.scopeLabel ?? "—"}) selected by the engine; not necessarily competitors named by the company. Period: ${periods}.`,
          })}
        </p>
        <DataTable
          headers={[t({ ar: "الشركة", en: "Company" }), ...table.columns.map((c) => t(c.label))]}
        >
          {table.rows.map((row) => (
            <tr
              key={row.symbol}
              className={cn(
                "border-b border-border/60",
                row.isTarget && "bg-brand/5 font-semibold",
              )}
            >
              <td className="py-2.5 pe-3">
                <span dir="auto">{row.name}</span>
                <span className="ms-1 text-[11px] text-muted-foreground">{row.symbol}</span>
              </td>
              {table.columns.map((col) => {
                const cell = row.cells[col.metric];
                return (
                  <td key={col.metric} className="py-2.5 pe-3 tabular-nums" dir="ltr">
                    {cell ? (
                      <a
                        href={cell.evidence.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        title={t(
                          cell.evidence.basis === "calculated_formula_recorded"
                            ? {
                                ar: "محسوب؛ المعادلة مسجلة، ولا يُثبت تتبع المدخلات هنا",
                                en: "Calculated; formula recorded, input lineage not certified here",
                              }
                            : { ar: "منشور في هذا المستند", en: "Reported in this document" },
                        )}
                      >
                        {cell.display}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="text-muted-foreground">
            <td className="py-2.5 pe-3 text-[11px]">{t({ ar: "الوسيط", en: "Median" })}</td>
            {table.columns.map((col) => (
              <td key={col.metric} className="py-2.5 pe-3 tabular-nums" dir="ltr">
                {col.medianDisplay}
                <span className="ms-1 text-[10px]">({col.companies})</span>
              </td>
            ))}
          </tr>
        </DataTable>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {t({
            ar: "كل رقم مرتبط بمصدره المسجل. للقيمة المحسوبة معادلة مسجلة، لكن ذلك لا يثبت مدخلاتها أو صحة الرقم مستقلاً. «—» تعني أن القيمة غير متاحة أو حُجبت لاختلاف الفترة أو غياب مصدر صالح أو علامة جودة.",
            en: "Each figure links to its recorded source. A recorded formula does not independently verify its inputs or the number. “—” means unavailable or withheld (different period, no valid source, or a quality flag).",
          })}
        </p>
      </Panel>
    </section>
  );
}
