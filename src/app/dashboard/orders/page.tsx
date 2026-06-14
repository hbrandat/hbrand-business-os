'use client'

import { useEffect, useState } from 'react'
import { supabase, type Order } from '@/lib/supabase'
import { formatCurrency, formatDate, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Plus, Search, Filter, Send, ShoppingBag, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const STATUS_FILTERS = ['alle', 'new', 'in_progress', 'review', 'done', 'cancelled']

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('alle')
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('orders').select('*, customers(name, company)').order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setLoading(false) })
  }, [])

  async function sendTelegram(order: Order) {
    setSending(order.id)
    // API call to send Telegram notification
    await fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id }),
    }).catch(console.error)
    await supabase.from('orders').update({ telegram_notified: true }).eq('id', order.id)
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, telegram_notified: true } : o))
    setSending(null)
  }

  const filtered = orders.filter(o => {
    if (statusFilter !== 'alle' && o.status !== statusFilter) return false
    if (search && !o.title.toLowerCase().includes(search.toLowerCase()) &&
        !(o.customers as any)?.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="p-6 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Aufträge</h1>
          <p className="text-zinc-500 text-sm">{orders.filter(o => ['new','in_progress','review'].includes(o.status)).length} aktiv · {orders.length} gesamt</p>
        </div>
        <Link href="/dashboard/orders/new" className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl transition-all font-medium">
          <Plus className="w-4 h-4" /> Neuer Auftrag
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5 flex-1 min-w-48">
          <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Auftrag oder Kunde suchen..." className="bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 outline-none flex-1" />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-2 text-xs rounded-xl transition-all font-medium',
                statusFilter === s ? 'bg-violet-600 text-white' : 'glass text-zinc-400 hover:text-white')}>
              {s === 'alle' ? 'Alle' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="p-8 text-center text-zinc-600">Lädt...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-600">Keine Aufträge gefunden</div>
          ) : (
            filtered.map(order => (
              <div key={order.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{order.title}</p>
                  <p className="text-xs text-zinc-500">{(order.customers as any)?.company || (order.customers as any)?.name} · {formatDate(order.due_date)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {order.price && <span className="text-sm font-medium text-zinc-300">{formatCurrency(order.price)}</span>}
                  <span className={cn('text-xs px-2.5 py-1 rounded-full border', STATUS_COLORS[order.status as keyof typeof STATUS_COLORS])}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  <button onClick={() => sendTelegram(order)}
                    disabled={!!order.telegram_notified || sending === order.id}
                    title={order.telegram_notified ? 'Bereits gesendet' : 'Via Telegram senden'}
                    className={cn('p-2 rounded-lg transition-all',
                      order.telegram_notified ? 'text-green-500 cursor-default' : 'text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10')}>
                    <Send className="w-4 h-4" />
                  </button>
                  <Link href={`/dashboard/orders/${order.id}`} className="p-1">
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
