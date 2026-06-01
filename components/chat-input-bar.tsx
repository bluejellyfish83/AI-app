'use client'

import { useRef, useCallback, useEffect, KeyboardEvent } from 'react'
import { ArrowUp, ArrowDown, Paperclip, Mic, Square } from 'lucide-react'

interface ChatInputBarProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop?: () => void
  isLoading?: boolean
  hasMessages?: boolean
  onScrollToLatest?: () => void
  fontSize?: number
  fontFamily?: 'mono' | 'sans'
}

const MAX_ROWS = 6
const LINE_HEIGHT = 18

export function ChatInputBar({
  value,
  onChange,
  onSend,
  onStop,
  isLoading = false,
  hasMessages = false,
  onScrollToLatest,
  fontSize = 11,
  fontFamily = 'mono',
}: ChatInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const syncHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxHeight = MAX_ROWS * LINE_HEIGHT + 8
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [])

  useEffect(() => {
    syncHeight()
  }, [value, syncHeight])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const normalized = e.target.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      onChange(normalized)
    },
    [onChange],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (value.trim() && !isLoading) onSend()
      }
    },
    [value, isLoading, onSend],
  )

  const canSend = value.trim().length > 0 && !isLoading

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 px-3 pb-5 pt-2"
      style={{
        background: 'linear-gradient(to top, rgba(3,3,8,0.98) 60%, rgba(3,3,8,0) 100%)',
      }}
    >
      {/* Scroll-to-latest button — circular, arrow only */}
      {hasMessages && (
        <div className="flex justify-center mb-2">
          <button
            onClick={onScrollToLatest}
            className="w-7 h-7 rounded-full flex items-center justify-center
              transition-all duration-200 active:scale-90 hover:scale-105"
            style={{
              background: 'rgba(10,10,22,0.85)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.13)',
              color: '#d6cfc4',
            }}
            aria-label="Scroll to latest message"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input container — stacked: textarea on top, actions on bottom */}
      <div
        className="glow-input relative flex flex-col rounded-2xl
          transition-all duration-300"
        style={{
          background: 'rgba(10,10,22,0.75)',
          backdropFilter: 'blur(48px) saturate(180%)',
          WebkitBackdropFilter: 'blur(48px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.09)',
        }}
      >
        {/* Row 1: Textarea */}
        <div className="px-3 pt-2.5 pb-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            className={`w-full resize-none bg-transparent border-none outline-none
              leading-[18px] text-white/85 placeholder:text-white/25
              min-h-[18px] scrollbar-none ${fontFamily === 'sans' ? 'font-sans' : 'font-mono'}`}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${LINE_HEIGHT}px`,
              caretColor: '#818cf8',
            }}
            aria-label="Message input"
            aria-multiline="true"
            disabled={isLoading}
          />
        </div>

        {/* Row 2: Icons */}
        <div className="flex items-center justify-between px-2 pb-2">
          {/* Left: Attach */}
          <button
            className="w-7 h-7 rounded-xl flex items-center justify-center
              hover:bg-white/[0.07] transition-all duration-200"
            style={{ color: '#d6cfc4', opacity: 0.65 }}
            aria-label="Attach file"
            type="button"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>

          {/* Right: Mic + Send */}
          <div className="flex items-center gap-1">
            {!value.trim() && (
              <button
                className="w-7 h-7 rounded-xl flex items-center justify-center
                  hover:bg-white/[0.07] transition-all duration-200"
                style={{ color: '#d6cfc4', opacity: 0.65 }}
                aria-label="Voice input"
                type="button"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            )}

            {isLoading && onStop ? (
              <button
                onClick={onStop}
                className="w-7 h-7 rounded-xl flex items-center justify-center
                  transition-all duration-200 active:scale-90"
                style={{
                  background: 'linear-gradient(135deg, #3730a3, #4f46e5)',
                  boxShadow: '0 2px 12px rgba(79,70,229,0.55)',
                  border: '1px solid rgba(129,140,248,0.3)',
                }}
                aria-label="Stop generating"
                type="button"
              >
                <Square className="w-2.5 h-2.5 fill-white" style={{ color: '#fff' }} />
              </button>
            ) : (
              <button
                onClick={onSend}
                disabled={!canSend}
                className="w-7 h-7 rounded-xl flex items-center justify-center
                  transition-all duration-200 active:scale-90"
                style={
                  canSend
                    ? {
                        background: 'linear-gradient(135deg, #3730a3, #4f46e5)',
                        boxShadow: '0 2px 12px rgba(79,70,229,0.55)',
                        border: '1px solid rgba(129,140,248,0.3)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }
                }
                aria-label="Send message"
                type="button"
              >
                <ArrowUp
                  className="w-3 h-3"
                  style={{ color: canSend ? '#fff' : 'rgba(255,255,255,0.25)' }}
                />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
