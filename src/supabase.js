import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ydgtxujasxnxgkuqkeaw.supabase.co'
const supabaseAnonKey = 'sb_publishable_rb-lyOnXmw1xEaxjXSzIug_Zja8Upje'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
