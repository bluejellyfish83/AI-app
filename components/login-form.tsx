'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

interface LoginFormProps {
  onAuth: () => void
}

export function LoginForm({ onAuth }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      onAuth()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-[100dvh] px-4">
      <div
        className="glass w-full max-w-sm rounded-2xl p-6 space-y-6"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="text-center space-y-1">
          <h1 className="text-lg font-semibold text-white/90">Glass AI</h1>
          <p className="text-xs text-white/40">
            {isSignUp ? 'Create an account' : 'Sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[11px] text-white/50">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 rounded-lg text-sm text-white/90 placeholder-white/20
                outline-none transition-all duration-150"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: '13px',
              }}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[11px] text-white/50">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={6}
              className="w-full px-3 py-2 rounded-lg text-sm text-white/90 placeholder-white/20
                outline-none transition-all duration-150"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: '13px',
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400/80 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg text-sm font-medium text-white
              transition-all duration-150 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #3730a3, #4f46e5)',
              border: '1px solid rgba(129, 140, 248, 0.2)',
            }}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
            }}
            className="text-[11px] text-white/35 hover:text-white/55 transition-colors duration-150"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  )
}