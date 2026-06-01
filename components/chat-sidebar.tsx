'use client'

import { useState, useMemo } from 'react'
import { X, Plus, MessageSquare, Search, SlidersHorizontal } from 'lucide-react'
import type { Conversation } from '@/app/page'

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  onOpenGlobalSettings: () => void
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
  onOpenGlobalSettings,
}: ChatSidebarProps) {
  const [query, setQuery] = useState('')

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
        {/* Header: search input + settings icon */}
        <div className="px-4 pt-12 pb-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            {/* Search field */}
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
                  text-white/70 placeholder:text-white/35 font-mono"
                aria-label="Search conversations"
              />
              {/* Single clear button — only when there is a query */}
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

            {/* Settings (sliders) icon — opens global defaults */}
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
              text-[11px] font-mono font-medium text-white/75 hover:text-white
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
              <div
                className="w-11 h-11 rounded-2xl glass flex items-center justify-center"
                aria-hidden="true"
              >
                <MessageSquare style={{ width: '18px', height: '18px', color: '#d6cfc4', opacity: 0.2 }} />
              </div>
              <p className="text-[11px] text-white/35 text-center leading-relaxed font-mono">
                {query ? 'No matches found.' : 'No conversations yet.\nStart a new chat above.'}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5" role="list">
              {filtered.map((conv) => {
                const isActive = conv.id === activeId
                const preview = conv.messages.at(-1)?.content?.slice(0, 60) ?? 'No messages yet'
                return (
                  <li key={conv.id}>
                    <button
                      onClick={() => onSelect(conv.id)}
                      className="w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150
                        flex flex-col gap-0.5"
                      style={{
                        background: isActive ? 'rgba(79,70,229,0.15)' : 'transparent',
                        border: isActive
                          ? '1px solid rgba(99,72,219,0.25)'
                          : '1px solid transparent',
                      }}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-[11px] font-mono font-medium truncate"
                          style={{ color: isActive ? '#a5b4fc' : '#d6cfc4' }}
                        >
                          {conv.title}
                        </span>
                        <span
                          className="text-[10px] font-mono shrink-0"
                          style={{ color: '#d6cfc4', opacity: 0.45 }}
                        >
                          {formatRelativeTime(conv.updatedAt)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-white/35 truncate leading-relaxed">
                        {preview}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
