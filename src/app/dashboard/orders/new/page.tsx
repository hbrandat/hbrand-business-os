'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Customer, type Employee } from '@/lib/supabase'
import { ArrowLeft, Save, Rocket } from 'lucide-react'
import Link from 'next/link'

export default function NewOrderPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  const [form, setForm] = useState({
    customer_id: '', title: '', description: '',
    type: 'fixed', price: '', hourly_rate: '',
    due_date: '', priority: 'normal', status: 'new',
  })

  // Startschuss ans Team
  const [handoff, setHandoff] = useState(true)
  const [assignee, setAssignee] = useState('max')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    supabase.from('customers').select('id, name, company').order('name')
      .then(({ data }) => setCustomers((data ?? []) as Customer[]))
    supabase.from('employees').select('*').order('sort_order')
      .then(({ data }) => setEmployees((data ?? []) as Employee[]))
  }, [])

  async function save() {
    setSaving(true)
    setError(null)

    const payload: Record<string, unknown> = {
      customer_id: form.customer_id || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      type: form.type,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
      price: form.type === 'fixed' && form.price ? Number(form.price) : null,
      hourly_rate: form.type === 'hourly' && form.hourly_rate ? Number(form.hourly_rate) : null,
    }

    const { data: order, error: oErr } = await supabase.from('orders').insert(payload).select().single()
    if (oErr || !order) {
      setSaving(false)
      setError(`Fehler beim Speichern: ${oErr?.message || 'unbekannt'}`)
      return
    }

    // Startschuss: Auftrag als Aufgabe an den gewählten Mitarbeiter übergeben
    if (handoff) {
      try {
        const emp = employees.find(e => e.key === assignee)
        const res = await fetch('/api/tasks/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            employeeKey: assignee,
            title: `Auftrag: ${form.title.trim()}`,
            brief: `${form.description.trim() || form.title.trim()}\n\n— Auftrag manuell vom Chef erteilt.`,
            customerId: form.customer_id || null,
            orderId: order.id,
            priority: form.priority === 'dringend' || form.priority === 'hoch' ? 'high' : 'normal',
            needsApproval: true,
          }),
        })
        const data = await res.json()
        // Mitarbeiter direkt loslegen lassen
        if (data?.task?.id) {
          fetch('/api/tasks/run', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: data.task.id }),
          }).catch(() => {})
        }
        void emp
      } catch {
        // Auftrag ist gespeichert; Übergabe kann später manuell erfolgen
      }
    }

    setSaving(false)
    router.push(`/dashboard/orders/${order.id}`)
  }

  return (
    <div className="p-6 max-w-2xl space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/orders" className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Neuer Auftrag</h1>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        {/* Kunde */}
        <div>
          <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Kunde</label>
          {customers.length === 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Noch keine Kunden angelegt.{' '}
              <Link href="/dashboard/customers/new" className="underline font-medium">Ersten Kunden anlegen →</Link>
              <span className="block text-amber-200/70 text-xs mt-1">Du kannst den Auftrag auch ohne Kunde anlegen und später zuordnen.</span>
            </div>
          ) : (
            <select value={form.customer_id} onChange={set('customer_id')}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
              <option value="">— Kein Kunde / später —</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.company || c.name}{c.company && c.name ? ` (${c.name})` : ''}</option>
              ))}
            </select>
          )}
        </div>

        <Field label="Titel *" value={form.title} onChange={set('title')} placeholder="z.B. Website-Relaunch hBrand.at" />

        <div>
          <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Beschreibung</label>
          <textarea value={form.description} onChange={set('description')} rows={4}
            placeholder="Was soll gemacht werden? Umfang, Ziele, Besonderheiten..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-violet-500 resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Abrechnung</label>
            <select value={form.type} onChange={set('type')}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
              <option value="fixed">Festpreis</option>
              <option value="hourly">Stundensatz</option>
              <option value="retainer">Retainer</option>
            </select>
          </div>
          {form.type === 'hourly' ? (
            <Field label="Stundensatz (€)" value={form.hourly_rate} onChange={set('hourly_rate')} type="number" placeholder="120" />
          ) : (
            <Field label="Preis (€)" value={form.price} onChange={set('price')} type="number" placeholder="2500" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fällig bis" value={form.due_date} onChange={set('due_date')} type="date" />
          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Priorität</label>
            <select value={form.priority} onChange={set('priority')}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
              <option value="niedrig">Niedrig</option>
              <option value="normal">Normal</option>
              <option value="hoch">Hoch</option>
              <option value="dringend">Dringend</option>
            </select>
          </div>
        </div>

        {/* Startschuss ans Team */}
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={handoff} onChange={e => setHandoff(e.target.checked)}
              className="w-4 h-4 accent-violet-600" />
            <span className="flex items-center gap-1.5 text-sm font-medium text-white">
              <Rocket className="w-4 h-4 text-violet-400" /> Startschuss — direkt ans Team übergeben
            </span>
          </label>
          {handoff && (
            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Übergeben an</label>
              <select value={assignee} onChange={e => setAssignee(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
                {employees.filter(e => !['walter'].includes(e.key)).map(e => (
                  <option key={e.key} value={e.key}>{e.emoji} {e.name} — {e.role_title}</option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 mt-1.5">
                Der Mitarbeiter legt sofort los und legt dir das Ergebnis zur Freigabe vor. Nichts geht ohne deine Freigabe zum Kunden.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        <button onClick={save} disabled={!form.title.trim() || saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-xl transition-all font-medium w-full justify-center">
          {handoff ? <Rocket className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Wird angelegt...' : handoff ? 'Auftrag anlegen & Startschuss geben' : 'Auftrag anlegen'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div>
      <label className="text-xs text-zinc-400 font-medium mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-violet-500" />
    </div>
  )
}
