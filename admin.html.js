'use strict';

(() => {
  const $ = id => document.getElementById(id);
  const loginForm = $('loginForm');
  const loginPanel = $('loginPanel');
  const adminPanel = $('adminPanel');
  const loginBtn = $('loginBtn');
  const form = $('addAppForm');
  const saveBtn = $('saveBtn');
  const cancelBtn = $('cancelBtn');
  const appList = $('appList');
  const statusBox = $('status');
  const loginStatus = $('loginStatus');
  let editingId = null;
  let apps = [];
  let client = null;

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  }
  function safeURL(value) {
    try { const url = new URL(String(value || '')); return ['https:','http:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  }
  function showMessage(target, message, type='danger') {
    target.innerHTML = `<div class="alert alert-${type} py-2 mb-0">${escapeHTML(message)}</div>`;
  }
  async function getClient() {
    if (!window.supabaseReady) throw new Error('supabase.js belum dimuat.');
    return await window.supabaseReady;
  }
  async function verifyAdmin() {
    const {data:{user}, error:userError} = await client.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Sesi login tidak ditemukan.');
    const {data, error} = await client.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Akun ini belum terdaftar sebagai admin. Tambahkan UUID akun di tabel admin_users.');
  }
  async function enterAdmin() {
    await verifyAdmin();
    loginPanel.style.display = 'none';
    adminPanel.style.display = 'block';
    $('navRight').innerHTML = `<div class="d-flex align-items-center gap-2"><a href="./index.html" class="back-btn"><i class="bi bi-house"></i> Beranda</a><button type="button" id="logoutBtn" class="logout-btn"><i class="bi bi-box-arrow-right"></i> Keluar</button></div>`;
    $('logoutBtn').addEventListener('click', logout);
    await loadApps();
    await loadReviews();
  }
  async function logout() {
    try { await client.auth.signOut(); } finally { location.reload(); }
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    loginBtn.disabled = true;
    loginBtn.textContent = 'Memeriksa login...';
    loginStatus.innerHTML = '';
    try {
      client = await getClient();
      const {error} = await client.auth.signInWithPassword({email:$('loginEmail').value.trim(), password:$('loginPassword').value});
      if (error) throw error;
      await enterAdmin();
    } catch (error) {
      try { if (client) await client.auth.signOut(); } catch (_) {}
      showMessage(loginStatus, 'Login gagal: ' + (error?.message || 'Kesalahan tidak diketahui.'));
    } finally {
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Masuk';
    }
  });

  async function checkSession() {
    try {
      client = await getClient();
      const {data:{session}, error} = await client.auth.getSession();
      if (error) throw error;
      if (session) await enterAdmin();
    } catch (error) {
      if (window.supabaseConfigError) {
        showMessage(loginStatus, 'Koneksi Supabase gagal: ' + window.supabaseConfigError);
      } else if (error?.message && error.message.toLowerCase().includes('admin')) {
        try { if (client) await client.auth.signOut(); } catch (_) {}
        showMessage(loginStatus, error.message);
      } else {
        console.info('Belum ada sesi admin atau sesi perlu login ulang:', error?.message || error);
      }
    }
  }

  function slugify(value) {
    const base = String(value || 'apk').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50) || 'apk';
    return base + '-' + Math.random().toString(36).slice(2,8);
  }
  function resetForm() {
    editingId = null;
    form.reset();
    $('formTitle').textContent = 'Tambah APK';
    $('appEditNotice').style.display = 'none';
    cancelBtn.style.display = 'none';
    saveBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Tambahkan APK';
  }
  cancelBtn.addEventListener('click', () => { resetForm(); statusBox.innerHTML = ''; });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!client) return showMessage(statusBox, 'Koneksi Supabase belum siap. Muat ulang halaman dan login kembali.');
    const name = $('name').value.trim();
    const downloadURL = safeURL($('download_url').value.trim());
    const iconURL = $('icon').value.trim() ? safeURL($('icon').value.trim()) : '';
    if (!name) return showMessage(statusBox, 'Nama aplikasi wajib diisi.');
    if (!downloadURL) return showMessage(statusBox, 'URL unduhan wajib berupa alamat HTTP atau HTTPS yang valid.');
    if ($('icon').value.trim() && !iconURL) return showMessage(statusBox, 'URL ikon harus berupa alamat HTTP atau HTTPS yang valid.');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan APK...';
    try {
      const current = apps.find(item => String(item.id) === String(editingId));
      const payload = {
        name,
        slug: current?.slug || slugify(name),
        description: $('description').value.trim(),
        version: $('version').value.trim(),
        size: $('size').value.trim(),
        category: $('category').value,
        icon: iconURL,
        download_url: downloadURL,
        is_published: true,
        updated_at: new Date().toISOString()
      };
      let result;
      if (editingId !== null) {
        result = await client.from('apps').update(payload).eq('id', editingId);
      } else {
        result = await client.from('apps').insert([payload]);
      }
      if (result.error) throw result.error;
      showMessage(statusBox, editingId !== null ? 'Informasi APK berhasil diperbarui.' : 'APK berhasil ditambahkan ke katalog.', 'success');
      resetForm();
      await loadApps();
    } catch (error) {
      console.error('Gagal menyimpan APK:', error);
      showMessage(statusBox, 'Gagal menyimpan APK: ' + (error?.message || 'Kesalahan tidak diketahui.'));
    } finally {
      saveBtn.disabled = false;
      if (editingId === null) saveBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Tambahkan APK';
      else saveBtn.innerHTML = '<i class="bi bi-save"></i> Simpan perubahan';
    }
  });

  async function loadApps() {
    appList.innerHTML = '<div class="empty">Memuat daftar APK...</div>';
    const {data, error} = await client.from('apps').select('*').order('created_at', {ascending:false});
    if (error) {
      appList.innerHTML = `<div class="empty">Gagal memuat APK: ${escapeHTML(error.message)}</div>`;
      return;
    }
    apps = data || [];
    if (!apps.length) { appList.innerHTML = '<div class="empty">Belum ada APK. Tambahkan aplikasi melalui formulir di atas.</div>'; return; }
    appList.innerHTML = apps.map(app => {
      const icon = safeURL(app.icon || app.icon_url) || 'https://placehold.co/100x100/eaf2ff/2457a6?text=APK';
      return `<article class="item-card"><img class="app-icon" src="${escapeHTML(icon)}" alt="" onerror="this.onerror=null;this.src='https://placehold.co/100x100?text=APK'"><div class="flex-grow-1"><div class="item-name">${escapeHTML(app.name || 'APK tanpa nama')}</div><div class="item-info">${escapeHTML(app.category || 'Lainnya')} · ${escapeHTML(app.version || 'Versi -')} · ${escapeHTML(app.size || 'Ukuran -')}</div></div><div class="item-actions"><button type="button" class="secondary-btn" data-edit="${escapeHTML(app.id)}"><i class="bi bi-pencil-square"></i> Edit</button><button type="button" class="danger-btn" data-delete="${escapeHTML(app.id)}"><i class="bi bi-trash"></i> Hapus</button></div></article>`;
    }).join('');
    appList.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => editApp(button.dataset.edit)));
    appList.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => deleteApp(button.dataset.delete)));
  }
  function editApp(id) {
    const app = apps.find(item => String(item.id) === String(id));
    if (!app) return;
    editingId = app.id;
    $('name').value = app.name || '';
    $('description').value = app.description || '';
    $('version').value = app.version || '';
    $('size').value = app.size || '';
    $('category').value = app.category || 'Lainnya';
    $('icon').value = app.icon || app.icon_url || '';
    $('download_url').value = app.download_url || app.download_path || '';
    $('formTitle').textContent = 'Perbarui APK';
    $('appEditNotice').textContent = 'Mode edit aktif untuk ' + (app.name || 'APK ini') + '. Ubah informasi lalu tekan Simpan Perubahan.';
    $('appEditNotice').style.display = 'block';
    cancelBtn.style.display = 'block';
    saveBtn.innerHTML = '<i class="bi bi-save"></i> Simpan perubahan';
    statusBox.innerHTML = '';
    window.scrollTo({top:0, behavior:'smooth'});
  }
  async function deleteApp(id) {
    if (!confirm('Hapus APK ini dari katalog?')) return;
    const {error} = await client.from('apps').delete().eq('id', id);
    if (error) { alert('Gagal menghapus APK: ' + error.message); return; }
    if (String(editingId) === String(id)) resetForm();
    showMessage(statusBox, 'APK berhasil dihapus.', 'success');
    await loadApps();
    await loadReviews();
  }

  async function loadReviews() {
    const list = $('reviewList');
    if (!list || !client) return;
    list.innerHTML = '<div class="empty">Memuat ulasan...</div>';
    const {data, error} = await client.from('app_reviews').select('id,app_id,display_name,review_text,rating,status,created_at').order('created_at', {ascending:false}).limit(100);
    if (error) { list.innerHTML = `<div class="empty">Gagal memuat ulasan: ${escapeHTML(error.message)}</div>`; return; }
    const rows = data || [];
    if (!rows.length) { list.innerHTML = '<div class="empty">Belum ada ulasan masuk.</div>'; return; }
    const appMap = new Map(apps.map(app => [String(app.id), app.name || 'APK']));
    list.innerHTML = rows.map(row => {
      const state = row.status || 'pending';
      const pending = state === 'pending';
      return `<article class="item-card" style="display:block"><div class="d-flex justify-content-between align-items-start gap-2 flex-wrap"><strong>${escapeHTML(appMap.get(String(row.app_id)) || 'APK')}</strong><span class="review-status">${escapeHTML(state === 'approved' ? 'Disetujui' : state === 'rejected' ? 'Ditolak' : 'Menunggu')}</span></div><div class="item-info mt-1">${escapeHTML(row.display_name || 'Pengguna')} · ${'★'.repeat(Math.max(0,Math.min(5,Number(row.rating)||0)))} · ${row.created_at ? escapeHTML(new Date(row.created_at).toLocaleString('id-ID')) : ''}</div><p class="review-text">${escapeHTML(row.review_text || '')}</p><div class="item-actions ms-0">${pending ? `<button class="secondary-btn" type="button" data-review-approve="${escapeHTML(row.id)}"><i class="bi bi-check-circle"></i> Setujui</button><button class="danger-btn" type="button" data-review-reject="${escapeHTML(row.id)}"><i class="bi bi-x-circle"></i> Tolak</button>` : `<button class="danger-btn" type="button" data-review-delete="${escapeHTML(row.id)}"><i class="bi bi-trash"></i> Hapus</button>`}</div></article>`;
    }).join('');
    list.querySelectorAll('[data-review-approve]').forEach(button => button.addEventListener('click', () => setReviewStatus(button.dataset.reviewApprove, 'approved')));
    list.querySelectorAll('[data-review-reject]').forEach(button => button.addEventListener('click', () => setReviewStatus(button.dataset.reviewReject, 'rejected')));
    list.querySelectorAll('[data-review-delete]').forEach(button => button.addEventListener('click', () => deleteReview(button.dataset.reviewDelete)));
  }
  async function setReviewStatus(id, status) {
    const {error} = await client.from('app_reviews').update({status}).eq('id', id);
    if (error) { showMessage($('reviewStatus'), 'Gagal memperbarui ulasan: ' + error.message); return; }
    showMessage($('reviewStatus'), status === 'approved' ? 'Ulasan disetujui dan akan tampil di halaman detail APK.' : 'Ulasan ditolak.', 'success');
    await loadReviews();
  }
  async function deleteReview(id) {
    if (!confirm('Hapus ulasan ini secara permanen?')) return;
    const {error} = await client.from('app_reviews').delete().eq('id', id);
    if (error) { showMessage($('reviewStatus'), 'Gagal menghapus ulasan: ' + error.message); return; }
    showMessage($('reviewStatus'), 'Ulasan berhasil dihapus.', 'success');
    await loadReviews();
  }

  document.querySelectorAll('[data-section]').forEach(button => button.addEventListener('click', () => {
    const section = button.dataset.section;
    $('appsPanel').style.display = section === 'apps' ? 'block' : 'none';
    $('reviewsPanel').style.display = section === 'reviews' ? 'block' : 'none';
    document.querySelectorAll('[data-section]').forEach(item => item.classList.toggle('active', item === button));
    if (section === 'reviews') loadReviews();
  }));

  checkSession();
})();
