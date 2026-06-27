import 'server-only'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

// The Service Role Key allows bypassing Row Level Security (RLS) entirely.
// NEVER leak this to the browser/client-side.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing in environment variables.')
}

/**
 * Supabase Admin Client (Server-Side Only)
 * 
 * Uses the Service Role Key. This client bypasses all Row Level Security (RLS) policies.
 * It is protected by the `server-only` package, which will throw a build error
 * if accidentally imported into a client component.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
