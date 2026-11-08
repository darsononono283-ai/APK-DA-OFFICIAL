/* APK DA•OFFICIAL | Koneksi Supabase bersama untuk semua halaman */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://xwwzpwiwlegjtxneoohe.supabase.co';
  // Gunakan publishable key / anon public key. Jangan pernah menaruh service_role key di browser.
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3d3pwd2l3bGVnanR4bmVvb2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNDk0MzAsImV4cCI6MjEwOTYyNTQzMH0.xPlXU7j36_7pc34J0fIJpzoldgoVbU-RanOgRI47Ym4';

  function loadSDK(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => window.supabase?.createClient ? resolve() : reject(new Error('SDK termuat tetapi createClient tidak ditemukan.'));
      script.onerror = () => reject(new Error('Tidak dapat memuat pustaka Supabase dari ' + url));
      document.head.appendChild(script);
    });
  }

  async function initialize() {
    let lastError = null;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      const urls = [
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
        'https://unpkg.com/@supabase/supabase-js@2'
      ];
      for (const url of urls) {
        try { await loadSDK(url); break; }
        catch (error) { lastError = error; }
      }
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Pustaka Supabase gagal dimuat. Periksa internet atau akses CDN. ' + (lastError?.message || ''));
    }
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Project URL atau public key Supabase belum diisi.');

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    // Alias yang konsisten: kode lama memakai supabaseClient, sebagian file lain memakai db.
    window.supabaseClient = client;
    window.db = client;
    window.supabaseConfigError = null;
    console.info('Supabase client siap digunakan.');
    return client;
  }

  window.supabaseClient = null;
  window.db = null;
  window.supabaseConfigError = null;
  window.supabaseReady = initialize().catch(error => {
    window.supabaseClient = null;
    window.db = null;
    window.supabaseConfigError = error?.message || String(error);
    console.error('Supabase gagal diinisialisasi:', error);
    throw error;
  });
})();
