import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ydgtxujasxnxgkuqkeaw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_rb-lyOnXmw1xEaxjXSzIug_Zja8Upje'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
