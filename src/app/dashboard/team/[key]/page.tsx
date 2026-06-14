'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  supabase, TASK_STATUS_META, EMPLOYEE_STATUS_META,
  type Employee, type Task, type Customer,
} from '@/lib/supabase'
import { cn, formatDateTime } from '@/lib/utils'
import {
  ArrowLeft, Send, Loader2, Check, X, Plus, Play,
  CheckCircle2, MessageSquare, ClipboardList, Sparkles, ShieldAlert,
} from 'lucide-react'

export default function EmployeePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params)
  const [emp, setEmp] = useState<Employee | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [tab, setTab] = useState<'tisch' | 'chat'>('tisch')
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  async function load() {
    const { data: e } = await supabase.from('employees').select('*').eq('key', key).single()
    setEmp(e)
    if (e) {
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase.from('tasks').select('*, customers(name, company)').eq('assignee', e.id).order('created_at', { ascending: false }),
        supabase.from('customers').select('id, name, company').order('name'),
      ])
      setTasks((t ?? []) as Task[])
      setCustomers((c ?? []) as Customer[])
    }
    setLoading(false)
  }
  useEffect(() => { load(); const iv = setInterval(load, 6000); return () => clearInterval(iv) }, [key])

  if (loading) return <p className="p-6 text-zinc-600 text-sm">Lädt…</p>
  if (!emp) return <p className="p-6 text-zinc-400 text-sm">Mitarbeiter nicht gefunden. <Link href="/dashboard/team" className="text-violet-400">Zurück</Link></p>

  const st = EMPLOYEE_STATUS_META[emp.status]
  const inbox = tasks.filter(t => ['inbox', 'working'].includes(t.status))
  const waiting = tasks.filter(t => t.status === 'needs_chef')
  const archive = tasks.filter(t => ['approved', 'handoff', 'done', 'failed', 'cancelled'].includes(t.status))

  return (
    <div className="p-6 space-y-6 animate-in max-w-4xl">
      <Link href="/dashboard/team" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="w-4 h-4" /> Mein Team
      </Link>

      {/* Kopf */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: emp.color }} />
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: `${emp.color}22` }}>
            {emp.emoji}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white">{emp.name}</h1>
              <span className={cn('w-2.5 h-2.5 rounded-full', st.dot)} />
              <span className="text-xs text-zinc-500">{st.label}</span>
            </div>
            <p className="text-sm text-violet-300">{emp.role_title}</p>
            <p className="text-sm text-zinc-400 mt-2">{emp.description}</p>
          </div>
          <div className="flex flex-col gap-2">
            {emp.key === 'walter' && <WalterButton />}
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl transition-all font-medium">
              <Plus className="w-4 h-4" /> Aufgabe geben
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <TabButton active={tab === 'tisch'} onClick={() => setTab('tisch')} icon={ClipboardList} label={`Tisch (${inbox.length + waiting.length})`} />
        <TabButton active={tab === 'chat'} onClick={() => setTab('chat')} icon={MessageSquare} label="Chat" />
      </div>

      {tab === 'chat' ? (
        <ChatPanel emp={emp} />
      ) : (
        <div className="space-y-6">
          {waiting.length > 0 && (
            <Section title="Wartet auf deine Freigabe" accent="amber">
              {waiting.map(t => <TaskCard key={t.id} task={t} employees={[]} onChange={load} expandable defaultOpen />)}
            </Section>
          )}
          <Section title="Auf dem Tisch">
            {inbox.length === 0 ? <Empty text="Nichts zu tun — der Tisch ist leer." /> :
              inbox.map(t => <TaskCard key={t.id} task={t} employees={[]} onChange={load} />)}
          </Section>
          {archive.length > 0 && (
            <Section title="Erledigt & Archiv">
              {archive.slice(0, 20).map(t => <TaskCard key={t.id} task={t} employees={[]} onChange={load} muted />)}
            </Section>
          )}
        </div>
      )}

      {showNew && <NewTaskModal emp={emp} customers={customers} onClose={() => setShowNew(false)} onDone={load} />}
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick}
      className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all',
        active ? 'bg-violet-600/15 text-white border border-violet-500/30' : 'text-zinc-400 hover:bg-white/5')}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  )
}

