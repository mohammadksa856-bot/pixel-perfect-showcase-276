import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Search as SearchIcon, Building2, Layers, FileText, BookOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { search, type SearchResult } from "@/lib/content";
import { cn } from "@/lib/utils";

const typeMeta = {
  company: { icon: Building2, to: "/companies/$slug" as const },
  sector: { icon: Layers, to: "/sectors/$slug" as const },
  research: { icon: FileText, to: "/research/$slug" as const },
  knowledge: { icon: BookOpen, to: "/knowledge/$slug" as const },
};

export function SearchBox({
  placeholder,
  className,
  inputClassName,
  onNavigate,
}: {
  placeholder: string;
  className?: string;
  inputClassName?: string;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const r = await search(query.trim());
      setResults(r.slice(0, 6));
      setOpen(true);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const goToResults = () => {
    if (!query.trim()) return;
    setOpen(false);
    onNavigate?.();
    navigate({ to: "/search", search: { q: query.trim() } });
  };

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToResults();
        }}
      >
        <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-all focus-within:ring-2 focus-within:ring-brand">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={placeholder}
            className={cn(
              "w-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground",
              inputClassName,
            )}
          />
        </label>
      </form>

      {open && results.length > 0 && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-lift">
          {results.map((r) => {
            const meta = typeMeta[r.type];
            const Icon = meta.icon;
            return (
              <Link
                key={`${r.type}-${r.slug}`}
                to={meta.to}
                params={{ slug: r.slug }}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  onNavigate?.();
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-start transition-colors hover:bg-muted"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm">{t(r.title)}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={goToResults}
            className="mt-1 w-full rounded-xl px-3 py-2 text-start text-xs font-medium text-brand hover:bg-muted"
          >
            {t({ ar: "عرض كل النتائج", en: "See all results" })} ←
          </button>
        </div>
      )}
    </div>
  );
}
