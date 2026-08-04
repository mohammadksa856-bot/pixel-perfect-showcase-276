import { useState } from "react";
import { createFileRoute, notFound, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowBigDown, ArrowBigUp, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { PageShell, Container } from "@/components/page-shell";
import { Panel } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/community/$postId")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("community_posts")
      .select("id, title, created_at, author_id, board_slug, score, comment_count")
      .eq("id", params.postId)
      .maybeSingle();
    if (error || !data) throw notFound();
    return { post: data };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.post.title} | معرفة استثمار` : "منشور | معرفة استثمار" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PostPage,
});

function authorLabel(authorId: string, t: (v: { ar: string; en: string }) => string) {
  return `${t({ ar: "مستثمر", en: "Investor" })} #${authorId.slice(0, 4)}`;
}

function PostPage() {
  const { post } = Route.useLoaderData();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  const postQuery = useQuery({
    queryKey: ["community_post", post.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, title, created_at, author_id, board_slug, score, comment_count")
        .eq("id", post.id)
        .single();
      if (error) throw error;
      return data;
    },
    initialData: post,
  });

  const myVoteQuery = useQuery({
    queryKey: ["my_post_vote", post.id],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("community_post_votes")
        .select("value")
        .eq("post_id", post.id)
        .eq("user_id", auth.user.id)
        .maybeSingle();
      return data?.value ?? null;
    },
  });

  const commentsQuery = useQuery({
    queryKey: ["community_comments", post.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_comments")
        .select("id, body, created_at, author_id")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const vote = async (value: 1 | -1) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      navigate({ to: "/auth", search: { denied: false } });
      return;
    }
    try {
      if (myVoteQuery.data === value) {
        const { error } = await supabase
          .from("community_post_votes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", auth.user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("community_post_votes")
          .upsert(
            { post_id: post.id, user_id: auth.user.id, value },
            { onConflict: "post_id,user_id" },
          );
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["community_post", post.id] });
      queryClient.invalidateQueries({ queryKey: ["my_post_vote", post.id] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate({ to: "/auth", search: { denied: false } });
        return;
      }
      const { error } = await supabase
        .from("community_comments")
        .insert({ post_id: post.id, author_id: auth.user.id, body: comment.trim() });
      if (error) throw error;
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["community_comments", post.id] });
      queryClient.invalidateQueries({ queryKey: ["community_post", post.id] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPosting(false);
    }
  };

  const p = postQuery.data;

  return (
    <PageShell>
      <Container>
        <nav className="flex items-center gap-1.5 pt-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            {t(ui.home)}
          </Link>
          <ChevronLeft className="size-3.5 rtl:rotate-180" />
          <Link to="/community" className="hover:text-foreground">
            {t(ui.community)}
          </Link>
          <ChevronLeft className="size-3.5 rtl:rotate-180" />
          <span className="line-clamp-1 text-foreground">{p.title}</span>
        </nav>

        <Panel className="mt-6 flex gap-4">
          <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
            <button
              onClick={() => vote(1)}
              aria-label={t({ ar: "تصويت إيجابي", en: "Upvote" })}
              className={cn(
                "rounded-md p-1 transition-colors hover:bg-muted",
                myVoteQuery.data === 1 && "text-brand",
              )}
            >
              <ArrowBigUp className={cn("size-6", myVoteQuery.data === 1 && "fill-current")} />
            </button>
            <span className="text-base font-bold">{p.score}</span>
            <button
              onClick={() => vote(-1)}
              aria-label={t({ ar: "تصويت سلبي", en: "Downvote" })}
              className={cn(
                "rounded-md p-1 transition-colors hover:bg-muted",
                myVoteQuery.data === -1 && "text-tone-rose",
              )}
            >
              <ArrowBigDown className={cn("size-6", myVoteQuery.data === -1 && "fill-current")} />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">
              {authorLabel(p.author_id, t)} ·{" "}
              {new Date(p.created_at).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
            </div>
            <h1 className="mt-2 text-lg font-bold leading-8">{p.title}</h1>
          </div>
        </Panel>

        <div className="mt-8">
          <h2 className="mb-4 text-sm font-bold">
            {p.comment_count} {t({ ar: "تعليق", en: "comments" })}
          </h2>

          <form onSubmit={submitComment} className="mb-6 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t({ ar: "اكتب تعليقك...", en: "Write a comment..." })}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
            <button
              type="submit"
              disabled={posting}
              className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground disabled:opacity-60"
            >
              {t({ ar: "تعليق", en: "Comment" })}
            </button>
          </form>

          {commentsQuery.data && commentsQuery.data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t({
                ar: "لا يوجد تعليقات بعد — كن أول من يعلّق.",
                en: "No comments yet — be the first.",
              })}
            </p>
          )}

          <div className="space-y-3">
            {commentsQuery.data?.map((c) => (
              <Panel key={c.id}>
                <div className="text-xs text-muted-foreground">
                  {authorLabel(c.author_id, t)} ·{" "}
                  {new Date(c.created_at).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
                </div>
                <p className="mt-2 text-sm leading-7">{c.body}</p>
              </Panel>
            ))}
          </div>
        </div>
      </Container>
    </PageShell>
  );
}
