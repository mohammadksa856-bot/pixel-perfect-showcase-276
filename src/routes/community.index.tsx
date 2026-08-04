import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Heart, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { Panel } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getBoards } from "@/lib/content";
import { getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/community/")({
  head: () => ({
    meta: [
      { title: "المجتمع | معرفة استثمار" },
      {
        name: "description",
        content:
          "لوحات نقاش لكل قطاع استثماري: شارك تحليلك، ناقش الشركات، وتفاعل مع مجتمع من المستثمرين.",
      },
      { property: "og:title", content: "المجتمع — معرفة استثمار" },
      {
        property: "og:description",
        content: "نقاشات استثمارية منظمة حسب القطاع مع إعجابات وتعليقات وحفظ للمنشورات.",
      },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const boards = getBoards();
  const [active, setActive] = useState(boards[0]!.slug);
  const board = boards.find((b) => b.slug === active) ?? boards[0]!;
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [posting, setPosting] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, key: string) =>
    set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

  const postsQuery = useQuery({
    queryKey: ["community_posts", active],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, title, created_at")
        .eq("board_slug", active)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleNewPostClick = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      navigate({ to: "/auth", search: { denied: false } });
      return;
    }
    setShowForm((v) => !v);
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setPosting(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth", search: { denied: false } });
        return;
      }
      const { error } = await supabase
        .from("community_posts")
        .insert({ board_slug: active, author_id: data.user.id, title: newTitle.trim() });
      if (error) throw error;
      setNewTitle("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["community_posts", active] });
      toast.success(t({ ar: "تم نشر المنشور.", en: "Post published." }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <PageShell>
      <PageHero
        eyebrow={t(ui.community)}
        title={t(ui.communityBoards)}
        description={t({
          ar: "لكل قطاع لوحة نقاش مستقلة. اطرح فكرتك، ناقش التحليلات، واحفظ أفضل المنشورات.",
          en: "Every sector has its own board. Share ideas, debate analysis and bookmark the best posts.",
        })}
      />

      <Container>
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="space-y-1.5">
              {boards.map((b) => {
                const Icon = getIcon(b.slug === "ai" ? "brain" : "chart");
                return (
                  <button
                    key={b.slug}
                    onClick={() => setActive(b.slug)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start text-sm transition-colors",
                      active === b.slug
                        ? "bg-card font-semibold shadow-card"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{t(b.name)}</span>
                    <span className="ms-auto text-[11px] text-muted-foreground">{b.posts}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{t(board.name)}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {board.posts} {t(ui.posts)} · {board.members} {t(ui.members)}
                </p>
              </div>
              <button
                onClick={handleNewPostClick}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-transform hover:scale-[1.03]"
              >
                <Plus className="size-4" />
                {t(ui.newPost)}
              </button>
            </div>

            {showForm && (
              <form onSubmit={submitPost} className="mb-6 flex gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t({ ar: "اكتب عنوان منشورك...", en: "Write your post title..." })}
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={posting}
                  className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground disabled:opacity-60"
                >
                  {t({ ar: "نشر", en: "Post" })}
                </button>
              </form>
            )}

            {postsQuery.data && postsQuery.data.length > 0 && (
              <div className="mb-4 space-y-3">
                {postsQuery.data.map((p) => (
                  <Panel key={p.id} className="border-brand/30">
                    <h3 className="text-sm font-bold leading-7">{p.title}</h3>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString(
                        locale === "ar" ? "ar-SA" : "en-US",
                      )}
                    </div>
                  </Panel>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {board.latest.map((post) => {
                const key = `${board.slug}-${post.title.en}`;
                const isLiked = liked.includes(key);
                const isSaved = saved.includes(key);
                return (
                  <Panel key={key} className="transition-colors hover:border-foreground/15">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-bold">
                        {t(post.author).slice(0, 1)}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {t(post.author)} · {t(post.time)}
                      </div>
                    </div>
                    <h3 className="mt-4 text-sm font-bold leading-7">{t(post.title)}</h3>
                    <div className="mt-5 flex items-center gap-5 text-xs text-muted-foreground">
                      <button
                        onClick={() => toggle(liked, setLiked, key)}
                        className={cn(
                          "inline-flex items-center gap-1.5 transition-colors hover:text-foreground",
                          isLiked && "text-tone-rose",
                        )}
                      >
                        <Heart className={cn("size-4", isLiked && "fill-current")} />
                        {post.likes + (isLiked ? 1 : 0)}
                      </button>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircle className="size-4" />
                        {post.comments}
                      </span>
                      <button
                        onClick={() => toggle(saved, setSaved, key)}
                        className={cn(
                          "ms-auto inline-flex items-center gap-1.5 transition-colors hover:text-foreground",
                          isSaved && "text-brand",
                        )}
                      >
                        <Bookmark className={cn("size-4", isSaved && "fill-current")} />
                        {t(ui.bookmark)}
                      </button>
                    </div>
                  </Panel>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </PageShell>
  );
}
