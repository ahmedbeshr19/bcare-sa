import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cgtewkervfjlcvrrztge.supabase.co'
const supabaseAnonKey = 'sb_publishable_aBk5gGCYG9qhLK2JFye6Hg_uKvmuVFd'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
