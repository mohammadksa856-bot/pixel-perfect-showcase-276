"""PEER-CANDIDATES.json (R03), DECISION-REGISTER.json, TRACKING-EVENT-CORRECTIONS.json (R05)."""
import json, sys, subprocess, hashlib, datetime, re

outdir = sys.argv[1]
def dump(name, obj):
    with open(f"{outdir}/{name}", "w") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1); f.write("\n")

CODEX_IDX = "Codex review 30fc720 (not accessible from this environment) reports nine SEC filing indices and iXBRL observed within its check; this does not establish Company Facts completeness or availability of every concept needed (R03)."

def peer(id, name, tier, listing, ownership, control, segments, integration, basis, filing, sec_url, rationale, differences, fiscal=None):
    return {
        "id": id, "name": name, "tier_proposed": tier,
        "status": "CANDIDATE_PENDING_OWNER_DECISION", "approved": False,
        "listing": listing,
        "ownership": ownership, "control": control,
        "relationship_to_aramco": {"type": "NONE_IDENTIFIED", "evidence": "UNVERIFIED"},
        "segments_reported": segments, "integration": integration, "accounting": basis,
        "filing": filing,
        "data_availability": {"latest_filing_url": sec_url, "period": "FY2025" if sec_url else None,
                              "version": (re.search(r"/(\d{18})/", sec_url).group(1) if sec_url and re.search(r"/(\d{18})/", sec_url) else None),
                              "filing_index_evidence": CODEX_IDX if sec_url else "NO_SEC_ROUTE_IDENTIFIED",
                              "company_facts_completeness": "UNVERIFIED", "concept_coverage": "UNVERIFIED"},
        "fiscal_regime_note": fiscal,
        "selection_rationale": rationale, "comparability_differences": differences,
        "evidence_label": "EXCERPT_OFFICIAL unless stated; not opened directly",
    }

