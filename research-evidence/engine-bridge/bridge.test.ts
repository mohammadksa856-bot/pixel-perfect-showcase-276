import { describe, expect, test } from "bun:test";
import { bridgeEngineEvidence, type BridgeInput } from "./bridge";
import { syntheticBridge } from "./synthetic";
import { evaluate, canonical } from "../v1/contract";
import { fixture, reviewedFixture } from "../v1/synthetic";

const row = (x: BridgeInput) => x.rows[0]!;
const source = (x: BridgeInput) =>
  (row(x)["provenance"] as { source: Record<string, unknown> }).source;
function rejects(x: BridgeInput, code: string) {
  const result = bridgeEngineEvidence(x);
  expect(result.state).toBe("BLOCKED");
  expect(result.context).toBeNull();
  expect(result.issues.map((i) => i.code)).toContain(code);
  expect(result.publicationAuthorized).toBe(false);
}

test("synthetic exact metadata maps into accepted B01, not a release", () => {
  const x = syntheticBridge();
  const result = bridgeEngineEvidence(x);
  expect(result.state).toBe("MAPPED_FOR_CONTRACT_EVALUATION");
  expect(result.context).toEqual(x.context);
  const verdict = evaluate(fixture().claim, result.context);
  expect(verdict.technical).toBe("eligible");
  expect(verdict.publication).toBe("blocked"); // no review events
  expect(result.publicationAuthorized).toBe(false);
  expect(result.liveIntegrationApproved).toBe(false);
});

describe("exact identity, no interpretation or first-match repair", () => {
  const mutations: [string, (x: BridgeInput) => void, string][] = [
    [
      "missing stable ID",
      (x) => {
        delete row(x)["fact_id"];
      },
      "stable_fact_reference_missing_or_invalid",
    ],
    [
      "integer database ID is not global fact reference",
      (x) => {
        row(x)["fact_id"] = 42;
      },
      "stable_fact_reference_missing_or_invalid",
    ],
    [
      "different revision",
      (x) => {
        row(x)["version"] = 2;
      },
      "fact_revision_not_resolved",
    ],
    [
      "different hash",
      (x) => {
        row(x)["fact_sha256"] = "c".repeat(64);
      },
      "fact_revision_not_resolved",
    ],
    [
      "wrong value digest",
      (x) => {
        row(x)["value_digest"] = "a".repeat(64);
      },
      "value_revision_digest_mismatch",
    ],
    [
      "issuer",
      (x) => {
        row(x)["company_id"] = "TEST:OTHER";
      },
      "full_identity_mismatch",
    ],
    [
      "same end annual versus quarter",
      (x) => {
        row(x)["period_kind"] = "quarter";
        row(x)["fiscal_quarter"] = 4;
      },
      "full_identity_mismatch",
    ],
    [
      "YTD versus standalone",
      (x) => {
        row(x)["period_kind"] = "ytd";
      },
      "full_identity_mismatch",
    ],
    [
      "different period start",
      (x) => {
        row(x)["period_start"] = "2025-10-01";
      },
      "full_identity_mismatch",
    ],
    [
      "different unit",
      (x) => {
        row(x)["unit"] = "USD";
      },
      "full_identity_mismatch",
    ],
    [
      "different currency",
      (x) => {
        row(x)["currency"] = "USD";
      },
      "full_identity_mismatch",
    ],
    [
      "scope",
      (x) => {
        row(x)["scope"] = "standalone";
      },
      "full_identity_mismatch",
    ],
    [
      "dimensions",
      (x) => {
        row(x)["dimensions"] = { segment: "synthetic" };
      },
      "full_identity_mismatch",
    ],
    [
      "empty period start is not invented",
      (x) => {
        row(x)["period_start"] = "";
      },
      "full_identity_mismatch",
    ],
    [
      "document ID",
      (x) => {
        delete source(x)["document_id"];
      },
      "document_revision_not_resolved",
    ],
    [
      "document version",
      (x) => {
        source(x)["document_version"] = 2;
      },
      "document_revision_not_resolved",
    ],
    [
      "content hash not artifact proof",
      (x) => {
        source(x)["content_hash"] = source(x)["artifact_sha256"];
        delete source(x)["artifact_sha256"];
      },
      "document_revision_not_resolved",
    ],
    [
      "source URL",
      (x) => {
        source(x)["source_url"] = "https://other.example.invalid";
      },
      "source_url_mismatch",
    ],
    [
      "date precision",
      (x) => {
        source(x)["published_at"] = "2026-03-01";
      },
      "publication_timestamp_mismatch",
    ],
    [
      "locator",
      (x) => {
        source(x)["page"] = 2;
      },
      "source_locator_mismatch",
    ],
    [
      "hidden source",
      (x) => {
        source(x)["accepted_for_display"] = false;
      },
      "engine_quality_not_eligible",
    ],
    [
      "no positive quality assessment",
      (x) => {
        delete row(x)["quality_status"];
      },
      "engine_quality_not_eligible",
    ],
    [
      "withheld fact",
      (x) => {
        x.context.facts[0]!.availability = "withheld";
      },
      "fact_withheld_or_ineligible",
    ],
    [
      "rejected finance",
      (x) => {
        x.context.facts[0]!.financial = "rejected";
      },
      "financial_input_rejected",
    ],
    [
      "derived without lineage",
      (x) => {
        row(x)["is_calculated"] = true;
      },
      "derivation_status_mismatch",
    ],
    [
      "artifact not verified",
      (x) => {
        x.context.documents[0]!.originalArtifactVerified = false;
      },
      "original_document_evidence_unproven",
    ],
  ];
  for (const [name, mutate, code] of mutations)
    test(name, () => {
      const x = syntheticBridge();
      mutate(x);
      rejects(x, code);
    });
});

