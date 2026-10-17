"""Append one deduplicated authorization/follow-up event to existing central tracking."""
import json
from datetime import datetime, timezone
from pathlib import Path
from finengine.project_tracking import record_batch, append_event, verify_events

root = Path('C:/Users/Mohammed856/Documents/Codex/2026-08-31/marefa-unified-20261012')
sha = '35f48b9e957693aaf86389c0c84de9b72b010b7b'
branch = 'codex/web08b02-aramco-evidence-20261017'
stamp = datetime.now(timezone.utc).isoformat()
batch_id = 'WEB08B02-USER-AUTHORIZATION-FOLLOWUP-20261017'
if any(e['event_id'] == batch_id for e in verify_events(root)):
    raise SystemExit('Already recorded; no duplicate event written')
previous = json.loads((root / 'docs/tracking/batches/WEB08B02-EVIDENCE-QUALIFICATION-20261017.json').read_text(encoding='utf-8'))
report = dict(previous)
report.update(
    batch_id=batch_id, observed_at=stamp, branch=branch,
    baseline_commit='ef3da332d9f33f1bf21844d906c464418ffca0e9',
    completed=['User commercial-use authorization recorded without fabricated grant reference', 'Generated 142-row metadata-only follow-up queue; permission request removed as local-work blocker', 'Reran previous Python comparator: all 142 classification/reason sets match'],
    in_progress=['Evidence qualification remains open; no additional financial input approved'],
    blocked=['113 audit rows lack exact engine reference resolution; 29 matched rows lack required reference metadata', 'Financial review pending for 142 observations; snapshot is frozen, not current production'],
    files_and_commits={'delivery':sha, 'files':['review-delivery/WEB08B02/followup/']},
    test_runs=[],
    area_progress={'factory':'Unchanged','data':'Authorization and actionable queue updated; 0 newly qualified or display-approved','website':'Unchanged','bot':'Unchanged','API':'Unchanged; no live reads or writes'},
    user_decisions=['Commercial use and local continuation authorized by user; do not request the same permission again', 'No production release authorization; financial approval and contract gates unchanged'],
    next_three=['Resolve source and definition differences for matching candidate rows', 'Bind actual immutable engine references from authorized evidence without synthetic IDs', 'Complete financial review and versioned derivative definition decisions before display approval'],
    executive_summary_ar='سُجل تأكيد المستخدم للاستخدام التجاري واستئناف العمل، وأزيل انتظار الإذن كعائق محلي. جُهزت متابعة142سجلًا وأعيدت مطابقة تصنيفاتها.6اختبارات متابعة و23اختبار حجب ناجحة في تشغيلين منفصلين.لا أرقام جديدة مؤهلة ولا تغيير للمحرك أوالإنتاج. المتبقي إسناد المحرك والمراجعة المالية لا انتظار الإذن.'
)
for ident, passed, scope in [('authorization-queue-6',6,'Metadata-only queue/history/safety tests'), ('qualification-regression-23',23,'Unmodified qualification unit tests')]:
    report['test_runs'].append(dict(run_id=ident,branch=branch,commit=report['baseline_commit'],artifact=sha+':review-delivery/WEB08B02/followup/REPORT_AR.md',scope=scope+'; follow-up files tested before commit35f48b9; baseline identifies unchanged tracked implementation',passed=passed,failed=0,errors=0,expected_failures=0,skipped=0,observed_at=stamp))
report['merged_and_unmerged'] = dict(previous['merged_and_unmerged'], authorization='USER_AUTHORIZED_LOCAL_CONTINUATION', newly_qualified=0)
p = record_batch(root, report)
event = append_event(root, dict(event_id=batch_id,occurred_at=stamp,task_id='WEB08-B02',state='REVIEW',change='Record explicit user commercial-use/local continuation authorization; no repeated permission blocker, financial and production gates unchanged.',branch=branch,commits=[sha],changed_files=['review-delivery/WEB08B02/followup/'],test_runs=report['test_runs'],review_decision='AUTHORIZATION_RECORDED_FINANCIAL_QUALIFICATION_PENDING',batch_report=p.relative_to(root).as_posix(),evidence=[sha+':review-delivery/WEB08B02/followup/REPORT_AR.md'],blockers=report['blocked'],required_decisions=report['user_decisions'],change_stage='LOCAL_TESTED_NO_PRODUCTION_OR_FINANCIAL_APPROVAL',production_published=False))
print(json.dumps({'sequence':event['sequence'],'hash':event['event_sha256'],'chain_verified':len(verify_events(root))}))
