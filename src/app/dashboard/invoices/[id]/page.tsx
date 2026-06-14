'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, logActivity, type Invoice, type InvoiceItem } from '@/lib/supabase'
import { formatCurrency, formatDate, cn, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'
import { ArrowLeft, FileDown, Trash2, Send, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

const STATUS_FLOW: Record<string, { label: string; next: Invoice['status']; icon: any; cls: string }[]> = {
  draft: [{ label: 'Als gesendet markieren', next: 'sent', icon: Send, cls: 'bg-blue-600 hover:bg-blue-700' }],
  sent: [
    { label: 'Als bezahlt markieren', next: 'paid', icon: CheckCircle2, cls: 'bg-green-600 hover:bg-green-700' },
    { label: 'Stornieren', next: 'cancelled', icon: XCircle, cls: 'bg-red-600/80 hover:bg-red-700' },
  ],
  overdue: [
    { label: 'Als bezahlt markieren', next: 'paid', icon: CheckCircle2, cls: 'bg-green-600 hover:bg-green-700' },
    { label: 'Stornieren', next: 'cancelled', icon: XCircle, cls: 'bg-red-600/80 hover:bg-red-700' },
  ],
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function load() {
    const [{ data: inv }, { data: it }] = await Promise.all([
      supabase.from('invoices').select('*, customers(name, company, email)').eq('id', id).single(),
      supabase.from('invoice_items').select('*').eq('invoice_id', id).order('position'),
    ])
    setInvoice(inv as any)
    setItems((it as any) ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [id])

  async function setStatus(next: Invoice['status']) {
    if (!invoice) return
    setBusy(true)
    const patch: any = { status: next }
    if (next === 'paid') patch.paid_at = new Date().toISOString()
    await supabase.from('invoices').update(patch).eq('id', invoice.id)
    await logActivity({
      entity_type: 'invoice',
      entity_id: invoice.id,
      customer_id: invoice.customer_id,
      type: 'invoice',
      title: `Rechnung ${invoice.invoice_number}: ${STATUS_LABELS[next] ?? next}`,
    })
    setBusy(false)
    load()
  }

  async function remove() {
    if (!invoice) return
    if (!confirm(`Rechnung ${invoice.invoice_number} wirklich löschen?`)) return
    setBusy(true)
    await supabase.from('invoices').delete().eq('id', invoice.id)
    router.push('/dashboard/invoices')
  }

  if (loading) return <div className="p-6 text-zinc-500 text-sm">Lädt…</div>
  if (!invoice) return <div className="p-6 text-zinc-400">Rechnung nicht gefunden.</div>

  const overdue = invoice.status === 'sent' && invoice.due_date && new Date(invoice.due_date) < new Date()
  const effStatus = overdue ? 'overdue' : invoice.status
  const actions = STATUS_FLOW[effStatus] ?? []

  return (
    <div className="p-6 max-w-3xl space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/invoices"
          className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{invoice.invoice_number}</h1>
          <p className="text-zinc-500 text-sm">{(invoice.customers as any)?.name ?? 'Kein Kunde'}</p>
        </div>
        <span
          className={cn(
            'px-3 py-1 rounded-lg text-xs border',
            STATUS_COLORS[effStatus as keyof typeof STATUS_COLORS],
          )}
        >
          {STATUS_LABELS[effStatus] ?? effStatus}
        </span>
      </div>

      {/* Aktionen */}
      <div className="flex flex-wrap gap-2">
        <a
          href={`/dashboard/invoices/${invoice.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl transition-all font-medium"
        >
          <FileDown className="w-4 h-4" /> PDF / Drucken
        </a>
        {actions.map((a) => (
          <button
            key={a.next}
            onClick={() => setStatus(a.next)}
            disabled={busy}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-white text-sm rounded-xl transition-all font-medium disabled:opacity-50',
              a.cls,
            )}
          >
            <a.icon className="w-4 h-4" /> {a.label}
          </button>
        ))}
        <button
          onClick={remove}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 text-sm rounded-xl transition-all font-medium disabled:opacity-50 ml-auto"
        >
          <Trash2 className="w-4 h-4" /> Löschen
        </button>
      </div>

      {/* Eckdaten */}
      <div className="glass rounded-2xl p-6 grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-zinc-500 text-xs">Rechnungsdatum</div>
          <div className="text-white">{formatDate(invoice.issue_date)}</div>
        </div>
        <div>
          <div className="text-zinc-500 text-xs">Fällig am</div>
          <div className={cn('text-white', overdue && 'text-red-400')}>{formatDate(invoice.due_date)}</div>
        </div>
        <div>
          <div className="text-zinc-500 text-xs">Bezahlt am</div>
          <div className="text-white">{formatDate(invoice.paid_at)}</div>
        </div>
      </div>

      {/* Positionen */}
      <div className="glass rounded-2xl p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs border-b border-white/10">
              <th className="text-left font-medium pb-2">Beschreibung</th>
              <th className="text-right font-medium pb-2">Menge</th>
              <th className="text-right font-medium pb-2">Einzelpreis</th>
              <th className="text-right font-medium pb-2">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-white/5">
                <td className="py-2 text-white">{it.description}</td>
                <td className="py-2 text-right text-zinc-300">
                  {it.quantity} {it.unit}
                </td>
                <td className="py-2 text-right text-zinc-300">{formatCurrency(it.unit_price)}</td>
                <td className="py-2 text-right text-white">{formatCurrency(it.quantity * it.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 space-y-1 text-sm ml-auto max-w-[260px]">
          <div className="flex justify-between text-zinc-400">
            <span>Netto</span>
            <span>{formatCurrency(invoice.net_amount || 0)}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>USt ({invoice.tax_rate} %)</span>
            <span>{formatCurrency(invoice.tax_amount || 0)}</span>
          </div>
          <div className="flex justify-between text-white font-semibold text-base pt-1 border-t border-white/10">
            <span>Gesamt</span>
            <span>{formatCurrency(invoice.gross_amount || invoice.amount || 0)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="glass rounded-2xl p-6">
          <div className="text-zinc-500 text-xs mb-1">Notizen</div>
          <p className="text-zinc-300 text-sm whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}
    </div>
  )
}
