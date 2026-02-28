function Navbar({ authLoading, isLoggedIn, username, onSignIn, onSignOut, onEditNickname }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <h1 className="text-lg font-bold tracking-tight">Meme War</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">
            {authLoading ? '登录状态加载中...' : isLoggedIn ? `已登录：${username}` : '未登录'}
          </span>
          <button
            type="button"
            onClick={isLoggedIn ? onSignOut : onSignIn}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            {isLoggedIn ? '退出登录' : 'Magic Link 登录'}
          </button>
          {isLoggedIn && (
            <button
              type="button"
              onClick={() => onEditNickname()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            >
              修改昵称
            </button>
          )}
        </div>
      </nav>
    </header>
  )
}

export default Navbar
