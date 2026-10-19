"""Minimal acceptance assertions on unmodified Claude JSON; requires no private PDFs."""
from pathlib import Path
import json
HERE=Path(__file__).resolve().parent
AUTHOR=HERE.parent/'FINANCIAL-HISTORY'
load=lambda name:json.loads((AUTHOR/(name+'.json')).read_text(encoding='utf8'))
matrix=load('HIST-PERIOD-MATRIX');ledger=load('HIST-FIN-LEDGER');restatement=load('FY2024-RESTATEMENT-CHECK')
cash=next(x for x in ledger['annual'] if x['id']=='QB2-A-cash-FY2023')
fy23=next(x for x in matrix['annual'] if x['fiscal_year']==2023)
q4=next(x for x in ledger['quarters'] if x['id']=='QB2-A-cash-Q4-2023')
parent=next(x for x in restatement['rows'] if x['metric']=='net_income_parent')
failures=[]
if cash['evidence_class']=='ISSUER_ANNUAL_REPORT_2025_CASH_FLOW_OPENING_BALANCE' and fy23['core_values_with_disclosure_evidence']==5:
    failures.append('R01: cashflow-opening proxy counted as fifth exact FY2023 core field; expected4exact +1proxy until direct balance identity is linked')
if 'none for the value' in q4['needed']:
    failures.append('R01: Q4-2023 cash needed=none despite unresolved balance identity in referenced annual cash record')
if parent['comparative_in_ara2025'] is None and parent['status']=='NO_VALUE_DIFFERENCE_SEEN_IN_ORIGINAL_SECONDARY':
    failures.append('R02: parent net income claims equality with no comparative operand recorded')
for f in failures:print('FAIL',f)
print('Application under review:1800f4c63f313eac2bb82546e6ccbdd2b9a38f6f;Delivery:b5010191d4b16cce9c5f885080667bb173e2d9cd')
raise SystemExit(1 if failures else 0)
