import { supabase } from "@/integrations/supabase/client";
import { getSectors } from "@/lib/content";
import type { Sector } from "@/data/types";

export type SectorStats = {
  sector: Sector;
  companiesCount: number | null;
  researchCount: number | null;
};

export type SectorDirectory = {
  stats: SectorStats[];
  status: "available" | "partial" | "unavailable";
};

// Read membership, not company profiles or research bodies. Exact counts also
// detect a truncated page or a changing total; partial counts are never published.
async function membershipCounts(table: "companies" | "research") {
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  const pageSize = 500;
  let expected: number | undefined;
  let offset = 0;
  do {
    const { data, error, count } = await supabase
      .from(table)
      .select("id, sectors(slug)", { count: "exact" })
      .eq("published", true)
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (
      !Array.isArray(data) ||
      count === null ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      (expected !== undefined && count !== expected)
    ) {
      throw new Error("SECTOR_MEMBERSHIP_INCOMPLETE");
    }
    expected = count;
    if ((data.length === 0 && offset < count) || offset + data.length > count) {
      throw new Error("SECTOR_MEMBERSHIP_INCOMPLETE");
    }
    for (const row of data) {
      if (typeof row.id !== "string" || !row.id || seen.has(row.id)) {
        throw new Error("SECTOR_MEMBERSHIP_INVALID");
      }
      seen.add(row.id);
      if (row.sectors === null) continue;
      if (!row.sectors || typeof row.sectors.slug !== "string" || !row.sectors.slug) {
        throw new Error("SECTOR_MEMBERSHIP_INVALID");
      }
      counts.set(row.sectors.slug, (counts.get(row.sectors.slug) ?? 0) + 1);
    }
    offset += data.length;
  } while (offset < expected);
  return counts;
}

export async function getSectorDirectory(): Promise<SectorDirectory> {
  let sectors: Sector[];
  try {
    sectors = await getSectors();
  } catch {
    return { stats: [], status: "unavailable" };
  }
  if (!sectors.length) return { stats: [], status: "available" };
  const [companies, research] = await Promise.allSettled([
    membershipCounts("companies"),
    membershipCounts("research"),
  ]);
  return {
    status:
      companies.status === "fulfilled" && research.status === "fulfilled" ? "available" : "partial",
    stats: sectors.map((sector) => ({
      sector,
      companiesCount:
        companies.status === "fulfilled" ? (companies.value.get(sector.slug) ?? 0) : null,
      researchCount:
        research.status === "fulfilled" ? (research.value.get(sector.slug) ?? 0) : null,
    })),
  };
}
