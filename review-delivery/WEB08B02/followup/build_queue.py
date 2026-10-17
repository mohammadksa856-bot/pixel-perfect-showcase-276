"""Metadata-only follow-up; no source amounts, production writes or invented IDs."""
import hashlib
import json
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE.parent / 'QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json'
RIGHTS = {'rights_evidence_pending', 'documented_rights_grant_missing'}
ACTIONS = {
    'NUMERICAL_SOURCE_MATCH_NOT_QUALIFICATION': 'Bind real engine references and obtain financial review; numerical agreement is not approval',
    'REVIEW_DIFFERENCE': 'Review each recorded difference against its source; do not treat all differences as wrong amounts',
    'REQUESTED_PERIOD_NOT_IN_SNAPSHOT': 'Locate requested historical period in an authorized engine export; do not infer live database absence',
    'PERIOD_DIFFERENCE': 'Resolve full period kind/start/end/fiscal metadata without substituting a matching end date',
    'MISSING_IN_SNAPSHOT': 'Request exact metric evidence in authorized export; no automatic extraction or fallback',
    'SCOPE_OR_DEFINITION_DIFFERENCE': 'Resolve accounting definition and consolidation scope before linking',
    'NO_APPROVED_METRIC_MAPPING': 'Review metric definition/unit/period mapping; do not manufacture an engine identifier',
}


def build(register, authorization):
    if authorization.get('commercial_use') != 'USER_AUTHORIZED':
        raise ValueError('Explicit user authorization missing')
    rows = []
    seen = set()
    for row in register['results']:
        key = row['audit_row']
        if key in seen:
            raise ValueError('Duplicate audit row')
        seen.add(key)
        classification = row['comparison']
        if classification not in ACTIONS:
            raise ValueError('Unreviewed classification')
        remaining = sorted(set(row['qualification']['reasons']) - RIGHTS)
        if not remaining:
            raise ValueError('No financial blockers recorded: manual review required, not automatic release')
        rows.append({
            'audit_row': key,
            'identity': row['identity'],
            'source': row['source'],
            'source_file_sha256': row['source_file_sha256'],
            'comparison': classification,
            'comparison_reasons': row['reasons'],
            'next_action': ACTIONS[classification],
            'local_work_blockers': remaining,
            'historical_contract_gaps': row['qualification']['reasons'],
            'state': 'WITHHELD',
            'publicationAuthorized': False,
        })
    if len(rows) != register['observations']:
        raise ValueError('Observation count mismatch')
    return {
        'schema': 'marefa-qualification-followup/1',
        'authorization': authorization,
        'snapshot': register['engine_snapshot'],
        'observations': len(rows),
        'comparison_counts': dict(sorted(Counter(r['comparison'] for r in rows).items())),
        'local_blocker_counts_nonexclusive': dict(sorted(Counter(g for r in rows for g in r['local_work_blockers']).items())),
        'qualified': 0, 'display_approved': 0,
        'note': 'Rights confirmation no longer blocks local work. Historical contract evidence is preserved; no release gate or financial review is waived.',
        'rows': rows,
    }


if __name__ == '__main__':
    result = build(json.loads(BASE.read_text(encoding='utf-8')), json.loads((HERE / 'authorization.json').read_text(encoding='utf-8')))
    result['baseline_sha256'] = hashlib.sha256(BASE.read_bytes()).hexdigest()
    with (HERE / 'WORK-QUEUE.json').open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(result, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    print(json.dumps({k: result[k] for k in ('observations', 'comparison_counts', 'local_blocker_counts_nonexclusive', 'qualified', 'display_approved')}))
