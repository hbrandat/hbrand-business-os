'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  supabase, logActivity,
  type Order, type OrderItem, type TimeEntry,
  ORDER_STAGES,
} from '@/lib/supabase'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Badge, stageStyle, priorityStyle } from '@/components/ui'
import { Timeline } from '@/components/timeline'
import {
  ArrowLeft, Building2, Plus, Trash2, Clock, Receipt,
  CheckCircle2, Circle, Euro, Hash, AlertTriangle,
} from 'lucide-react'

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [times, setTimes] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'items' | 'time' | 'activity'>('overview')

  async function load() {
    const [{ data: o }, { data: it }, { data: tm }] = await Promise.all([
      supabase.from('orders').select('*, customers(*)').eq('id', id).single(),
      supabase.from('order_items').select('*').eq('order_id', id).order('position'),
      supabase.from('time_entries').select('*').eq('order_id', id).order('entry_date', { ascending: false }),
    ])
    setOrder(o as Order)
    setItems(it ?? [])
    setTimes(tm ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  async function setStage(stage: NonNullable<Order['stage']>) {
    if (!order) return
    const old = order.stage
    await supabase.from('orders').update({ stage }).eq('id', id)
    setOrder({ ...order, stage })
    await logActivity({
      entity_type: 'order', entity_id: id, customer_id: order.customer_id,
      type: 'status_change', title: 'Pipeline-Stufe geändert',
      description: `${stageLabel(old)} → ${stageLabel(stage)}`,
    })
  }

  if (loading) return <div className="p-6 text-zinc-500">Lädt…</div>
  if (!order) return (
    <div className="p-6">
      <p className="text-zinc-400">Auftrag nicht gefunden.</p>
      <Link href="/dashboard/orders" className="text-violet-400 text-sm">← Zurück</Link>
    </div>
  )

  const customer = (order as any).customers
  const itemsTotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const billableMin = times.filter(t => t.billable).reduce((s, t) => s + t.minutes, 0)
  const timeValue = order.hourly_rate ? (billableMin / 60) * order.hourly_rate : 0
  const grandTotal = (order.type === 'hourly' ? timeValue : itemsTotal || (order.price ?? 0))

  return (
    <div className="p-6 space-y-6 animate-in max-w-5xl">
      {/* Kopf */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/orders" className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{order.title}</h1>
            <Badge className={priorityStyle(order.priority)}>{prioLabel(order.priority)}</Badge>
          </div>
          {customer && (
            <Link href={`/dashboard/customers/${customer.id}`}
              className="text-sm text-zinc-400 hover:text-violet-300 flex items-center gap-1.5 mt-1 w-fit">
              <Building2 className="w-3.5 h-3.5" />
              {customer.company || customer.name}
            </Link>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{formatCurrency(grandTotal)}</p>
          <p className="text-xs text-zinc-500">{order.type === 'hourly' ? `${(billableMin/60).toFixed(1)} h abrechenbar` : 'Auftragswert'}</p>
        </div>
      </div>

      {/* Pipeline */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Pipeline</span>
        </div>
        <div className="flex items-center gap-1">
          {ORDER_STAGES.map((s, i) => {
            const currentIdx = ORDER_STAGES.findIndex(x => x.key === order.stage)
            const done = i < currentIdx
            const active = s.key === order.stage
            return (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <button onClick={() => setStage(s.key)}
                  className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap',
                    active ? 'bg-violet-600 text-white' :
                    done ? 'text-green-400 hover:bg-white/5' : 'text-zinc-500 hover:bg-white/5')}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : active ? <Circle className="w-4 h-4 fill-current" /> : <Circle className="w-4 h-4" />}
                  {s.label}
                </button>
                {i < ORDER_STAGES.length - 1 && <div className={cn('h-px flex-1 mx-1', done ? 'bg-green-500/40' : 'bg-white/10')} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5">
        {([['overview','Übersicht'],['items','Positionen'],['time','Zeiten'],['activity','Verlauf']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn('px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
              tab === k ? 'text-white border-violet-500' : 'text-zinc-500 border-transparent hover:text-zinc-300')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <InfoCard label="Status" value={stageLabel(order.stage)} />
          <InfoCard label="Typ" value={order.type === 'hourly' ? 'Stundensatz' : order.type === 'retainer' ? 'Retainer' : 'Pauschal'} />
          <InfoCard label="Fällig" value={formatDate(order.due_date)} />
          {order.hourly_rate ? <InfoCard label="Stundensatz" value={formatCurrency(order.hourly_rate)} /> : null}
          <InfoCard label="Erfasste Zeit" value={`${(times.reduce((s,t)=>s+t.minutes,0)/60).toFixed(1)} h`} />
          <InfoCard label="Positionen" value={`${items.length}`} />
          {order.description && (
            <div className="lg:col-span-3 glass rounded-2xl p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Beschreibung</p>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{order.description}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'items' && <ItemsTab orderId={id} items={items} onChange={load} total={itemsTotal} customerId={order.customer_id} />}
      {tab === 'time' && <TimeTab orderId={id} times={times} onChange={load} rate={order.hourly_rate} customerId={order.customer_id} />}
      {tab === 'activity' && <Timeline entityType="order" entityId={id} customerId={order.customer_id} />}
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-white mt-1">{value}</p>
    </div>
  )
}

// ─── Positionen ───
function ItemsTab({ orderId, items, onChange, total, customerId }: {
  orderId: string; items: OrderItem[]; onChange: () => void; total: number; customerId?: string
}) {
  const [desc, setDesc] = useState('')
  const [qty, setQty] = useState('1')
  const [unit, setUnit] = useState('Stk')
  const [price, setPrice] = useState('')

  async function add() {
    if (!desc.trim() || !price) return
    await supabase.from('order_items').insert({
      order_id: orderId, description: desc.trim(),
      quantity: parseFloat(qty) || 1, unit, unit_price: parseFloat(price) || 0,
      position: items.length,
    })
    await logActivity({ entity_type: 'order', entity_id: orderId, customer_id: customerId,
      type: 'note', title: 'Position hinzugefügt', description: `${desc} — ${qty} ${unit} à ${price}€` })
    setDesc(''); setQty('1'); setPrice('')
    onChange()
  }
  async function del(id: string) {
    await supabase.from('order_items').delete().eq('id', id)
    onChange()
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="divide-y divide-white/5">
        {items.map(it => (
          <div key={it.id} className="flex items-center gap-3 px-5 py-3 group">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">{it.description}</p>
              <p className="text-xs text-zinc-500">{it.quantity} {it.unit} × {formatCurrency(it.unit_price)}</p>
            </div>
            <span className="text-sm font-medium text-white">{formatCurrency(it.quantity * it.unit_price)}</span>
            <button onClick={() => del(it.id)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="px-5 py-6 text-sm text-zinc-600 text-center">Noch keine Positionen.</p>}
      </div>
      {/* Eingabe */}
      <div className="p-4 bg-white/2 border-t border-white/5 flex gap-2 flex-wrap items-end">
        <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Beschreibung"
          className="flex-1 min-w-40 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500" />
        <input value={qty} onChange={e=>setQty(e.target.value)} type="number" placeholder="Menge"
          className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-violet-500" />
        <select value={unit} onChange={e=>setUnit(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-zinc-200 outline-none focus:border-violet-500">
          <option>Stk</option><option>Std</option><option>Pauschal</option>
        </select>
        <input value={price} onChange={e=>setPrice(e.target.value)} type="number" placeholder="Preis €"
          className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-violet-500" />
        <button onClick={add} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Hinzufügen
        </button>
      </div>
      <div className="px-5 py-3 border-t border-white/5 flex justify-between items-center">
        <span className="text-sm text-zinc-400">Summe netto</span>
        <span className="text-lg font-bold text-white">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

// ─── Zeiten ───
function TimeTab({ orderId, times, onChange, rate, customerId }: {
  orderId: string; times: TimeEntry[]; onChange: () => void; rate?: number; customerId?: string
}) {
  const [desc, setDesc] = useState('')
  const [hours, setHours] = useState('')
  const [billable, setBillable] = useState(true)

  async function add() {
    if (!desc.trim() || !hours) return
    const minutes = Math.round((parseFloat(hours) || 0) * 60)
    await supabase.from('time_entries').insert({
      order_id: orderId, customer_id: customerId, description: desc.trim(),
      minutes, billable,
    })
    await logActivity({ entity_type: 'order', entity_id: orderId, customer_id: customerId,
      type: 'note', title: 'Zeit erfasst', description: `${hours} h — ${desc}${billable ? '' : ' (nicht abrechenbar)'}` })
    setDesc(''); setHours('')
    onChange()
  }
  async function del(id: string) {
    await supabase.from('time_entries').delete().eq('id', id)
    onChange()
  }

  const totalMin = times.reduce((s,t)=>s+t.minutes,0)
  const billMin = times.filter(t=>t.billable).reduce((s,t)=>s+t.minutes,0)

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="divide-y divide-white/5">
        {times.map(t => (
          <div key={t.id} className="flex items-center gap-3 px-5 py-3 group">
            <Clock className={cn('w-4 h-4 flex-shrink-0', t.billable ? 'text-green-400' : 'text-zinc-600')} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">{t.description}</p>
              <p className="text-xs text-zinc-500">{formatDate(t.entry_date)} {!t.billable && '· nicht abrechenbar'}</p>
            </div>
            <span className="text-sm font-medium text-white">{(t.minutes/60).toFixed(2)} h</span>
            <button onClick={() => del(t.id)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {times.length === 0 && <p className="px-5 py-6 text-sm text-zinc-600 text-center">Noch keine Zeiten erfasst.</p>}
      </div>
      <div className="p-4 bg-white/2 border-t border-white/5 flex gap-2 flex-wrap items-end">
        <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Was wurde gemacht?"
          className="flex-1 min-w-40 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500" />
        <input value={hours} onChange={e=>setHours(e.target.value)} type="number" step="0.25" placeholder="Stunden"
          className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-violet-500" />
        <button onClick={()=>setBillable(b=>!b)}
          className={cn('px-3 py-2 rounded-lg text-xs font-medium transition-all', billable ? 'bg-green-500/15 text-green-300' : 'bg-white/5 text-zinc-500')}>
          {billable ? 'abrechenbar' : 'intern'}
        </button>
        <button onClick={add} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Erfassen
        </button>
      </div>
      <div className="px-5 py-3 border-t border-white/5 flex justify-between items-center">
        <span className="text-sm text-zinc-400">{(totalMin/60).toFixed(1)} h gesamt · {(billMin/60).toFixed(1)} h abrechenbar</span>
        {rate ? <span className="text-lg font-bold text-white">{formatCurrency((billMin/60)*rate)}</span> : null}
      </div>
    </div>
  )
}

function stageLabel(k?: string) { return ORDER_STAGES.find(s => s.key === k)?.label ?? k ?? '—' }
function prioLabel(p?: string) { return ({ niedrig:'Niedrig', normal:'Normal', hoch:'Hoch', dringend:'Dringend' } as any)[p ?? 'normal'] }
