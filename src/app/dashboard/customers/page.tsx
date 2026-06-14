'use client'

import { useEffect, useState } from 'react'
import { supabase, type Customer } from '@/lib/supabase'
import { formatDate, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Plus, Search, Users, Phone, Mail, Building2, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('customers').select('*').order('name')
      .then(({ data }) => { setCustomers(data ?? []); setLoading(false) })
  }, [])

  const filtered = customers.filter(c =>
    search === '' ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Kunden</h1>
          <p className="text-zinc-500 text-sm">{customers.length} Kunden gesamt</p>
        </div>
        <Link href="/dashboard/customers/new" className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl transition-all font-medium">
          <Plus className="w-4 h-4" /> Neuer Kunde
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 glass rounded-xl px-4 py-3">
        <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Name, E-Mail oder Firma suchen..."
          className="bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 outline-none flex-1"
        />
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] text-xs text-zinc-500 font-medium uppercase tracking-wider px-5 py-3 border-b border-white/5">
          <span>Name / Firma</span>
          <span>Kontakt</span>
          <span>Stadt</span>
          <span>Status</span>
          <span></span>
        </div>
        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="p-8 text-center text-zinc-600">Lädt...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-600">
              {search ? 'Keine Ergebnisse' : 'Noch keine Kunden — leg gleich los!'}
            </div>
          ) : (
            filtered.map(c => (
              <Link key={c.id} href={`/dashboard/customers/${c.id}`}
                className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center px-5 py-4 hover:bg-white/3 transition-all group gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center text-violet-400 font-semibold text-sm flex-shrink-0">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">{c.name}</p>
                    {c.company && <p className="text-xs text-zinc-500 flex items-center gap-1"><Building2 className="w-3 h-3" />{c.company}</p>}
                  </div>
                </div>
                <div className="min-w-0">
                  {c.email && <p className="text-xs text-zinc-400 flex items-center gap-1 truncate"><Mail className="w-3 h-3 flex-shrink-0" />{c.email}</p>}
                  {c.phone && <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3 flex-shrink-0" />{c.phone}</p>}
                </div>
                <span className="text-xs text-zinc-500">{c.city || '—'}</span>
                <span className={cn('text-xs px-2.5 py-1 rounded-full border', STATUS_COLORS[c.status as keyof typeof STATUS_COLORS])}>
                  {STATUS_LABELS[c.status]}
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
