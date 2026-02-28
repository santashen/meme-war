function ConfigNotice() {
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
      未检测到 Supabase 环境变量。请在 `.env` 中设置 `VITE_SUPABASE_URL` 与
      `VITE_SUPABASE_ANON_KEY`。
    </div>
  )
}

export default ConfigNotice
