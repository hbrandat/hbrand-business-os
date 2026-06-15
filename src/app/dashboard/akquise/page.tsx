'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Phone, Mail, Globe, MapPin, Plus, Check, X, Clock, PhoneOff,
  PhoneCall, Star, ChevronDown, Loader2, UserPlus, RefreshCw,
  AlertCircle, CheckCircle2, Archive, MessageSquare, Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Typen ─────────────────────────────────────────────────────────────────────
type ProspectStatus =
  | 'neu' | 'nicht_erreicht' | 'rueckruf' | 'kontaktiert'
  | 'mail_gesendet' | 'interessiert' | 'gewonnen' | 'abgelehnt'

type Priority = 'hoch' | 'mittel' | 'niedrig'
type Package = 'starter' | 'professional' | 'enterprise' | ''

interface Prospect {
  id: string
  created_at: string
  updated_at: string
  name: string
  company?: string
  phone?: string
  email?: string
  website?: string
  address?: string
  city?: string
  industry?: string
  status: ProspectStatus
  priority: Priority
  package?: Package
  source: string
  rueckruf_at?: string
  last_contact_at?: string
  contact_attempts: number
  notes?: string
  customer_id?: string
  welcome_sent: boolean
  dsgvo_sent: boolean
}

// ── Status-Meta ───────────────────────────────────────────────────────────────
const STATUS_META: Record<ProspectStatus, { label: string; color: string; dot: string }> = {
  neu:           { label: 'Neu',            color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',     dot: 'bg-blue-400' },
  nicht_erreicht:{ label: 'Nicht erreicht', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', dot: 'bg-orange-400' },
  rueckruf:      { label: 'Rückruf',        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', dot: 'bg-yellow-400 animate-pulse' },
  kontaktiert:   { label: 'Kontaktiert',    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',     dot: 'bg-cyan-400' },
  mail_gesendet: { label: 'Mail gesendet',  color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', dot: 'bg-purple-400' },
  interessiert:  { label: 'Interessiert',   color: 'text-green-400 bg-green-500/10 border-green-500/30',  dot: 'bg-green-400' },
  gewonnen:      { label: 'Gewonnen ✓',     color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400' },
  abgelehnt:     { label: 'Abgelehnt',      color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/30',     dot: 'bg-zinc-500' },
}

const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  hoch:    { label: 'Hoch',    color: 'text-red-400' },
  mittel:  { label: 'Mittel',  color: 'text-yellow-400' },
  niedrig: { label: 'Niedrig', color: 'text-zinc-500' },
}

const FILTER_TABS = [
  { key: 'offen',      label: 'Offen',      statuses: ['neu', 'nicht_erreicht', 'rueckruf', 'kontaktiert', 'mail_gesendet'] },
  { key: 'interessiert', label: 'Interessiert', statuses: ['interessiert'] },
  { key: 'rueckruf',   label: 'Rückrufe',   statuses: ['rueckruf'] },
  { key: 'gewonnen',   label: 'Gewonnen',   statuses: ['gewonnen'] },
  { key: 'abgelehnt',  label: 'Abgelehnt',  statuses: ['abgelehnt'] },
  { key: 'alle',       label: 'Alle',       statuses: [] },
]

// ── Haupt-Seite ───────────────────────────────────────────────────────────────
export default function AkquisePage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('offen')
  const [showNew, setShowNew] = useState(false)
  const [converting, setConverting] = useState<string | null>(null)
  const [convertResult, setConvertResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null)
  const [showVera, setShowVera] = useState(false)
  const [veraSearching, setVeraSearching] = useState(false)
  const [veraResult, setVeraResult] = useState<{ found: number; cost_usd: number; queries: string[] } | null>(null)
  const [veraBranche, setVeraBranche] = useState('Elektriker')
  const [veraOrt, setVeraOrt] = useState('Kärnten')

  async function veraSearch() {
    setVeraSearching(true)
    setVeraResult(null)
    try {
      const res = await fetch('/api/vera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branche: veraBranche, ort: veraOrt }),
      })
      const data = await res.json()
      if (res.ok) {
        setVeraResult({ found: data.found, cost_usd: data.cost_usd, queries: data.search_queries ?? [] })
        await load()
      } else {
        setVeraResult({ found: -1, cost_usd: 0, queries: [data.error] })
      }
    } catch (e: any) {
      setVeraResult({ found: -1, cost_usd: 0, queries: [e.message] })
    }
    setVeraSearching(false)
  }

  const load = useCallback(async () => {
    const res = await fetch('/api/prospects')
    const data = await res.json()
    setProspects(data.prospects ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(load, 15000)
    return () => clearInterval(iv)
  }, [load])

  const filtered = prospects.filter(p => {
    const tab = FILTER_TABS.find(t => t.key === filter)
    if (!tab || tab.statuses.length === 0) return true
    return tab.statuses.includes(p.status)
  })

  // Stats
  const stats = {
    total:       prospects.filter(p => !['gewonnen','abgelehnt'].includes(p.status)).length,
    rueckruf:    prospects.filter(p => p.status === 'rueckruf').length,
    interessiert:prospects.filter(p => p.status === 'interessiert').length,
    gewonnen:    prospects.filter(p => p.status === 'gewonnen').length,
  }

  async function patch(id: string, update: Record<string, any>) {
    await fetch(`/api/prospects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
    await load()
  }

  async function convert(id: string) {
    setConverting(id)
    setConvertResult(null)
    const res = await fetch(`/api/prospects/${id}/convert`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setConvertResult({ id, ok: true, msg: `✅ Kunde angelegt! ${data.welcome_sent ? 'Willkommens-E-Mail gesendet.' : 'E-Mail: SMTP konfigurieren.'}` })
    } else {
      setConvertResult({ id, ok: false, msg: `❌ Fehler: ${data.error}` })
    }
    setConverting(null)
    await load()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
    </div>
  )

  return (
    <div className="p-6 space-y-6 animate-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-violet-400" /> Akquise-Pipeline
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">VERA recherchiert, du entscheidest — nichts geht ohne deine Freigabe.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowVera(v => !v)}
            className={cn('flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl font-medium transition-all',
              showVera ? 'bg-emerald-600 text-white' : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30')}>
            🤖 VERA suchen
          </button>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl font-medium transition-all">
            <Plus className="w-4 h-4" /> Neuer Kontakt
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Offen',       value: stats.total,        color: 'text-blue-400' },
          { label: 'Rückrufe',    value: stats.rueckruf,     color: 'text-yellow-400' },
          { label: 'Interessiert',value: stats.interessiert, color: 'text-green-400' },
          { label: 'Gewonnen',    value: stats.gewonnen,     color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">{s.label}</p>
            <p className={cn('text-3xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* VERA-Suchmaske */}
      {showVera && (
        <div className="glass rounded-xl p-5 border border-emerald-500/20 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <div>
              <p className="text-sm font-semibold text-white">VERA — KI-Akquise</p>
              <p className="text-xs text-zinc-500">Sucht via Google echte Betriebe in Kärnten und legt sie direkt in die Pipeline</p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs text-zinc-500 mb-1.5 block">Branche</label>
              <select value={veraBranche} onChange={e => setVeraBranche(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500">
                <option>Elektriker</option>
                <option>Installateur</option>
                <option>Tischler</option>
                <option>Maler</option>
                <option>Arzt / Ordination</option>
                <option>Zahnarzt</option>
                <option>Physiotherapeut</option>
                <option>KFZ-Werkstatt</option>
                <option>Steuerberater</option>
                <option>Friseur</option>
                <option>Restaurant</option>
                <option>Hotel</option>
                <option>Handwerker</option>
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs text-zinc-500 mb-1.5 block">Ort / Region</label>
              <select value={veraOrt} onChange={e => setVeraOrt(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500">
                <option>Kärnten</option>
                <option>Klagenfurt</option>
                <option>Villach</option>
                <option>St. Veit an der Glan</option>
                <option>Wolfsberg</option>
                <option>Spittal an der Drau</option>
                <option>Feldkirchen</option>
                <option>Hermagor</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={veraSearch} disabled={veraSearching}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm rounded-xl font-medium transition-all whitespace-nowrap">
                {veraSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔍'}
                {veraSearching ? 'VERA sucht…' : '5 Betriebe suchen'}
              </button>
            </div>
          </div>
          {veraResult && (
            <div className={cn('p-3 rounded-xl text-sm',
              veraResult.found >= 0
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300')}>
              {veraResult.found >= 0 ? (
                <div className="space-y-1">
                  <p>✅ <strong>{veraResult.found} Betriebe</strong> gefunden und in die Pipeline eingetragen</p>
                  {veraResult.queries.length > 0 && (
                    <p className="text-xs text-zinc-500">Suchanfragen: {veraResult.queries.join(', ')}</p>
                  )}
                  <p className="text-xs text-zinc-500">Kosten: ~${(veraResult.cost_usd * 100).toFixed(3)} Cent (Gemini Free Tier)</p>
                </div>
              ) : (
                <p>❌ Fehler: {veraResult.queries[0]}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ergebnis-Banner */}
      {convertResult && (
        <div className={cn('flex items-center gap-3 p-4 rounded-xl text-sm',
          convertResult.ok ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                           : 'bg-red-500/10 border border-red-500/30 text-red-300')}>
          {convertResult.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {convertResult.msg}
          <button onClick={() => setConvertResult(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filter-Tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map(t => {
          const count = t.statuses.length > 0
            ? prospects.filter(p => t.statuses.includes(p.status)).length
            : prospects.length
          return (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={cn('px-3 py-1.5 rounded-xl text-sm transition-all',
                filter === t.key
                  ? 'bg-violet-600/15 text-white border border-violet-500/30'
                  : 'text-zinc-400 hover:bg-white/5')}>
              {t.label}
              <span className="ml-1.5 text-xs text-zinc-600">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Prospect-Liste */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-zinc-600 text-sm glass rounded-2xl">
            <Target className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
            Keine Einträge in dieser Ansicht. Lass VERA Kontakte recherchieren!
          </div>
        )}
        {filtered.map(p => (
          <ProspectCard
            key={p.id}
            prospect={p}
            converting={converting === p.id}
            onPatch={(update) => patch(p.id, update)}
            onConvert={() => convert(p.id)}
            onDelete={async () => {
              await fetch(`/api/prospects/${p.id}`, { method: 'DELETE' })
              await load()
            }}
          />
        ))}
      </div>

      {showNew && <NewProspectModal onClose={() => setShowNew(false)} onDone={load} />}
    </div>
  )
}

// ── Prospect-Karte ─────────────────────────────────────────────────────────────
function ProspectCard({
  prospect: p, converting, onPatch, onConvert, onDelete,
}: {
  prospect: Prospect
  converting: boolean
  onPatch: (u: Record<string, any>) => void
  onConvert: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [notesEdit, setNotesEdit] = useState(false)
  const [notes, setNotes] = useState(p.notes ?? '')
  const [rueckrufMin, setRueckrufMin] = useState(30)
  const [busy, setBusy] = useState(false)
  const [showRueckruf, setShowRueckruf] = useState(false)
  const [showConvertConfirm, setShowConvertConfirm] = useState(false)

  const meta = STATUS_META[p.status]
  const prio = PRIORITY_META[p.priority]
  const isWon = p.status === 'gewonnen'
  const isRejected = p.status === 'abgelehnt'

  async function act(update: Record<string, any>) {
    setBusy(true)
    await onPatch(update)
    setBusy(false)
  }

  async function saveNotes() {
    await act({ notes })
    setNotesEdit(false)
  }

  function setRueckruf() {
    const at = new Date(Date.now() + rueckrufMin * 60 * 1000).toISOString()
    act({ status: 'rueckruf', rueckruf_at: at, contact_attempt: true })
    setShowRueckruf(false)
  }

  const rueckrufTime = p.rueckruf_at ? new Date(p.rueckruf_at) : null
  const rueckrufPast = rueckrufTime && rueckrufTime < new Date()

  return (
    <div className={cn('glass rounded-xl overflow-hidden transition-all',
      isWon && 'opacity-60', isRejected && 'opacity-40')}>
      {/* Prioritätsstreifen */}
      <div className={cn('h-0.5 w-full', {
        'bg-red-500': p.priority === 'hoch',
        'bg-yellow-500': p.priority === 'mittel',
        'bg-zinc-700': p.priority === 'niedrig',
      })} />

      <div className="p-4">
        {/* Kopfzeile */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-white">{p.company || p.name}</p>
              {p.company && <span className="text-xs text-zinc-500">{p.name}</span>}
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', meta.color)}>
                <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1', meta.dot)} />
                {meta.label}
              </span>
              <span className={cn('text-[10px]', prio.color)}>● {prio.label}</span>
              {p.industry && <span className="text-[10px] text-zinc-600 bg-white/5 px-2 py-0.5 rounded-full">{p.industry}</span>}
              {p.package && <span className="text-[10px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">{p.package}</span>}
            </div>

            {/* Kontaktzeile */}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {p.phone && (
                <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors">
                  <Phone className="w-3 h-3" /> {p.phone}
                </a>
              )}
              {p.email && (
                <a href={`mailto:${p.email}`} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors">
                  <Mail className="w-3 h-3" /> {p.email}
                </a>
              )}
              {p.website && (
                <a href={p.website.startsWith('http') ? p.website : `https://${p.website}`} target="_blank" rel="noopener"
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors">
                  <Globe className="w-3 h-3" /> {p.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {p.city && (
                <span className="flex items-center gap-1 text-xs text-zinc-600">
                  <MapPin className="w-3 h-3" /> {p.city}
                </span>
              )}
            </div>

            {/* Rückruf-Hinweis */}
            {p.status === 'rueckruf' && rueckrufTime && (
              <div className={cn('flex items-center gap-1.5 mt-1.5 text-xs rounded-lg px-2 py-1 w-fit',
                rueckrufPast
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20')}>
                <Clock className="w-3 h-3" />
                {rueckrufPast ? '⚠ Überfällig! ' : 'Rückruf: '}
                {rueckrufTime.toLocaleString('de-AT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
              </div>
            )}

            {/* Metadaten */}
            <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-600">
              <span>{p.contact_attempts}× kontaktiert</span>
              {p.last_contact_at && (
                <span>Letzter Kontakt: {new Date(p.last_contact_at).toLocaleDateString('de-AT')}</span>
              )}
              <span>Quelle: {p.source}</span>
            </div>
          </div>

          {/* Expand-Button */}
          <button onClick={() => setOpen(o => !o)}
            className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all flex-shrink-0">
            <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
          </button>
        </div>

        {/* Aktions-Buttons (immer sichtbar, außer bei gewonnen/abgelehnt) */}
        {!isWon && !isRejected && (
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {/* Angerufen */}
            <ActionBtn icon={PhoneCall} label="Angerufen" color="cyan"
              onClick={() => act({ status: 'kontaktiert', contact_attempt: true })} busy={busy} />

            {/* Nicht erreicht */}
            <ActionBtn icon={PhoneOff} label="Nicht erreicht" color="orange"
              onClick={() => act({ status: 'nicht_erreicht', contact_attempt: true })} busy={busy} />

            {/* Rückruf in X min */}
            <div className="relative">
              <ActionBtn icon={Clock} label="Rückruf" color="yellow"
                onClick={() => setShowRueckruf(r => !r)} busy={busy} />
              {showRueckruf && (
                <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl p-3 z-10 shadow-xl min-w-[180px]">
                  <p className="text-xs text-zinc-400 mb-2">Zurückrufen in:</p>
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    {[15, 30, 60, 120, 240, 1440].map(m => (
                      <button key={m} onClick={() => setRueckrufMin(m)}
                        className={cn('text-xs py-1 rounded-lg transition-all',
                          rueckrufMin === m ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-zinc-400 hover:bg-white/10')}>
                        {m < 60 ? `${m}min` : m === 1440 ? '1 Tag' : `${m/60}h`}
                      </button>
                    ))}
                  </div>
                  <button onClick={setRueckruf}
                    className="w-full py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs rounded-lg">
                    Einstellen ✓
                  </button>
                </div>
              )}
            </div>

            {/* Mail geschickt */}
            <ActionBtn icon={Mail} label="Mail gesendet" color="purple"
              onClick={() => act({ status: 'mail_gesendet', contact_attempt: true })} busy={busy} />

            {/* Interessiert */}
            <ActionBtn icon={Star} label="Interessiert" color="green"
              onClick={() => act({ status: 'interessiert' })} busy={busy} />

            {/* Angenommen → Kunde */}
            <div className="relative">
              <button onClick={() => setShowConvertConfirm(true)} disabled={busy || converting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs rounded-lg font-medium transition-all">
                {converting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                Angenommen
              </button>
              {showConvertConfirm && (
                <div className="absolute top-full right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl p-4 z-10 shadow-xl w-64">
                  <p className="text-sm text-white font-medium mb-1">Als Kunde übernehmen?</p>
                  <p className="text-xs text-zinc-400 mb-3">
                    {p.company || p.name} wird in die Kundendatenbank übernommen.
                    {p.email ? ' Willkommens-E-Mail & DSGVO werden gesendet.' : ' Keine E-Mail-Adresse vorhanden.'}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowConvertConfirm(false); onConvert() }}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg font-medium">
                      Ja, übernehmen
                    </button>
                    <button onClick={() => setShowConvertConfirm(false)}
                      className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs rounded-lg">
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Abgelehnt */}
            <button onClick={() => act({ status: 'abgelehnt' })} disabled={busy}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 text-xs rounded-lg transition-all">
              <X className="w-3.5 h-3.5" /> Abgelehnt
            </button>
          </div>
        )}

        {isWon && (
          <div className="flex items-center gap-2 mt-3 text-xs text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Kunde übernommen
            {p.welcome_sent && <span className="text-zinc-500">· Welcome-Mail ✓</span>}
            {p.dsgvo_sent && <span className="text-zinc-500">· DSGVO-Mail ✓</span>}
          </div>
        )}
      </div>

      {/* Aufgeklappt: Notizen + Paket */}
      {open && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
          {/* Paket wählen */}
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Paket-Interesse</label>
            <div className="flex gap-2">
              {(['starter', 'professional', 'enterprise', ''] as const).map(pkg => (
                <button key={pkg || 'keins'} onClick={() => act({ package: pkg || null })}
                  disabled={isWon || busy}
                  className={cn('px-3 py-1.5 rounded-lg text-xs transition-all',
                    p.package === pkg
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10')}>
                  {pkg ? pkg.charAt(0).toUpperCase() + pkg.slice(1) : '—'}
                  {pkg === 'starter' && ' (149€)'}
                  {pkg === 'professional' && ' (299€)'}
                  {pkg === 'enterprise' && ' (499€)'}
                </button>
              ))}
            </div>
          </div>

          {/* Priorität */}
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Priorität</label>
            <div className="flex gap-2">
              {(['hoch', 'mittel', 'niedrig'] as const).map(prio => (
                <button key={prio} onClick={() => act({ priority: prio })}
                  disabled={isWon || busy}
                  className={cn('px-3 py-1.5 rounded-lg text-xs transition-all',
                    p.priority === prio
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10')}>
                  {prio.charAt(0).toUpperCase() + prio.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Notizen */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-zinc-500 font-medium">Gesprächsnotizen</label>
              {!notesEdit && !isWon && (
                <button onClick={() => setNotesEdit(true)} className="text-xs text-violet-400 hover:text-violet-300">
                  <MessageSquare className="w-3 h-3 inline mr-1" />Bearbeiten
                </button>
              )}
            </div>
            {notesEdit ? (
              <div className="space-y-2">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                  placeholder="Was wurde besprochen? Einwände, Interesse, nächste Schritte…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500 resize-none" />
                <div className="flex gap-2">
                  <button onClick={saveNotes} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-lg">Speichern</button>
                  <button onClick={() => { setNotesEdit(false); setNotes(p.notes ?? '') }}
                    className="px-3 py-1.5 bg-white/5 text-zinc-400 text-xs rounded-lg">Abbrechen</button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 bg-black/20 rounded-xl p-3 min-h-[48px] whitespace-pre-wrap">
                {p.notes || <span className="text-zinc-600 italic">Noch keine Notizen…</span>}
              </p>
            )}
          </div>

          {/* Löschen (nur Abgelehnte) */}
          {isRejected && (
            <button onClick={onDelete}
              className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors">
              <Archive className="w-3 h-3" /> Endgültig löschen
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Aktions-Button ────────────────────────────────────────────────────────────
function ActionBtn({ icon: Icon, label, color, onClick, busy }: {
  icon: any; label: string; color: string; onClick: () => void; busy: boolean
}) {
  const colors: Record<string, string> = {
    cyan:   'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20',
    orange: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20',
    yellow: 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
    purple: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20',
    green:  'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20',
  }
  return (
    <button onClick={onClick} disabled={busy}
      className={cn('flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs transition-all disabled:opacity-50', colors[color])}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  )
}

// ── Neuer Prospect Modal ──────────────────────────────────────────────────────
function NewProspectModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '', website: '',
    city: 'Kärnten', industry: '', priority: 'mittel' as Priority,
    package: '' as Package, source: 'manuell', notes: '',
  })
  const [busy, setBusy] = useState(false)

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  async function save() {
    if (!form.name.trim()) return
    setBusy(true)
    await fetch('/api/prospects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, package: form.package || null }),
    })
    setBusy(false); onDone(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-violet-400" /> Neuer Prospect
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ansprechpartner *" value={form.name} onChange={v => set('name', v)} placeholder="Max Mustermann" />
          <Field label="Firma / Betrieb" value={form.company} onChange={v => set('company', v)} placeholder="Elektro Müller GmbH" />
          <Field label="Telefon" value={form.phone} onChange={v => set('phone', v)} placeholder="0664 12345678" />
          <Field label="E-Mail" value={form.email} onChange={v => set('email', v)} placeholder="office@firma.at" />
          <Field label="Website" value={form.website} onChange={v => set('website', v)} placeholder="firma.at" />
          <Field label="Ort" value={form.city} onChange={v => set('city', v)} placeholder="Klagenfurt" />
          <Field label="Branche" value={form.industry} onChange={v => set('industry', v)} placeholder="Elektriker" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Priorität</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none">
              <option value="hoch">Hoch</option>
              <option value="mittel">Mittel</option>
              <option value="niedrig">Niedrig</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Paket-Interesse</label>
            <select value={form.package} onChange={e => set('package', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none">
              <option value="">—</option>
              <option value="starter">Starter 149€</option>
              <option value="professional">Professional 299€</option>
              <option value="enterprise">Enterprise 499€</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Quelle</label>
            <select value={form.source} onChange={e => set('source', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none">
              <option value="manuell">Manuell</option>
              <option value="vera">VERA</option>
              <option value="empfehlung">Empfehlung</option>
              <option value="website">Website</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Notizen</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
            placeholder="Erstkontakt-Infos, Interesse, besondere Hinweise…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500 resize-none" />
        </div>

        <button onClick={save} disabled={!form.name.trim() || busy}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm rounded-xl font-medium">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Speichern
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs text-zinc-500 font-medium mb-1.5 block">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500" />
    </div>
  )
}
