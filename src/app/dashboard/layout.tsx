'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  FileText,
  Bot,
  DollarSign,
  Settings,
  ChevronRight,
  Bell,
  Search,
} from 'lucide-react'

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/customers', icon: Users, label: 'Kunden' },
  { href: '/dashboard/orders', icon: ShoppingBag, label: 'Aufträge' },
  { href: '/dashboard/invoices', icon: FileText, label: 'Rechnungen' },
  { href: '/dashboard/ai-monitor', icon: Bot, label: 'KI Monitor' },
  { href: '/dashboard/costs', icon: DollarSign, label: 'Kosten' },
  { href: '/dashboard/settings', icon: Settings, label: 'Einstellungen' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-white/5 bg-[#0d0d0d]">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-bold text-sm glow">
              H
            </div>
            <span className="font-semibold text-white">HBrand.at</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group',
                  active
                    ? 'bg-violet-600/15 text-white border-l-2 border-violet-500 pl-[10px]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-violet-400' : '')} />
                <span>{label}</span>
                {active && <ChevronRight className="w-3 h-3 ml-auto text-violet-400 opacity-60" />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
              AH
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Alexander H.</p>
              <p className="text-xs text-zinc-500 truncate">Alexander@hbrand.at</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#0d0d0d] flex-shrink-0">
          <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2 w-72">
            <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Suchen..."
              className="bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 outline-none flex-1"
            />
            <kbd className="text-xs text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-violet-500 rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-white font-semibold text-xs cursor-pointer">
              AH
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
