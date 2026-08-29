import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// Simple in-memory rate limiter for MVP (Use Upstash Redis in Prod)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 300; // Allow 300 requests per minute per IP

// Map to store IP hit counts
const ipHits = new Map<string, { count: number, resetTime: number }>();

function rateLimit(request: NextRequest): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for') || request.ip || '127.0.0.1';
  const now = Date.now();
  const record = ipHits.get(ip);

  if (!record || now > record.resetTime) {
    ipHits.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return null;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  record.count++;
  ipHits.set(ip, record);
  return null;
}

export async function proxy(request: NextRequest) {
  // 1. Check Rate Limit
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  // 2. Auth Middleware
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
