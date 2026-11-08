
const SUPABASE_URL =
  "https://xwwzpwiwlegjtxneoohe.supabase.co";

// Ganti dengan Publishable key atau anon public key milikmu.
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3d3pwd2l3bGVnanR4bmVvb2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNDk0MzAsImV4cCI6MjEwOTYyNTQzMH0.xPlXU7j36_7pc34J0fIJpzoldgoVbU-RanOgRI47Ym4";

window.db = null;
window.supabaseConfigError = null;

try {
  if (!window.supabase) {
    throw new Error(
      "Pustaka Supabase belum dimuat. Periksa koneksi internet dan CDN."
    );
  }

  if (
    !SUPABASE_KEY ||
    SUPABASE_KEY === "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3d3pwd2l3bGVnanR4bmVvb2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNDk0MzAsImV4cCI6MjEwOTYyNTQzMH0.xPlXU7j36_7pc34J0fIJpzoldgoVbU-RanOgRI47Ym4"
  ) {
    throw new Error("API key Supabase belum diisi.");
  }

  window.db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  console.log("Supabase client berhasil dibuat.");

} catch (error) {
  window.db = null;
  window.supabaseConfigError = error.message;
  console.error("Supabase:", error.message);
}
