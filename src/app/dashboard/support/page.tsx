'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type Ticket } from '@/lib/supabase'
import { formatDateTime, cn } from '@/lib/utils'
import { Badge } from '@/components/ui'
import { LifeBuoy, Plus, Circle } from 'lucide-react'

const STATUS_META: Record<string, { label: string; color: string }> = {
  offen:          { label: 'Offen',          color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  in_bearbeitung: { label: 'In Bearbeitung', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  wartet_kunde:   { label: 'Wartet auf Kunde', color: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
  'gelöst':       { label: 'Gelöst',         color: 'bg-green-500/10 text-green-300 border-green-500/20' },
  geschlossen:    { label: 'Geschlossen',    color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'offen' | 'alle'>('offen')

  useEffect(() => {
    supabase.from('tickets').select('*, customers(name, company)').order('created_at', { ascending: false })
      .then(({ data }) => { setTickets(data ?? []); setLoading(false) })
  }, [])

  const filtered = tickets.filter(t => filter === 'alle' || !['gelöst', 'geschlossen'].includes(t.status))

  return (
    <div className="p-6 space-y-6 animate-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-violet-400" /> Support
          </h1>
          <p className="text-zinc-500 text-sm mt-0.5">Alle Kundenanfragen vom Erstkontakt bis zur Lösung.</p>
        </div>
        <div className="flex gap-1.5">
          {(['offen', 'alle'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-2 text-xs rounded-xl font-medium transition-all',
                filter === f ? 'bg-violet-600 text-white' : 'glass text-zinc-400 hover:text-white')}>
              {f === 'offen' ? 'Offene' : 'Alle'}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="divide-y divide-white/5">
          {loading ? (
            <p className="px-5 py-8 text-center text-zinc-600 text-sm">Lädt…</p>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-8 text-center text-zinc-600 text-sm">
              {filter === 'offen' ? 'Keine offenen Tickets — alles erledigt. 🎉' : 'Noch keine Tickets.'}
            </p>
          ) : filtered.map(t => {
            const meta = STATUS_META[t.status] ?? STATUS_META.offen
            return (
              <Link key={t.id} href={`/dashboard/support/${t.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition-all group">
                <LifeBuoy className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-violet-300">{t.subject}</p>
                  <p className="text-xs text-zinc-500">
                    {t.ticket_number || '—'} · {(t as any).customers?.company || (t as any).customers?.name || 'Kein Kunde'} · {formatDateTime(t.created_at)}
                  </p>
                </div>
                {t.priority === 'dringend' && <Badge className="bg-red-500/10 text-red-300 border-red-500/20">Dringend</Badge>}
                <Badge className={meta.color}>{meta.label}</Badge>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
