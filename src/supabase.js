import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://erooogrlzhuswzfskyce.supabase.co'
const supabaseAnonKey = 'sb_publishable_uqicBznOu4HKS1KpW5Gxtg_dx_Sp0j8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
