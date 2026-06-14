'use client'

import { useEffect, useState } from 'react'
import { supabase, type Invoice } from '@/lib/supabase'
import { formatCurrency, formatDate, STATUS_COLORS, STATUS_LABELS, cn } from '@/lib/utils'
import { Plus, Search, FileText, ChevronRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const STATUS_FILTERS = ['alle', 'draft', 'sent', 'paid', 'overdue', 'cancelled']

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('alle')

  useEffect(() => {
    supabase
      .from('invoices')
      .select('*, customers(name, company)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setInvoices(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== 'alle' && inv.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const name = (inv.customers as any)?.name?.toLowerCase() ?? ''
      if (!inv.invoice_number?.toLowerCase().includes(q) && !name.includes(q)) return false
    }
    return true
  })

  const totalOpen = invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + (i.gross_amount || i.amount || 0), 0)
  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + (i.gross_amount || i.amount || 0), 0)

  return (
    <div className="p-6 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rechnungen</h1>
          <p className="text-zinc-500 text-sm">
            {invoices.length} gesamt · <span className="text-amber-400">{formatCurrency(totalOpen)} offen</span> ·{' '}
            <span className="text-green-400">{formatCurrency(totalPaid)} bezahlt</span>
          </p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl transition-all font-medium"
        >
          <Plus className="w-4 h-4" /> Neue Rechnung
        </Link>
      </div>

      {/* Filter + Suche */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechnungsnummer oder Kunde suchen..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500"
          />
        </div>
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg transition-all font-medium',
                statusFilter === s ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white',
              )}
            >
              {s === 'alle' ? 'Alle' : STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-zinc-500 text-sm py-12 text-center">Lädt…</div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Noch keine Rechnungen.</p>
          <Link href="/dashboard/invoices/new" className="text-violet-400 text-sm hover:underline mt-2 inline-block">
            Erste Rechnung erstellen →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => {
            const overdue =
              inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < new Date()
            return (
              <Link
                key={inv.id}
                href={`/dashboard/invoices/${inv.id}`}
                className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-white/[0.07] transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium truncate">{inv.invoice_number}</span>
                    {overdue && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                  <p className="text-zinc-500 text-xs truncate">
                    {(inv.customers as any)?.name ?? 'Kein Kunde'} · Fällig: {formatDate(inv.due_date)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-white font-semibold">
                    {formatCurrency(inv.gross_amount || inv.amount || 0)}
                  </div>
                  <span
                    className={cn(
                      'inline-block px-2 py-0.5 rounded-md text-[11px] border mt-0.5',
                      STATUS_COLORS[(overdue ? 'overdue' : inv.status) as keyof typeof STATUS_COLORS],
                    )}
                  >
                    {STATUS_LABELS[overdue ? 'overdue' : inv.status] ?? inv.status}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
