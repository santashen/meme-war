function UploadFab({ uploading, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={uploading}
      className="fixed bottom-6 right-6 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-600"
    >
      {uploading ? '上传中...' : '+ 上传'}
    </button>
  )
}

export default UploadFab
