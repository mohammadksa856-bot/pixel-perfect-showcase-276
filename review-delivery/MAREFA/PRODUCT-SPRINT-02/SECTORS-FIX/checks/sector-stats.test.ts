import { beforeEach, expect, mock, test } from "bun:test";

type Row = { id: string; sectors: { slug: string } | null };
let companies: Row[];
let research: Row[];
let failed = "";
let truncate = false;
let malformed = false;
let noSectors = false;
const calls: { table: string; columns: string; from?: number; to?: number }[] = [];
mock.module("../../../../../src/integrations/supabase/client", () => ({
  supabase: {
    from(table: string) {
      const call = { table, columns: "" } as (typeof calls)[number];
      calls.push(call);
      const query = {
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve({
            data: null,
            error: { code: "57014", message: "canceling statement due to statement timeout" },
          }).then(resolve);
        },
        select(columns: string) {
          call.columns = columns;
          return query;
        },
        eq(key: string, value: unknown) {
          expect([key, value]).toEqual(["published", true]);
          return query;
        },
        order(key: string) {
          if (table === "sectors") {
            if (failed === table) return Promise.resolve({ error: { code: "57014" }, data: null });
            return Promise.resolve({
              error: null,
              data: noSectors
                ? []
                : ["energy", "banks", "empty"].map((slug) => ({
                    slug,
                    name: { ar: slug, en: slug },
                    tagline: {},
                    description: {},
                    icon: "",
                    tone: "",
                  })),
            });
          }
          if (call.columns === "id, sectors(slug)") expect(key).toBe("id");
          return query;
        },
        async range(from: number, to: number) {
          call.from = from;
          call.to = to;
          if (table === failed)
            return {
              error: { code: "57014", message: "canceling statement due to statement timeout" },
              data: null,
              count: null,
            };
          // Model the actual failure trigger: a broad profile select is not safe.
          if (call.columns !== "id, sectors(slug)")
            return { error: { code: "57014" }, data: null, count: null };
          const rows = table === "companies" ? companies : research;
          return {
            error: null,
            data: malformed
              ? [{ id: "bad", sectors: [] }]
              : truncate
                ? []
                : rows.slice(from, to + 1),
            count: rows.length,
          };
        },
      };
      return query;
    },
  },
}));
const { getSectorDirectory } = await import("../../../../../src/lib/sector-stats");
const { getCompanies, getResearch, getSectors } = await import("../../../../../src/lib/content");
beforeEach(() => {
  calls.length = 0;
  failed = "";
  truncate = false;
  malformed = false;
  noSectors = false;
  companies = [
    { id: "a", sectors: { slug: "energy" } },
    { id: "b", sectors: { slug: "banks" } },
    { id: "c", sectors: { slug: "energy" } },
    { id: "d", sectors: null },
  ];
  research = [{ id: "r", sectors: { slug: "energy" } }];
});
test("three narrow requests preserve counts and empty sectors without financial profiles", async () => {
  const result = await getSectorDirectory();
  expect(result.status).toBe("available");
  expect(result.stats.map((s) => [s.companiesCount, s.researchCount])).toEqual([
    [2, 1],
    [1, 0],
    [0, 0],
  ]);
  expect(calls).toHaveLength(3);
  expect(calls.slice(1).map((c) => c.columns)).toEqual(["id, sectors(slug)", "id, sectors(slug)"]);
  expect(JSON.stringify(result)).not.toMatch(/financials|price|valuation|avgChange/);
});
test("old per-sector full-profile algorithm reproduces timeout, replacement succeeds on the same source", async () => {
  const sectors = await getSectors();
  const legacy = Promise.all(
    sectors.map(async (s) => {
      const [c, r] = await Promise.all([
        getCompanies({ sectorSlug: s.slug }),
        getResearch({ sectorSlug: s.slug }),
      ]);
      return [c.length, r.length];
    }),
  );
  await expect(legacy).rejects.toMatchObject({ code: "57014" });
  expect(
    calls.filter((c) => c.table === "companies").every((c) => c.columns.includes("financials")),
  ).toBe(true);
  calls.length = 0;
  expect((await getSectorDirectory()).stats[0].companiesCount).toBe(2);
  expect(calls).toHaveLength(3);
});
test("more than 1000 memberships are paginated without silent truncation", async () => {
  companies = Array.from({ length: 1201 }, (_, i) => ({
    id: String(i),
    sectors: { slug: "energy" },
  }));
  const result = await getSectorDirectory();
  expect(result.stats[0].companiesCount).toBe(1201);
  expect(calls.filter((c) => c.table === "companies").map((c) => [c.from, c.to])).toEqual([
    [0, 499],
    [500, 999],
    [1000, 1499],
  ]);
});
test("statement timeout produces unavailable counts, not fake zero or stale counts", async () => {
  await getSectorDirectory();
  failed = "companies";
  const result = await getSectorDirectory();
  expect(result.status).toBe("partial");
  expect(result.stats.every((s) => s.companiesCount === null)).toBe(true);
  expect(result.stats[0].researchCount).toBe(1);
  expect(JSON.stringify(result)).not.toContain("57014");
});
test("research failure does not invent research counts", async () => {
  failed = "research";
  const result = await getSectorDirectory();
  expect(result.stats[0].companiesCount).toBe(2);
  expect(result.stats.every((s) => s.researchCount === null)).toBe(true);
});
test("sector failure returns an explicit unavailable directory", async () => {
  failed = "sectors";
  expect(await getSectorDirectory()).toEqual({ stats: [], status: "unavailable" });
  expect(calls).toHaveLength(1);
});
test("a truly empty directory is not a source failure", async () => {
  noSectors = true;
  expect(await getSectorDirectory()).toEqual({ stats: [], status: "available" });
  expect(calls).toHaveLength(1);
});
test("truncated pages are not accepted as complete counts", async () => {
  truncate = true;
  expect((await getSectorDirectory()).status).toBe("partial");
});
test("duplicate identities cannot inflate counts", async () => {
  companies.push(companies[0]);
  expect((await getSectorDirectory()).stats[0].companiesCount).toBeNull();
});
test("malformed relationships fail closed instead of becoming empty sectors", async () => {
  malformed = true;
  const result = await getSectorDirectory();
  expect(result.status).toBe("partial");
  expect(result.stats.every((s) => s.companiesCount === null && s.researchCount === null)).toBe(
    true,
  );
});
