"""Inspect pinned committed source only. Never imports engine modules or opens a database."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--engine', required=True)
p.add_argument('--commit', required=True)
p.add_argument('--output', required=True)
a = p.parse_args()
checks = [
    ('data_point_identity', 'src/finengine/database.py', 'CREATE TABLE IF NOT EXISTS data_points(', 'id is a local SQLite row identity; version is recorded. No global immutable fact reference/digest column declared in this table.'),
    ('source_identity', 'src/finengine/database.py', 'CREATE TABLE IF NOT EXISTS source_documents(', 'source_key and content_hash exist, but no explicit document revision chain in this table.'),
    ('original_artifact', 'src/finengine/database.py', 'CREATE TABLE IF NOT EXISTS source_artifacts(', 'artifact_key, byte hash and source/artifact links exist; do not substitute source JSON hash for original bytes.'),
    ('revision_publication', 'src/finengine/database.py', 'def _publish_data_point(', 'publication increments version and retires current rows; current flag alone cannot reproduce historical knowledge.'),
    ('read_only_facade', 'src/finengine/query.py', 'PRAGMA query_only=ON', 'query service is read-only; this audit does not construct it or open any DB.'),
    ('artifact_selection', 'src/finengine/query.py', 'ORDER BY a.archived_at DESC LIMIT 1', 'source trace picks latest archived artifact; this is not a version-bound as-of document resolver.'),
    ('hidden_row_id', 'src/finengine/query.py', 'item.pop("data_point_id", None)', 'selected row ID is removed from display payload; do not invent a stable research ID from display position.'),
    ('extraction_locator', 'src/finengine/query.py', 'SELECT e.raw_label,e.raw_value', 'page/table/extraction path can exist internally. Join selects one matching extraction; not an independent source-review certificate.'),
    ('quality_quarantine', 'src/finengine/query.py', "item['quality_status']='quarantined'", 'quality holds null financial values; bridge must never fall back to raw extraction.'),
    ('current_only', 'src/finengine/query.py', 'WHERE c.market=? AND c.symbol=? AND d.metric_key=? AND d.is_current=1', 'current history API does not expose full retired-revision as-of horizon.'),
    ('lineage_identity', 'src/finengine/calculation_lineage.py', 'input_version INTEGER NOT NULL', 'lineage records local input IDs/versions; not a global immutable ref graph or financial certification.'),
    ('lineage_verification', 'src/finengine/calculation_lineage.py', 'def verify(conn, output_id, historical=False', 'lineage replay checks exist; bridge never runs formulas and never equates replay with independent verification.'),
    ('source_rights_policy', 'src/finengine/database.py', 'rights_status TEXT NOT NULL CHECK', 'source policy statuses/use flags exist; these are not a document-scoped versioned grant receipt reviewed under B01.'),
    ('preview_accuracy', 'src/finengine/preview_delivery.py', "'independent_numeric':'NOT_VERIFIED'", 'preview explicitly does not assert independent numeric verification.'),
]
files = {}
matrix = []
for key, path, needle, observation in checks:
    if path not in files:
        raw = subprocess.check_output(['git', '-C', a.engine, 'show', f'{a.commit}:{path}'])
        files[path] = {'sha256': hashlib.sha256(raw).hexdigest(), 'lines': raw.decode('utf-8').splitlines()}
    matches = [i + 1 for i, line in enumerate(files[path]['lines']) if needle in line]
    if not matches:
        raise ValueError(f'Pinned source marker missing: {key}')
    matrix.append({'requirement': key, 'path': path, 'line': matches[0], 'marker': needle, 'observation': observation, 'real_bridge': 'BLOCKED_PENDING_EXACT_EVIDENCE_EXPORT'})
result = {'schema': 'engine-research-source-inspection/1', 'engine_commit': a.commit,
          'source_only': True, 'database_opened': False, 'network_calls': False,
          'files': {k: {'sha256': v['sha256'], 'line_count': len(v['lines'])} for k, v in files.items()},
          'matrix': matrix}
with Path(a.output).open('x', encoding='utf-8', newline='\n') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
    f.write('\n')
print(json.dumps({'source_files': len(files), 'matrix_entries': len(matrix), 'database_opened': False, 'engine_commit': a.commit}))