PEERS = [
 peer("XOM", "Exxon Mobil Corporation", "A", "NYSE: XOM", {"state_holder": None, "evidence": "UNVERIFIED (widely held)"}, {"state_control": False, "evidence": "UNVERIFIED"},
      ["Upstream", "Energy Products", "Chemical Products", "Specialty Products"], "integrated", "US GAAP, USD", "10-K, SEC CIK 34088",
      "https://www.sec.gov/Archives/edgar/data/34088/000003408826000045/xom-20251231.htm", "Integrated upstream-refining-chemicals; listed peer of similar scope.",
      ["US GAAP (LIFO, no impairment reversal)", "diversified fiscal regimes", "no state control"]),
 peer("CVX", "Chevron Corporation", "A", "NYSE: CVX", {"state_holder": None, "evidence": "UNVERIFIED"}, {"state_control": False, "evidence": "UNVERIFIED"},
      ["Upstream", "Downstream"], "integrated", "US GAAP, USD; LIFO", "10-K, SEC CIK 93410",
      "https://www.sec.gov/Archives/edgar/data/93410/000009341026000078/cvx-20251231.htm", "Two-segment structure closest in form to Aramco's.",
      ["US GAAP", "Hess acquisition changes the historical base"]),
 peer("SHEL", "Shell plc", "A", "LSE / Euronext Amsterdam: SHEL; NYSE ADS (UNVERIFIED)", {"state_holder": None, "evidence": "UNVERIFIED"}, {"state_control": False, "evidence": "UNVERIFIED"},
      ["Integrated Gas", "Upstream", "Marketing", "Chemicals and Products", "Renewables and Energy Solutions", "Corporate"], "integrated, large LNG", "IFRS (adoption wording UNVERIFIED), USD", "Annual Report; 20-F, SEC CIK 1306965",
      "https://www.sec.gov/Archives/edgar/data/1306965/000162828026017024/shel-20251231.htm", "Integrated IFRS reporter.",
      ["LNG weight", "CCS-based adjusted earnings", "own gas factor"]),
 peer("TTE", "TotalEnergies SE", "A", "Euronext Paris: TTE; NYSE (UNVERIFIED)", {"state_holder": None, "evidence": "UNVERIFIED"}, {"state_control": False, "evidence": "UNVERIFIED"},
      ["Exploration & Production", "Integrated LNG", "Integrated Power", "Refining & Chemicals", "Marketing & Services"], "integrated with power", "IFRS (IASB and EU), USD; FIFO with replacement-cost adjusted results", "URD (AMF); 20-F, SEC CIK 879764",
      "https://www.sec.gov/Archives/edgar/data/879764/000110465926035876/tot-20251231x20f.htm", "Integrated IFRS reporter.",
      ["large power segment", "own adjusted net income definition"]),
 peer("BP", "BP p.l.c.", "A", "LSE: BP.; NYSE ADS (UNVERIFIED)", {"state_holder": None, "evidence": "UNVERIFIED"}, {"state_control": False, "evidence": "UNVERIFIED"},
      ["gas & low carbon energy", "oil production & operations", "customers & products"], "integrated", "IFRS, USD; successful efforts", "Annual Report and Form 20-F, SEC CIK 313807",
      "https://www.sec.gov/Archives/edgar/data/0000313807/000031380726000006/bp-20251231.htm", "Integrated IFRS reporter.",
      ["underlying RC profit", "segment reorganisations between years"]),
 peer("EQNR", "Equinor ASA", "B", "Oslo Børs and NYSE: EQNR", {"state_holder": "Kingdom of Norway (Ministry of Trade, Industry and Fisheries)", "stake_reported": "67.0% (excerpt)", "evidence": "EXCERPT_OFFICIAL"},
      {"state_control": "UNVERIFIED (majority holding reported; control assessment not made)", "evidence": "UNVERIFIED"},
      ["E&P Norway", "E&P International", "E&P USA", "MMP", "REN", "Other", "Power (from Q1 2026, 2025 restated)"], "upstream-led with midstream and marketing; refining limited (UNVERIFIED)", "IFRS (wording UNVERIFIED), USD presentation (UNVERIFIED)", "20-F / Norwegian statutory annual report, SEC CIK 1140625",
      "https://www.sec.gov/Archives/edgar/data/1140625/000114062526000013/eqnr-20251231.htm", "State-owned issuer with a concentrated national resource base.",
      ["limited downstream", "segment change in 2026", "Norwegian petroleum tax on NCS activities"],
      fiscal="The 78% marginal rate (22% ordinary + 71.8% special tax, cash-flow based since 2022) applies to petroleum activities on the Norwegian continental shelf under the petroleum tax regime. It is not the group's effective tax rate and does not apply to all group profit (EXCERPT_OFFICIAL norskpetroleum.no; group effect UNVERIFIED)."),
 peer("PTR", "PetroChina Company Limited", "B", "HKEX 857; A-shares (UNVERIFIED)", {"state_holder": "CNPC (UNVERIFIED)", "evidence": "UNVERIFIED"}, {"state_control": "UNVERIFIED", "evidence": "UNVERIFIED"},
      ["Oil, Gas & New Energy", "Refining, Chemicals & New Materials", "Marketing", "Natural Gas Sales"], "integrated", "UNVERIFIED", "HKEX filings; SEC filing status UNVERIFIED",
      None, "Structural analogue: listed integrated national oil company.", ["domestic price regulation", "no confirmed EDGAR route"]),
 peer("PBR", "Petróleo Brasileiro S.A. (Petrobras)", "B", "B3 and NYSE (UNVERIFIED)", {"state_holder": "Federal Government of Brazil (UNVERIFIED)", "evidence": "20-F describes itself as partially state-owned (EXCERPT_OFFICIAL)"},
      {"state_control": "UNVERIFIED", "evidence": "UNVERIFIED"}, ["to be confirmed from 20-F (excerpts inconsistent)"], "upstream-led with domestic refining", "IFRS (UNVERIFIED)", "20-F, SEC",
      "https://www.sec.gov/Archives/edgar/data/1119639/000129281426002168/pbrform20f_2025.htm", "State-owned, large offshore upstream.", ["domestic pricing policy", "intervention risk"]),
 peer("COP", "ConocoPhillips", "C", "NYSE: COP", {"state_holder": None, "evidence": "UNVERIFIED"}, {"state_control": False, "evidence": "UNVERIFIED"},
      ["UNVERIFIED"], "upstream only", "US GAAP; successful efforts", "10-K, SEC CIK 1163165",
      "https://www.sec.gov/Archives/edgar/data/1163165/000116316526000009/cop-20251231.htm", "Contrast benchmark for the Upstream segment only.", ["no downstream"]),
 peer("ADNOCGAS", "ADNOC Gas plc", "C", "ADX: ADNOCGAS", {"state_holder": "ADNOC via XRG; TAQA minority (EXCERPT_OFFICIAL)", "evidence": "EXCERPT_OFFICIAL"}, {"state_control": "UNVERIFIED", "evidence": "UNVERIFIED"},
      ["UNVERIFIED"], "gas processing", "UNVERIFIED", "ADX disclosures", None, "Gulf gas-processing contrast.", ["gas processing only", "small free float", "no EDGAR route"]),
 peer("ENI", "Eni S.p.A.", "NOT_ASSESSED", "UNVERIFIED", {"state_holder": "UNVERIFIED", "evidence": "UNVERIFIED"}, {"state_control": "UNVERIFIED", "evidence": "UNVERIFIED"},
      [], "UNVERIFIED", "UNVERIFIED", "UNVERIFIED", None, "Not assessed: no excerpt found.", []),
]

