import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Module-level singleton — one Supabase client per browser tab.
// SupabaseClient (no Database generic) preserves all method types
// while avoiding the type inference issues that caused `never` errors.
let _browserClient: SupabaseClient | null = null

export function createBrowserClient(): SupabaseClient {
  if (_browserClient) return _browserClient
  _browserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return _browserClient
}

/**
 * Server-side Supabase client (uses service role key).
 * Only call from API routes / server components — NEVER expose to browser.
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}