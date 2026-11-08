// ==========================================
// APK DA•OFFICIAL V3
// KONFIGURASI SUPABASE
// ==========================================

const SUPABASE_URL =
  "https://xwwzpwiwlegjtxneoohe.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3d3pwd2l3bGVnanR4bmVvb2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNDk0MzAsImV4cCI6MjEwOTYyNTQzMH0.xPlXU7j36_7pc34J0fIJpzoldgoVbU-RanOgRI47Ym4";

// ==========================================
// PEMERIKSAAN LIBRARY SUPABASE
// ==========================================

if (!window.supabase) {

  window.db = null;

  window.supabaseConfigError =
    "Library Supabase CDN belum berhasil dimuat.";

  console.error(window.supabaseConfigError);

} else {

  // ========================================
  // MEMBUAT KONEKSI SUPABASE
  // ========================================

  try {

    window.db = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    window.supabaseConfigError = null;

    console.log(
      "APK DA•OFFICIAL V3: Supabase berhasil dimuat."
    );

  } catch (error) {

    window.db = null;

    window.supabaseConfigError =
      "Gagal membuat koneksi Supabase: " + error.message;

    console.error(error);

  }
}
