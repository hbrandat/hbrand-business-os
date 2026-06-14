import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifyToken } from '@/lib/auth'

// Schützt das gesamte Dashboard + schreibende APIs. Login-Seite & Auth-API bleiben offen.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const valid = await verifyToken(token)

  // Eingeloggt + ruft /login auf → ab ins Dashboard
  if (pathname === '/login' && valid) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Geschützte Bereiche
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/api/assets') ||
    pathname.startsWith('/api/telegram')

  if (isProtected && !valid) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    const url = new URL('/login', req.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/api/assets/:path*', '/api/telegram/:path*'],
}
