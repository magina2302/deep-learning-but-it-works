import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://axysoajemivtxvubgosj.supabase.co'
const supabaseKey = 'sb_publishable_GsJKOZ57KlrzJjLfYzoQQA_DSMeUXLx'

export const supabase = createClient(supabaseUrl, supabaseKey)