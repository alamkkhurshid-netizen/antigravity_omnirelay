import { createClient } from '@supabase/supabase-js'

// Note: This client uses the Service Role Key. 
// It bypasses Row Level Security.
// NEVER use this in client components or expose it to the browser.
// Use ONLY in secure Server Actions or Route Handlers.

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