test("duplicate revision is not chosen by order", () => {
  const x = syntheticBridge();
  x.rows.push(structuredClone(row(x)));
  rejects(x, "duplicate_fact_revision_row");
});
test("contradicting sources block in either order even when second not requested", () => {
  for (const reverse of [false, true]) {
    const x = syntheticBridge(),
      other = structuredClone(x.context.facts[0]!);
    other.ref = { ...other.ref, id: "synthetic-other" };
    other.valueDigest = "d".repeat(64);
    x.context.facts.push(other);
    if (reverse) x.context.facts.reverse();
    rejects(x, "source_conflict");
  }
});
test("known superseding withheld fact prevents stale fallback", () => {
  const x = syntheticBridge(),
    next = structuredClone(x.context.facts[0]!);
  next.supersedes = next.ref;
  next.ref = { ...next.ref, version: 2 };
  next.availability = "withheld";
  x.context.facts.push(next);
  rejects(x, "fact_superseded_asof");
});
test("known superseding document prevents old link", () => {
  const x = syntheticBridge(),
    next = structuredClone(x.context.documents[0]!);
  next.supersedes = next.evidence.document;
  next.evidence.document = { ...next.evidence.document, version: 2 };
  x.context.documents.push(next);
  rejects(x, "document_superseded_asof");
});
test("later source does not leak backward into as-of snapshot", () => {
  const x = syntheticBridge(),
    next = structuredClone(x.context.facts[0]!);
  next.supersedes = next.ref;
  next.ref = { ...next.ref, version: 2 };
  next.evidence.publishedAt = "2026-03-03T00:00:00.000Z";
  next.valueDigest = "d".repeat(64);
  x.context.facts.push(next);
  const result = bridgeEngineEvidence(x);
  expect(result.state).toBe("MAPPED_FOR_CONTRACT_EVALUATION");
  expect(result.context!.facts).toHaveLength(1);
  expect(result.context!.facts[0]!.ref.version).toBe(1);
});
test("current-only export is insufficient for historical claim", () => {
  const x = syntheticBridge();
  x.knowledgeCompleteThrough = "2026-03-01T00:00:00.000Z";
  rejects(x, "asof_history_completeness_unproven");
});
test("export from future evaluation fails", () => {
  const x = syntheticBridge();
  x.exportedAt = "2026-03-06T00:00:00.000Z";
  rejects(x, "snapshot_time_invalid");
});
test("withdrawal blocks even older analysis", () => {
  const x = syntheticBridge();
  x.sourceWithdrawals.push({
    document: x.context.documents[0]!.evidence.document,
    withdrawnAt: "2026-03-04T00:00:00.000Z",
    observedAt: "2026-03-04T00:00:00.000Z",
  });
  rejects(x, "source_withdrawn");
});
test("unproven withdrawal observation time fails closed", () => {
  const x = syntheticBridge();
  x.sourceWithdrawals.push({
    document: x.context.documents[0]!.evidence.document,
    withdrawnAt: "2026-03-04T00:00:00.000Z",
    observedAt: "2026-03-06T00:00:00.000Z",
  });
  rejects(x, "withdrawal_time_invalid");
});
test("user permission does not mint grant; missing grant remains separate B01 gate", () => {
  const x = syntheticBridge();
  x.context.grants = [];
  const result = bridgeEngineEvidence(x);
  expect(result.state).toBe("MAPPED_FOR_CONTRACT_EVALUATION");
  const verdict = evaluate(fixture().claim, result.context);
  expect(verdict.rights).toBe("blocked");
  expect(verdict.publication).toBe("blocked");
});
test("financial review not inferred from extraction or mapping", () => {
  const x = syntheticBridge();
  x.context.facts[0]!.financial = "unreviewed";
  x.context.facts[0]!.verification = null;
  const result = bridgeEngineEvidence(x);
  expect(result.state).toBe("MAPPED_FOR_CONTRACT_EVALUATION");
  expect(evaluate(fixture().claim, result.context).reasons).toContain(
    "financial_input_verification_required",
  );
});
test("existing reviewed synthetic B01 claim still evaluated by original ledger", () => {
  const x = syntheticBridge(),
    reviewed = reviewedFixture();
  x.context = reviewed.context;
  const result = bridgeEngineEvidence(x);
  expect(evaluate(reviewed.claim, result.context).publication).toBe("eligible");
  expect(result.publicationAuthorized).toBe(false); // prototype itself cannot release
});
test("missing derived operand is not reconstructed", () => {
  const x = syntheticBridge();
  row(x)["is_calculated"] = true;
  x.context.facts[0]!.lineage = {
    methodId: "SYNTHETIC",
    version: "1",
    status: "reproduced",
    inputs: [{ id: "missing", version: 1, sha256: "a".repeat(64) }],
  };
  rejects(x, "derived_input_reference_unresolved_or_withheld");
});
test("no mutation, determinism, no values in diagnostic or mapped metadata", () => {
  const x = syntheticBridge();
  row(x)["value"] = "SYNTHETIC_NUMBER_DO_NOT_EMIT";
  const before = canonical(x),
    first = bridgeEngineEvidence(x),
    second = bridgeEngineEvidence(x);
  expect(canonical(x)).toBe(before);
  expect(first).toEqual(second);
  expect(JSON.stringify(first)).not.toContain("SYNTHETIC_NUMBER_DO_NOT_EMIT");
  expect(JSON.stringify(first)).not.toContain('"value":');
  delete row(x)["fact_id"];
  expect(JSON.stringify(bridgeEngineEvidence(x))).not.toContain("SYNTHETIC_NUMBER_DO_NOT_EMIT");
});
test("unknown bridge properties cannot smuggle publication approval", () => {
  const x = { ...syntheticBridge(), publicationAuthorized: true };
  expect(bridgeEngineEvidence(x).issues[0]!.code).toBe("bridge_contract_invalid");
});
