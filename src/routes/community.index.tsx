import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowBigDown, ArrowBigUp, Flame, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { Panel } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getBoards } from "@/lib/content";
import { getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ensureCommunityUser } from "@/lib/community-auth";

export const Route = createFileRoute("/community/")({
  loader: async () => ({ boards: await getBoards() }),
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
        content: "نقاشات استثمارية منظمة حسب القطاع مع تصويت وتعليقات حقيقية.",
      },
    ],
  }),
  component: CommunityPage,
});

type PostRow = {
  id: string;
  title: string;
  created_at: string;
  author_id: string;
  score: number;
  comment_count: number;
};

type SortKey = "hot" | "new" | "top";

function authorLabel(authorId: string, t: (v: { ar: string; en: string }) => string) {
  return `${t({ ar: "مستثمر", en: "Investor" })} #${authorId.slice(0, 4)}`;
}

function CommunityPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const { boards } = Route.useLoaderData();
  const [active, setActive] = useState(boards[0]!.slug);
  const board = boards.find((b) => b.slug === active) ?? boards[0]!;
  const [sort, setSort] = useState<SortKey>("hot");
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [posting, setPosting] = useState(false);

  const postsQuery = useQuery({
    queryKey: ["community_posts", active],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, title, created_at, author_id, score, comment_count")
        .eq("board_slug", active)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PostRow[];
    },
  });

  const myVotesQuery = useQuery({
    queryKey: ["my_post_votes", active],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from("community_post_votes")
        .select("post_id, value")
        .eq("user_id", auth.user.id);
      if (error) throw error;
      return Object.fromEntries(data.map((v) => [v.post_id, v.value])) as Record<string, number>;
    },
  });

  const posts = useMemo(() => {
    const list = [...(postsQuery.data ?? [])];
    if (sort === "new") list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "top") list.sort((a, b) => b.score - a.score);
    if (sort === "hot")
      list.sort((a, b) => {
        const hotScore = (p: PostRow) => {
          const hours = (Date.now() - +new Date(p.created_at)) / 3_600_000;
          return p.score / Math.pow(hours + 2, 1.5);
        };
        return hotScore(b) - hotScore(a);
      });
    return list;
  }, [postsQuery.data, sort]);

  const vote = async (postId: string, value: 1 | -1) => {
    let user;
    try {
      user = await ensureCommunityUser();
    } catch (err) {
      toast.error((err as Error).message);
      return;
    }
    const current = myVotesQuery.data?.[postId];
    try {
      if (current === value) {
        const { error } = await supabase
          .from("community_post_votes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("community_post_votes")
          .upsert({ post_id: postId, user_id: user.id, value }, { onConflict: "post_id,user_id" });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["community_posts", active] });
      queryClient.invalidateQueries({ queryKey: ["my_post_votes", active] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleNewPostClick = async () => {
    try {
      await ensureCommunityUser();
    } catch (err) {
      toast.error((err as Error).message);
      return;
    }
    setShowForm((v) => !v);
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setPosting(true);
    try {
      const user = await ensureCommunityUser();
      const { error } = await supabase
        .from("community_posts")
        .insert({ board_slug: active, author_id: user.id, title: newTitle.trim() });
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
          ar: "لكل قطاع لوحة نقاش مستقلة. اطرح فكرتك، صوّت للمنشورات، وناقش التحليلات.",
          en: "Every sector has its own board. Post ideas, vote, and debate analysis.",
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
                  {postsQuery.data?.length ?? 0} {t(ui.posts)}
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

            <div className="mb-4 flex gap-1.5">
              {(
                [
                  { key: "hot", label: { ar: "الأكثر تفاعلاً", en: "Hot" }, icon: Flame },
                  { key: "new", label: { ar: "الأحدث", en: "New" } },
                  { key: "top", label: { ar: "الأعلى تقييماً", en: "Top" } },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSort(opt.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    sort === opt.key
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border/70 bg-card hover:bg-muted",
                  )}
                >
                  {"icon" in opt && opt.icon && <opt.icon className="size-3.5" />}
                  {t(opt.label)}
                </button>
              ))}
            </div>

            {postsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                {t({ ar: "يحمّل...", en: "Loading..." })}
              </p>
            )}

            {postsQuery.data && postsQuery.data.length === 0 && (
              <Panel className="text-center">
                <p className="text-sm text-muted-foreground">
                  {t({
                    ar: "لا يوجد منشورات بعد بهذه اللوحة — كن أول من ينشر.",
                    en: "No posts yet on this board — be the first to post.",
                  })}
                </p>
              </Panel>
            )}

            <div className="space-y-3">
              {posts.map((post) => {
                const myVote = myVotesQuery.data?.[post.id];
                return (
                  <Panel
                    key={post.id}
                    className="flex gap-4 transition-colors hover:border-foreground/15"
                  >
                    <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
                      <button
                        onClick={() => vote(post.id, 1)}
                        aria-label={t({ ar: "تصويت إيجابي", en: "Upvote" })}
                        className={cn(
                          "rounded-md p-1 transition-colors hover:bg-muted",
                          myVote === 1 && "text-brand",
                        )}
                      >
                        <ArrowBigUp className={cn("size-5", myVote === 1 && "fill-current")} />
                      </button>
                      <span className="text-sm font-bold">{post.score}</span>
                      <button
                        onClick={() => vote(post.id, -1)}
                        aria-label={t({ ar: "تصويت سلبي", en: "Downvote" })}
                        className={cn(
                          "rounded-md p-1 transition-colors hover:bg-muted",
                          myVote === -1 && "text-tone-rose",
                        )}
                      >
                        <ArrowBigDown className={cn("size-5", myVote === -1 && "fill-current")} />
                      </button>
                    </div>

                    <Link
                      to="/community/$postId"
                      params={{ postId: post.id }}
                      className="min-w-0 flex-1"
                    >
                      <div className="text-xs text-muted-foreground">
                        {authorLabel(post.author_id, t)} ·{" "}
                        {new Date(post.created_at).toLocaleDateString(
                          locale === "ar" ? "ar-SA" : "en-US",
                        )}
                      </div>
                      <h3 className="mt-2 text-sm font-bold leading-7">{post.title}</h3>
                      <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MessageCircle className="size-4" />
                        {post.comment_count} {t({ ar: "تعليق", en: "comments" })}
                      </div>
                    </Link>
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
