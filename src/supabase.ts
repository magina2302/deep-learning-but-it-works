import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qqydhkhbnrpmfmsbvflx.supabase.co'
const supabaseKey = 'sb_publishable_pBcLA7a2apzvm03DZnZgSw_AAcfgewC'

export const supabase = createClient(supabaseUrl, supabaseKey)