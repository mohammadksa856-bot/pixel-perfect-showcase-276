"""FIN-QUAL-BATCH-01: local qualification file for five Aramco values (revenue, net income, operating cash flow, cash and
cash equivalents, total equity) over the periods that already have evidence. Nothing is approved here: every row stays
WITHHELD. Inputs: B02 (review-delivery/WEB08B02), the engine values gathered by measure_engine.py ($OUT/five-engine.json)
and the site's display positions. Usage: OUT=<dir> python3 fin_qual_batch01.py"""
import json, os
O = os.environ["OUT"]
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B02 = os.path.join(os.path.dirname(H), "WEB08B02")
reg = json.load(open(f"{B02}/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json"))
docs = {d["key"]: d for d in json.load(open(f"{B02}/FINANCIAL-EVIDENCE-REGISTER.json"))["documents"]}
engine = {(x["metric"], x["kind"], x["end"]): x for x in json.load(open(f"{O}/five-engine.json"))}

METRICS = {
    "revenue": dict(name_ar="الإيرادات", line="Revenue",
        definition="سطر Revenue في قائمة الدخل الموحدة (IFRS المعتمدة في المملكة). لا يشمل 'Other income related to sales'؛ المجموع 'Revenue and other income related to sales' مقياس منفصل في B02.",
        pages={"overview": "رقم رئيسي: الإيرادات (سنوي)", "investor": "الموضوع 5: آخر سنة، والربع، ومنذ بداية العام", "data": "المستكشف: صف revenue سنوي وربعي وتراكمي"}),
    "net_income": dict(name_ar="صافي الدخل", line="Net income",
        definition="صافي دخل المجموعة الموحد شاملًا حقوق غير المسيطرين. المنسوب للمساهمين (net_income_parent) مقياس مستقل ولا يُستبدل به.",
        pages={"overview": "رقم رئيسي: صافي الدخل (سنوي)", "investor": "الموضوع 5", "data": "المستكشف: صف net_income سنوي وربعي وتراكمي"}),
    "operating_cash_flow": dict(name_ar="التدفق النقدي التشغيلي", line="Net cash provided by operating activities",
        definition="صافي النقد من الأنشطة التشغيلية في قائمة التدفقات الموحدة. التصنيف التشغيلي للفوائد والتوزيعات المستلمة كما يعرضه المُصدر، دون إعادة تصنيف.",
        pages={"overview": "غير معروض اليوم (ليس ضمن الأرقام الرئيسية)", "investor": "الموضوع 5: مجموعة التدفقات", "data": "المستكشف: صف operating_cash_flow"}),
    "cash": dict(name_ar="النقد وما في حكمه", line="Cash and cash equivalents",
        definition="رصيد النقد وما في حكمه في الميزانية الموحدة في تاريخ الرصيد. لا يشمل الاستثمارات قصيرة الأجل، ولا نقد PRefChem المحتفظ به للبيع. نقد نهاية التدفقات (cash_end) مقياس مختلف.",
        pages={"overview": "غير معروض اليوم", "investor": "الموضوع 5: الميزانية (آخر رصيد فقط)", "data": "غير معروض: صف cash ليس ضمن صفوف المستكشف، ويُعرض cash_end لـFY2025 فقط"}),
    "total_equity": dict(name_ar="إجمالي حقوق الملكية", line="Equity subtotal including non-controlling interests (unlabelled subtotal)",
        definition="مجموع حقوق الملكية شاملًا حقوق غير المسيطرين، وهو مجموع فرعي غير معنون في الميزانية الموحدة. حقوق المساهمين (parent_equity) مقياس مستقل.",
        pages={"overview": "رقم رئيسي: إجمالي حقوق الملكية", "investor": "الموضوع 5: الميزانية", "data": "المستكشف: صف total_equity لخمس سنوات"}),
}
COMPARISON_AR = {
    "NUMERICAL_SOURCE_MATCH_NOT_QUALIFICATION": "تطابق رقمي بين قيمة اللقطة وسطر المصدر بفحص بصري من B02 (المؤلف)؛ ليس اعتمادًا ماليًا",
    "REVIEW_DIFFERENCE": "اختلاف إسناد: قيمة المحرك مسندة إلى مستند آخر (مقارنات FY2025) لا إلى مستند الفترة الأصلي",
    "REQUESTED_PERIOD_NOT_IN_SNAPSHOT": "الفترة غير موجودة في لقطة صفحة الموقع؛ لم تُقارن رقميًا",
    "PERIOD_DIFFERENCE": "هوية الفترة مختلفة (رصيد instant بـperiod_start فارغ)؛ لم تُقارن رقميًا",
}
# QB1-A correction: notes are keyed by metric as well as period. Before, ("instant", "2024-12-31") and
# ("instant", "2026-06-30") attached the cash comparative and the PRefChem cash-bridge notes to total equity too.
RECON = {
    ("revenue", "fy", "2024-12-31"): None, ("net_income", "fy", "2024-12-31"): None, ("operating_cash_flow", "fy", "2024-12-31"): None,
    ("fy", "2024-12-31"): "قيمة المحرك من مقارنات FY2025 (إعادة عرض محتملة). يلزم ربط نسختي FY2024 (الأصل المنشور 2025-03-04 والمقارن في FY2025) وتسجيل أي إعادة عرض، واعتماد الأحدث إن طُبقت قاعدة restated_latest، دون استبدال تلقائي.",
    ("cash", "instant", "2024-12-31"): "قيمة المحرك من مقارنات التقرير السنوي 2025 ('comparative restatement'). نفس تسوية FY2024.",
    ("total_equity", "instant", "2024-12-31"): "قيمة المحرك من مقارنات FY2025 (aramco-2024-fy-comparative). يلزم ربطها بميزانية FY2024 الأصلية (المنشورة 2025-03-04) وتسجيل أي إعادة عرض لحقوق الملكية أو حقوق غير المسيطرين.",
    ("cash", "instant", "2026-06-30"): "عند الرصيد H1-2026 يُعرض نقد PRefChem ضمن مجموعة الأصول المحتفظ بها للبيع (B02: H1 PDF29 و31 وNote 16(a) PDF42). يلزم جسر بين نقد الميزانية ونقد نهاية التدفقات، لا تعديل تلقائي.",
}
COMMON_MISSING = [
    "ربط الحقيقة في المحرك ببصمة ملف PDF الأصلي: البصمة الحالية لملف استيراد JSON (data/imports)، لا لمستند أرامكو",
    "محدد الصفحة والجدول في المحرك: غائب لأغلب هذه الصفوف",
    "معرف حقيقة ثابت وبصمة مراجعة وتصدير مرجعي غير قابل للتغيير (B02C/B02D)",
    "إيصال مراجعة مالية من مراجع مالي مخوَّل (غير موجود؛ فحص B02 بصري من المؤلف)",
    "منح حقوق موثق للعرض (D4)؛ الحالي 'USER_ASSERTED_NOT_DOCUMENTED'",
    "قراءة حية من المحرك (اللقطة مجمدة 2026-10-13)",
]
rows = []
for r in reg["results"]:
    i = r["identity"]
    if i["metric"] not in METRICS: continue
    m = METRICS[i["metric"]]; s = r["source"]; d = docs[s["document_key"]]
    e = engine.get((i["metric"], i["kind"], i["end"]))
    er = e["rows"][0] if e else None
    rows.append({
        "id": f"FQ01-{r['audit_row']}", "b02_audit_row": r["audit_row"], "metric": i["metric"], "metric_ar": m["name_ar"],
        "period": {"kind": i["kind"], "start": i["start"], "end": i["end"], "fiscal_year": i["fiscalYear"], "fiscal_quarter": i["fiscalQuarter"]},
        "source": {"document": s["document_key"], "url": d["url"], "published": d["published"], "assurance": d["assurance"],
                   "sha256": d["sha256"], "pdf_page": s["pdf_page"], "printed_page": s.get("printed_page"), "table": s.get("table"),
                   "line_label": s.get("original_label"), "column": s.get("column")},
        "unit": i["unit"], "currency": i["currency"], "scale_in_engine": "SAR (units, not millions)",
        "scope": i["scope"], "basis": "IFRS as endorsed in the Kingdom of Saudi Arabia; consolidated",
        "definition_ar": m["definition"],
        "engine": ({"value_sar": er["value_decimal"], "form": er["form"], "source_url": er["source_url"], "filed_at": er["filed_at"],
                    "content_hash": er.get("content_hash"), "import_file": (e.get("source_document") or {}).get("local_path"),
                    "page_or_table": [(x["page"], x["table_ref"]) for x in e.get("extracted", [])][:2],
                    "is_calculated": er["is_calculated"]} if er else None),
        "engine_absent_reason": None if er else "no current engine data point for this period",
        "source_match": {"b02_comparison": r["comparison"], "meaning_ar": COMPARISON_AR.get(r["comparison"], r["comparison"]),
                         "b02_check": r["source_check"], "verified_by_this_batch": False,
                         "why_not": "aramco.com is denied by this environment's network policy; the source PDFs are private to B02 and not in Git"},
        "reconciliation_ar": RECON.get((i["metric"], i["kind"], i["end"])) or (RECON.get((i["kind"], i["end"])) if i["kind"] == "fy" else None),
        "missing_evidence_ar": COMMON_MISSING + ([f"B02: {x}" for x in r["reasons"]] if r["reasons"] else []),
        "target_display": m["pages"],
        "qualification": {"state": "WITHHELD", "b02_reasons": r["qualification"]["reasons"], "publication_authorized": False,
                          "next_step_ar": "مراجع مالي مخوَّل يطابق القيمة بالصفحة المذكورة في PDF المبصوم، ويثبت التعريف والتسوية، ويوقع إيصالًا. ثم ربط المحرك بالبصمة والصفحة، ثم قرار الحقوق D4. لا يُرفع الحجب بمجرد تطابق الرقم."},
    })
