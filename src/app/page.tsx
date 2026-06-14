import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