AFFILIATES = [
 {"name": "SABIC", "relationship_proposed": "CONSOLIDATED_SUBSIDIARY", "evidence": "UNVERIFIED; confirm from Aramco consolidation notes"},
 {"name": "Petro Rabigh", "relationship_proposed": "NOT_ESTABLISHED", "evidence": "INTERNAL_ACCEPTED note B04_PETRO_RABIGH_CONTROL (fa3a772): an acquired percentage does not by itself establish control or the consolidation basis"},
 {"name": "Luberef", "relationship_proposed": "CONSOLIDATED_SUBSIDIARY", "evidence": "UNVERIFIED"},
 {"name": "Motiva", "relationship_proposed": "CONSOLIDATED_SUBSIDIARY", "evidence": "UNVERIFIED"},
 {"name": "S-Oil", "relationship_proposed": "NOT_ESTABLISHED", "evidence": "UNVERIFIED; may be consolidated or equity-accounted"},
]

dump("PEER-CANDIDATES.json", {
 "schema": "marefa-web08b06-peer-candidates/1",
 "status": "CANDIDATES_ONLY_NO_APPROVED_PEER_LIST",
 "rule": "Tiers A/B/C are proposals. No candidate becomes a peer without an owner decision (D1) recorded with its date and reference; approved stays false in this package.",
 "dimension_rules": {
  "ownership": "Who holds the shares (holder and reported stake).",
  "control": "Whether a holder controls the entity (IFRS 10 / ASC 810 assessment); a majority holding is recorded, not assumed to be control.",
  "consolidation": "How an entity appears in Aramco's accounts: consolidated subsidiary, equity-accounted investee, or neither.",
  "commercial_relationship": "Supply, offtake or JV operating relationships; recorded, never by itself an exclusion criterion."
 },
 "aramco_relationship_rules": {
  "CONSOLIDATED_SUBSIDIARY": "Excluded from whole-company peer comparison (its figures are inside Aramco's). May be used in a segment-specific analysis with the overlap disclosed.",
  "EQUITY_ACCOUNTED": "Not automatically excluded and not treated as a subsidiary; listed for owner decision with the overlap (share of profit) disclosed.",
  "COMMERCIAL_ONLY": "Recorded; no exclusion on this ground alone.",
  "NOT_ESTABLISHED": "Verification from Aramco notes required before any use."
 },
 "aramco_relationship_candidates": AFFILIATES,
 "candidates": PEERS,
})

def dec(id, title, verified, unverified, rec, presentable, legal="PENDING", notes=""):
    return {"id": id, "title": title, "verified_facts": verified, "unverified_facts": unverified,
            "recommendation": rec, "owner_approval": "PENDING", "legal_approval": legal,
            "implementation_authorization": False, "presentable_to_owner_now": presentable, "notes": notes}

dump("DECISION-REGISTER.json", {
 "schema": "marefa-web08b06-decision-register/1",
 "status": "NO_DECISION_APPROVED",
 "execution_gate": ["Codex independent review of B06-0", "Codex ACCEPT of the B06-0 decision pack", "owner decisions required for the batch", "explicit implementation assignment for the batch", "start of that batch"],
 "gate_rule": "Each step is separate. ACCEPT of B06-0 does not authorise B06-1. No implicit authorisation.",
 "verified_facts_scope": "verified_facts lists only INTERNAL_ACCEPTED repository facts; no external fact is verified in this package.",
 "decisions": [
  dec("D1", "Peer universe and tiers",
      ["Engine peers fixture for SA:2222 returns peer_count 0, reason no_other_peer_with_comparable_facts (tests/fixtures/engine-b70254e_peers_SA-2222_default.json)"],
      ["segments, accounting bases, filings and ownership of all candidates (EXCERPT_OFFICIAL)", "Aramco relationship of SABIC, Petro Rabigh, Luberef, Motiva, S-Oil"],
      "A: XOM, CVX, SHEL, TTE, BP; B: EQNR (PTR, PBR low priority); C: COP, ADNOCGAS contrast only; ENI not assessed", False, legal="NOT_REQUIRED"),
  dec("D2", "Sources for implementation",
      ["WEB08A candidate sources list rights as unreviewed (review-delivery/WEB08A/SOURCES-AND-DERIVATIONS.json)"],
      ["all terms in SOURCE-RIGHTS-MATRIX.json (excerpts only)"],
      "SEC XBRL financial data for peer facts; EIA open data (EIA-produced series) for industry; GASTAT and Open Data Platform for Saudi context; others after permission or legal review", False),
  dec("D3", "Rights reviewer role and legal review of D2 sources",
      ["B01 GrantSchema requires a rights_reviewer grant (research-evidence/v1/contract.ts)"], [],
      "Name a rights_reviewer and commission legal review before any rights-dependent batch", True),
  dec("D4", "Aramco site terms vs display of Aramco-derived data",
      [], ["aramco.com terms excerpt: no public display without express prior written consent"],
      "High rights risk requiring legal review or a consent request; not an established violation by Marefa", True,
      notes="Affects the existing product beyond B06; legal question includes the effect of listing disclosure obligations."),
  dec("D5", "Currency policy", [], ["SAMA peg statement (older excerpt)", "IAS 21 convention (secondary)"],
      "Flows at period-average rate, stocks at closing rate, rate source and date per cell", False, legal="NOT_REQUIRED"),
  dec("D6", "Gas conversion factor and production basis", [], ["issuer gas factors (only Shell excerpt seen)"],
      "One declared factor applied to reported gas volumes; net entitlement; liquids and gas separate", False, legal="NOT_REQUIRED"),
  dec("D7", "Aramco reserves basis", [], ["PRMS bases in Aramco legal section (excerpt)"],
      "Concession basis with disclosure; NOT_COMPARABLE with SEC reserves", False, legal="NOT_REQUIRED"),
  dec("D8", "Access to sec.gov", ["Direct fetch of sec.gov blocked in this environment (observed 2026-10-18)"], ["SEC fair-access requirements (excerpt)"],
      "Allow sec.gov/data.sec.gov for the environment or have Codex run ingestion; owner sets organisation User-Agent and contact", True),
  dec("D9", "Valuation multiples and consensus", [], ["Tadawul, consensus and benchmark-price licences (excerpts)"],
      "Out of B06; no licence or purchase; B07 not started", True),
 ],
})

