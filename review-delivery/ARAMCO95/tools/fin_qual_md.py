"""Write FIN-QUAL-BATCH-01_AR.md (review sheet) from FIN-QUAL-BATCH-01.json."""
import json, os
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(f"{H}/FIN-QUAL-BATCH-01.json"))
fmt = lambda v: f"{int(v) / 1e6:,.0f}" if v else "—"
P = {"fy": "سنة مالية", "quarter": "ربع منفرد", "ytd": "منذ بداية العام", "instant": "رصيد"}
L = ["# FIN-QUAL-BATCH-01: ملف تأهيل خمس قيم أساسية لأرامكو (للمراجعة، الكل WITHHELD)", "",
     f"مولَّد من `FIN-QUAL-BATCH-01.json` بالأداة `tools/fin_qual_md.py`. {d['rows_in_batch']} صفًا. المؤهل 0، والمعتمد 0.", "",
     "**القواعد:**",
     "- القيم من قاعدة المحرك (`b70254e`) ومراجع الصفحات من سجل B02. لا قيمة مُنشأة أو مقدَّرة.",
     "- 'تطابق' في عمود B02 فحص بصري من المؤلف، **ليس اعتمادًا**.",
     "- لم يتحقق هذا الملف من ملفات PDF بنفسه: aramco.com محظور في هذه البيئة، وملفات B02 خاصة.",
     "- العملة SAR. القيم معروضة بملايين الريالات، ومخزنة بالريال.", ""]
for metric in ["revenue", "net_income", "operating_cash_flow", "cash", "total_equity"]:
    rs = [r for r in d["rows"] if r["metric"] == metric]
    r0 = rs[0]
    L += [f"## {r0['metric_ar']} (`{metric}`)", "", f"**التعريف وأساس التوحيد:** {r0['definition_ar']} النطاق: موحد. المعيار: IFRS المعتمدة في المملكة.", "",
          f"**العرض المستهدف:** Overview: {r0['target_display']['overview']}. Investor: {r0['target_display']['investor']}. Data: {r0['target_display']['data']}.", "",
          "| المعرّف | الفترة | المستند (النشر) | صفحة PDF / المطبوعة | السطر | قيمة المحرك (مليون) | مصدر قيمة المحرك | مقارنة B02 | تسوية لازمة |",
          "|---|---|---|---|---|---|---|---|---|"]
    for r in rs:
        e = r["engine"] or {}
        src = (e.get("source_url") or "").split("/")[-1]
        L.append(f"| {r['id']} | {P[r['period']['kind']]} {r['period']['end']} | {r['source']['document']} ({r['source']['published']}, {r['source']['assurance']}) | {r['source']['pdf_page']} / {r['source']['printed_page']} | {r['source']['line_label']} | {fmt(e.get('value_sar'))} | {src}، {e.get('form')} | {r['source_match']['meaning_ar']} | {r['reconciliation_ar'] or '—'} |")
    L.append("")
L += ["## الأدلة والمراجعات الناقصة (تنطبق على كل الصفوف)", ""] + [f"- {x}" for x in d["rows"][0]["missing_evidence_ar"][:6]] + ["",
      "## حالة التأهيل والخطوة التالية", "",
      "- **الحالة:** كل الصفوف `WITHHELD`، و`publication_authorized: false`.",
      f"- **الخطوة التالية:** {d['rows'][0]['qualification']['next_step_ar']}", "",
      "## فترات موجودة في المحرك وخارج هذه الدفعة", "",
      "| المقياس | الفترة | قيمة المحرك (مليون) | مصدر المحرك | السبب |", "|---|---|---|---|---|"]
for o in d["engine_periods_outside_batch"]:
    L.append(f"| {o['metric']} | {o['end']} | {fmt(o['engine_value_sar'])} | {o['source_url'].split('/')[-1]}، {o['form']} | {o['reason_ar']} |")
open(f"{H}/FIN-QUAL-BATCH-01_AR.md", "w").write("\n".join(L) + "\n")
print("ok")
