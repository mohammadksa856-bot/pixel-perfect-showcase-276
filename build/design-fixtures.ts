import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import type { Plugin } from "vite";
import { designReviewFixturesEnabled } from "../src/lib/web-v1/design-review-policy";

const SHA: Record<string, string> = {
  "2222": "e98863c41faf85069a4562b0d330a77f49863979bc3fb78502912ced5d95c936",
  "1120": "39c5373abf96399e2e4c23c3728b78c9c2179520544d1053fd6dddface1f0606",
  "8010": "c0652cc6da3142745513d1acd959753724a9ce0f7a4674e3f37b81df3378108a",
};

/** Bundle existing, documented test fixtures into server code, never public static assets. */
export function designFixturePlugin(env = process.env): Plugin {
  const id = "virtual:marefa-design-fixtures";
  return {
    name: "marefa-branch-scoped-design-fixtures",
    resolveId(source) {
      return source === id ? "\0" + id : undefined;
    },
    load(source) {
      if (source !== "\0" + id) return;
      const pages: Record<string, unknown> = {};
      if (designReviewFixturesEnabled(env)) {
        for (const [symbol, sha] of Object.entries(SHA)) {
          const raw = gunzipSync(
            readFileSync(
              new URL(`../tests/fixtures/codex-20261013/${symbol}-page.json.gz`, import.meta.url),
            ),
          );
          if (createHash("sha256").update(raw).digest("hex") !== sha)
            throw new Error(`Design fixture fingerprint mismatch: ${symbol}`);
          pages[symbol] = JSON.parse(raw.toString("utf8"));
        }
      }
      return `export default ${JSON.stringify(pages)};`;
    },
  };
}
