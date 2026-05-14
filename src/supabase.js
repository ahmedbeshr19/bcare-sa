import { createClient } from '@supabase/supabase-js'

// Auto-Detection Logic to separate databases based on domain
const isSO = window.location.hostname.includes('bcare-so');

const supabaseUrl = isSO 
  ? 'https://ydgtxujasxnxgkuqkeaw.supabase.co' 
  : 'https://cgtewkervfjlcvrrztge.supabase.co';

const supabaseAnonKey = isSO 
  ? 'sb_publishable_rb-lyOnXmw1xEaxjXSzIug_Zja8Upje' 
  : 'sb_publishable_aBk5gGCYG9qhLK2JFye6Hg_uKvmuVFd';

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