# ---- R05: tracking timestamps ----
base = sys.argv[2]  # commit whose CHANGELOG is audited (previous delivery)
out = subprocess.check_output(["git", "blame", "--line-porcelain", base, "--", "product-tracking/CHANGELOG.jsonl"], text=True)
rows, cur = [], {}
for l in out.splitlines():
    if re.match(r"^[0-9a-f]{40} ", l):
        parts = l.split(); cur = {"commit": parts[0], "line": int(parts[2])}
    elif l.startswith("committer-time "):
        cur["ct"] = int(l.split()[1])
    elif l.startswith("\t"):
        cur["text"] = l[1:]; rows.append(cur)
aff = []
for r in rows:
    ev = json.loads(r["text"])
    ct = datetime.datetime.fromtimestamp(r["ct"], datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if ev.get("ts") and ev["ts"] > ct:
        d = datetime.datetime.strptime(ev["ts"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc) - datetime.datetime.fromtimestamp(r["ct"], datetime.timezone.utc)
        aff.append({"line": r["line"], "line_sha256": hashlib.sha256(r["text"].encode()).hexdigest(),
                    "task": ev.get("task"), "event": ev.get("event"), "ts_as_written": ev["ts"],
                    "recording_commit": r["commit"], "recording_commit_committer_time_utc": ct,
                    "ts_exceeds_recording_by_seconds": int(d.total_seconds()),
                    "event_time": "NOT_ESTABLISHED", "event_time_not_later_than": ct})
blob = subprocess.check_output(["git", "show", f"{base}:product-tracking/CHANGELOG.jsonl"])
dump("TRACKING-EVENT-CORRECTIONS.json", {
 "schema": "marefa-web08b06-tracking-corrections/1",
 "audited_file": "product-tracking/CHANGELOG.jsonl", "audited_at_commit": base,
 "audited_file_sha256": hashlib.sha256(blob).hexdigest(), "audited_lines": len(rows),
 "finding": "The ts field of these events is later than the git committer time of the commit that recorded them. An event cannot be recorded before it happens, so these ts values are not event times.",
 "cause": "ts values were typed by the author agent as estimated narrative times; no clock was read when writing them. Git committer time is machine-recorded at commit and is used here only as an upper bound.",
 "correction": "Original lines are kept unchanged. For each affected line: event_time NOT_ESTABLISHED; event_time_not_later_than = recording commit committer time. No replacement timestamp is invented.",
 "forward_rule": "New entries carry ts = recorded_at from the system clock (date -u) at authoring, plus time_source; event_time is given only when evidenced.",
 "central_board": "docs/PROJECT_EXECUTION_BOARD_ROOT_20261011_v1.json is not in this repository and was not updated by the author; central events 110-113 are referenced, not edited.",
 "affected_count": len(aff),
 "affected_more_than_24h": sum(1 for a in aff if a["ts_exceeds_recording_by_seconds"] > 86400),
 "affected": aff,
})
print(len(PEERS), len(aff))
