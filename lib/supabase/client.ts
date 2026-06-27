import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Supabase Client (Browser/Client-Side Safe)
 * 
 * Uses the NEXT_PUBLIC_SUPABASE_ANON_KEY. This is completely safe to be bundled
 * into the browser. It is restricted by Row Level Security (RLS) policies in Supabase.
 */
export const supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey)
