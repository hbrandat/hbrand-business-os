'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Falsches Passwort')
        setLoading(false)
      }
    } catch {
      setError('Verbindungsfehler')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-bold text-2xl glow mb-4">
            H
          </div>
          <h1 className="text-xl font-semibold text-white">HBrand.at Business OS</h1>
          <p className="text-sm text-zinc-500 mt-1">Bitte anmelden</p>
        </div>

        <form
          onSubmit={submit}
          className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Passwort</label>
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-violet-500/50 transition-all">
              <Lock className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none flex-1"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl py-2.5 transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}
