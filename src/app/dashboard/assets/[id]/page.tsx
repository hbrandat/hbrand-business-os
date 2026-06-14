'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  supabase, logActivity,
  ASSET_TYPES, ASSET_STATUS_META,
  type Asset, type AssetVersion,
} from '@/lib/supabase'
import { formatDateTime, cn } from '@/lib/utils'
import { Badge } from '@/components/ui'
import {
  ArrowLeft, CheckCircle2, XCircle, Send, RefreshCw, Save,
  Building2, Copy, Check, MessageSquare, History, Loader2,
} from 'lucide-react'

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [asset, setAsset] = useState<Asset | null>(null)
  const [versions, setVersions] = useState<AssetVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState(false)

  async function load() {
    const [{ data: a }, { data: v }] = await Promise.all([
      supabase.from('assets').select('*, customers(name, company, email)').eq('id', id).single(),
      supabase.from('asset_versions').select('*').eq('asset_id', id).order('version', { ascending: false }),
    ])
    setAsset(a as Asset)
    setDraft((a as Asset)?.content ?? '')
    setVersions(v ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  async function setStatus(status: Asset['status'], extra: Record<string, any> = {}) {
    if (!asset) return
    setBusy(status)
    await supabase.from('assets').update({ status, ...extra }).eq('id', id)
    await logActivity({
      entity_type: 'asset', entity_id: id, customer_id: asset.customer_id,
      type: status === 'versendet' ? 'email' : 'status_change',
      title: STATUS_ACTIVITY[status] ?? 'Status geändert',
      description: `${asset.title}`,
    })
    await load()
    setBusy('')
  }

  async function saveEdit() {
    if (!asset) return
    setBusy('save')
    const newVersion = asset.version + 1
    await supabase.from('assets').update({ content: draft, version: newVersion }).eq('id', id)
    await supabase.from('asset_versions').insert({
      asset_id: id, version: newVersion, content: draft, note: 'Manuell bearbeitet', created_by: 'Alexander',
    })
    setEditing(false)
    await load()
    setBusy('')
  }

  async function regenerate() {
    if (!asset) return
    setBusy('regen')
    try {
      const res = await fetch('/api/assets/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: asset.type, title: asset.title, brief: asset.brief, customerId: asset.customer_id }),
      })
      const data = await res.json()
      if (res.ok && data.asset) {
        window.location.href = `/dashboard/assets/${data.asset.id}`
        return
      }
    } catch {}
    setBusy('')
  }

  function copy() {
    navigator.clipboard.writeText(asset?.content ?? '')
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  if (loading) return <div className="p-6 text-zinc-500">Lädt…</div>
  if (!asset) return (
    <div className="p-6">
      <p className="text-zinc-400">Asset nicht gefunden.</p>
      <Link href="/dashboard/assets" className="text-violet-400 text-sm">← Zurück</Link>
    </div>
  )

  const meta = ASSET_STATUS_META[asset.status]
  const typeDef = ASSET_TYPES.find(t => t.key === asset.type)
  const customer = (asset as any).customers
  const salesMessage = (asset.metadata as any)?.sales_message as string | undefined
  const canApprove = asset.status === 'entwurf' || asset.status === 'in_review'

  return (
    <div className="p-6 space-y-6 animate-in max-w-4xl">
      {/* Kopf */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/assets" className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{asset.title}</h1>
            <Badge className={meta.color}>{meta.label}</Badge>
            <span className="text-xs text-zinc-600">v{asset.version}</span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            {typeDef?.label}
            {customer && <> · <Link href={`/dashboard/customers/${customer.id ?? asset.customer_id}`} className="hover:text-violet-300">{customer.company || customer.name}</Link></>}
          </p>
        </div>
      </div>

      {/* Freigabe-Gate: Aktionsleiste */}
      <div className="glass rounded-2xl p-4 flex items-center gap-2 flex-wrap">
        {canApprove && (
          <>
            <button onClick={() => setStatus('freigegeben', { approved_at: new Date().toISOString(), approved_by: 'Alexander' })}
              disabled={!!busy}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm rounded-xl transition-all font-medium">
              {busy === 'freigegeben' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Freigeben
            </button>
            <button onClick={() => setStatus('abgelehnt')} disabled={!!busy}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/10 text-zinc-300 hover:text-red-400 text-sm rounded-xl transition-all">
              <XCircle className="w-4 h-4" /> Ablehnen
            </button>
          </>
        )}
        {asset.status === 'freigegeben' && (
          <button onClick={() => setStatus('versendet', { sent_at: new Date().toISOString() })} disabled={!!busy}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm rounded-xl transition-all font-medium">
            {busy === 'versendet' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Als versendet markieren
          </button>
        )}
        <div className="flex-1" />
        <button onClick={() => editing ? saveEdit() : setEditing(true)} disabled={!!busy}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 text-sm rounded-xl transition-all">
          {editing ? (busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />) : <span>✏️</span>}
          {editing ? 'Speichern' : 'Bearbeiten'}
        </button>
        <button onClick={regenerate} disabled={!!busy}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 text-sm rounded-xl transition-all">
          {busy === 'regen' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Neu generieren
        </button>
        <button onClick={copy} className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 text-sm rounded-xl transition-all">
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Dokument */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 text-xs text-zinc-500 uppercase tracking-wider">Dokument</div>
        {editing ? (
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={24}
            className="w-full bg-transparent px-5 py-4 text-sm text-zinc-200 font-mono outline-none resize-none" />
        ) : (
          <div className="px-5 py-4 prose-invert">
            <pre className="whitespace-pre-wrap text-sm text-zinc-200 font-sans leading-relaxed">{asset.content}</pre>
          </div>
        )}
      </div>

      {/* Begleitnachricht (Sales-Agent) */}
      {salesMessage && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
            <MessageSquare className="w-3.5 h-3.5" /> Begleitnachricht (vom Sales-Agent)
          </div>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{salesMessage}</p>
        </div>
      )}

      {/* Ursprünglicher Brief */}
      {asset.brief && (
        <div className="glass rounded-2xl p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Ursprüngliche Anfrage</div>
          <p className="text-sm text-zinc-400 whitespace-pre-wrap">{asset.brief}</p>
        </div>
      )}

      {/* Versionen */}
      {versions.length > 1 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider">
            <History className="w-3.5 h-3.5" /> Versionen
          </div>
          <div className="divide-y divide-white/5">
            {versions.map(v => (
              <div key={v.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                <span className="text-zinc-500">v{v.version}</span>
                <span className="text-zinc-400 flex-1">{v.note}</span>
                <span className="text-xs text-zinc-600">{v.created_by} · {formatDateTime(v.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const STATUS_ACTIVITY: Record<string, string> = {
  freigegeben: 'Asset freigegeben',
  abgelehnt: 'Asset abgelehnt',
  versendet: 'Asset an Kunde versendet',
}
