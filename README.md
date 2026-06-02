# Glass AI — Liquid Glass Chat

A beautiful liquid-glass AI chat interface built with Next.js 16, React 19, Tailwind CSS v4, Supabase, and OpenRouter.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-61dafb)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-v2-3fcf8e)
![OpenRouter](https://img.shields.io/badge/OpenRouter-API-7c3aed)

---

## Features

- **Multi-model chat** — 18+ models from Anthropic, OpenAI, Google, Meta, Mistral, DeepSeek, and xAI via OpenRouter
- **Streaming responses** — real-time typewriter effect via SSE (Server-Sent Events)
- **Stop streaming** — click the stop button during AI generation to pause/abort the response (partial content is preserved)
- **Markdown rendering** — AI responses render as full Markdown (code blocks, tables, lists, etc.) with styled theme
- **Persistent conversations** — all chats and messages stored in Supabase PostgreSQL
- **Swipe-to-delete** — swipe left on conversations in the sidebar to reveal a delete button with confirmation dialog
- **Message actions** — hover over any message to reveal Copy, Branch, and Delete buttons (double-press safety for destructive actions)
- **Branching** — fork any point in a conversation into a new "Branch: <title>" chat with full message history
- **Undo branch** — undo icon in header lets you return to (or delete) a branched conversation
- **Configurable context window** — slider + number input to control how many past messages the model sees (1–500)
- **Daily memory system** — automatic daily summarization gives the model long-term context
- **Live model list** — refresh to pull the latest models from OpenRouter's API
- **Per-conversation settings** — custom system prompt, model, and context size per chat
- **Universal font settings** — choose between Geist Sans or Geist Mono font family, adjustable size (10–20px), applies across the entire UI
- **Glassmorphism UI** — frosted glass panels, animated ambient orbs, dark theme

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui (Radix) |
| Fonts | Geist + Geist Mono |
| Markdown | react-markdown + remark-gfm |
| Icons | lucide-react |
| Database | Supabase (PostgreSQL) |
| AI Gateway | OpenRouter (OpenAI-compatible API) |
| Package Manager | pnpm |

---

## Project Structure

```
app/
  page.tsx                           — main client component (state, streaming, persistence)
  layout.tsx                         — fonts, metadata, html shell
  globals.css                        — Tailwind theme + custom glass classes
  api/
    chat/route.ts                    — SSE streaming chat endpoint (Node.js runtime)
    models/route.ts                  — proxy OpenRouter /models (1hr cache, Edge)
    cron/summarize/route.ts          — daily conversation summarization (Node.js runtime)

components/
  ambient-orbs.tsx                   — animated background blobs
  chat-header.tsx                    — top bar: menu, editable title, settings
  chat-sidebar.tsx                   — slide-in conversation list with swipe-to-delete
  chat-messages.tsx                  — scrollable message list, auto-scroll
  message-bubble.tsx                 — UserBubble + AIBubble renderers
  chat-input-bar.tsx                 — textarea, send/stop button, scroll-to-latest
  model-picker.tsx                   — model dropdown grouped by provider
  settings-sheet.tsx                 — bottom sheet: prompt, model, font, context
  chat-empty-state.tsx               — empty state (ambient orbs show through)

lib/
  supabase.ts                        — browser + service client factories
  openrouter-models.ts               — model catalogue, live fetch, localStorage cache
  utils.ts                           — cn() Tailwind merge utility

supabase/
  schema.sql                         — database schema (run in Supabase SQL Editor)
```

---

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd aiApp-project
pnpm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Copy your project URL and API keys from **Settings → API**

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in your `.env.local`:

```env
# Supabase (Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenRouter (https://openrouter.ai/keys)
OPENROUTER_API_KEY=sk-or-v1-...

# Cron secret (generate: openssl rand -hex 32)
CRON_SECRET=your-random-secret-here
```

> **Important**: The Supabase URL should be just `https://your-project-id.supabase.co` — do NOT include `/rest/v1/`.

### 4. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Where to get it | Required |
|----------|----------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` `secret` | Yes |
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) | Yes |
| `CRON_SECRET` | Generate with `openssl rand -hex 32` | For cron only |

---

## Database Schema

Three tables, all with RLS disabled (auth is client-side via localStorage `user_id`):

```
chats              — id, user_id, title, model_id, context_size, system_prompt, branched_from, created_at, updated_at
messages           — id, chat_id (FK), role, content, created_at
daily_summaries    — id, chat_id (FK), summary_date, summary, created_at
```

> For existing databases, run: `ALTER TABLE chats ADD COLUMN branched_from UUID REFERENCES chats(id) ON DELETE SET NULL;`

Run `supabase/schema.sql` in the Supabase SQL Editor to create these tables.

---

## Architecture

### Chat Flow

1. User types a message → optimistic UI update (message appears immediately)
2. `fetch('/api/chat', { chatId, content })` → API route
3. API fetches last N messages from Supabase (based on `context_size` setting), THEN saves the new user message
4. Builds system prompt with user's custom prompt + current date/time + daily summaries (if any)
5. Calls OpenRouter with streaming via OpenAI SDK
6. Returns SSE stream → frontend reads chunks and appends to AI message (typewriter effect)
7. After stream ends, API awaits saving the full assistant message to Supabase before closing
8. User can click the **stop button** (square icon) at any time to abort the stream — partial content is preserved

> **Important**: The user message is saved AFTER fetching context to avoid sending it twice to the LLM. The assistant message save is `await`ed before the stream closes to ensure persistence on Vercel's serverless runtime.

### Conversation Management

- **Create**: Click "New conversation" in the sidebar
- **Switch**: Click any conversation in the sidebar
- **Delete**: Swipe left on a conversation to reveal a red delete button → tap it → confirm with "Delete" in the popup
- **Rename**: Click the conversation title in the header to edit inline
- **Auto-title**: New chats are automatically titled from the first 32 characters of the first message
- **Branch**: Hover any message → click the git-branch icon (double-click to confirm) → creates a new chat prefixed with "Branch: "
- **Undo branch**: Branched conversations show an undo icon in the header → click to return to (or delete) the branch

### Message Actions

- **Copy**: Hover any message → click the copy icon to copy content to clipboard
- **Delete**: Hover → click trash icon → icon turns red → click again to confirm (auto-resets after 3s)
- **Branch**: Hover → click branch icon → icon turns purple → click again to confirm

### Font & Display Settings

- **Font family**: Choose between Geist Sans (clean sans-serif) or Geist Mono (monospace) — applies everywhere: sidebar, settings, model picker, messages
- **Font size**: Adjustable from 10px to 20px via slider or number input
- **Context messages**: Configurable from 1 to 500 messages sent to the model per request

### Memory System

- **Short-term**: Configurable number of recent messages (default 8, adjustable 1–500 via settings)
- **Long-term**: Daily summaries stored in `daily_summaries` table, prepended to system prompt
- Summaries are generated by a cron job (`/api/cron/summarize`) that processes yesterday's conversations
- Uses `openai/gpt-4o-mini` for summarization (cheap, max 200 tokens per summary)

### User Identity

- Each user gets a random UUID stored in `localStorage` under `liquid_user_id`
- No authentication system — just a persistent anonymous ID
- All chats are scoped to this user ID

---

## Daily Cron Setup (Optional)

The daily summarization cron is optional. The chat works fine without it — the model just won't have long-term memory from previous days.

### Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/summarize",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Manual Trigger

```bash
curl -X POST https://your-domain.vercel.app/api/cron/summarize \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Models

Full list from OpenRouter (500+ models). Cached in localStorage.

Default: `anthropic/claude-sonnet-4-5`

---

## Key Data Types

```ts
// Frontend message (components/message-bubble.tsx)
interface Message {
  id: string
  role: 'user' | 'ai'    // note: DB stores 'assistant', mapped to 'ai' on read
  content: string
  timestamp: Date
}

// Frontend conversation (app/page.tsx)
interface Conversation {
  id: string
  title: string
  messages: Message[]
  updatedAt: Date
  systemPrompt: string
  modelId: string          // OpenRouter model ID
  contextSize: number      // number of recent messages sent to model (1–500, default 8)
  branchedFromId?: string  // ID of the original conversation if this is a branch
}
```

---

## Deployment

This project deploys on [Vercel](https://vercel.com):

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel project settings
4. Deploy

`app/api/chat` and `app/api/cron/summarize` use **Node.js runtime** (needed for reliable async DB writes after streaming). `app/api/models` uses **Edge Runtime** for low-latency model list proxying.
