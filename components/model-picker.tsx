'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Search, Check, RefreshCw } from 'lucide-react'
import {
  OPENROUTER_MODELS,
  getCachedModels,
  groupModelsByProvider,
  type OpenRouterModel,
} from '@/lib/openrouter-models'

interface ModelPickerProps {
  value: string
  onChange: (modelId: string) => void
}

export function ModelPicker({ value, onChange }: ModelPickerProps) {
  const [query, setQuery] = useState('')
  const [liveModels, setLiveModels] = useState<OpenRouterModel[] | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // On mount, load from localStorage cache if present
  useEffect(() => {
    const cached = getCachedModels()
    if (cached) setLiveModels(cached)
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/models')
      if (res.ok) {
        const models: OpenRouterModel[] = await res.json()
        if (models.length > 0) {
          localStorage.setItem('openrouter_models_cache', JSON.stringify(models))
          setLiveModels(models)
        }
      }
    } catch {
      // silently fail, keep current list
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const models = liveModels ?? OPENROUTER_MODELS

  const filtered = useMemo(() => {
    if (!query.trim()) return models
    const q = query.toLowerCase()
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q),
    )
  }, [query, models])

  const grouped = useMemo(() => groupModelsByProvider(filtered), [filtered])
  const providers = Object.keys(grouped).sort()
  const modelCount = models.length
  const isLive = liveModels !== null

  return (
    <div className="flex flex-col gap-2">
      {/* Search + Refresh */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Search className="w-3 h-3 shrink-0" style={{ color: '#d6cfc4', opacity: 0.55 }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
            placeholder="Search models…"
           className="flex-1 bg-transparent border-none outline-none text-[11px]
             text-white/70 placeholder:text-white/35"
        />
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-6 h-6 rounded-lg flex items-center justify-center
            hover:bg-white/[0.08] transition-all duration-200 shrink-0"
          style={{ color: '#d6cfc4', opacity: isRefreshing ? 0.3 : 0.5 }}
          title="Refresh model list from OpenRouter"
          type="button"
        >
          <RefreshCw
            className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Model count hint */}
       <p className="text-[9px] text-white/30 px-1">
        {isLive ? `${modelCount} models (live from OpenRouter)` : `${modelCount} built-in models`}
      </p>

      {/* Grouped list */}
      <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-0.5">
        {providers.length === 0 && (
           <p className="text-[11px] text-white/35 text-center py-6">No models match.</p>
        )}
        {providers.map((provider) => (
          <div key={provider}>
             <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1 px-1">
              {provider}
            </p>
            <div className="flex flex-col gap-0.5">
              {grouped[provider].map((model: OpenRouterModel) => {
                const isSelected = model.id === value
                return (
                  <button
                    key={model.id}
                    onClick={() => onChange(model.id)}
                    className="w-full text-left px-3 py-2 rounded-xl transition-all duration-150
                      flex items-start justify-between gap-2 group"
                    style={{
                      background: isSelected
                        ? 'rgba(79,70,229,0.18)'
                        : 'rgba(255,255,255,0.03)',
                      border: isSelected
                        ? '1px solid rgba(99,72,219,0.30)'
                        : '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                       <span
                         className="text-[11px] font-medium truncate"
                        style={{ color: isSelected ? '#a5b4fc' : '#d6cfc4' }}
                      >
                        {model.name}
                      </span>
                      {model.description && (
                         <span className="text-[10px] text-white/35 leading-snug">
                          {model.description}
                        </span>
                      )}
                       <span className="text-[9px] text-white/28 mt-0.5">
                        {model.contextK}K ctx · {model.id}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#818cf8' }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
