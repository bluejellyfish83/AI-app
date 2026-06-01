'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { ModelPicker } from './model-picker'
import { getModelById } from '@/lib/openrouter-models'

interface SettingsSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  systemPrompt: string
  onSystemPromptChange: (v: string) => void
  modelId: string
  onModelChange: (id: string) => void
  contextSize: number
  onContextSizeChange: (v: number) => void
  fontFamily?: 'mono' | 'sans'
  onFontFamilyChange?: (f: 'mono' | 'sans') => void
  fontSize?: number
  onFontSizeChange?: (s: number) => void
}

const FONTS: { value: 'mono' | 'sans'; label: string; description: string }[] = [
  { value: 'mono', label: 'Geist Mono', description: 'Monospace — default' },
  { value: 'sans', label: 'Geist', description: 'Sans-serif — clean & readable' },
]

export function SettingsSheet({
  isOpen,
  onClose,
  title,
  systemPrompt,
  onSystemPromptChange,
  modelId,
  onModelChange,
  contextSize,
  onContextSizeChange,
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange,
}: SettingsSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const currentModel = getModelById(modelId)

  // Trap focus / close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet — slides up from bottom */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col
          transition-transform duration-300 ease-out rounded-t-3xl max-h-[90dvh]
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{
          background: 'rgba(8,8,18,0.95)',
          backdropFilter: 'blur(48px) saturate(180%)',
          WebkitBackdropFilter: 'blur(48px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
        }}
      >
        {/* Handle + header */}
        <div className="flex flex-col items-center pt-3 pb-0">
          <div
            className="w-9 h-1 rounded-full mb-4"
            style={{ background: 'rgba(255,255,255,0.15)' }}
            aria-hidden="true"
          />
          <div className="w-full flex items-center justify-between px-5 pb-3 border-b border-white/[0.07]">
            <h2 className="text-[12px] font-semibold text-white/70">{title}</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center
                hover:bg-white/[0.08] transition-all duration-200"
              style={{ color: '#d6cfc4', opacity: 0.5 }}
              aria-label="Close settings"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {/* System prompt */}
          <section>
            <label className="block text-[10px] text-white/45 uppercase tracking-widest mb-1.5">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              placeholder="You are a helpful assistant…"
              rows={5}
              className="w-full resize-none rounded-xl px-3 py-2.5 text-[11px]
                text-white/75 placeholder:text-white/20 outline-none leading-relaxed font-mono"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                caretColor: '#818cf8',
              }}
            />
            <p className="text-[10px] text-white/30 mt-1">
              Sent as the first message to the model on every request.
            </p>
          </section>

          {/* Context size */}
          <section>
            <label className="block text-[10px] text-white/45 uppercase tracking-widest mb-1.5">
              Context Messages
            </label>
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <input
                type="range"
                min={1}
                max={500}
                step={1}
                value={contextSize}
                onChange={(e) => onContextSizeChange(Number(e.target.value))}
                className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #818cf8 0%, #818cf8 ${((contextSize - 1) / 499) * 100}%, rgba(255,255,255,0.1) ${((contextSize - 1) / 499) * 100}%, rgba(255,255,255,0.1) 100%)`,
                  accentColor: '#818cf8',
                }}
                aria-label="Context messages count"
              />
              <input
                type="number"
                min={1}
                max={500}
                value={contextSize}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (v >= 1 && v <= 500) onContextSizeChange(v)
                }}
                  className="w-12 text-center text-[11px] text-white/75 bg-transparent
                  border border-white/[0.12] rounded-lg py-1 outline-none
                  focus:border-indigo-400/50 transition-colors"
                style={{ caretColor: '#818cf8' }}
                aria-label="Context messages number"
              />
            </div>
            <p className="text-[10px] text-white/30 mt-1">
              Number of recent messages sent to the model with each request. Higher = more context, more cost.
            </p>
          </section>

          {/* Font family + size — only shown when props are provided */}
          {fontFamily !== undefined && onFontFamilyChange && (
            <section className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] text-white/45 uppercase tracking-widest mb-1.5">
                  Font
                </label>
                <div className="flex gap-2">
                  {FONTS.map((f) => {
                    const isActive = fontFamily === f.value
                    return (
                      <button
                        key={f.value}
                        onClick={() => onFontFamilyChange(f.value)}
                        className="flex-1 flex flex-col gap-0.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200"
                        style={{
                          background: isActive ? 'rgba(79,70,229,0.15)' : 'rgba(255,255,255,0.04)',
                          border: isActive
                            ? '1px solid rgba(99,72,219,0.35)'
                            : '1px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        <span
                          className={`text-[11px] font-medium ${f.value === 'mono' ? 'font-mono' : 'font-sans'}`}
                          style={{ color: isActive ? '#818cf8' : '#d6cfc4' }}
                        >
                          {f.label}
                        </span>
                        <span className="text-[10px] text-white/35">{f.description}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {fontSize !== undefined && onFontSizeChange && (
                <div>
                  <label className="block text-[10px] text-white/45 uppercase tracking-widest mb-1.5">
                    Font Size
                  </label>
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <input
                      type="range"
                      min={10}
                      max={20}
                      step={1}
                      value={fontSize}
                      onChange={(e) => onFontSizeChange(Number(e.target.value))}
                      className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #818cf8 0%, #818cf8 ${((fontSize - 10) / 10) * 100}%, rgba(255,255,255,0.1) ${((fontSize - 10) / 10) * 100}%, rgba(255,255,255,0.1) 100%)`,
                        accentColor: '#818cf8',
                      }}
                      aria-label="Font size"
                    />
                    <input
                      type="number"
                      min={10}
                      max={20}
                      value={fontSize}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (v >= 10 && v <= 20) onFontSizeChange(v)
                      }}
                      className="w-12 text-center text-[11px] text-white/75 bg-transparent
                        border border-white/[0.12] rounded-lg py-1 outline-none
                        focus:border-indigo-400/50 transition-colors"
                      style={{ caretColor: '#818cf8' }}
                      aria-label="Font size number"
                    />
                    <span className="text-[10px] text-white/25">px</span>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Model picker */}
          <section>
            <label className="block text-[10px] text-white/45 uppercase tracking-widest mb-1.5">
              Model
            </label>
            <div
              className="px-3 py-2 rounded-xl mb-2"
              style={{
                background: 'rgba(79,70,229,0.10)',
                border: '1px solid rgba(99,72,219,0.20)',
              }}
            >
                <span className="text-[11px] text-indigo-300">{currentModel.name}</span>
              <span className="text-[10px] text-white/35 ml-2">{currentModel.provider}</span>
            </div>
            <ModelPicker value={modelId} onChange={onModelChange} />
          </section>

          {/* Integration instructions */}
          <section>
            <label className="block text-[10px] text-white/45 uppercase tracking-widest mb-1.5">
              Integration
            </label>
            <div
              className="px-3 py-3 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <p className="text-[10px] text-white/45 leading-relaxed">
                {'To connect OpenRouter:'}
              </p>
              <ol className="mt-1.5 flex flex-col gap-1">
                {[
                  'Add OPENROUTER_API_KEY to your environment variables.',
                  'Create app/api/chat/route.ts — proxy POST to https://openrouter.ai/api/v1/chat/completions with the model ID, system prompt, and messages.',
                  "In page.tsx, replace the setTimeout stub in sendMessage with fetch('/api/chat', { model, systemPrompt, messages }).",
                  'Stream the response with ReadableStream or use the AI SDK streamText helper.',
                ].map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[10px] text-indigo-400/70 shrink-0">
                      {i + 1}.
                    </span>
                    <span className="text-[10px] text-white/40 leading-relaxed">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