# engine periods outside the B02 evidence set (kept visible, not qualified in this batch)
covered = {(x["metric"], x["period"]["kind"], x["period"]["end"]) for x in rows}
outside = [{"metric": k[0], "kind": k[1], "end": k[2], "engine_value_sar": v["rows"][0]["value_decimal"], "form": v["rows"][0]["form"],
            "source_url": v["rows"][0]["source_url"], "reason_ar": "لا مستند مدقق مبصوم لهذه الفترة في أدلة B02؛ مصدر المحرك ملخص تاريخي/مقاييس تقرير سنوي. الدفعة القادمة: القوائم المدققة FY2021–FY2023."}
           for k, v in sorted(engine.items()) if k not in covered]
out = {"schema": "marefa-aramco-fin-qual-batch/1", "batch": "FIN-QUAL-BATCH-01", "company_id": "sa:2222",
       "status": "PREPARED_FOR_REVIEW_ALL_WITHHELD", "approved": 0, "qualified": 0, "rows_in_batch": len(rows),
       "counts": {m: sum(1 for x in rows if x["metric"] == m) for m in METRICS},
       "inputs": {"b02_register": "review-delivery/WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json", "b02_documents": "review-delivery/WEB08B02/FINANCIAL-EVIDENCE-REGISTER.json",
                  "engine": "engine b70254e data/financial.sqlite3 (isolated copy, data_points is_current=1, no dimensions)"},
       "rows": rows, "engine_periods_outside_batch": outside,
       "correction_log": [{"event": "QB1-A (central event 123)", "change": "reconciliation notes keyed by metric and period, not period alone",
                           "removed": [{"row": "FQ01-OBS-074", "metric": "total_equity", "note": "PRefChem held-for-sale cash bridge (H1-2026)"},
                                       {"row": "FQ01-OBS-053", "metric": "total_equity", "note": "cash comparative-restatement note (2024-12-31)"}],
                           "added": [{"row": "FQ01-OBS-053", "note": "equity-specific FY2024 comparative reconciliation"}],
                           "previous_version": "a76286c review-delivery/ARAMCO95/FIN-QUAL-BATCH-01.json"}]}
json.dump(out, open(f"{H}/FIN-QUAL-BATCH-01.json", "w"), ensure_ascii=False, indent=1)
print(out["rows_in_batch"], out["counts"], "outside", len(outside))
