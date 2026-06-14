'use client'

import { cn } from '@/lib/utils'

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border', className)}>
      {children}
    </span>
  )
}

const STAGE_STYLES: Record<string, string> = {
  kontakt: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
  angebot: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  zusage: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  in_arbeit: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  review: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  abgeschlossen: 'bg-green-500/10 text-green-300 border-green-500/20',
}

const PRIORITY_STYLES: Record<string, string> = {
  niedrig: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  normal: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  hoch: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  dringend: 'bg-red-500/10 text-red-300 border-red-500/20',
}

export function stageStyle(stage?: string) {
  return STAGE_STYLES[stage ?? ''] ?? STAGE_STYLES.kontakt
}
export function priorityStyle(p?: string) {
  return PRIORITY_STYLES[p ?? ''] ?? PRIORITY_STYLES.normal
}
