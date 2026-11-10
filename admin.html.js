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
    await loadStats();
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

  const numberFormat = value => Number(value || 0).toLocaleString('id-ID');
  const dateFormat = value => {
    if (!value) return 'Waktu tidak tersedia';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Waktu tidak valid' : date.toLocaleString('id-ID', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  };
  async function countRows(table, filters = []) {
    let query = client.from(table).select('id', {count:'exact', head:true});
    for (const [method, ...args] of filters) query = query[method](...args);
    const {count, error} = await query;
    if (error) throw error;
    return Number(count || 0);
  }
  function localDayKey(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  }
  function localDayLabel(date) {
    return date.toLocaleDateString('id-ID', {weekday:'short'});
  }
  function drawDownloadChart(rows) {
    const target = $('downloadsChart');
    if (!target) return;
    const days = [];
    const start = new Date();
    start.setHours(0,0,0,0);
    start.setDate(start.getDate()-6);
    for (let i=0; i<7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate()+i);
      days.push({key:localDayKey(d),label:localDayLabel(d),count:0});
    }
    const counts = new Map(days.map(day => [day.key, day]));
    (rows || []).forEach(row => {
      const day = counts.get(localDayKey(row.created_at));
      if (day) day.count++;
    });
    const max = Math.max(1, ...days.map(day => day.count));
    target.innerHTML = days.map(day => {
      const height = day.count ? Math.max(7, (day.count/max)*142) : 4;
      return `<div class="chart-day" title="${escapeHTML(day.label)}: ${day.count} klik"><span class="chart-value">${numberFormat(day.count)}</span><div class="chart-bar" style="height:${height}px" aria-label="${day.count} klik"></div><span class="chart-label">${escapeHTML(day.label)}</span></div>`;
    }).join('');
  }
  function renderDashRows(targetId, rows, emptyText, formatter) {
    const target = $(targetId);
    if (!target) return;
    if (!rows || !rows.length) {
      target.innerHTML = `<div class="empty">${escapeHTML(emptyText)}</div>`;
      return;
    }
    target.innerHTML = rows.map(formatter).join('');
  }
  async function loadStats() {
    const status = $('statsStatus');
    if (!status || !client) return;
    const refresh = $('refreshStatsBtn');
    if (refresh) refresh.disabled = true;
    status.textContent = 'Mengambil ringkasan dari Supabase...';
    const issues = [];
    const metricTasks = [
      ['statApps', () => countRows('apps')],
      ['statDownloads', () => countRows('app_downloads')],
      ['statRatings', () => countRows('app_ratings')],
      ['statReviews', () => countRows('app_reviews')],
      ['statPending', () => countRows('app_reviews', [['eq','status','pending']])],
      ['statPublished', () => countRows('apps', [['eq','is_published',true]])]
    ];
    await Promise.all(metricTasks.map(async ([id, task]) => {
      try { const value = await task(); if ($(id)) $(id).textContent = numberFormat(value); }
      catch (error) { if ($(id)) $(id).textContent = '—'; issues.push(`${id}: ${error.message}`); }
    }));

    let latestApps = [];
    try {
      const result = await client.from('apps').select('id,name,version,created_at,is_published').order('created_at',{ascending:false}).limit(7);
      if (result.error) throw result.error;
      latestApps = result.data || [];
      renderDashRows('latestAppsList', latestApps, 'Belum ada APK di katalog.', app => `<div class="dash-row"><div><div class="dash-row-name">${escapeHTML(app.name || 'APK tanpa nama')}</div><div class="dash-row-meta">${escapeHTML(app.version || 'Versi tidak dicantumkan')} · ${escapeHTML(app.created_at ? new Date(app.created_at).toLocaleDateString('id-ID') : 'Tanggal —')}</div></div><span class="dash-pill">${app.is_published ? 'Tayang' : 'Draft'}</span></div>`);
    } catch (error) { issues.push(`APK terbaru: ${error.message}`); renderDashRows('latestAppsList', [], 'Data APK terbaru gagal dibaca.'); }

    let downloadRows = [];
    try {
      const result = await client.from('app_downloads').select('app_id,created_at').order('created_at',{ascending:false}).limit(1000);
      if (result.error) throw result.error;
      downloadRows = result.data || [];
      drawDownloadChart(downloadRows.filter(row => row.created_at && new Date(row.created_at) >= (() => { const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-6); return d; })()));
      const names = new Map(apps.map(app => [String(app.id), app.name || 'APK tanpa nama']));
      const totals = new Map();
      downloadRows.forEach(row => {
        const id = String(row.app_id || '');
        if (id) totals.set(id, (totals.get(id) || 0) + 1);
      });
      const popular = [...totals.entries()].map(([id,count]) => ({name:names.get(id) || 'APK dihapus/tidak dikenal',count})).sort((a,b)=>b.count-a.count).slice(0,7);
      renderDashRows('popularAppsList', popular, 'Belum ada klik unduhan tercatat.', row => `<div class="dash-row"><div class="dash-row-name">${escapeHTML(row.name)}</div><span class="dash-pill">${numberFormat(row.count)} klik</span></div>`);
      const activity = downloadRows.slice(0,10);
      const tbody = $('activityRows');
      if (tbody) tbody.innerHTML = activity.length ? activity.map(row => `<tr><td>${escapeHTML(names.get(String(row.app_id)) || 'APK tidak dikenal')}</td><td>${escapeHTML(dateFormat(row.created_at))}</td></tr>`).join('') : '<tr><td colspan="2">Belum ada aktivitas unduhan.</td></tr>';
    } catch (error) {
      issues.push(`Aktivitas unduhan: ${error.message}`);
      drawDownloadChart([]);
      renderDashRows('popularAppsList', [], 'Data unduhan gagal dibaca.');
      if ($('activityRows')) $('activityRows').innerHTML = '<tr><td colspan="2">Data unduhan gagal dibaca.</td></tr>';
    }
    status.textContent = issues.length
      ? 'Dashboard dimuat sebagian. Periksa tabel atau kebijakan RLS: ' + issues.join(' · ')
      : 'Statistik berhasil diperbarui. Total klik dihitung sebagai klik tombol, bukan bukti file berhasil terunduh.';
    status.className = issues.length ? 'small text-danger mb-3' : 'small text-success mb-3';
    if (refresh) refresh.disabled = false;
  }

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

    const wasEditing = editingId !== null;
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
        // APK baru otomatis dipublikasikan. Checkbox hanya mengatur status saat mengedit.
        is_published: editingId !== null ? $('published').checked : true,
        updated_at: new Date().toISOString()
      };
      const isEditing = editingId !== null;
      let result;
      if (isEditing) {
        result = await client.from('apps').update(payload).eq('id', editingId).select('id,name,is_published').single();
      } else {
        // Selalu minta Supabase menyimpan APK baru dalam status tayang.
        result = await client.from('apps').insert([{...payload, is_published:true}]).select('id,name,is_published').single();
      }
      if (result.error) throw result.error;
      if (!result.data) throw new Error('Supabase tidak mengembalikan data APK setelah penyimpanan.');

      // Verifikasi nilai yang benar-benar tersimpan, bukan hanya menganggap insert berhasil.
      if (!isEditing && result.data.is_published !== true) {
        const publishResult = await client.from('apps')
          .update({is_published:true, updated_at:new Date().toISOString()})
          .eq('id', result.data.id)
          .select('id,name,is_published')
          .single();
        if (publishResult.error) {
          throw new Error('APK tersimpan, tetapi gagal diterbitkan otomatis: ' + publishResult.error.message);
        }
        if (!publishResult.data || publishResult.data.is_published !== true) {
          throw new Error('APK tersimpan, tetapi Supabase masih mengembalikan is_published bukan true. Periksa trigger atau kebijakan database.');
        }
        result = publishResult;
      }

      showMessage(
        statusBox,
        isEditing
          ? 'Informasi APK berhasil diperbarui.'
          : `APK ${result.data.name} berhasil ditambahkan. Status publikasi: TAYANG.`,
        'success'
      );
      resetForm();
      await loadApps();
    } catch (error) {
      console.error('Gagal menyimpan APK:', error);
      showMessage(statusBox, 'Gagal menyimpan APK: ' + (error?.message || 'Kesalahan tidak diketahui.'));
    } finally {
      saveBtn.disabled = false;
      if (!wasEditing) saveBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Tambahkan APK';
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
      return `<article class="item-card"><img class="app-icon" src="${escapeHTML(icon)}" alt="" onerror="this.onerror=null;this.src='https://placehold.co/100x100?text=APK'"><div class="flex-grow-1"><div class="item-name">${escapeHTML(app.name || 'APK tanpa nama')}</div><div class="item-info">${escapeHTML(app.category || 'Lainnya')} · ${escapeHTML(app.version || 'Versi -')} · ${escapeHTML(app.size || 'Ukuran -')}</div><span class="published-state ${app.is_published ? 'is-live' : 'is-draft'}">${app.is_published ? 'Tayang' : 'Draft'}</span></div><div class="item-actions"><button type="button" class="secondary-btn" data-edit="${escapeHTML(app.id)}"><i class="bi bi-pencil-square"></i> Edit</button><button type="button" class="danger-btn" data-delete="${escapeHTML(app.id)}"><i class="bi bi-trash"></i> Hapus</button></div></article>`;
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
    $('published').checked = app.is_published !== false;
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
    const panels = {apps:$('appsPanel'), reviews:$('reviewsPanel'), stats:$('statsPanel')};
    Object.entries(panels).forEach(([key, panel]) => { if (panel) panel.style.display = key === section ? 'block' : 'none'; });
    document.querySelectorAll('[data-section]').forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
    if (section === 'reviews') loadReviews();
    if (section === 'stats') loadStats();
  }));
  $('refreshStatsBtn')?.addEventListener('click', loadStats);

  checkSession();
})();