function Section({ title, accent, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className={cn('text-xs font-semibold uppercase tracking-wide', accent === 'amber' ? 'text-amber-400' : 'text-zinc-500')}>{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-zinc-600 py-6 text-center glass rounded-xl">{text}</p>
}

function TaskCard({ task, onChange, expandable, defaultOpen, muted }: {
  task: Task; employees: Employee[]; onChange: () => void; expandable?: boolean; defaultOpen?: boolean; muted?: boolean
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  const [busy, setBusy] = useState(false)
  const meta = TASK_STATUS_META[task.status]
  const cost = (task.metadata as any)?.cost_usd

  async function run() {
    setBusy(true)
    await fetch('/api/tasks/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: task.id }) })
    setBusy(false); onChange()
  }
  async function act(action: string, extra: any = {}) {
    setBusy(true)
    await fetch('/api/tasks/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, taskId: task.id, ...extra }) })
    setBusy(false); onChange()
  }

  return (
    <div className={cn('glass rounded-xl p-4', muted && 'opacity-60')}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-white">{task.title}</p>
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', meta.color)}>{meta.label}</span>
            {cost != null && <span className="text-[10px] text-zinc-600">${Number(cost).toFixed(4)}</span>}
          </div>
          {task.brief && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{task.brief}</p>}
          <p className="text-[10px] text-zinc-600 mt-1">{formatDateTime(task.created_at)}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {task.status === 'inbox' && (
            <button onClick={run} disabled={busy}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-lg">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Bearbeiten
            </button>
          )}
          {(task.result || expandable) && (
            <button onClick={() => setOpen(o => !o)} className="px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white/5 rounded-lg">
              {open ? 'Zu' : 'Ansehen'}
            </button>
          )}
        </div>
      </div>

      {open && task.result && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="text-xs text-zinc-300 whitespace-pre-wrap bg-black/20 rounded-lg p-3 max-h-80 overflow-y-auto">{task.result}</div>
          {task.status === 'needs_chef' && (
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => act('approve')} disabled={busy}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg">
                <Check className="w-3.5 h-3.5" /> Freigeben
              </button>
              <button onClick={() => act('reject')} disabled={busy}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs rounded-lg">
                <X className="w-3.5 h-3.5" /> Ablehnen
              </button>
            </div>
          )}
        </div>
      )}
      {task.status === 'failed' && task.error && (
        <p className="text-xs text-red-400 mt-2 bg-red-500/10 rounded-lg px-3 py-2">{task.error}</p>
      )}
    </div>
  )
}

function ChatPanel({ emp }: { emp: Employee }) {
  const [msgs, setMsgs] = useState<{ role: 'chef' | 'employee'; text: string }[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    if (!input.trim() || busy) return
    const userMsg = input.trim()
    setMsgs(m => [...m, { role: 'chef', text: userMsg }])
    setInput(''); setBusy(true)
    try {
      const res = await fetch('/api/employees/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeKey: emp.key, message: userMsg, history: msgs.slice(-8) }),
      })
      const data = await res.json()
      setMsgs(m => [...m, { role: 'employee', text: data.reply || data.error || 'Keine Antwort' }])
    } catch {
      setMsgs(m => [...m, { role: 'employee', text: 'Verbindungsfehler' }])
    }
    setBusy(false)
  }

  return (
    <div className="glass rounded-2xl flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.length === 0 && (
          <div className="text-center text-zinc-600 text-sm py-10">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-zinc-700" />
            Sprich mit {emp.name}. Frag nach Status, gib Anweisungen oder lass dir etwas vorbereiten.
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'chef' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
              m.role === 'chef' ? 'bg-violet-600 text-white' : 'bg-white/5 text-zinc-200')}>
              {m.text}
            </div>
          </div>
        ))}
        {busy && <div className="flex justify-start"><div className="bg-white/5 rounded-2xl px-4 py-2.5"><Loader2 className="w-4 h-4 animate-spin text-zinc-400" /></div></div>}
      </div>
      <div className="p-3 border-t border-white/5 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={`Nachricht an ${emp.name}…`}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500" />
        <button onClick={send} disabled={busy || !input.trim()}
          className="px-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function NewTaskModal({ emp, customers, onClose, onDone }: { emp: Employee; customers: Customer[]; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [brief, setBrief] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [autorun, setAutorun] = useState(true)
  const [busy, setBusy] = useState(false)

  async function create() {
    if (!title.trim()) return
    setBusy(true)
    const res = await fetch('/api/tasks/action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', employeeKey: emp.key, title, brief, customerId: customerId || undefined }),
    })
    const data = await res.json()
    if (autorun && data.task?.id) {
      await fetch('/api/tasks/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: data.task.id }) })
    }
    setBusy(false); onDone(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl">{emp.emoji}</span> Aufgabe für {emp.name}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400"><X className="w-4 h-4" /></button>
        </div>
        {busy ? (
          <div className="py-10 flex flex-col items-center gap-3">
            <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
            <p className="text-sm text-zinc-300">{emp.name} arbeitet…</p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Aufgabe *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Angebot für Website Elektriker Müller erstellen"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Details / Input</label>
              <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={4} placeholder="Alle Infos, die der Mitarbeiter braucht…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500 resize-none" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Kunde (optional)</label>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
                <option value="">— Kein Kunde —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={autorun} onChange={e => setAutorun(e.target.checked)} className="accent-violet-600" />
              Sofort bearbeiten lassen
            </label>
            <button onClick={create} disabled={!title.trim()}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm rounded-xl font-medium">
              <CheckCircle2 className="w-4 h-4" /> Auf den Tisch legen
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Walters „Jetzt prüfen"-Button — startet einen Wächter-Lauf von Hand
function WalterButton() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function check() {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/walter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.problems === 0) setMsg('✓ Alles sauber — keine Vorfälle')
      else setMsg(`⚠ ${data.problems} Vorfall/Vorfälle${data.telegram?.ok ? ' · Telegram gesendet' : ''}`)
    } catch (e: any) {
      setMsg('Fehler: ' + e.message)
    }
    setBusy(false)
    setTimeout(() => setMsg(null), 8000)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={check} disabled={busy}
        className="flex items-center gap-1.5 px-3 py-2 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white text-sm rounded-xl transition-all font-medium">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />} Jetzt prüfen
      </button>
      {msg && <span className="text-[11px] text-zinc-400 max-w-[180px] text-right">{msg}</span>}
    </div>
  )
}
