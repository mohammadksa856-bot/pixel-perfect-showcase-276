import { useQuery } from "@tanstack/react-query";
import { listRows } from "@/lib/cms";
import { useI18n } from "@/lib/i18n";
import type { OptionSet } from "@/components/admin/resource-manager";

/** Lookup options (sectors, companies) shared by the admin forms. */
export function useCmsOptions(): OptionSet {
  const { locale } = useI18n();
  const sectors = useQuery({ queryKey: ["cms", "sectors"], queryFn: () => listRows("sectors") });
  const companies = useQuery({
    queryKey: ["cms", "companies"],
    queryFn: () => listRows("companies"),
  });

  const label = (raw: unknown, fallback: string) => {
    const v = (raw ?? {}) as Record<string, string>;
    return v[locale] || v["en"] || v["ar"] || fallback;
  };

  return {
    sectors: (sectors.data ?? []).map((s) => ({
      value: s.id,
      label: label(s["name"], String(s["slug"] ?? "")),
    })),
    companies: (companies.data ?? []).map((c) => ({
      value: c.id,
      label: label(c["name"], String(c["slug"] ?? "")),
    })),
  };
}
