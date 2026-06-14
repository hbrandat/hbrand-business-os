'use client'

import { useEffect, useState } from 'react'
import { supabase, type AiJob } from '@/lib/supabase'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Bot, Zap, Clock, CheckCircle, XCircle, RefreshCw, TrendingUp } from 'lucide-react'

type ModelStat = { model: string; provider: string; jobs: number; cost: number; tokens: number }

export default function AiMonitorPage() {
  const [jobs, setJobs] = useState<AiJob[]>([])
  const [stats, setStats] = useState<ModelStat[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  async function load() {
    const [{ data: jobData }, { data: costData }] = await Promise.all([
      supabase.from('ai_jobs').select('*, customers(name), orders(title)').order('created_at', { ascending: false }).limit(50),
      supabase.from('api_costs').select('*').order('date', { ascending: false }).limit(30),
    ])
    setJobs(jobData ?? [])
    // Aggregate by model
    const modelMap = new Map<string, ModelStat>()
    ;(jobData ?? []).forEach((j: AiJob) => {
      const key = `${j.provider}::${j.model}`
      const existing = modelMap.get(key) || { model: j.model, provider: j.provider, jobs: 0, cost: 0, tokens: 0 }
      modelMap.set(key, { ...existing, jobs: existing.jobs + 1, cost: existing.cost + j.cost_usd, tokens: existing.tokens + j.input_tokens + j.output_tokens })
    })
    setStats(Array.from(modelMap.values()).sort((a, b) => b.cost - a.cost))
    setLoading(false)
  }

  useEffect(() => {
    load()
    if (!autoRefresh) return
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const totalCost = jobs.reduce((s, j) => s + j.cost_usd, 0)
  const totalTokens = jobs.reduce((s, j) => s + j.input_tokens + j.output_tokens, 0)
  const running = jobs.filter(j => j.status === 'running').length

  return (
    <div className="p-6 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">KI Monitor</h1>
          <p className="text-zinc-500 text-sm">Echtzeit-Übersicht aller KI-Aktivitäten</p>
        </div>
        <button onClick={() => setAutoRefresh(a => !a)}
          className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all',
            autoRefresh ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'glass text-zinc-400')}>
          <RefreshCw className={cn('w-4 h-4', autoRefresh && 'animate-spin')} style={autoRefresh ? { animationDuration: '3s' } : {}} />
          {autoRefresh ? 'Live' : 'Manuell'}
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Läuft gerade', value: running, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Gesamt Jobs', value: jobs.length, icon: Bot, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Gesamtkosten', value: `$${totalCost.toFixed(4)}`, icon: TrendingUp, color: 'text-pink-400', bg: 'bg-pink-500/10' },
          { label: 'Tokens (gesamt)', value: totalTokens.toLocaleString(), icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map(c => (
          <div key={c.label} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">{c.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{loading ? '···' : c.value}</p>
              </div>
              <div className={cn('p-2.5 rounded-xl', c.bg)}><c.icon className={cn('w-5 h-5', c.color)} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Model stats */}
      {stats.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="font-semibold text-white text-sm">Modell-Übersicht</h2>
          </div>
          <div className="divide-y divide-white/5">
            {stats.map(s => (
              <div key={s.model} className="flex items-center gap-4 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{s.model}</p>
                  <p className="text-xs text-zinc-500">{s.provider} · {s.jobs} Jobs · {s.tokens.toLocaleString()} Tokens</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-medium text-pink-400">${s.cost.toFixed(4)}</p>
                  <p className="text-xs text-zinc-600">${(s.cost / s.jobs).toFixed(4)}/Job</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job list */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-semibold text-white text-sm">Job-Log (letzte 50)</h2>
        </div>
        <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-zinc-600">Lädt...</div>
          ) : jobs.length === 0 ? (
            <div className="p-6 text-center text-zinc-600">Noch keine KI-Jobs</div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="flex items-center gap-4 px-5 py-3">
                {job.status === 'done' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                {job.status === 'running' && <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />}
                {job.status === 'failed' && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{job.model}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {(job.customers as any)?.name || 'Kein Kunde'} · {(job.orders as any)?.title || 'Kein Auftrag'}
                    {job.result_summary && ` · ${job.result_summary}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-mono text-zinc-400">${job.cost_usd?.toFixed(4)}</p>
                  <p className="text-xs text-zinc-600">{formatDateTime(job.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
