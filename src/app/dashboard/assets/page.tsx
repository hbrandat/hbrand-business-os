'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  supabase, ASSET_TYPES, ASSET_STATUS_META,
  type Asset, type AssetType, type Customer,
} from '@/lib/supabase'
import { formatDateTime, cn } from '@/lib/utils'
import { Badge } from '@/components/ui'
import {
  FileText, Receipt, Briefcase, Mail, Shield, Share2, Layout, Sparkles,
  Wand2, Loader2, ArrowRight, X,
} from 'lucide-react'

const ICON_MAP: Record<string, any> = {
  FileText, Receipt, Briefcase, Mail, Shield, Share2, Layout, Sparkles,
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [preset, setPresetState] = useState<AssetType | undefined>(undefined)

  async function load() {
    const [{ data: a }, { data: c }] = await Promise.all([
      supabase.from('assets').select('*, customers(name, company)').order('created_at', { ascending: false }).limit(100),
      supabase.from('customers').select('id, name, company').order('name'),
    ])
    setAssets(a ?? [])
    setCustomers((c ?? []) as Customer[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  return (
    <div className="p-6 space-y-6 animate-in max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-violet-400" />
            Asset-Maschine
          </h1>
          <p className="text-zinc-500 text-sm mt-0.5">Kunde sagt „ich brauche X" → fertiges Dokument in Minuten. Nichts geht raus ohne deine Freigabe.</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl transition-all font-medium">
          <Sparkles className="w-4 h-4" /> Neues Asset
        </button>
      </div>

      {/* Schnellauswahl der Typen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ASSET_TYPES.map(t => {
          const Icon = ICON_MAP[t.icon] ?? Sparkles
          return (
            <button key={t.key} onClick={() => { setPresetState(t.key); setShowNew(true) }}
              className="glass rounded-2xl p-4 text-left hover:bg-white/5 transition-all group">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center mb-2 group-hover:bg-violet-500/20 transition-all">
                <Icon className="w-4 h-4 text-violet-400" />
              </div>
              <p className="text-sm font-medium text-white">{t.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{t.desc}</p>
            </button>
          )
        })}
      </div>

      {/* Asset-Liste */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-semibold text-white text-sm">Erstellte Assets</h2>
        </div>
        <div className="divide-y divide-white/5">
          {loading ? (
            <p className="px-5 py-8 text-center text-zinc-600 text-sm">Lädt…</p>
          ) : assets.length === 0 ? (
            <p className="px-5 py-8 text-center text-zinc-600 text-sm">Noch keine Assets — erstell dein erstes oben.</p>
          ) : assets.map(a => {
            const meta = ASSET_STATUS_META[a.status]
            const typeDef = ASSET_TYPES.find(t => t.key === a.type)
            const Icon = ICON_MAP[typeDef?.icon ?? 'Sparkles'] ?? Sparkles
            return (
              <Link key={a.id} href={`/dashboard/assets/${a.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-violet-300">{a.title}</p>
                  <p className="text-xs text-zinc-500">{typeDef?.label} · {(a as any).customers?.company || (a as any).customers?.name || 'Kein Kunde'} · {formatDateTime(a.created_at)}</p>
                </div>
                <Badge className={meta.color}>{meta.label}</Badge>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
              </Link>
            )
          })}
        </div>
      </div>

      {showNew && <NewAssetModal customers={customers} preset={preset} onClose={() => { setShowNew(false); setPresetState(undefined) }} onDone={load} />}
    </div>
  )
}

function NewAssetModal({ customers, preset, onClose, onDone }: {
  customers: Customer[]; preset?: AssetType; onClose: () => void; onDone: () => void
}) {
  const [type, setType] = useState<AssetType>(preset ?? 'angebot')
  const [title, setTitle] = useState('')
  const [brief, setBrief] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [running, setRunning] = useState(false)
  const [stage, setStage] = useState('')
  const [error, setError] = useState('')

  async function generate() {
    if (!brief.trim()) return
    setRunning(true); setError(''); setStage('Pipeline startet…')

    // Visuelles Feedback der Stufen (die echte Arbeit passiert serverseitig)
    const stages = ['Intake analysiert…', 'Content erstellt Entwurf…', 'Format veredelt…', 'Qualität prüft…', 'Sales formuliert…']
    let si = 0
    const ticker = setInterval(() => { if (si < stages.length) setStage(stages[si++]) }, 2500)

    try {
      const res = await fetch('/api/assets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, brief, customerId: customerId || undefined }),
      })
      clearInterval(ticker)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler bei der Generierung')
      onDone()
      onClose()
    } catch (e: any) {
      clearInterval(ticker)
      setError(e.message)
      setRunning(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Wand2 className="w-5 h-5 text-violet-400" /> Neues Asset</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400"><X className="w-4 h-4" /></button>
        </div>

        {running ? (
          <div className="py-10 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            <p className="text-sm text-zinc-300">{stage}</p>
            <p className="text-xs text-zinc-600">Die 5 Agenten arbeiten — das dauert ~30-60 Sekunden.</p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Typ</label>
              <select value={type} onChange={e => setType(e.target.value as AssetType)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
                {ASSET_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Kunde (optional)</label>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
                <option value="">— Kein Kunde —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Titel (optional)</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Angebot Website Elektriker Müller"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Was braucht der Kunde? *</label>
              <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={4}
                placeholder="Beschreibe in eigenen Worten, was erstellt werden soll. Je mehr Details, desto besser. z.B. 'Elektriker aus Klagenfurt, 5 Mitarbeiter, braucht ein Angebot für eine neue Website mit Kontaktformular und Referenzen, Budget ca. 3000€'"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500 resize-none" />
            </div>
            {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <button onClick={generate} disabled={!brief.trim()}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm rounded-xl transition-all font-medium">
              <Sparkles className="w-4 h-4" /> Asset generieren
            </button>
          </>
        )}
      </div>
    </div>
  )
}
