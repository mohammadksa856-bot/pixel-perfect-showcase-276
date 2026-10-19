"""Conservative workpaper presentation guard; NOT an accounting approval receipt."""
from pathlib import Path
from functools import lru_cache
import json

HERE=Path(__file__).resolve().parent
LEGACY_DA_DOCS={'FY2021-FS','FY2022-FS','FY2023-FS','FY2024-FS','Q3-2023','Q3-2024','Q3-2025'}
DA_FIELDS={'depreciation_amortization','depreciation_amortization_cash_flow'}

@lru_cache(maxsize=1)
def original_observations():
    return {r['local_observation_id']:r for r in json.loads((HERE/'EXTRACTED-OBSERVATIONS.json').read_text(encoding='utf8'))['observations']}

def assess_basis(field,fy,ytd):
    """Inspect exact input editions BEFORE any usable FY-minus-YTD subtraction.

    No difference detected is deliberately not independent SAME_BASIS approval.
    Unknown editions and material presentation differences cannot issue a value.
    The pinned manifest identifies artifacts, not invented financial versions.
    """
    manifest=json.loads((HERE/'SOURCE-MANIFEST.json').read_text(encoding='utf8'))
    documents=manifest['documents']
    if isinstance(documents,dict): docs=documents
    else: docs={r.get('source_id',r.get('key')):r for r in documents}
    descriptors=[]
    for r in (fy,ytd):
        d=docs.get(r['source_id'])
        known_hash=(d or {}).get('sha256',(d or {}).get('source_document_sha256'))
        original=original_observations().get(r['local_observation_id'])
        compared=['company_id','field_id','period','normalized_observation_value','normalized_unit',
                  'source_currency','scope','dimensions','source_document_sha256','artifact_edition_key',
                  'source_id','source_pdf_page','source_label']
        exact=original is not None and all(original.get(k)==r.get(k) for k in compared)
        known=(known_hash==r['source_document_sha256'] and exact)
        if not known:
            presentation=None
        elif field in DA_FIELDS:
            presentation=('LEGACY_AS_REPORTED_DA_PRESENTATION' if r['source_id'] in LEGACY_DA_DOCS
                          else 'DA_SEPARATE_FROM_IMPAIRMENT_ARA2025_PRESENTATION' if r['source_id']=='ARA2025' else None)
        else:
            presentation='CANONICAL_AS_REPORTED_UNRECONCILED:'+field
        descriptors.append(dict(observation_id=r['local_observation_id'],source_id=r['source_id'],
            artifact_edition_key=r['artifact_edition_key'],source_document_sha256=r['source_document_sha256'],
            source_pdf_page=r['source_pdf_page'],source_label=r['source_label'],
            definition_key='as_reported:'+field,scope=r['scope'],dimensions=r['dimensions'],
            presentation_key=presentation,exact_manifest_edition_recognized=known,
            unchanged_source_observation_identity=exact))
    revisions=json.loads((HERE/'EDITION-RECONCILIATIONS.json').read_text(encoding='utf8'))['comparisons']
    relevant=[dict(field_id=x['field_id'],kind=x['kind'],start=x['start'],end=x['end'],
                   observation_ids=x['observation_ids'],status=x['status'])
              for x in revisions if x['field_id']==field and x['end'].startswith(str(fy['period']['fiscal_year']))
              and x['status'].startswith('VALUES_DIFFER')]
    if any(x['presentation_key'] is None for x in descriptors):
        state='BLOCKED_BASIS_UNESTABLISHED';reason='Exact source edition or presentation definition not recognized'
    elif descriptors[0]['presentation_key']!=descriptors[1]['presentation_key']:
        state='BLOCKED_MIXED_BASIS';reason='Material presentation/reclassification difference has no approved reconciliation'
    else:
        state='NO_MIXED_BASIS_DETECTED_NOT_APPROVED'
        reason='Preparer screen only; matching canonical labels and known input presentations do not establish financial comparability'
    return dict(policy_version='Q4-SEMANTIC-EDITION-SCREEN/2',state=state,reason=reason,
        inputs=descriptors,within_year_edition_difference_signals=relevant,
        material_presentation_difference=state=='BLOCKED_MIXED_BASIS',
        same_reporting_basis_independently_approved=False,
        preparer_assessment_only=True,evidence_accept=False,financially_qualified=False,
        independent_source_review='INDEPENDENT_SOURCE_REVIEW_PENDING',
        reclassification_context=dict(source_id='ARA2025',pdf_page=184,
            limit='Note explicitly discusses FY2024 reclassification; differences in 2025 comparative D&A additionally signal unreconciled presentation. No inferred numeric reconciliation.') if field in DA_FIELDS else None)
