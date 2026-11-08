
// ==================================
// APK DA•OFFICIAL V3
// KONFIGURASI SUPABASE
// ==================================

const SUPABASE_URL = "https://xwwzpwiwlegjtxneoohe.supabase.co";

// Tempelkan Supabase anon/public key milikmu
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3d3pwd2l3bGVnanR4bmVvb2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNDk0MzAsImV4cCI6MjEwOTYyNTQzMH0.xPlXU7j36_7pc34J0fIJpzoldgoVbU-RanOgRI47Ym4";

window.db = null;
window.supabaseConfigError = null;

try {
  if (!window.supabase) {
    throw new Error(
      "Library Supabase belum dimuat. Periksa CDN."
    );
  }

  if (typeof window.supabase.createClient !== "function") {
    throw new Error(
      "Fungsi createClient tidak ditemukan."
    );
  }

  if (
    !SUPABASE_KEY ||
    SUPABASE_KEY === "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3d3pwd2l3bGVnanR4bmVvb2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNDk0MzAsImV4cCI6MjEwOTYyNTQzMH0.xPlXU7j36_7pc34J0fIJpzoldgoVbU-RanOgRI47Ym4"
  ) {
    throw new Error("Anon key belum diisi.");
  }

  window.db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  console.log("Supabase berhasil dibuat.");

} catch (error) {
  window.supabaseConfigError = error.message;
  console.error("Kesalahan Supabase:", error);
}
