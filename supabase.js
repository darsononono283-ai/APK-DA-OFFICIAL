
const SUPABASE_URL = "https://hqfqowbvpzkomiyfzhdc.supabase.co";
const SUPABASE_ANON_KEY = "TEMPEL_ANON_KEY_LAMA_KAMU_DI_SINI";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
