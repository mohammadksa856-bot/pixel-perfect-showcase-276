/**
 * WEB-08B06 / B06-0 — R05 وR05-A: سجل التتبع إلحاقي، ووقت commit بيانات وصفية قابلة للتغيير لا دليل زمني.
 * لا يُستنتج ترتيب زمني للأحداث من مقارنة الطوابع، في أي اتجاه.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- audit output is untyped JSON */
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = fileURLToPath(new URL("../", import.meta.url));
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const AUDITED = "17b870cf4e1bf6fc8ff4d0afb9f9d3b5b675fb26";
const PREVIOUS_DELIVERY = "c054ff78dd117226336512289f6fc064a7659ea3";
const LAST_DELIVERY = "cc5c92c8e3197c01880041c024c7584844d7d664";
const corrections = JSON.parse(readFileSync(join(DIR, "TRACKING-EVENT-CORRECTIONS.json"), "utf8"));
const sh = (cmd: string[], cwd: string, env: Record<string, string> = {}) => {
  const r = Bun.spawnSync(cmd, { cwd, env: { ...process.env, ...env } });
  if (r.exitCode !== 0) throw Error(`${cmd.join(" ")}: ${r.stderr.toString()}`);
  return r.stdout;
};
/** Keys that would assert a chronology or treat a git timestamp as proof. */
const CHRONOLOGY_KEY =
  /bound|not_later|not_earlier|before|after|occurred|happened|provabl|proof|true_time/i;
const keys = (o: any): string[] =>
  o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => [k, ...keys(v)]) : [];

describe("R05 history is append-only", () => {
  const head = readFileSync(join(ROOT, "product-tracking/CHANGELOG.jsonl"));
  test("events up to the audited and the previous delivery are preserved byte for byte", () => {
    for (const c of [AUDITED, PREVIOUS_DELIVERY, LAST_DELIVERY]) {
      const prev = sh(["git", "show", `${c}:product-tracking/CHANGELOG.jsonl`], ROOT);
      expect({ c, prefix: head.subarray(0, prev.length).equals(Buffer.from(prev)) }).toEqual({
        c,
        prefix: true,
      });
    }
  });
  test("appended events carry recorded_at and a declared time source; the amendment cites the withdrawn wording", () => {
    const prev = sh(["git", "show", `${AUDITED}:product-tracking/CHANGELOG.jsonl`], ROOT);
    const added = head
      .subarray(prev.length)
      .toString()
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    for (const e of added) {
      expect(e.time_source).toBe("system clock (date -u) at authoring");
      expect(e.ts).toBe(e.recorded_at);
    }
    const amend = added.find((e) => e.event === "tracking_correction_amendment");
    expect(amend).toBeDefined();
    expect(amend.amends_line).toBe(217);
    expect(amend.result).toMatch(/not a trusted timestamp/);
  });
});

describe("R05-A audit wording and structure", () => {
  test("git commit timestamps are labelled observed metadata; no chronology is asserted", () => {
    expect(corrections.schema).toBe("marefa-web08b06-tracking-corrections/2");
    expect(keys(corrections).filter((k) => CHRONOLOGY_KEY.test(k))).toEqual([]);
    expect(corrections.evidence_status.git_commit_timestamp_observed).toMatch(
      /mutable metadata.*not a trusted timestamp/,
    );
    expect(corrections.evidence_status.event_time).toMatch(/^NOT_ESTABLISHED/);
    expect(corrections.counts).toEqual({
      ts_later_than_git_commit_timestamp: 165,
      of_which_difference_over_24h: 27,
      ts_equal_or_earlier_than_git_commit_timestamp: 50,
      ts_missing_or_unparseable: 0,
    });
  });
  test("each listed inconsistency points at an unchanged original line", () => {
    const prev = sh(["git", "show", `${AUDITED}:product-tracking/CHANGELOG.jsonl`], ROOT);
    expect(corrections.audited_file_sha256).toBe(createHash("sha256").update(prev).digest("hex"));
    const lines = prev.toString().split("\n");
    for (const a of corrections.inconsistencies) {
      const text = lines[a.line - 1];
      expect(createHash("sha256").update(text).digest("hex")).toBe(a.line_sha256);
      expect(JSON.parse(text).ts).toBe(a.ts_as_written);
      expect(a.event_time).toBe("NOT_ESTABLISHED");
      expect(a.field_relation).toBe("ts_later_than_git_commit_timestamp");
    }
  });
  test("no document in the package presents a commit time as a bound on event time", () => {
    const md = readdirSync(DIR).filter((f) => f.endsWith(".md"));
    for (const f of md) {
      const t = readFileSync(join(DIR, f), "utf8");
      expect({
        f,
        hit: /event_time_not_later_than|حدًّا أعلى|provable upper bound/.test(t),
      }).toEqual({ f, hit: false });
    }
  });
});

