'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Users, ShoppingBag, FileText, Bot, TrendingUp, TrendingDown,
  AlertCircle, Clock, CheckCircle, Euro, ArrowUpRight, Zap,
  Plus,
} from 'lucide-react'
import Link from 'next/link'

type Stats = {
  customers: number
  activeOrders: number
  monthRevenue: number
  pendingInvoices: number
  aiJobsToday: number
  aiCostMonth: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    customers: 0, activeOrders: 0, monthRevenue: 0,
    pendingInvoices: 0, aiJobsToday: 0, aiCostMonth: 0,
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [
          { count: customers },
          { count: activeOrders },
          { data: paidInvoices },
          { count: pendingInvoices },
          { count: aiJobsToday },
          { data: aiCosts },
          { data: orders },
          { data: jobs },
        ] = await Promise.all([
          supabase.from('customers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['new', 'in_progress', 'review']),
          supabase.from('invoices').select('amount').eq('status', 'paid').gte('paid_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          supabase.from('invoices').select('*', { count: 'exact', head: true }).in('status', ['sent', 'overdue']),
          supabase.from('ai_jobs').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]),
          supabase.from('api_costs').select('total_cost_usd').gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
          supabase.from('orders').select('*, customers(name, company)').order('created_at', { ascending: false }).limit(5),
          supabase.from('ai_jobs').select('*, customers(name)').order('created_at', { ascending: false }).limit(5),
        ])

        const monthRevenue = paidInvoices?.reduce((s, i) => s + i.amount, 0) ?? 0
        const aiCostMonth = aiCosts?.reduce((s, c) => s + c.total_cost_usd, 0) ?? 0

        setStats({
          customers: customers ?? 0,
          activeOrders: activeOrders ?? 0,
          monthRevenue,
          pendingInvoices: pendingInvoices ?? 0,
          aiJobsToday: aiJobsToday ?? 0,
          aiCostMonth,
        })
        setRecentOrders(orders ?? [])
        setRecentJobs(jobs ?? [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statCards = [
    { label: 'Aktive Kunden', value: stats.customers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Offene Aufträge', value: stats.activeOrders, icon: ShoppingBag, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Umsatz Monat', value: formatCurrency(stats.monthRevenue), icon: Euro, color: 'text-green-400', bg: 'bg-green-500/10', large: true },
    { label: 'Offene Rechnungen', value: stats.pendingInvoices, icon: FileText, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'KI Jobs heute', value: stats.aiJobsToday, icon: Bot, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'KI Kosten Monat', value: `$${stats.aiCostMonth.toFixed(2)}`, icon: Zap, color: 'text-pink-400', bg: 'bg-pink-500/10', large: true },
  ]

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/orders/new" className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl transition-all font-medium">
            <Plus className="w-4 h-4" />
            Neuer Auftrag
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{card.label}</p>
                <p className={cn('mt-2 font-bold text-white', card.large ? 'text-2xl' : 'text-3xl')}>
                  {loading ? <span className="text-zinc-700 animate-pulse">···</span> : card.value}
                </p>
              </div>
              <div className={cn('p-2.5 rounded-xl', card.bg)}>
                <card.icon className={cn('w-5 h-5', card.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <h2 className="font-semibold text-white text-sm">Neueste Aufträge</h2>
            <Link href="/dashboard/orders" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              Alle <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {loading ? (
              <div className="p-5 text-center text-zinc-600 text-sm">Lädt...</div>
            ) : recentOrders.length === 0 ? (
              <div className="p-5 text-center text-zinc-600 text-sm">Keine Aufträge vorhanden</div>
            ) : (
              recentOrders.map((order) => (
                <Link key={order.id} href={`/dashboard/orders/${order.id}`} className="flex items-center gap-4 p-4 hover:bg-white/3 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">{order.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{order.customers?.company || order.customers?.name}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', STATUS_COLORS[order.status as keyof typeof STATUS_COLORS])}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    {order.price && <p className="text-xs text-zinc-500 mt-1">{formatCurrency(order.price)}</p>}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* AI Jobs */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <h2 className="font-semibold text-white text-sm">Letzte KI-Jobs</h2>
            <Link href="/dashboard/ai-monitor" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              Alle <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {loading ? (
              <div className="p-5 text-center text-zinc-600 text-sm">Lädt...</div>
            ) : recentJobs.length === 0 ? (
              <div className="p-5 text-center text-zinc-600 text-sm">Noch keine KI-Jobs</div>
            ) : (
              recentJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-4 p-4">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0',
                    job.status === 'done' ? 'bg-green-500' :
                    job.status === 'running' ? 'bg-amber-500 animate-pulse' :
                    'bg-red-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{job.model}</p>
                    <p className="text-xs text-zinc-500 truncate">{job.customers?.name || 'Kein Kunde'} · {job.provider}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-mono text-zinc-400">${job.cost_usd?.toFixed(4)}</p>
                    <p className="text-xs text-zinc-600">{job.input_tokens + job.output_tokens} tok</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
