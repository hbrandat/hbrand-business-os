'use client'

import { useEffect, useState } from 'react'
import { supabase, logActivity, type Activity } from '@/lib/supabase'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  StickyNote, ArrowRightLeft, Mail, Phone, Users, FileText,
  Receipt, CreditCard, LifeBuoy, Cpu, Send, Plus,
} from 'lucide-react'

const ICONS: Record<Activity['type'], typeof StickyNote> = {
  note: StickyNote,
  status_change: ArrowRightLeft,
  email: Mail,
  call: Phone,
  meeting: Users,
  file: FileText,
  invoice: Receipt,
  payment: CreditCard,
  ticket: LifeBuoy,
  system: Cpu,
}

const COLORS: Record<Activity['type'], string> = {
  note: 'bg-zinc-500/15 text-zinc-300',
  status_change: 'bg-blue-500/15 text-blue-300',
  email: 'bg-violet-500/15 text-violet-300',
  call: 'bg-green-500/15 text-green-300',
  meeting: 'bg-amber-500/15 text-amber-300',
  file: 'bg-cyan-500/15 text-cyan-300',
  invoice: 'bg-pink-500/15 text-pink-300',
  payment: 'bg-green-500/15 text-green-300',
  ticket: 'bg-orange-500/15 text-orange-300',
  system: 'bg-zinc-600/15 text-zinc-400',
}

type Props = {
  entityType: 'customer' | 'order' | 'invoice' | 'ticket'
  entityId: string
  customerId?: string | null
  /** Wenn true, werden alle Aktivitäten dieses Kunden gezeigt (entityübergreifend) */
  byCustomer?: boolean
}

export function Timeline({ entityType, entityId, customerId, byCustomer }: Props) {
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState<Activity['type']>('note')
  const [saving, setSaving] = useState(false)

  async function load() {
    let q = supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(100)
    if (byCustomer && customerId) {
      q = q.eq('customer_id', customerId)
    } else {
      q = q.eq('entity_type', entityType).eq('entity_id', entityId)
    }
    const { data } = await q
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [entityId, customerId, byCustomer])

  async function addNote() {
    if (!note.trim()) return
    setSaving(true)
    await logActivity({
      entity_type: entityType,
      entity_id: entityId,
      customer_id: customerId,
      type: noteType,
      title: NOTE_TITLES[noteType],
      description: note.trim(),
    })
    setNote('')
    setNoteType('note')
    await load()
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {/* Eingabe */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex gap-1.5 flex-wrap">
          {(['note', 'call', 'email', 'meeting'] as const).map(t => {
            const Icon = ICONS[t]
            return (
              <button key={t} onClick={() => setNoteType(t)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all',
                  noteType === t ? 'bg-violet-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white')}>
                <Icon className="w-3.5 h-3.5" />
                {NOTE_TITLES[t]}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
            placeholder="Was ist passiert? (Notiz, Anruf, E-Mail, Termin…) — ⌘+Enter zum Speichern"
            rows={2}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500 resize-none"
          />
          <button onClick={addNote} disabled={!note.trim() || saving}
            className="px-4 self-stretch bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl transition-all flex items-center">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Verlauf */}
      <div className="relative pl-2">
        {loading ? (
          <p className="text-zinc-600 text-sm py-4 text-center">Lädt…</p>
        ) : items.length === 0 ? (
          <p className="text-zinc-600 text-sm py-8 text-center">Noch keine Aktivität — leg mit der ersten Notiz los.</p>
        ) : (
          <div className="space-y-0">
            {items.map((a, i) => {
              const Icon = ICONS[a.type] ?? StickyNote
              return (
                <div key={a.id} className="flex gap-3 group">
                  {/* Linie + Icon */}
                  <div className="flex flex-col items-center">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', COLORS[a.type])}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {i < items.length - 1 && <div className="w-px flex-1 bg-white/10 my-1" />}
                  </div>
                  {/* Inhalt */}
                  <div className="flex-1 pb-5 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{a.title}</span>
                      <span className="text-xs text-zinc-600">{formatDateTime(a.created_at)}</span>
                      {a.created_by && <span className="text-xs text-zinc-600">· {a.created_by}</span>}
                    </div>
                    {a.description && <p className="text-sm text-zinc-400 mt-0.5 whitespace-pre-wrap">{a.description}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const NOTE_TITLES: Record<Activity['type'], string> = {
  note: 'Notiz',
  call: 'Anruf',
  email: 'E-Mail',
  meeting: 'Termin',
  status_change: 'Status geändert',
  file: 'Datei',
  invoice: 'Rechnung',
  payment: 'Zahlung',
  ticket: 'Ticket',
  system: 'System',
}
