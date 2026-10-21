// Metadata only. Never persist company/research bodies, URLs with credentials,
// headers, or financial values. One narrow read; no retries or database writes.
const nativeFetch = globalThis.fetch;
const requests: {
  table: string;
  status: number;
  bytes: number;
  milliseconds: number;
  columns: string | null;
}[] = [];
globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
  const url = new URL(String(args[0]));
  const start = Date.now();
  const response = await nativeFetch(...args);
  if (url.pathname.includes("/rest/v1/")) {
    const body = await response.clone().text();
    requests.push({
      table: url.pathname.split("/").at(-1)!,
      status: response.status,
      bytes: Buffer.byteLength(body),
      milliseconds: Date.now() - start,
      columns: url.searchParams.get("select"),
    });
  }
  return response;
}) as typeof fetch;
const { getSectorDirectory } = await import("../../../../../src/lib/sector-stats");
const start = Date.now();
const result = await getSectorDirectory();
console.log(
  JSON.stringify(
    {
      status: result.status,
      milliseconds: Date.now() - start,
      sectors: result.stats.length,
      companyMemberships: result.stats.reduce((n, s) => n + (s.companiesCount ?? 0), 0),
      researchMemberships: result.stats.reduce((n, s) => n + (s.researchCount ?? 0), 0),
      emptySectors: result.stats.filter((s) => s.companiesCount === 0 && s.researchCount === 0)
        .length,
      requests,
      bytes: requests.reduce((n, r) => n + r.bytes, 0),
    },
    null,
    2,
  ),
);
if (result.status !== "available" || requests.some((r) => r.status !== 200)) process.exitCode = 1;
