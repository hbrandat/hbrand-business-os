'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { DollarSign, TrendingUp, Calendar, Zap } from 'lucide-react'

const COLORS = ['#7c3aed', '#ec4899', '#3b82f6', '#22c55e', '#f59e0b', '#06b6d4']

export default function CostsPage() {
  const [costs, setCosts] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('api_costs').select('*').order('date', { ascending: false }).limit(90),
      supabase.from('invoices').select('*, customers(name)').order('created_at', { ascending: false }).limit(20),
    ]).then(([{ data: c }, { data: i }]) => {
      setCosts(c ?? [])
      setInvoices(i ?? [])
      setLoading(false)
    })
  }, [])

  const totalCostUSD = costs.reduce((s, c) => s + c.total_cost_usd, 0)
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)

  // Group by model for pie
  const byModel = Object.values(
    costs.reduce((acc: any, c) => {
      acc[c.model] = acc[c.model] || { name: c.model, value: 0 }
      acc[c.model].value += c.total_cost_usd
      return acc
    }, {})
  ) as any[]

  // Group by day for bar chart (last 14 days)
  const byDay = Object.entries(
    costs.reduce((acc: any, c) => {
      const d = c.date?.split('T')[0] || ''
      acc[d] = (acc[d] || 0) + c.total_cost_usd
      return acc
    }, {})
  ).slice(-14).map(([date, cost]) => ({ date: date.slice(5), cost: Number((cost as number).toFixed(4)) }))

  return (
    <div className="p-6 space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Kostenkontrolle</h1>
        <p className="text-zinc-500 text-sm">API-Kosten und Umsatzübersicht</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'API Kosten gesamt', value: `$${totalCostUSD.toFixed(2)}`, sub: `≈ ${formatCurrency(totalCostUSD * 0.92)}`, icon: Zap, color: 'text-pink-400', bg: 'bg-pink-500/10' },
          { label: 'Umsatz (bezahlt)', value: formatCurrency(totalRevenue), sub: 'diesen Monat', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Marge', value: totalRevenue > 0 ? `${Math.round((1 - (totalCostUSD * 0.92) / totalRevenue) * 100)}%` : '—', sub: 'nach API-Kosten', icon: DollarSign, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Offene Rechnungen', value: formatCurrency(invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.amount, 0)), sub: 'ausstehend', icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map(c => (
          <div key={c.label} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">{c.label}</p>
                <p className="text-2xl font-bold text-white mt-1.5">{loading ? '···' : c.value}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{c.sub}</p>
              </div>
              <div className={cn('p-2.5 rounded-xl', c.bg)}><c.icon className={cn('w-5 h-5', c.color)} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold text-white text-sm mb-4">API-Kosten letzte 14 Tage</h2>
          {byDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byDay}>
                <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, color: '#fff', fontSize: 12 }} formatter={(v: any) => [`$${v}`, 'Kosten']} />
                <Bar dataKey="cost" fill="#7c3aed" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">Noch keine Daten</div>
          )}
        </div>

        {/* Pie chart */}
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold text-white text-sm mb-4">Kosten nach Modell</h2>
          {byModel.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byModel} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45}>
                  {byModel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, color: '#fff', fontSize: 12 }} formatter={(v: any) => [`$${Number(v).toFixed(4)}`, 'Kosten']} />
                <Legend formatter={(v) => <span className="text-xs text-zinc-400">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">Noch keine Daten</div>
          )}
        </div>
      </div>

      {/* Invoice table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-semibold text-white text-sm">Rechnungen</h2>
        </div>
        <div className="divide-y divide-white/5">
          {invoices.map(inv => (
            <div key={inv.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-mono">{inv.invoice_number}</p>
                <p className="text-xs text-zinc-500">{(inv.customers as any)?.name} · Fällig {formatDate(inv.due_date)}</p>
              </div>
              <p className="text-sm font-medium text-white">{formatCurrency(inv.amount)}</p>
              <span className={cn('text-xs px-2 py-0.5 rounded-full',
                inv.status === 'paid' ? 'bg-green-500/10 text-green-400' :
                inv.status === 'overdue' ? 'bg-red-500/10 text-red-400' :
                inv.status === 'sent' ? 'bg-blue-500/10 text-blue-400' :
                'bg-zinc-500/10 text-zinc-400'
              )}>
                {inv.status === 'paid' ? 'Bezahlt' : inv.status === 'overdue' ? 'Überfällig' : inv.status === 'sent' ? 'Gesendet' : 'Entwurf'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
