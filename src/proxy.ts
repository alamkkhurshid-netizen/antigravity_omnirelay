import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// Simple in-memory rate limiter for MVP (Use Upstash Redis in Prod)
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 300

const ipHits = new Map<string, { count: number, resetTime: number }>()

function rateLimit(request: NextRequest): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
  const now = Date.now()
  const record = ipHits.get(ip)

  if (!record || now > record.resetTime) {
    ipHits.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return null
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return new NextResponse('Too Many Requests', { status: 429 })
  }

  record.count++
  ipHits.set(ip, record)
  return null
}

export async function proxy(request: NextRequest) {
  // 1. Skip rate limiting for webhooks (Meta sends bursts)
  if (!request.nextUrl.pathname.startsWith('/api/webhooks')) {
    const rateLimitResponse = rateLimit(request)
    if (rateLimitResponse) return rateLimitResponse
  }

  // 2. Auth + session middleware
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
