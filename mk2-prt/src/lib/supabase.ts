import { createClient } from '@supabase/supabase-js'

const url       = import.meta.env.VITE_SUPABASE_URL         as string
const key       = import.meta.env.VITE_SUPABASE_ANON_KEY    as string
const serviceKey= import.meta.env.VITE_SUPABASE_SERVICE_KEY as string

export const supabase      = createClient(url, key)
// Admin client uses service_role key — only import in admin routes
export const supabaseAdmin = createClient(url, serviceKey ?? key, {
  auth: { autoRefreshToken: false, persistSession: false },
})
