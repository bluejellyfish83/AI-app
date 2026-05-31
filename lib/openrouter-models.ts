/**
 * OpenRouter model catalogue — add/remove entries freely.
 * Each entry maps to an OpenRouter model ID you pass to the API:
 *   POST https://openrouter.ai/api/v1/chat/completions
 *   { model: entry.id, messages: [...] }
 *
 * To plug in the backend:
 *  1. Add OPENROUTER_API_KEY to your env vars.
 *  2. Create app/api/chat/route.ts that proxies the request to OpenRouter.
 *  3. In sendMessage (page.tsx), replace the setTimeout stub with a fetch
 *     to /api/chat, passing { model, systemPrompt, messages }.
 */

export interface OpenRouterModel {
  id: string          // exact model ID sent to OpenRouter API
  name: string        // display name
  provider: string    // provider label shown in UI
  contextK: number    // context window in thousands of tokens
  description?: string
}

export const OPENROUTER_MODELS: OpenRouterModel[] = [
  // ── Anthropic ───────────────────────────────────────────────
  {
    id: 'anthropic/claude-opus-4',
    name: 'Claude Opus 4',
    provider: 'Anthropic',
    contextK: 200,
    description: 'Most capable Claude model, strong at complex reasoning.',
  },
  {
    id: 'anthropic/claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    contextK: 200,
    description: 'Balanced performance and cost.',
  },
  {
    id: 'anthropic/claude-haiku-3-5',
    name: 'Claude Haiku 3.5',
    provider: 'Anthropic',
    contextK: 200,
    description: 'Fastest Claude model, great for simple tasks.',
  },

  // ── OpenAI ──────────────────────────────────────────────────
  {
    id: 'openai/gpt-4.1',
    name: 'GPT-4.1',
    provider: 'OpenAI',
    contextK: 128,
    description: 'Latest GPT-4 class model.',
  },
  {
    id: 'openai/gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'OpenAI',
    contextK: 128,
    description: 'Fast and cost-efficient GPT-4 class model.',
  },
  {
    id: 'openai/o3',
    name: 'o3',
    provider: 'OpenAI',
    contextK: 200,
    description: 'Extended thinking model for hard reasoning tasks.',
  },
  {
    id: 'openai/o4-mini',
    name: 'o4 Mini',
    provider: 'OpenAI',
    contextK: 128,
    description: 'Efficient reasoning model.',
  },

  // ── Google ──────────────────────────────────────────────────
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    contextK: 1000,
    description: "Google's most capable multimodal model.",
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    contextK: 1000,
    description: 'Fast and cheap Gemini model.',
  },

  // ── Meta ────────────────────────────────────────────────────
  {
    id: 'meta-llama/llama-4-maverick',
    name: 'Llama 4 Maverick',
    provider: 'Meta',
    contextK: 128,
    description: "Meta's open-source flagship model.",
  },
  {
    id: 'meta-llama/llama-4-scout',
    name: 'Llama 4 Scout',
    provider: 'Meta',
    contextK: 128,
    description: 'Efficient Llama 4 variant.',
  },

  // ── Mistral ─────────────────────────────────────────────────
  {
    id: 'mistralai/mistral-large-2411',
    name: 'Mistral Large',
    provider: 'Mistral',
    contextK: 128,
    description: "Mistral's strongest model.",
  },
  {
    id: 'mistralai/mistral-small-3.2-24b-instruct',
    name: 'Mistral Small 3.2',
    provider: 'Mistral',
    contextK: 128,
    description: 'Lightweight and fast Mistral model.',
  },

  // ── DeepSeek ────────────────────────────────────────────────
  {
    id: 'deepseek/deepseek-r2',
    name: 'DeepSeek R2',
    provider: 'DeepSeek',
    contextK: 128,
    description: 'Strong reasoning model from DeepSeek.',
  },
  {
    id: 'deepseek/deepseek-chat-v3-0324',
    name: 'DeepSeek Chat V3',
    provider: 'DeepSeek',
    contextK: 64,
    description: 'Fast chat-focused DeepSeek model.',
  },

  // ── xAI ─────────────────────────────────────────────────────
  {
    id: 'x-ai/grok-3',
    name: 'Grok 3',
    provider: 'xAI',
    contextK: 131,
    description: "xAI's latest model with real-time web access.",
  },
  {
    id: 'x-ai/grok-3-mini',
    name: 'Grok 3 Mini',
    provider: 'xAI',
    contextK: 131,
    description: 'Faster and cheaper Grok model.',
  },
]

export const DEFAULT_MODEL_ID = 'anthropic/claude-sonnet-4-5'

const LS_KEY = 'openrouter_models_cache'

export function getModelById(id: string): OpenRouterModel {
  // Check static list first
  const staticMatch = OPENROUTER_MODELS.find((m) => m.id === id)
  if (staticMatch) return staticMatch

  // Check localStorage cache for live models
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const cached: OpenRouterModel[] = JSON.parse(raw)
      const cachedMatch = cached.find((m) => m.id === id)
      if (cachedMatch) return cachedMatch
    }
  } catch {
    // ignore
  }

  return OPENROUTER_MODELS[0]
}

/** Group models by provider for display in the picker */
export function groupModelsByProvider(models: OpenRouterModel[]): Record<string, OpenRouterModel[]> {
  return models.reduce<Record<string, OpenRouterModel[]>>((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = []
    acc[m.provider].push(m)
    return acc
  }, {})
}

/**
 * Fetch the live model list from our API route.
 * Returns cached models from localStorage if available.
 * Falls back to static OPENROUTER_MODELS on error.
 */
export async function fetchModels(): Promise<OpenRouterModel[]> {
  try {
    const res = await fetch('/api/models')
    if (!res.ok) throw new Error('Failed to fetch')
    const models: OpenRouterModel[] = await res.json()
    if (models.length > 0) {
      localStorage.setItem(LS_KEY, JSON.stringify(models))
      return models
    }
    return getCachedModels() ?? OPENROUTER_MODELS
  } catch {
    return getCachedModels() ?? OPENROUTER_MODELS
  }
}

/** Read cached models from localStorage (null if none). */
export function getCachedModels(): OpenRouterModel[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
    return null
  } catch {
    return null
  }
}
