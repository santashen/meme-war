import { useEffect, useRef, useState } from 'react'
import ConfigNotice from './components/ConfigNotice'
import Navbar from './components/Navbar'
import PostsGrid from './components/PostsGrid'
import UploadFab from './components/UploadFab'
import { isSupabaseConfigured, supabase } from './lib/supabaseClient'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [commentsByPost, setCommentsByPost] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [commentingByPost, setCommentingByPost] = useState({})
  const [authLoading, setAuthLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [likingIds, setLikingIds] = useState({})
  const fileInputRef = useRef(null)

  const fetchPosts = async () => {
    if (!supabase) return

    setPostsLoading(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, created_at, title, image_url, user_id, votes')
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        setPosts([])
        setCommentsByPost({})
        return
      }

      const nextPosts = data ?? []
      setPosts(nextPosts)
      await fetchComments(nextPosts.map((post) => post.id))
    } catch (error) {
      console.error(error)
      setPosts([])
      setCommentsByPost({})
    } finally {
      setPostsLoading(false)
    }
  }

  const fetchComments = async (postIds) => {
    if (!supabase || postIds.length === 0) {
      if (!postIds.length) setCommentsByPost({})
      return
    }

    const { data, error } = await supabase
      .from('comments')
      .select('id, post_id, content, created_at, user_id, profiles(username)')
      .in('post_id', postIds)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    const next = {}
    for (const row of data ?? []) {
      if (!next[row.post_id]) next[row.post_id] = []
      next[row.post_id].push({
        id: row.id,
        post_id: row.post_id,
        content: row.content,
        created_at: row.created_at,
        user_id: row.user_id,
        username: row.profiles?.username || '匿名用户',
      })
    }
    setCommentsByPost(next)
  }

  const fetchProfile = async (userId) => {
    if (!supabase || !userId) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error(error)
      return null
    }

    setProfile(data)
    return data
  }

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      setPostsLoading(false)
      return
    }

    let isMounted = true

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession?.user?.id) {
        setProfile(null)
        return
      }

      // Avoid awaiting Supabase calls inside auth callback to prevent auth deadlocks.
      void fetchProfile(nextSession.user.id)
    })

    const postsChannel = supabase
      .channel('posts-realtime-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          const nextRow = payload.new
          setPosts((prevPosts) =>
            prevPosts.map((post) => (post.id === nextRow.id ? { ...post, ...nextRow } : post)),
          )
        },
      )
      .subscribe()

    const commentsChannel = supabase
      .channel('comments-realtime-inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        async (payload) => {
          const inserted = payload.new
          const { data: row } = await supabase
            .from('comments')
            .select('id, post_id, content, created_at, user_id, profiles(username)')
            .eq('id', inserted.id)
            .maybeSingle()

          if (!row) return

          const nextComment = {
            id: row.id,
            post_id: row.post_id,
            content: row.content,
            created_at: row.created_at,
            user_id: row.user_id,
            username: row.profiles?.username || '匿名用户',
          }

          setCommentsByPost((prev) => {
            const current = prev[nextComment.post_id] ?? []
            if (current.some((item) => item.id === nextComment.id)) return prev
            return { ...prev, [nextComment.post_id]: [...current, nextComment] }
          })
        },
      )
      .subscribe()

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!isMounted) return

        setSession(data.session)

        const userId = data.session?.user?.id
        if (userId) {
          await fetchProfile(userId)
        }

        await fetchPosts()
      } catch (error) {
        console.error(error)
      } finally {
        if (isMounted) {
          setAuthLoading(false)
          setPostsLoading(false)
        }
      }
    }

    void init()

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
      supabase.removeChannel(postsChannel)
      supabase.removeChannel(commentsChannel)
    }
  }, [])

  const handleSignIn = async () => {
    if (!supabase) return
    const email = window.prompt('请输入邮箱，我们会发送登录验证码')
    if (!email) return
    const normalizedEmail = email.trim()
    if (!normalizedEmail) return

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
    })

    if (error) {
      window.alert(`验证码发送失败：${error.message}`)
      return
    }

    const token = window.prompt('请输入邮箱中的 8 位验证码')
    if (!token) return

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: token.trim(),
      type: 'email',
    })

    if (verifyError) {
      window.alert(`验证码校验失败：${verifyError.message}`)
      return
    }

    window.alert('登录成功。')
  }

  const handleSignOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) window.alert(`退出失败：${error.message}`)
  }

  const handleEditNickname = async (forcedUserId) => {
    if (!supabase) return
    const userId = typeof forcedUserId === 'string' ? forcedUserId : session?.user?.id
    if (!userId) return

    const nextName = window.prompt('请输入昵称（2-30个字符）', profile?.username || '')
    if (!nextName) return

    const trimmed = nextName.trim()
    if (trimmed.length < 2 || trimmed.length > 30) {
      window.alert('昵称长度需要在 2-30 个字符之间。')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', userId)
      .select() // <--- 这一步很重要，让它返回更新后的数据

    console.log('调试信息:', { data, error, userId }) // 打开浏览器控制台看这个

    if (error) {
      window.alert(`更新昵称失败：${error.message}`)
      return
    }

    await fetchProfile(userId)
  }

  const handleUploadButtonClick = () => {
    if (!isSupabaseConfigured) {
      window.alert('请先在 .env 中配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY')
      return
    }
    if (!session) {
      window.alert('请先登录再上传。')
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    if (!supabase || !session) return

    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
    const safeExt = ext?.toLowerCase() || 'jpg'
    const filePath = `${session.user.id}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`

    const { error: uploadError } = await supabase.storage
      .from('memes')
      .upload(filePath, file, { upsert: false })

    if (uploadError) {
      window.alert(`上传图片失败：${uploadError.message}`)
      setUploading(false)
      event.target.value = ''
      return
    }

    const { data } = supabase.storage.from('memes').getPublicUrl(filePath)
    const inputTitle = window.prompt('请输入标题（可选）')

    const { error: insertError } = await supabase.from('posts').insert({
      title: inputTitle?.trim() || file.name,
      image_url: data.publicUrl,
      user_id: session.user.id,
    })

    if (insertError) {
      window.alert(`写入帖子失败：${insertError.message}`)
      setUploading(false)
      event.target.value = ''
      return
    }

    await fetchPosts()
    setUploading(false)
    event.target.value = ''
  }

  const handleLike = async (postId) => {
    if (!supabase) return
    if (!session) {
      window.alert('请先登录再点赞。')
      return
    }
    if (likingIds[postId]) return

    setLikingIds((prev) => ({ ...prev, [postId]: true }))

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId ? { ...post, votes: (post.votes ?? 0) + 1 } : post,
      ),
    )

    const { error } = await supabase.rpc('increment_post_votes', { p_post_id: postId })

    if (error) {
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, votes: Math.max((post.votes ?? 1) - 1, 0) } : post,
        ),
      )
      window.alert(`点赞失败：${error.message}`)
    }

    setLikingIds((prev) => ({ ...prev, [postId]: false }))
  }

  const handleCommentDraftChange = (postId, value) => {
    setCommentDrafts((prev) => ({ ...prev, [postId]: value }))
  }

  const handleCommentSubmit = async (postId) => {
    if (!supabase) return
    if (!session) {
      window.alert('请先登录再评论。')
      return
    }
    if (!profile?.username) {
      window.alert('请先设置昵称再评论。')
      await handleEditNickname()
      return
    }

    const content = (commentDrafts[postId] || '').trim()
    if (!content) return
    if (commentingByPost[postId]) return

    setCommentingByPost((prev) => ({ ...prev, [postId]: true }))

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: session.user.id,
        content,
      })
      .select('id, post_id, content, created_at, user_id, profiles(username)')
      .single()

    if (error) {
      window.alert(`评论失败：${error.message}`)
      setCommentingByPost((prev) => ({ ...prev, [postId]: false }))
      return
    }

    const nextComment = {
      id: data.id,
      post_id: data.post_id,
      content: data.content,
      created_at: data.created_at,
      user_id: data.user_id,
      username: data.profiles?.username || profile.username,
    }

    setCommentsByPost((prev) => {
      const current = prev[postId] ?? []
      if (current.some((item) => item.id === nextComment.id)) return prev
      return { ...prev, [postId]: [...current, nextComment] }
    })
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }))
    setCommentingByPost((prev) => ({ ...prev, [postId]: false }))
  }

  const username = profile?.username || session?.user?.email?.split('@')?.[0] || 'User'

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar
        authLoading={authLoading}
        isLoggedIn={!!session}
        username={username}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onEditNickname={handleEditNickname}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        {!isSupabaseConfigured && <ConfigNotice />}

        {postsLoading ? (
          <p className="text-sm text-slate-500">加载帖子中...</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-slate-500">还没有帖子，上传第一张 Meme 吧。</p>
        ) : (
          <PostsGrid
            posts={posts}
            likingIds={likingIds}
            onLike={handleLike}
            commentsByPost={commentsByPost}
            commentDrafts={commentDrafts}
            commentingByPost={commentingByPost}
            isLoggedIn={!!session}
            onCommentDraftChange={handleCommentDraftChange}
            onCommentSubmit={handleCommentSubmit}
          />
        )}
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <UploadFab uploading={uploading} onClick={handleUploadButtonClick} />
    </div>
  )
}

export default App
