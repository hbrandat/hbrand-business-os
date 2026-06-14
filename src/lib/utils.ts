import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: string | null | undefined) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | null | undefined) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export const STATUS_COLORS = {
  // Order status
  new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  review: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  done: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  // Customer status
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  lead: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  // Invoice status
  draft: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  sent: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  paid: 'bg-green-500/10 text-green-400 border-green-500/20',
  overdue: 'bg-red-500/10 text-red-400 border-red-500/20',
  // AI job status
  running: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
} as const

export const STATUS_LABELS: Record<string, string> = {
  new: 'Neu',
  in_progress: 'In Arbeit',
  review: 'Review',
  done: 'Fertig',
  cancelled: 'Abgebrochen',
  active: 'Aktiv',
  inactive: 'Inaktiv',
  lead: 'Lead',
  draft: 'Entwurf',
  sent: 'Gesendet',
  paid: 'Bezahlt',
  overdue: 'Überfällig',
  running: 'Läuft',
  failed: 'Fehler',
  fixed: 'Pauschal',
  hourly: 'Stundensatz',
  retainer: 'Retainer',
}
