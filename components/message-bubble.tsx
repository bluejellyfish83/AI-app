'use client'

import { useState, useRef, useEffect } from 'react'
import { Copy, GitBranch, Trash2, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type MessageRole = 'user' | 'ai'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
}

interface MessageBubbleProps {
  message: Message
  onCopy?: () => void
  onDelete?: () => void
  onBranch?: () => void
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function formatDateLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (msgDay.getTime() === today.getTime()) return 'Today'
  if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday'

  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

export function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center my-1" aria-label={`Messages from ${label}`}>
      <span
        className="px-3 py-0.5 rounded-full text-[10px] tracking-wide text-white/42"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {label}
      </span>
    </div>
  )
}

export function UserBubble({ message, onCopy, onDelete, onBranch }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [pending, setPending] = useState<'delete' | 'branch' | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-reset pending state after 3 seconds
  useEffect(() => {
    if (pending) {
      resetTimerRef.current = setTimeout(() => setPending(null), 3000)
      return () => { if (resetTimerRef.current) clearTimeout(resetTimerRef.current) }
    }
  }, [pending])

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    onCopy?.()
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = () => {
    if (pending === 'delete') {
      setPending(null)
      onDelete?.()
    } else {
      setPending('delete')
    }
  }

  const handleBranch = () => {
    if (pending === 'branch') {
      setPending(null)
      onBranch?.()
    } else {
      setPending('branch')
    }
  }

  return (
    <div className="group w-full flex flex-col items-end gap-0.5">
      <div className="w-full flex justify-end">
        <div
          className="bubble-user px-3 py-1.5 rounded-[18px] rounded-br-sm
            leading-[1.5] text-white font-normal max-w-[72%] whitespace-pre-wrap break-words"
          style={{ fontSize: 'var(--chat-font-size, 11px)' }}
        >
          {message.content}
        </div>
      </div>
      <div className="flex items-center gap-1 pr-0.5">
        <div className="flex items-center gap-0.5
          opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{ marginTop: '1px' }}
        >
          <button
            onClick={handleCopy}
            className="w-5 h-5 rounded flex items-center justify-center
              hover:bg-white/[0.08] transition-all duration-150"
            style={{ color: '#d6cfc4', opacity: 0.45 }}
            aria-label="Copy message"
            type="button"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
          {onBranch && (
            <button
              onClick={handleBranch}
              className="w-5 h-5 rounded flex items-center justify-center
                hover:bg-white/[0.08] transition-all duration-150"
              style={{ color: pending === 'branch' ? '#818cf8' : '#d6cfc4', opacity: pending === 'branch' ? 1 : 0.45 }}
              aria-label={pending === 'branch' ? 'Confirm branch' : 'Branch conversation here'}
              type="button"
            >
              <GitBranch className="w-3 h-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="w-5 h-5 rounded flex items-center justify-center
                hover:bg-white/[0.08] transition-all duration-150"
              style={{ color: pending === 'delete' ? '#ef4444' : '#d6cfc4', opacity: pending === 'delete' ? 1 : 0.45 }}
              aria-label={pending === 'delete' ? 'Confirm delete' : 'Delete message'}
              type="button"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        <span className="text-[10px] text-white/38 tabular-nums">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
}

export function AIBubble({ message, onCopy, onDelete, onBranch }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [pending, setPending] = useState<'delete' | 'branch' | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (pending) {
      resetTimerRef.current = setTimeout(() => setPending(null), 3000)
      return () => { if (resetTimerRef.current) clearTimeout(resetTimerRef.current) }
    }
  }, [pending])

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    onCopy?.()
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = () => {
    if (pending === 'delete') {
      setPending(null)
      onDelete?.()
    } else {
      setPending('delete')
    }
  }

  const handleBranch = () => {
    if (pending === 'branch') {
      setPending(null)
      onBranch?.()
    } else {
      setPending('branch')
    }
  }

  return (
    <div className="group w-full text-left py-1">
      <div
        className="markdown-body"
        style={{ fontSize: 'var(--chat-font-size, 11px)' }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      </div>
      <div className="flex items-center gap-0.5 mt-0.5
        opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={handleCopy}
          className="w-5 h-5 rounded flex items-center justify-center
            hover:bg-white/[0.08] transition-all duration-150"
          style={{ color: '#d6cfc4', opacity: 0.45 }}
          aria-label="Copy message"
          type="button"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
        {onBranch && (
          <button
            onClick={handleBranch}
            className="w-5 h-5 rounded flex items-center justify-center
              hover:bg-white/[0.08] transition-all duration-150"
            style={{ color: pending === 'branch' ? '#818cf8' : '#d6cfc4', opacity: pending === 'branch' ? 1 : 0.45 }}
            aria-label={pending === 'branch' ? 'Confirm branch' : 'Branch conversation here'}
            type="button"
          >
            <GitBranch className="w-3 h-3" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="w-5 h-5 rounded flex items-center justify-center
              hover:bg-white/[0.08] transition-all duration-150"
            style={{ color: pending === 'delete' ? '#ef4444' : '#d6cfc4', opacity: pending === 'delete' ? 1 : 0.45 }}
            aria-label={pending === 'delete' ? 'Confirm delete' : 'Delete message'}
            type="button"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

export function MessageBubble({ message, onCopy, onDelete, onBranch }: MessageBubbleProps) {
  if (message.role === 'user') return <UserBubble message={message} onCopy={onCopy} onDelete={onDelete} onBranch={onBranch} />
  return <AIBubble message={message} onCopy={onCopy} onDelete={onDelete} onBranch={onBranch} />
}
