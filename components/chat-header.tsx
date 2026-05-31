'use client'

import { useState, useRef, useEffect } from 'react'
import { Menu, MoreHorizontal } from 'lucide-react'

interface ChatHeaderProps {
  onMenuClick: () => void
  title: string
  onRename: (title: string) => void
  onOpenConvSettings: () => void
}

export function ChatHeader({ onMenuClick, title, onRename, onOpenConvSettings }: ChatHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep draft in sync when external title changes (e.g. auto-title from first message)
  useEffect(() => {
    if (!editing) setDraft(title)
  }, [title, editing])

  function startEdit() {
    setDraft(title)
    setEditing(true)
    setTimeout(() => {
      inputRef.current?.select()
    }, 0)
  }

  function commit() {
    setEditing(false)
    onRename(draft)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setEditing(false); setDraft(title) }
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-12"
      style={{
        background: 'rgba(3,3,8,0.6)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Menu button */}
      <button
        onClick={onMenuClick}
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0
          text-[#d6cfc4] hover:text-white hover:bg-white/[0.08]
          transition-all duration-200 active:scale-95"
        aria-label="Open chat history"
      >
        <Menu style={{ width: '16px', height: '16px' }} />
      </button>

      {/* Editable conversation title */}
      <div className="flex-1 flex justify-center px-2 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-b border-white/20 outline-none text-[11px]
              text-white/80 font-mono text-center w-full max-w-[180px] pb-0.5
              caret-indigo-400"
            aria-label="Rename conversation"
            maxLength={60}
          />
        ) : (
          <button
            onClick={startEdit}
            className="text-[11px] font-mono text-white/50 hover:text-white/80
              transition-colors duration-200 truncate max-w-[180px]"
            aria-label={`Conversation title: ${title}. Tap to rename.`}
            title="Tap to rename"
          >
            {title}
          </button>
        )}
      </div>

      {/* Per-conversation settings */}
      <button
        onClick={onOpenConvSettings}
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0
          text-[#d6cfc4] hover:text-white hover:bg-white/[0.08]
          transition-all duration-200 active:scale-95"
        aria-label="Conversation settings"
      >
        <MoreHorizontal style={{ width: '16px', height: '16px' }} />
      </button>
    </header>
  )
}
