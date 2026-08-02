import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/markets/$slug")({
  component: MarketPage,
});

function MarketPage() {
  const { slug } = Route.useParams();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">

      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">

        <Link
          to="/"
          className="hover:text-foreground transition-colors"
        >
          الرئيسية
        </Link>

        <span>/</span>

        <Link
          to="/"
          className="hover:text-foreground transition-colors"
        >
          الأسواق
        </Link>

        <span>/</span>

        <span className="font-medium text-foreground">
          {slug.toUpperCase()}
        </span>
      </div>

      {/* Back Button */}
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-accent transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        العودة للرئيسية
      </Link>

      {/* Title */}
      <h1 className="mb-2 text-5xl font-bold tracking-tight">
        {slug.toUpperCase()}
      </h1>

      <p className="mb-10 text-muted-foreground">
        نظرة شاملة على المؤشر، الأداء، التحليل، والأخبار.
      </p>

      {/* AI Summary */}
      <div className="mb-8 rounded-2xl border bg-card p-8 shadow-sm">

        <div className="mb-4 flex items-center justify-between">

          <div>

            <h2 className="text-2xl font-bold">
              ✨ ملخص استثماري
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              ملخص سريع تم إنشاؤه بالذكاء الاصطناعي ليساعدك على فهم المؤشر خلال أقل من دقيقة.
            </p>

          </div>

        </div>

        <p className="leading-8 text-muted-foreground">
          سيتم هنا مستقبلاً عرض ملخص تلقائي يشرح حركة المؤشر،
          وأهم الأسباب التي أثرت عليه،
          وأبرز الأخبار،
          والعوامل الاقتصادية المرتبطة به،
          بالإضافة إلى أهم النقاط التي يحتاج المستثمر لمعرفتها قبل قراءة التفاصيل.
        </p>

      </div>

      {/* Statistics */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">

        <div className="rounded-xl border p-5">
          <div className="text-sm text-muted-foreground">
            القيمة الحالية
          </div>

          <div className="mt-2 text-3xl font-bold">
            --
          </div>
        </div>

        <div className="rounded-xl border p-5">
          <div className="text-sm text-muted-foreground">
            تغير اليوم
          </div>

          <div className="mt-2 text-3xl font-bold text-green-500">
            --
          </div>
        </div>

        <div className="rounded-xl border p-5">
          <div className="text-sm text-muted-foreground">
            أعلى مستوى
          </div>

          <div className="mt-2 text-3xl font-bold">
            --
          </div>
        </div>

        <div className="rounded-xl border p-5">
          <div className="text-sm text-muted-foreground">
            أقل مستوى
          </div>

          <div className="mt-2 text-3xl font-bold">
            --
          </div>
        </div>

      </div>

      {/* Chart */}
      <div className="flex h-[450px] items-center justify-center rounded-2xl border bg-card">
        الرسم البياني سيظهر هنا
      </div>

    </div>
  );
}
