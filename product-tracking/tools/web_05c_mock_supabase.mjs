// WEB-05C test-only mock of the Supabase REST endpoint (PostgREST subset) for browser tests and screenshots.
// SYNTHETIC CONTENT ONLY: every title says it is a synthetic test fixture; numbers are placeholders;
// sources are example.com. Never shipped, never used by the Preview or production.
// Usage: MOCK_MODE=ok|empty|error|slow PORT=54321 node product-tracking/tools/web_05c_mock_supabase.mjs
import http from "node:http";

const MODE = process.env.MOCK_MODE ?? "ok";
const PORT = Number(process.env.PORT ?? 54321);
const T = (ar, en) => ({ ar, en });
const SYN = T("محتوى اختبار اصطناعي", "Synthetic test content");

const table = [
  "| البند (اصطناعي) | الفترة أ | الفترة ب | التغير |",
  "|---|---|---|---|",
  "| البند الأول | 100 | 120 | 20% |",
  "| البند الثاني | 50 | 45 | -10% |",
  "| البند الثالث | 1,000 | 1,100 | 10% |",
].join("\n");
const tableEn = [
  "| Item (synthetic) | Period A | Period B | Change |",
  "|---|---|---|---|",
  "| First item | 100 | 120 | 20% |",
  "| Second item | 50 | 45 | -10% |",
  "| Third item | 1,000 | 1,100 | 10% |",
].join("\n");

// WEB-05C reader fixes: a synthetic table whose rows do not match the header (one longer, one shorter),
// with untrusted HTML in a cell, and a research piece with an impossible date (2026-02-31).
const mismatch = [
  "| البند (اصطناعي) | الفترة أ | الفترة ب |",
  "|---|---|---|",
  "| بند طويل | 100 | 120 | 999 |",
  "| بند قصير | (١٢٫٥) |",
  "| <script>alert(1)</script> | -3.4% | +7 |",
].join("\n");
const mismatchEn = [
  "| Item (synthetic) | Period A | Period B |",
  "|---|---|---|",
  "| Long row | 100 | 120 | 999 |",
  "| Short row | (12.5) |",
  "| <script>alert(1)</script> | -3.4% | +7 |",
].join("\n");

const research = [
  {
    slug: "synthetic-research-1",
    title: T(
      "بحث اختبار اصطناعي ١: قالب القراءة الطويلة",
      "Synthetic test research 1: long-read template",
    ),
    summary: T(
      "نص اختبار لقالب البحث الطويل. ليس بحثًا حقيقيًا ولا يحمل أي استنتاج مالي.",
      "Test text for the long research template. Not real research and carries no financial conclusion.",
    ),
    author: T("مؤلف اختبار", "Test author"),
    author_role: T("دور اختبار", "Test role"),
    reading_time: 12,
    published_at: "2026-09-01T00:00:00Z",
    tags: [T("وسم أ", "Tag A"), T("وسم ب", "Tag B")],
    sectors: { slug: "test-sector-a", name: T("قطاع اختبار أ", "Test sector A") },
    sections: [
      {
        id: "intro",
        heading: T("المقدمة", "Introduction"),
        body: T(
          "فقرة اختبار أولى لقياس طول السطر والمسافات بين الأسطر في القراءة الطويلة. هذا النص لا يحمل معلومات.\n\nفقرة اختبار ثانية بعد سطر فارغ.\n\n> اقتباس اختبار لعرض الاقتباسات.",
          "A first test paragraph to check line length and spacing for long reads. This text carries no information.\n\nA second test paragraph after a blank line.\n\n> A test quote to show quotations.",
        ),
      },
      {
        id: "table",
        heading: T("جدول اختبار", "Test table"),
        body: T(
          `جدول اصطناعي لعرض الأرقام والمحاذاة والتمرير داخل الجدول:\n\n${table}\n\nفقرة بعد الجدول.`,
          `A synthetic table to show numbers, alignment and in-table scrolling:\n\n${tableEn}\n\nA paragraph after the table.`,
        ),
      },
      {
        id: "lists",
        heading: T("قوائم", "Lists"),
        body: T(
          "- عنصر أول\n- عنصر ثان\n- عنصر ثالث\n\n1. خطوة أولى\n2. خطوة ثانية\n\n### عنوان فرعي\nفقرة تحت عنوان فرعي.",
          "- First item\n- Second item\n- Third item\n\n1. First step\n2. Second step\n\n### Subheading\nA paragraph under a subheading.",
        ),
      },
      {
        id: "arabic-only",
        heading: T("قسم بالعربية فقط", null),
        body: T("هذا القسم متوفر بالعربية فقط في المصدر الاصطناعي، لاختبار تنبيه اللغة.", null),
      },
    ],
    refs: [
      "مرجع اختبار ١ — https://example.com/synthetic-ref-1",
      "https://example.com/synthetic-ref-2",
      "مرجع اختبار بلا رابط",
      "javascript:alert(1)",
    ],
  },
  {
    slug: "synthetic-research-2",
    title: T("بحث اختبار اصطناعي ٢", "Synthetic test research 2"),
    summary: T("ملخص اختبار قصير.", "A short test summary."),
    author: null,
    author_role: null,
    reading_time: null,
    published_at: "2026-08-01T00:00:00Z",
    tags: [T("وسم أ", "Tag A")],
    sectors: { slug: "test-sector-b", name: T("قطاع اختبار ب", "Test sector B") },
    sections: [
      { id: "only", heading: T("قسم وحيد", "Only section"), body: T("نص اختبار.", "Test text.") },
    ],
    refs: [],
  },
  {
    slug: "synthetic-research-3",
    title: T("بحث اختبار اصطناعي ٣", "Synthetic test research 3"),
    summary: T("ملخص اختبار.", "Test summary."),
    author: T("مؤلف اختبار", "Test author"),
    author_role: null,
    reading_time: 4,
    published_at: null,
    tags: [],
    sectors: { slug: "test-sector-a", name: T("قطاع اختبار أ", "Test sector A") },
    sections: [],
    refs: [],
  },
  {
    slug: "synthetic-research-4",
    title: T(
      "بحث اختبار اصطناعي ٤: تاريخ مستحيل وجدول غير متسق",
      "Synthetic test research 4: impossible date, inconsistent table",
    ),
    summary: T(
      "اختبار لتاريخ نشر غير صالح وجدول لا تطابق صفوفه رأسه.",
      "Tests an invalid publication date and a table whose rows do not match its header.",
    ),
    author: T("مؤلف اختبار", "Test author"),
    author_role: null,
    reading_time: 3,
    published_at: "2026-02-31T00:00:00Z",
    tags: [],
    sectors: { slug: "test-sector-b", name: T("قطاع اختبار ب", "Test sector B") },
    sections: [
      {
        id: "mismatch",
        heading: T("جدول غير متسق", "Inconsistent table"),
        body: T(
          `قبل الجدول.\n\n${mismatch}\n\nبعد الجدول.`,
          `Before the table.\n\n${mismatchEn}\n\nAfter the table.`,
        ),
      },
      { id: "valid", heading: T("جدول سليم", "Valid table"), body: T(table, tableEn) },
    ],
    refs: [],
  },
];

