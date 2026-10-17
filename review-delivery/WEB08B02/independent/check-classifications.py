"""Independent Python reference comparison for the fixed 142 observations; no numeric output."""
import argparse, gzip, json
from decimal import Decimal, InvalidOperation
from pathlib import Path
p = argparse.ArgumentParser()
p.add_argument('--repo', required=True); p.add_argument('--private-root', required=True); p.add_argument('--output', required=True)
a = p.parse_args()
repo, private = Path(a.repo), Path(a.private_root)
read = lambda p: json.loads(Path(p).read_text(encoding='utf-8-sig'))
root = repo / 'review-delivery/WEB08B02'
reg = read(root / 'QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json')
docs = {d['key']: d for d in read(root / 'FINANCIAL-EVIDENCE-REGISTER.json')['documents']}
page = json.loads(gzip.decompress((repo / reg['engine_snapshot']['path']).read_bytes()))
rows = []
def traverse(v):
    if isinstance(v, list):
        for x in v: traverse(x)
    elif isinstance(v, dict):
        for key, x in v.items():
            if key == 'metrics':
                for metric, items in x.items():
                    rows.extend([{**item, 'company_id': page['company']['company_id'], 'metric': metric} for item in items])
            else: traverse(x)
traverse(page['sections']['financials'])
key = lambda x: json.dumps(x, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
engine = list({key(r): r for r in rows}.values())
observations = read(private / 'audit-observations.json')['rows'] + read(private / 'audit-adjusted-observations.json')['rows']
def compare(o):
    i = o['identity']
    if o['engine_mapping'] is None: return 'NO_APPROVED_METRIC_MAPPING', ['definition_mapping_required']
    candidates = [f for f in engine if f.get('metric') == o['engine_mapping']]
    if not candidates: return 'MISSING_IN_SNAPSHOT', ['engine_metric_missing']
    candidates = [f for f in candidates if f.get('company_id') == i['companyId']]
    if not candidates: return 'COMPANY_IDENTITY_DIFFERENCE', ['issuer_context_missing_or_different']
    if not any(f.get('period_end') == i['end'] for f in candidates): return 'REQUESTED_PERIOD_NOT_IN_SNAPSHOT', ['requested_period_end_missing']
    fields = [('kind','period_kind'), ('start','period_start'), ('end','period_end'), ('fiscalYear','fiscal_year'), ('fiscalQuarter','fiscal_quarter')]
    candidates = [f for f in candidates if all(i[s] == f.get(t) for s,t in fields)]
    if not candidates: return 'PERIOD_DIFFERENCE', ['full_period_identity_differs']
    candidates = [f for f in candidates if f.get('scope') == i['scope'] and f.get('dimensions', {}) == i['dimensions']]
    if not candidates: return 'SCOPE_OR_DEFINITION_DIFFERENCE', ['scope_dimensions_differ']
    candidates = [f for f in candidates if (f.get('currency') or None) == i['currency']]
    if not candidates: return 'CURRENCY_DIFFERENCE', ['currency_differs']
    candidates = [f for f in candidates if f.get('unit') == i['unit']]
    if not candidates: return 'UNIT_DIFFERENCE', ['unit_differs']
    reasons = []
    if len({key([f.get('value'), f.get('value_type')]) for f in candidates}) > 1: reasons.append('conflicting_engine_records')
    same_source = [f for f in candidates if f.get('source_url') == docs[o['source']['document_key']]['url']]
    if not same_source: reasons.append('source_url_differs')
    chosen = same_source or candidates
    if any(f.get('value') is None for f in chosen): reasons.append('engine_value_unavailable')
    if any(f.get('is_calculated') for f in chosen): reasons.append('calculated_value_not_direct_original')
    available = [f for f in chosen if f.get('value') is not None]
    try:
        amount = Decimal(o['observed_amount']) * Decimal(o['source_scale'])
        if any(amount != Decimal(str(f['value'])) for f in available): reasons.append('numeric_or_sign_difference')
    except InvalidOperation: reasons.append('uncomparable_numeric_representation')
    return ('REVIEW_DIFFERENCE' if reasons else 'NUMERICAL_SOURCE_MATCH_NOT_QUALIFICATION'), reasons
actual = {r['audit_row']: r for r in reg['results']}
checks = []
counts = {}
for o in observations:
    category, reasons = compare(o)
    r = actual[o['audit_row']]
    checks.append({'audit_row': o['audit_row'], 'category_matches': category == r['comparison'], 'reason_set_matches': set(reasons) == set(r['reasons'])})
    counts[category] = counts.get(category, 0) + 1
assert all(c['category_matches'] and c['reason_set_matches'] for c in checks)
assert counts == reg['comparison_counts']
out = {'tested_sha':'b1f90a9f4e21ef9f1277c07376c3c7f4d2ad2bcf', 'independent_implementation':'Python Decimal comparison; no import of author comparator',
       'observations':len(observations), 'all_categories_and_reason_sets_match':True, 'counts':counts, 'checks':checks, 'source_values_emitted':False}
with Path(a.output).open('x', encoding='utf-8') as f: json.dump(out, f, indent=2)
print(json.dumps({k:v for k,v in out.items() if k != 'checks'}))
