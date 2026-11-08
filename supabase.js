const SUPABASE_URL =
"https://xwwzpwiwlegjtxneoohe.supabase.co";

const SUPABASE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3d3pwd2l3bGVnanR4bmVvb2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNDk0MzAsImV4cCI6MjEwOTYyNTQzMH0.xPlXU7j36_7pc34J0fIJpzoldgoVbU-RanOgRI47Ym4";

window.db = null;
window.supabaseConfigError = null;

window.supabaseReady = (async () => {
  if (!window.supabase) {
    throw new Error("Pustaka Supabase belum dimuat.");
  }

  window.db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  return window.db;
})().catch(error => {
  window.supabaseConfigError = error.message;
  console.error(error);
  throw error;
});