// CI checks of the dormant ARAMCO95 financial projection kernel (workflow aramco95-kernel.yml).
// Usage: bun .github/scripts/aramco95-kernel-checks.ts <pins|trust|scan>
//   pins  - the sha-pinned files are LF on this checkout and hash to the values pinned in the baseline and here.
//   trust - the publication trust store has no authority, so no publication decision can verify.
//   scan  - the synthetic test data carries no secret, private record or real-looking value, source or issuer.
// Every check prints one PASS/FAIL line; the process exits non-zero if any fails.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const FIXTURES = ["9901", "9902", "9903"].map(
  (s) => `tests/fixtures/synthetic-projection/${s}-page.json`,
);
const BASELINE = "src/lib/engine/publication-baseline.json";
const TRUST = "src/lib/engine/publication-trust.json";
const GENERATOR = "tests/fixtures/synthetic-projection/generate.ts";
const TEST = "tests/financial-projection.test.ts";
// Pinned at the accepted candidate c43f6ba. Changing test data means changing these in the same reviewed commit.
const PINNED: Record<string, string> = {
  [FIXTURES[0]]: "7a3a5f9606d2b9d3052f57f2c682e811eecf391674e87ad7551242bff52ce093",
  [FIXTURES[1]]: "323e4d242d88d71497757e70a12714f69f1110eaaa6341edd076291fe6c66c81",
  [FIXTURES[2]]: "0a48c331b72503b3bee65fdaa48e997a868d05f966ff3cad5f65040ac28f9302",
  [BASELINE]: "a2ed6c7ed36cf554755ab4770060a555ee593cdbc00b149e6583e14c56caea65",
};
const SECRETS: [string, RegExp][] = [
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["JWT", /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./],
  ["OpenAI-style key", /\bsk-[A-Za-z0-9]{20,}/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ["Supabase service role", /service_role/],
  ["Vercel token or env", /VERCEL_(TOKEN|OIDC)|vercel_blob_rw_/i],
  ["embedded PDF", /%PDF-/],
  [
    "private T1 record",
    /T1-SOURCE-REVIEW-RECEIPT|T1-AUTHORIZATION\.json|T1-INDEPENDENT-SOURCE-REVIEW/,
  ],
  ["QB3/QB4 record", /\bQB[34]\b/],
];

const results: [string, boolean, string?][] = [];
const check = (name: string, ok: boolean, detail?: string) => results.push([name, ok, detail]);
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

function pins() {
  for (const path of [...FIXTURES, BASELINE]) {
    check(`${path} has no CR byte`, !readFileSync(path).includes(13));
    const got = sha256(path);
    check(`${path} sha256 = pinned`, got === PINNED[path], got);
  }
  const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
  FIXTURES.forEach((path, i) => {
    const symbol = ["9901", "9902", "9903"][i];
    check(
      `baseline pins ${symbol} to the checked-out fixture`,
      baseline.fixtures?.[symbol] === sha256(path),
    );
  });
}

function trust() {
  const store = JSON.parse(readFileSync(TRUST, "utf8"));
  check(
    "trust store schema is marefa-publication-trust/1",
    store.schema === "marefa-publication-trust/1",
  );
  check(
    "trust store authorities is an empty array",
    Array.isArray(store.authorities) && store.authorities.length === 0,
  );
  check(
    "trust store carries no key material",
    !/[A-Za-z0-9+/]{40,}={0,2}|-----BEGIN/.test(JSON.stringify(store)),
  );
}

function scan() {
  const files = [...FIXTURES, BASELINE, GENERATOR, TEST, TRUST];
  for (const path of files) {
    const text = readFileSync(path, "utf8");
    const hits = SECRETS.filter(([, re]) => re.test(text)).map(([n]) => n);
    check(`${path}: no secret or private record`, hits.length === 0, hits.join(", "));
    const hosts = [...new Set([...text.matchAll(/https?:\/\/([^/\s"'`]+)/g)].map((m) => m[1]))];
    // The test points the kernel at stub engines; both hosts are unresolvable (reserved .test TLD, single label).
    const allowed = path === TEST ? ["example.invalid", "engine.test", "e"] : ["example.invalid"];
    check(
      `${path}: URLs only on reserved hosts`,
      hosts.every((h) => allowed.includes(h)),
      hosts.join(", "),
    );
  }
  for (const path of FIXTURES) {
    const page = JSON.parse(readFileSync(path, "utf8"));
    const values = new Set<string>();
    const names = new Set<string>();
    const walk = (x: unknown, key?: string) => {
      if (Array.isArray(x)) x.forEach((v) => walk(v, key));
      else if (x && typeof x === "object") Object.entries(x).forEach(([k, v]) => walk(v, k));
      else if (key === "value" && x !== null) values.add(String(x));
      else if ((key === "name" || key === "legal_name") && typeof x === "string") names.add(x);
    };
    walk(page);
    // Synthetic amounts are 4242… markers; ratios and per-share figures are 0.42… / 4.21… markers.
    const real = [...values].filter((v) => !/^-?(4242\d*|0\.42\d+|4\.21\d+)$/.test(v));
    check(
      `${path}: every value is a synthetic marker`,
      values.size > 0 && real.length === 0,
      real.slice(0, 5).join(", "),
    );
    check(
      `${path}: issuer is a synthetic SA 99xx symbol`,
      /^sa:990[123]$/.test(page.company?.company_id ?? ""),
    );
    const realNames = [...names].filter((n) => !/Synthetic/.test(n));
    check(
      `${path}: every name says Synthetic`,
      realNames.length === 0,
      realNames.slice(0, 5).join(", "),
    );
    check(`${path}: no ISIN`, page.company?.isin === null);
  }
  const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
  check(
    "baseline holds hashes only, no values",
    baseline.keys.every((k: string) => /^[0-9a-f]{64}$/.test(k)) &&
      !/"value"\s*:/.test(readFileSync(BASELINE, "utf8")),
  );
}

const mode = process.argv[2];
const run = { pins, trust, scan }[mode as "pins" | "trust" | "scan"];
if (!run) {
  console.error("usage: aramco95-kernel-checks.ts <pins|trust|scan>");
  process.exit(2);
}
run();
for (const [name, ok, detail] of results)
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${!ok && detail ? ` (${detail})` : ""}`);
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
