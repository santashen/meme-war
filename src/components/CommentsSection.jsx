function CommentsSection({
  postId,
  comments,
  draft,
  commenting,
  isLoggedIn,
  onDraftChange,
  onSubmit,
}) {
  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="text-xs font-semibold text-slate-600">评论 ({comments.length})</p>

      <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-400">还没有评论</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-md bg-slate-50 px-2 py-1">
              <p className="text-xs text-slate-700">
                <span className="font-semibold">{comment.username || '匿名用户'}</span>: {comment.content}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          value={draft}
          onChange={(event) => onDraftChange(postId, event.target.value)}
          placeholder={isLoggedIn ? '写点评论...' : '登录后可评论'}
          disabled={!isLoggedIn || commenting}
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
        />
        <button
          type="button"
          onClick={() => onSubmit(postId)}
          disabled={!isLoggedIn || commenting || !draft.trim()}
          className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          发送
        </button>
      </div>
    </div>
  )
}

export default CommentsSection
