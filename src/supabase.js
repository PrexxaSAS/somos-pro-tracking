import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cfvvnvmezmrxehpaqayw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmdnZudm1lem1yeGVocGFxYXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzQwNTAsImV4cCI6MjA5MTYxMDA1MH0.XnVcFeDPxFzLnGPAcl6E1XwLgWpjvyT_RiiagteTPiE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
