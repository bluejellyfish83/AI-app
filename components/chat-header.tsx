'use client'

import { useState, useRef, useEffect } from 'react'
import { Menu, MoreHorizontal, Undo2, X } from 'lucide-react'

interface ChatHeaderProps {
  onMenuClick: () => void
  title: string
  onRename: (title: string) => void
  onOpenConvSettings: () => void
  fontSize?: number
  fontFamily?: 'mono' | 'sans'
  isBranched?: boolean
  onGoBackBranch?: (deleteBranch: boolean) => void
}

export function ChatHeader({ onMenuClick, title, onRename, onOpenConvSettings, fontSize = 11, fontFamily = 'mono', isBranched, onGoBackBranch }: ChatHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const [showBranchConfirm, setShowBranchConfirm] = useState(false)
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

      {/* Undo branch button + editable title */}
      <div className="flex-1 flex items-center justify-center px-2 min-w-0 gap-1">
        {isBranched && onGoBackBranch && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowBranchConfirm(!showBranchConfirm)}
              className="w-6 h-6 rounded-lg flex items-center justify-center
                hover:bg-white/[0.08] transition-all duration-200"
              style={{ color: '#d6cfc4', opacity: 0.5 }}
              aria-label="Go back to original conversation"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            {showBranchConfirm && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50
                  flex flex-col gap-2 p-3 rounded-xl whitespace-nowrap"
                style={{
                  background: 'rgba(8,8,18,0.95)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  minWidth: '200px',
                }}
              >
                <p className="text-[11px] text-white/60 text-center">Return to original conversation?</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => { setShowBranchConfirm(false); onGoBackBranch(false) }}
                    className="px-3 py-1 rounded-lg text-[11px] text-white/60
                      transition-colors duration-150 hover:text-white/80"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Keep branch
                  </button>
                  <button
                    onClick={() => { setShowBranchConfirm(false); onGoBackBranch(true) }}
                    className="px-3 py-1 rounded-lg text-[11px] text-white
                      transition-colors duration-150"
                    style={{ background: 'rgba(220,38,38,0.85)' }}
                  >
                    Delete & return
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            className={`bg-transparent border-b border-white/20 outline-none
              text-white/80 text-center w-full max-w-[180px] pb-0.5
              caret-indigo-400 ${fontFamily === 'sans' ? 'font-sans' : 'font-mono'}`}
            style={{ fontSize: `${fontSize}px` }}
            aria-label="Rename conversation"
            maxLength={60}
          />
        ) : (
          <button
            onClick={startEdit}
            className={`text-white/50 hover:text-white/80
              transition-colors duration-200 truncate max-w-[180px] ${fontFamily === 'sans' ? 'font-sans' : 'font-mono'}`}
            style={{ fontSize: `${fontSize}px` }}
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
