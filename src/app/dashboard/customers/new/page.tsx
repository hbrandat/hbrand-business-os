'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function NewCustomerPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '',
    address: '', city: '', country: 'Österreich',
    status: 'lead', notes: '', discount_percent: 0,
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    setSaving(true)
    const { data, error } = await supabase.from('customers').insert(form).select().single()
    setSaving(false)
    if (!error && data) router.push(`/dashboard/customers/${data.id}`)
  }

  return (
    <div className="p-6 max-w-2xl space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/customers" className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Neuer Kunde</h1>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name *" value={form.name} onChange={set('name')} placeholder="Max Mustermann" />
          <Field label="Firma" value={form.company} onChange={set('company')} placeholder="Musterfirma GmbH" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="E-Mail" value={form.email} onChange={set('email')} placeholder="max@firma.at" type="email" />
          <Field label="Telefon" value={form.phone} onChange={set('phone')} placeholder="+43 660 000 0000" />
        </div>
        <Field label="Adresse" value={form.address} onChange={set('address')} placeholder="Musterstraße 1" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Stadt" value={form.city} onChange={set('city')} placeholder="Wien" />
          <Field label="Land" value={form.country} onChange={set('country')} placeholder="Österreich" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Status</label>
            <select value={form.status} onChange={set('status')}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
              <option value="lead">Lead</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </div>
          <Field label="Rabatt %" value={form.discount_percent} onChange={set('discount_percent')} type="number" placeholder="0" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Notizen</label>
          <textarea value={form.notes} onChange={set('notes')} rows={3}
            placeholder="Interne Notizen..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-violet-500 resize-none" />
        </div>
        <button onClick={save} disabled={!form.name || saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-xl transition-all font-medium w-full justify-center">
          <Save className="w-4 h-4" />
          {saving ? 'Wird gespeichert...' : 'Kunde anlegen'}
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
