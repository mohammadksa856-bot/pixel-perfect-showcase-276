import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/markets/$slug")({
  component: MarketPage,
});

function MarketPage() {
  const { slug } = Route.useParams();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">

      <h1 className="text-5xl font-bold mb-2">
        {slug.toUpperCase()}
      </h1>

      <p className="text-gray-400 mb-8">
        صفحة المؤشر
      </p>

      {/* AI Summary */}
      <div className="rounded-2xl border p-6 mb-8 bg-card">
        <h2 className="text-xl font-bold mb-3">
          🤖 ملخص الذكاء الاصطناعي
        </h2>

        <p className="leading-8 text-muted-foreground">
          سيتم هنا مستقبلاً عرض ملخص تلقائي يشرح حركة المؤشر،
          أهم الأسباب، وما الذي يجب على المستثمر معرفته.
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">

        <div className="rounded-xl border p-5">
          <div className="text-sm text-muted-foreground">
            القيمة الحالية
          </div>

          <div className="text-3xl font-bold mt-2">
            --
          </div>
        </div>

        <div className="rounded-xl border p-5">
          <div className="text-sm text-muted-foreground">
            تغير اليوم
          </div>

          <div className="text-3xl font-bold text-green-500 mt-2">
            --
          </div>
        </div>

        <div className="rounded-xl border p-5">
          <div className="text-sm text-muted-foreground">
            أعلى مستوى
          </div>

          <div className="text-3xl font-bold mt-2">
            --
          </div>
        </div>

        <div className="rounded-xl border p-5">
          <div className="text-sm text-muted-foreground">
            أقل مستوى
          </div>

          <div className="text-3xl font-bold mt-2">
            --
          </div>
        </div>

      </div>

      {/* Chart */}
      <div className="rounded-2xl border h-[450px] flex items-center justify-center">
        الرسم البياني سيظهر هنا
      </div>

    </div>
  );
}