describe("R05-A audit on crafted git histories", () => {
  const AUDIT = join(DIR, "tools/tracking_audit.py");
  const make = () => {
    const d = mkdtempSync(join(tmpdir(), "b06-ts-"));
    sh(["git", "init", "-q"], d);
    return d;
  };
  const ident = {
    GIT_AUTHOR_NAME: "audit-test",
    GIT_AUTHOR_EMAIL: "audit-test",
    GIT_COMMITTER_NAME: "audit-test",
    GIT_COMMITTER_EMAIL: "audit-test",
  };
  const commit = (d: string, lines: string[], when: string, amend = false) => {
    writeFileSync(join(d, "log.jsonl"), lines.join("\n") + "\n");
    sh(["git", "add", "log.jsonl"], d);
    sh(["git", "commit", "-q", ...(amend ? ["--amend", "--no-edit"] : ["-m", "c"])], d, {
      ...ident,
      GIT_AUTHOR_DATE: when,
      GIT_COMMITTER_DATE: when,
    });
    return sh(["git", "rev-parse", "HEAD"], d).toString().trim();
  };
  const audit = (d: string, c: string) => {
    const out = join(d, "out.json");
    sh(["python3", AUDIT, d, c, "log.jsonl", out], d);
    return JSON.parse(readFileSync(out, "utf8"));
  };
  const ev = (ts: string) => JSON.stringify({ ts, task: "T", event: "e" });

  test("future commit timestamp: fields consistent, chronology still not established", () => {
    const d = make();
    const c = commit(d, [ev("2030-01-01T00:00:00Z")], "2045-01-01T00:00:00Z");
    const a = audit(d, c);
    expect(a.counts.ts_later_than_git_commit_timestamp).toBe(0);
    expect(a.counts.ts_equal_or_earlier_than_git_commit_timestamp).toBe(1);
    expect(a.evidence_status.event_time).toMatch(/^NOT_ESTABLISHED/);
    expect(keys(a).filter((k) => CHRONOLOGY_KEY.test(k))).toEqual([]);
  });
  test("commit timestamp older than real time: inconsistency reported, no claim the event followed the commit", () => {
    const d = make();
    const c = commit(d, [ev("2030-06-01T00:00:00Z")], "2000-01-01T00:00:00Z");
    const a = audit(d, c);
    expect(a.counts.ts_later_than_git_commit_timestamp).toBe(1);
    expect(a.inconsistencies[0]).toMatchObject({
      event_time: "NOT_ESTABLISHED",
      git_commit_timestamp_observed: "2000-01-01T00:00:00Z",
    });
    expect(keys(a).filter((k) => CHRONOLOGY_KEY.test(k))).toEqual([]);
  });
  test("amended commit: the same unchanged line flips classification, showing the timestamp is mutable metadata", () => {
    const d = make();
    const lines = [ev("2030-07-01T00:00:00Z")];
    const before = audit(d, commit(d, lines, "2030-06-01T00:00:00Z"));
    const after = audit(d, commit(d, lines, "2030-07-02T00:00:00Z", true));
    expect(before.counts.ts_later_than_git_commit_timestamp).toBe(1);
    expect(after.counts.ts_later_than_git_commit_timestamp).toBe(0);
    for (const a of [before, after]) {
      expect(a.evidence_status.git_commit_timestamp_observed).toMatch(/amend/);
      expect(keys(a).filter((k) => CHRONOLOGY_KEY.test(k))).toEqual([]);
    }
  });
  test("missing or malformed ts is counted, not guessed", () => {
    const d = make();
    const a = audit(
      d,
      commit(d, [JSON.stringify({ task: "T" }), ev("18 Oct 2026")], "2030-01-01T00:00:00Z"),
    );
    expect(a.counts.ts_missing_or_unparseable).toBe(2);
    expect(a.inconsistencies).toEqual([]);
  });
});

describe("tracking files contain no personal data", () => {
  test("crafted identities and outputs stay out of the package", () => {
    for (const f of readdirSync(DIR))
      if (statSync(join(DIR, f)).isFile())
        expect(readFileSync(join(DIR, f), "utf8")).not.toMatch(/audit-test@/);
  });
});