const knowledge = [
  [
    "synthetic-topic-1",
    T("موضوع اختبار ١", "Test topic 1"),
    T("تصنيف اختبار أ", "Test category A"),
    T("مبتدئ", "Beginner"),
  ],
  [
    "synthetic-topic-2",
    T("موضوع اختبار ٢", "Test topic 2"),
    T("تصنيف اختبار أ", "Test category A"),
    T("متوسط", "Intermediate"),
  ],
  [
    "synthetic-topic-3",
    T("موضوع اختبار ٣", "Test topic 3"),
    T("تصنيف اختبار ب", "Test category B"),
    T("مبتدئ", "Beginner"),
  ],
  ["synthetic-topic-4", T("موضوع اختبار ٤", "Test topic 4"), null, null],
].map(([slug, title, category, level], i) => ({
  slug,
  title,
  summary: T("ملخص موضوع اختبار اصطناعي.", "Synthetic test topic summary."),
  category,
  level,
  reading_time: i === 3 ? null : 5,
  sections: [
    {
      heading: T("ما هو؟", "What is it?"),
      body: T("فقرة اختبار للموضوع.", "A test paragraph for the topic."),
    },
    {
      heading: T("مثال", "Example"),
      body: T(`مثال اصطناعي:\n\n${table}`, `A synthetic example:\n\n${tableEn}`),
    },
    ...(i === 1
      ? [{ heading: T("جدول غير متسق", "Inconsistent table"), body: T(mismatch, mismatchEn) }]
      : []),
  ],
  videos:
    i === 0
      ? [
          {
            title: T("مقطع اختبار", "Test video"),
            duration: "3:20",
            url: "https://example.com/synthetic-video",
          },
          { title: T("مقطع اختبار بلا رابط", "Test video without link"), duration: "1:05" },
        ]
      : [],
}));

const send = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json", "content-range": "0-*/*" });
  res.end(JSON.stringify(body));
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    console.log(MODE, req.method, url.pathname, url.searchParams.toString().slice(0, 120));
    if (MODE === "slow") await new Promise((r) => setTimeout(r, 8000));
    if (MODE === "error") return send(res, 500, { message: "synthetic failure", code: "XX000" });
    const name = url.pathname.replace(/^\/rest\/v1\//, "");
    if (MODE === "empty") return send(res, 200, []);
    if (name === "research") return send(res, 200, research);
    if (name === "knowledge_articles") return send(res, 200, knowledge);
    return send(res, 200, []);
  })
  .listen(PORT, "127.0.0.1", () =>
    console.log(`mock supabase (${MODE}) on ${PORT}; content: ${SYN.en}`),
  );
