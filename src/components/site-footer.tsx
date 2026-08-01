import { Github, Linkedin, Twitter, Youtube } from "lucide-react";
import { footerColumns } from "@/data/site";

export function SiteFooter() {
  return (
    <footer className="night-panel">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:pl-8">
            <h2 className="text-lg font-bold">معرفة استثمار</h2>
            <p className="mt-3 max-w-xs text-sm leading-7 text-night-foreground/65">
              منصة عربية تهدف لنشر المعرفة الاستثمارية ومساعدة المستثمرين على اتخاذ قرارات
              مستنيرة مبنية على تحليل وبيانات.
            </p>
            <div className="mt-5 flex gap-4 text-night-foreground/60">
              {[Youtube, Linkedin, Twitter, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="رابط تواصل اجتماعي"
                  className="transition-colors hover:text-night-foreground"
                >
                  <Icon className="size-5" />
                </a>
              ))}
            </div>
          </div>

          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold">{col.title}</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-night-foreground/65">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="transition-colors hover:text-night-foreground">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-night-foreground/10 pt-6 text-center text-xs text-night-foreground/50">
          © 2024 معرفة استثمار. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
