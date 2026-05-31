# Liquid Glass Chat UI — Project Docs

## Stack
- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS v4, custom glassmorphism CSS classes in `app/globals.css`
- **Fonts**: Geist (sans) + Geist Mono, loaded via `next/font/google` in `app/layout.tsx`
- **Icons**: lucide-react
- **UI primitives**: shadcn/ui (new-york style), Radix UI

---

## File Map

```
app/
  page.tsx              — root client component, all state lives here
  layout.tsx            — fonts, metadata, html shell
  globals.css           — Tailwind theme + custom classes (glass, bubble-user, bubble-ai, etc.)

components/
  ambient-orbs.tsx      — animated background blobs (purely decorative)
  chat-header.tsx       — top bar: menu toggle, editable title, settings button
  chat-sidebar.tsx      — slide-in conversation list + new chat + global settings entry
  chat-messages.tsx     — scrollable message list, auto-scroll logic, typing indicator
  message-bubble.tsx    — UserBubble + AIBubble render components
  chat-input-bar.tsx    — textarea input, send button, scroll-to-latest button
  model-picker.tsx      — dropdown grouped by provider (Anthropic, OpenAI, Google, etc.)
  settings-sheet.tsx    — bottom sheet: system prompt, model, font family, font size
  chat-empty-state.tsx  — renders nothing (empty spacer, ambient orbs show through)

lib/
  openrouter-models.ts  — model catalogue + DEFAULT_MODEL_ID + groupModelsByProvider()
  utils.ts              — cn() class merge utility
```

---

## Key Data Shapes

```ts
// A single chat message
interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: Date
}

// A conversation thread
interface Conversation {
  id: string
  title: string           // auto-set from first message (32 chars)
  messages: Message[]
  updatedAt: Date
  systemPrompt: string    // per-conversation override
  modelId: string         // per-conversation override
}

// Global display + AI defaults (all conversations inherit these)
interface GlobalDefaults {
  systemPrompt: string
  modelId: string         // OpenRouter model ID e.g. 'anthropic/claude-sonnet-4-5'
  fontFamily: 'mono' | 'sans'
  fontSize: 'sm' | 'md' | 'lg'   // maps to 10px / 11px / 13px via --chat-font-size CSS var
}
```

---

## Backend Integration Point

In `app/page.tsx`, inside the `sendMessage` function, there is a clearly marked stub:

```ts
// REPLACE THIS:
await new Promise((r) => setTimeout(r, 1000))
const content = 'stub response'

// WITH THIS:
const res = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: active.modelId,
    systemPrompt: active.systemPrompt,
    messages: [...active.messages, userMsg].map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
  }),
})
const { content } = await res.json()
```

Create `app/api/chat/route.ts` as the backend handler. It should:
1. Accept `{ model, systemPrompt, messages }` in the request body.
2. Forward to `https://openrouter.ai/api/v1/chat/completions` using `OPENROUTER_API_KEY` from env.
3. Return `{ content: string }` (or a stream — see streaming note below).

---

## Model Catalogue (`lib/openrouter-models.ts`)

18 models across 7 providers. All use OpenRouter-compatible IDs:

| Provider   | Models |
|------------|--------|
| Anthropic  | claude-opus-4, claude-sonnet-4-5, claude-haiku-3-5 |
| OpenAI     | gpt-4.1, gpt-4.1-mini, o3, o4-mini |
| Google     | gemini-2.5-pro, gemini-2.5-flash |
| Meta       | llama-4-maverick, llama-4-scout |
| Mistral    | mistral-large-2411, mistral-small-3.2 |
| DeepSeek   | deepseek-r2, deepseek-chat-v3 |
| xAI        | grok-3, grok-3-mini |

Default: `anthropic/claude-sonnet-4-5`

---

## Streaming (optional upgrade)

The UI can support streaming. To add it:
- Change `app/api/chat/route.ts` to return a `ReadableStream`.
- In `sendMessage`, read the stream chunk-by-chunk and call `updateActive` on each chunk to append to the last AI message's `content`.
- The `AIBubble` component renders a plain `<p>` so it will rerender naturally as content grows.

---

## Design Tokens (globals.css)

```css
--accent-purple: #4f46e5       /* primary brand accent — buttons, user bubble, sidebar active */
--accent-purple-bright: #818cf8
--accent-purple-glow: rgba(79, 70, 229, 0.45)

--bubble-user-from: #3730a3   /* user message gradient start */
--bubble-user-to:   #4f46e5   /* user message gradient end */

--chat-font-size               /* CSS var set on <main>, read by message bubbles */
```

Key CSS utility classes:
- `.glass` — frosted glass panel (backdrop-filter blur + rgba bg)
- `.bubble-user` — indigo gradient pill for user messages
- `bubble-ai` messages are unstyled `<p>` tags, no container

---

## State Architecture

All state lives in `app/page.tsx` (single client component). No global store, no context. Props drill down one level to each component. The conversation list and active conversation are plain `useState` arrays — persistence (localStorage, DB) is not yet implemented and is the next integration step.

---

## Environment Variables Needed

```
OPENROUTER_API_KEY=sk-or-...
```
