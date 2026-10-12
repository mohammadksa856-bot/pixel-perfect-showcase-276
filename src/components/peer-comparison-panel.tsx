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
    <Panel title={t({ ar: "مقارنة مع شركات مماثلة", en: "Comparison with similar companies" })}>
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
            className={cn("border-b border-border/60", row.isTarget && "bg-brand/5 font-semibold")}
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
                      href={cell.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
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
          ar: "كل رقم مرتبط بمصدره الرسمي. «—» تعني أن القيمة غير متاحة أو حُجبت لاختلاف الفترة أو غياب المصدر.",
          en: "Each figure links to its official source. “—” means unavailable or withheld (different period or no source).",
        })}
      </p>
    </Panel>
  );
}
