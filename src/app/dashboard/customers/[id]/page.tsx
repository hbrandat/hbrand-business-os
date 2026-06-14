'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  supabase, logActivity,
  type Customer, type Order, type Invoice, type Ticket, type CustomerFile,
} from '@/lib/supabase'
import { formatCurrency, formatDate, cn, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'
import { Badge, stageStyle } from '@/components/ui'
import { Timeline } from '@/components/timeline'
import {
  ArrowLeft, Mail, Phone, Building2, MapPin, Globe, Hash,
  ShoppingBag, Receipt, LifeBuoy, FolderOpen, Plus, ExternalLink,
} from 'lucide-react'

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [files, setFiles] = useState<CustomerFile[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'activity' | 'orders' | 'invoices' | 'tickets' | 'files'>('activity')

  async function load() {
    const [{ data: c }, { data: o }, { data: inv }, { data: tk }, { data: fl }] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('orders').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      supabase.from('tickets').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      supabase.from('customer_files').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    ])
    setCustomer(c as Customer)
    setOrders(o ?? []); setInvoices(inv ?? []); setTickets(tk ?? []); setFiles(fl ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  if (loading) return <div className="p-6 text-zinc-500">Lädt…</div>
  if (!customer) return (
    <div className="p-6">
      <p className="text-zinc-400">Kunde nicht gefunden.</p>
      <Link href="/dashboard/customers" className="text-violet-400 text-sm">← Zurück</Link>
    </div>
  )

  const openOrders = orders.filter(o => o.stage !== 'abgeschlossen').length
  const revenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const openInvoices = invoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s,i)=>s+i.amount,0)
  const openTickets = tickets.filter(t => !['gelöst','geschlossen'].includes(t.status)).length

  return (
    <div className="p-6 space-y-6 animate-in max-w-5xl">
      {/* Kopf */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/customers" className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
          {customer.name.slice(0,2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
            <Badge className={STATUS_COLORS[customer.status as keyof typeof STATUS_COLORS]}>{STATUS_LABELS[customer.status]}</Badge>
          </div>
          {customer.company && <p className="text-sm text-zinc-400 flex items-center gap-1.5 mt-1"><Building2 className="w-3.5 h-3.5" />{customer.company}</p>}
        </div>
      </div>

      {/* Kennzahlen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Offene Aufträge" value={`${openOrders}`} />
        <Stat label="Umsatz (bezahlt)" value={formatCurrency(revenue)} />
        <Stat label="Offene Rechnungen" value={formatCurrency(openInvoices)} />
        <Stat label="Offene Tickets" value={`${openTickets}`} />
      </div>

      {/* Kontaktdaten */}
      <div className="glass rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
        {customer.email && <ContactRow icon={Mail} value={customer.email} href={`mailto:${customer.email}`} />}
        {customer.phone && <ContactRow icon={Phone} value={customer.phone} href={`tel:${customer.phone}`} />}
        {(customer.address || customer.city) && <ContactRow icon={MapPin} value={[customer.address, customer.city, customer.country].filter(Boolean).join(', ')} />}
        {customer.website && <ContactRow icon={Globe} value={customer.website} href={customer.website} />}
        {customer.vat_id && <ContactRow icon={Hash} value={`UID: ${customer.vat_id}`} />}
        {customer.source && <ContactRow icon={ExternalLink} value={`Quelle: ${customer.source}`} />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 overflow-x-auto">
        {([['activity','Verlauf', null],['orders','Aufträge', orders.length],['invoices','Rechnungen', invoices.length],['tickets','Support', tickets.length],['files','Dateien', files.length]] as const).map(([k, label, count]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={cn('px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap flex items-center gap-2',
              tab === k ? 'text-white border-violet-500' : 'text-zinc-500 border-transparent hover:text-zinc-300')}>
            {label}
            {count !== null && count > 0 && <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{count}</span>}
          </button>
        ))}
      </div>

      {tab === 'activity' && <Timeline entityType="customer" entityId={id} customerId={id} byCustomer />}

      {tab === 'orders' && (
        <List empty="Noch keine Aufträge." action={<Link href="/dashboard/orders/new" className="btn-add"><Plus className="w-4 h-4" />Auftrag</Link>}>
          {orders.map(o => (
            <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="row group">
              <ShoppingBag className="w-4 h-4 text-zinc-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate group-hover:text-violet-300">{o.title}</p>
                <p className="text-xs text-zinc-500">{formatDate(o.created_at)}</p>
              </div>
              <Badge className={stageStyle(o.stage)}>{o.stage ?? 'kontakt'}</Badge>
              {o.price ? <span className="text-sm text-zinc-300">{formatCurrency(o.price)}</span> : null}
            </Link>
          ))}
        </List>
      )}

      {tab === 'invoices' && (
        <List empty="Noch keine Rechnungen.">
          {invoices.map(inv => (
            <div key={inv.id} className="row">
              <Receipt className="w-4 h-4 text-zinc-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-mono">{inv.invoice_number}</p>
                <p className="text-xs text-zinc-500">Fällig {formatDate(inv.due_date)}</p>
              </div>
              <span className="text-sm text-white">{formatCurrency(inv.amount)}</span>
              <Badge className={STATUS_COLORS[inv.status as keyof typeof STATUS_COLORS]}>{STATUS_LABELS[inv.status]}</Badge>
            </div>
          ))}
        </List>
      )}

      {tab === 'tickets' && (
        <List empty="Keine Support-Tickets.">
          {tickets.map(t => (
            <Link key={t.id} href={`/dashboard/support/${t.id}`} className="row group">
              <LifeBuoy className="w-4 h-4 text-zinc-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate group-hover:text-violet-300">{t.subject}</p>
                <p className="text-xs text-zinc-500">{t.ticket_number} · {formatDate(t.created_at)}</p>
              </div>
              <Badge className={STATUS_COLORS[t.status as keyof typeof STATUS_COLORS] ?? 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20'}>{t.status}</Badge>
            </Link>
          ))}
        </List>
      )}

      {tab === 'files' && (
        <List empty="Noch keine Dateien.">
          {files.map(f => (
            <a key={f.id} href={f.drive_url || '#'} target="_blank" rel="noreferrer" className="row group">
              <FolderOpen className="w-4 h-4 text-cyan-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate group-hover:text-violet-300">{f.name}</p>
                <p className="text-xs text-zinc-500">{f.category || 'Sonstiges'}{f.ai_named && ' · KI-benannt'}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />
            </a>
          ))}
        </List>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  )
}

function ContactRow({ icon: Icon, value, href }: { icon: any; value: string; href?: string }) {
  const inner = (
    <span className="flex items-center gap-2 text-sm text-zinc-300 py-1">
      <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
      <span className="truncate">{value}</span>
    </span>
  )
  return href ? <a href={href} target="_blank" rel="noreferrer" className="hover:text-violet-300 transition-colors">{inner}</a> : inner
}

function List({ children, empty, action }: { children: React.ReactNode; empty: string; action?: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children]
  const isEmpty = arr.flat().filter(Boolean).length === 0
  return (
    <div className="glass rounded-2xl overflow-hidden">
      {action && <div className="p-3 border-b border-white/5 flex justify-end">{action}</div>}
      <div className="divide-y divide-white/5">
        {isEmpty ? <p className="px-5 py-8 text-sm text-zinc-600 text-center">{empty}</p> : children}
      </div>
    </div>
  )
}
