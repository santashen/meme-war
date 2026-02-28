import CommentsSection from './CommentsSection'

function PostsGrid({
  posts,
  likingIds,
  onLike,
  commentsByPost,
  commentDrafts,
  commentingByPost,
  isLoggedIn,
  onCommentDraftChange,
  onCommentSubmit,
}) {
  return (
    <section className="columns-1 gap-4 sm:columns-2 lg:columns-3">
      {posts.map((post) => (
        <article
          key={post.id}
          className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <img src={post.image_url} alt={post.title || 'meme'} className="w-full object-cover" />
          <div className="p-3">
            <h2 className="font-medium">{post.title || 'Untitled meme'}</h2>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleString()}</p>
              <button
                type="button"
                onClick={() => onLike(post.id)}
                disabled={!!likingIds[post.id]}
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                👍 {post.votes ?? 0}
              </button>
            </div>
            <CommentsSection
              postId={post.id}
              comments={commentsByPost[post.id] ?? []}
              draft={commentDrafts[post.id] ?? ''}
              commenting={!!commentingByPost[post.id]}
              isLoggedIn={isLoggedIn}
              onDraftChange={onCommentDraftChange}
              onSubmit={onCommentSubmit}
            />
          </div>
        </article>
      ))}
    </section>
  )
}

export default PostsGrid
