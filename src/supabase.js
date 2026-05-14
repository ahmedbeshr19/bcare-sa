import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cgtewkervfjlcvrrztge.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_aBk5gGCYG9qhLK2JFye6Hg_uKvmuVFd'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
