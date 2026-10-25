APK DA•OFFICIAL — pembaruan fitur 46–50

Isi paket:
- index.html: berdasarkan index_fitur_31-35.html, menambahkan lazy-loading gambar, tautan ke pusat bantuan/kebijakan privasi, dan perlindungan spam dasar untuk formulir yang memakai data-spam-protect.
- privasi.html: halaman kebijakan privasi awal; sesuaikan dengan praktik aktual dan layanan yang benar-benar aktif.
- bantuan.html: panduan download, kompatibilitas APK, tautan bermasalah, website, dan Spotify.
- link-checker.mjs + .github/workflows/check-download-links.yml: pemeriksaan terjadwal melalui GitHub Actions, memakai Supabase REST API.

Pemasangan:
1. Cadangkan index.html yang sekarang.
2. Unggah index.html, privasi.html, bantuan.html, dan link-checker.mjs ke folder utama repositori.
3. Unggah folder .github/workflows/check-download-links.yml sesuai jalurnya.
4. Di GitHub: Settings > Secrets and variables > Actions, buat:
   - SUPABASE_URL = URL project Supabase
   - SUPABASE_SERVICE_ROLE_KEY = service_role key (rahasia, jangan masukkan ke HTML atau file publik)
5. Pastikan tabel apps memiliki kolom id, name, download_url. Jalankan workflow dari Actions untuk tes.

Catatan penting:
- Paket ini belum diuji langsung di browser atau terhadap skema Supabase milikmu.
- Jangan mengganti/menghapus admin.html, script.js, atau supabase.js.
- Anti-spam di browser hanya lapisan dasar. Formulir harus diberi atribut data-spam-protect dan idealnya memiliki honeypot name="website". Pembatasan yang benar harus diterapkan di backend/RLS/Edge Function.
- Link checker menandai link yang gagal dijangkau untuk diperiksa; status HTTP bukan bukti mutlak bahwa tautan mati. Sebagian penyedia menolak pemeriksaan otomatis.
- Kebijakan privasi perlu disesuaikan dengan layanan iklan, analitik, atau data aktual yang digunakan.
