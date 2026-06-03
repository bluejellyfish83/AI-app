'use client'

import { useState, useMemo, useRef } from 'react'
import { X, Plus, MessageSquare, Search, SlidersHorizontal, Trash2, LogOut } from 'lucide-react'
import type { Conversation } from '@/app/page'

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onOpenGlobalSettings: () => void
  onLogout?: () => void
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export function ChatSidebar({
  isOpen,
  onClose,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onOpenGlobalSettings,
  onLogout,
}: ChatSidebarProps) {
  const [query, setQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  // Track which item is "locked open" (user swiped past threshold)
  const [lockedOpenId, setLockedOpenId] = useState<string | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; id: string; active: boolean } | null>(null)

  // Sort newest first, then filter
  const filtered = useMemo(() => {
    const sorted = [...conversations].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    )
    if (!query.trim()) return sorted
    const q = query.toLowerCase()
    return sorted.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.at(-1)?.content?.toLowerCase().includes(q),
    )
  }, [conversations, query])

  function closeSwipe(id?: string) {
    setLockedOpenId((prev) => (prev === id || !id ? null : prev))
    setConfirmId(null)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Chat history"
        className={`fixed left-0 top-0 bottom-0 z-50 w-[272px] sidebar-glass flex flex-col
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="px-4 pt-12 pb-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <div
              className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Search
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: '#d6cfc4', opacity: 0.5 }}
                aria-hidden="true"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="flex-1 bg-transparent border-none outline-none text-[11px]
                  text-white/70 placeholder:text-white/35"
                aria-label="Search conversations"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="transition-colors duration-150"
                  style={{ color: '#d6cfc4', opacity: 0.4 }}
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={onOpenGlobalSettings}
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                hover:bg-white/[0.08] transition-all duration-200"
              style={{ color: '#d6cfc4', opacity: 0.6 }}
              aria-label="Global default settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* New chat */}
        <div className="px-4 py-3">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl
              text-[11px] font-medium text-white/75 hover:text-white
              transition-all duration-200 group"
            style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.18), rgba(124,58,237,0.13))',
              border: '1px solid rgba(99,72,219,0.28)',
            }}
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform duration-200" />
            New conversation
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
              <div className="w-11 h-11 rounded-2xl glass flex items-center justify-center">
                <MessageSquare style={{ width: '18px', height: '18px', color: '#d6cfc4', opacity: 0.2 }} />
              </div>
              <p className="text-[11px] text-white/35 text-center leading-relaxed">
                {query ? 'No matches found.' : 'No conversations yet.\nStart a new chat above.'}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5" role="list">
              {filtered.map((conv) => {
                const isActive = conv.id === activeId
                const preview = conv.messages.at(-1)?.content?.slice(0, 60) ?? 'No messages yet'
                const isLockedOpen = lockedOpenId === conv.id
                const isConfirming = confirmId === conv.id

                // ── Swipe handlers (React synthetic events) ──
                function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
                  closeSwipe(lockedOpenId ?? undefined)
                  dragRef.current = { startX: e.clientX, startY: e.clientY, id: conv.id, active: true }
                  // Capture pointer so the wrapper keeps getting events even if the finger
                  // moves outside the inner <button> or across element boundaries.
                  e.currentTarget.setPointerCapture(e.pointerId)
                }

                function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
                  if (!dragRef.current || dragRef.current.id !== conv.id || !dragRef.current.active) return
                  if (e.buttons === 0) { dragRef.current = null; return }
                  const dx = e.clientX - dragRef.current.startX
                  const dy = e.clientY - dragRef.current.startY
                  // If vertical, cancel drag
                  if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 10) {
                    dragRef.current.active = false
                    return
                  }
                }

                function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
                  if (!dragRef.current || dragRef.current.id !== conv.id) return
                  const dx = e.clientX - dragRef.current.startX
                  const dy = e.clientY - dragRef.current.startY
                  const wasActive = dragRef.current.active
                  dragRef.current = null
                  if (!wasActive) return

                  // Small movement = tap / click (select conversation)
                  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
                    if (isLockedOpen) {
                      setLockedOpenId(null)
                      setConfirmId(null)
                    } else {
                      closeSwipe()
                      onSelect(conv.id)
                    }
                    return
                  }

                  // Swipe left past threshold => reveal delete button
                  if (dx < -30) {
                    setLockedOpenId(conv.id)
                  }
                }

                function handlePointerCancel() {
                  if (dragRef.current?.id === conv.id) {
                    dragRef.current = null
                  }
                }

                function handleConfirmDelete() {
                  setConfirmId(null)
                  setDeletingId(conv.id)
                  setLockedOpenId(null)
                  setTimeout(() => {
                    onDelete(conv.id)
                    setDeletingId(null)
                  }, 200)
                }

                // Kept on the <button> so keyboard / screen-reader activation still works
                function handleActivate() {
                  if (isLockedOpen) {
                    setLockedOpenId(null)
                    setConfirmId(null)
                    return
                  }
                  closeSwipe()
                  onSelect(conv.id)
                }

                return (
                  <li
                    key={conv.id}
                    className={`relative rounded-xl overflow-hidden transition-all duration-200 ${
                      deletingId === conv.id ? 'scale-95 opacity-0' : ''
                    }`}
                  >
                    {/* Red delete button (behind, revealed on swipe) */}
                    <div
                      className="absolute right-0.5 top-0 bottom-0 flex items-center z-0
                        transition-opacity duration-150"
                      style={{ opacity: isLockedOpen ? 1 : 0 }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmId(conv.id) }}
                        className="w-8 h-8 rounded-full flex items-center justify-center
                          transition-transform duration-150 active:scale-90"
                        style={{ background: 'rgba(220,38,38,0.9)' }}
                        aria-label={`Delete ${conv.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>

                    {/* Conversation item — slides left when swiped */}
                    <div
                      className="relative z-10 rounded-xl transition-transform duration-200"
                      style={{
                        transform: isLockedOpen ? 'translateX(-42px)' : 'translateX(0)',
                        background: isLockedOpen ? 'rgba(6,6,14,0.97)' : 'transparent',
                        // CRITICAL: tell browser to handle only vertical scrolling here,
                        // leaving horizontal drags for our code.
                        touchAction: 'pan-y',
                      }}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerCancel}
                    >
                      <button
                        onClick={handleActivate}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleActivate()
                          }
                        }}
                        className="w-full text-left px-3 py-2.5 transition-colors duration-150
                          flex flex-col gap-0.5"
                        style={{
                          background: isActive && !isLockedOpen ? 'rgba(79,70,229,0.15)' : 'transparent',
                          border: isActive
                            ? '1px solid rgba(99,72,219,0.25)'
                            : '1px solid transparent',
                        }}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-[11px] font-medium truncate"
                            style={{ color: isActive ? '#a5b4fc' : '#d6cfc4' }}
                          >
                            {conv.title}
                          </span>
                          <span
                            className="text-[10px] shrink-0"
                            style={{ color: '#d6cfc4', opacity: 0.45 }}
                          >
                            {formatRelativeTime(conv.updatedAt)}
                          </span>
                        </div>
                        <span className="text-[10px] text-white/35 truncate leading-relaxed">
                          {preview}
                        </span>
                      </button>
                    </div>

                    {/* Confirm delete overlay */}
                    {isConfirming && (
                      <div
                        className="absolute inset-0 flex items-center justify-center gap-2 z-20 rounded-xl"
                        style={{ background: 'rgba(8,8,18,0.94)', backdropFilter: 'blur(8px)' }}
                      >
                        <span className="text-[11px] text-white/70 mr-1">Delete?</span>
                        <button
                          onClick={() => { setConfirmId(null); setLockedOpenId(null) }}
                          className="px-3 py-1 rounded-lg text-[11px] text-white/60
                            transition-colors duration-150 hover:text-white/80"
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmDelete}
                          className="px-3 py-1 rounded-lg text-[11px] text-white
                            transition-colors duration-150"
                          style={{ background: 'rgba(220,38,38,0.85)' }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Logout button */}
        {onLogout && (
          <div className="px-4 py-3 border-t border-white/[0.07]">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl
                text-[11px] text-white/40 hover:text-white/60 transition-all duration-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
