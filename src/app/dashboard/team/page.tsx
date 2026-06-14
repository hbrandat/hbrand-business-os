'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  supabase, EMPLOYEE_STATUS_META,
  type Employee, type Task,
} from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Users, Inbox, Clock, AlertTriangle } from 'lucide-react'

type EmpWithCounts = Employee & {
  inbox_count: number
  working_count: number
  needs_chef_count: number
  failed_count: number
}

export default function TeamPage() {
  const [emps, setEmps] = useState<EmpWithCounts[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const [{ data: e }, { data: t }] = await Promise.all([
      supabase.from('employees').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('tasks').select('assignee, status'),
    ])
    const tasks = (t ?? []) as Pick<Task, 'assignee' | 'status'>[]
    const withCounts: EmpWithCounts[] = (e ?? []).map((emp: Employee) => {
      const mine = tasks.filter(x => x.assignee === emp.id)
      return {
        ...emp,
        inbox_count: mine.filter(x => x.status === 'inbox').length,
        working_count: mine.filter(x => x.status === 'working').length,
        needs_chef_count: mine.filter(x => x.status === 'needs_chef').length,
        failed_count: mine.filter(x => x.status === 'failed').length,
      }
    })
    setEmps(withCounts)
    setLoading(false)
  }
  useEffect(() => {
    load()
    const iv = setInterval(load, 8000)
    return () => clearInterval(iv)
  }, [])

  const totalInbox = emps.reduce((s, e) => s + e.inbox_count, 0)
  const totalNeedsChef = emps.reduce((s, e) => s + e.needs_chef_count, 0)
  const totalFailed = emps.reduce((s, e) => s + e.failed_count, 0)

  return (
    <div className="p-6 space-y-6 animate-in max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-400" />
            Mein KI-Team
          </h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Deine digitale Belegschaft. Jeder hat seinen eigenen Tisch — nichts geht zum Kunden ohne deine Freigabe.
          </p>
        </div>
        <div className="flex gap-3">
          <Stat icon={Inbox} label="Im Eingang" value={totalInbox} color="text-blue-400" />
          <Stat icon={Clock} label="Wartet auf dich" value={totalNeedsChef} color="text-amber-400" />
          <Stat icon={AlertTriangle} label="Fehler" value={totalFailed} color="text-red-400" />
        </div>
      </div>

      {loading ? (
        <p className="text-center text-zinc-600 text-sm py-16">Lädt…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {emps.map(emp => {
            const st = EMPLOYEE_STATUS_META[emp.status]
            const busy = emp.inbox_count + emp.working_count
            return (
              <Link
                key={emp.id}
                href={`/dashboard/team/${emp.key}`}
                className="glass rounded-2xl p-5 hover:bg-white/5 transition-all group relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 w-full h-1 opacity-80"
                  style={{ background: emp.color }}
                />
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `${emp.color}22` }}
                  >
                    {emp.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white truncate group-hover:text-violet-300">{emp.name}</p>
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', st.dot)} />
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{emp.role_title}</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 mt-3 line-clamp-2 min-h-[2rem]">{emp.description}</p>

                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5">
                  <TaskPill label="Eingang" value={emp.inbox_count} active={emp.inbox_count > 0} color="text-blue-300" />
                  <TaskPill label="Arbeit" value={emp.working_count} active={emp.working_count > 0} color="text-violet-300" />
                  <TaskPill label="Chef" value={emp.needs_chef_count} active={emp.needs_chef_count > 0} color="text-amber-300" />
                  {emp.failed_count > 0 && (
                    <TaskPill label="Fehler" value={emp.failed_count} active color="text-red-300" />
                  )}
                  <span className="ml-auto text-[11px] text-zinc-600">{st.label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="glass rounded-xl px-4 py-2 flex items-center gap-2.5">
      <Icon className={cn('w-4 h-4', color)} />
      <div>
        <p className="text-lg font-bold text-white leading-none">{value}</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function TaskPill({ label, value, active, color }: { label: string; value: number; active: boolean; color: string }) {
  return (
    <div className={cn('text-center', !active && 'opacity-40')}>
      <p className={cn('text-sm font-bold leading-none', active ? color : 'text-zinc-500')}>{value}</p>
      <p className="text-[10px] text-zinc-600 mt-0.5">{label}</p>
    </div>
  )
}
