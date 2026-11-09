/* APK DA•OFFICIAL | Koneksi Supabase bersama untuk semua halaman */
(function () {
  'use strict';

  // Konfigurasi proyek Supabase APK DA•OFFICIAL yang baru.
  const SUPABASE_URL = 'https://hqfqowbvpzkomiyfzhdc.supabase.co';
  // Gunakan anon public key di frontend. Jangan pernah menaruh service_role / secret key di browser.
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZnFvd2J2cHprb21peWZ6aGRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNjMxNjQsImV4cCI6MjEwNjYzOTE2NH0.yKKi630Jxq8RDLQ_RukC5HzQk5fSvL2-cWdHsXqmQiI';

  function loadSDK(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => window.supabase?.createClient
        ? resolve()
        : reject(new Error('SDK termuat tetapi createClient tidak ditemukan.'));
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
        try {
          await loadSDK(url);
          break;
        } catch (error) {
          lastError = error;
        }
      }
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error(
        'Pustaka Supabase gagal dimuat. Periksa internet atau akses CDN. ' +
        (lastError?.message || '')
      );
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Project URL atau public key Supabase belum diisi.');
    }

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Alias yang dipakai oleh halaman website.
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
