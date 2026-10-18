"""Write FIELD-LIST_AR.md (appendix) from FIELD-REQUIREMENTS.json and CATEGORY-MATRIX.json."""
import json, os
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = json.load(open(f"{H}/FIELD-REQUIREMENTS.json")); M = json.load(open(f"{H}/CATEGORY-MATRIX.json"))
NAME = {"A": "مصدر الشركة", "B": "حساب داخلي", "C": "ترخيص/تغذية", "D": "استبعاد مراجَع", "H": "تاريخ 10 سنوات"}
L = ["# ملحق: الحقول الناقصة لكل فئة (sa:2222، العقد 1.0.0)", "",
     "مولَّد آليًا من `FIELD-REQUIREMENTS.json` بالأداة `tools/field_list.py`. الفئات بترتيب العقد. ",
     "`*` = ضمن أصغر مجموعة تكفي للوصول إلى 95 في السيناريو S5. الفئة D لا تُملأ أبدًا: مسارها استبعاد مراجَع بعد الموافقة.", ""]
for r in M["categories"]:
    k = r["category_key"]
    if r["expected"] is None:
        L += [f"## {k}", "", "فئة متقاطعة بلا حقول؛ تُقاس بالمصادر والحداثة.", ""]; continue
    L += [f"## {k} — الوزن {r['weight']:g}، الحد {r['threshold']:.0%}، موجود {r['engine_present']}/{r['expected']}", ""]
    rows = [f for f in F["fields"] if k in f["categories"]]
    if not rows: L += ["لا حقول ناقصة.", ""]; continue
    L += ["| الحقل | المجموعة | الصنف | الدفعة |", "|---|---|---|---|"]
    for f in rows:
        L.append(f"| `{f['field_key']}`{' *' if f['in_minimum_set_for_95'] else ''} | {f['field_group']} | {f['class']} ({NAME[f['class']]}) | {f['batch']} |")
    L.append("")
open(f"{H}/FIELD-LIST_AR.md", "w").write("\n".join(L) + "\n")
print(len(F["fields"]), "fields")
