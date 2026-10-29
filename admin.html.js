
let editingId = null;
let editingQuoteId = null;

const $ = id => document.getElementById(id);
const loginForm = $("loginForm");
const loginPanel = $("loginPanel");
const adminPanel = $("adminPanel");
const loginBtn = $("loginBtn");
const loginStatus = $("loginStatus");
const form = $("addAppForm");
const saveBtn = $("saveBtn");
const cancelBtn = $("cancelBtn");
const statusBox = $("status");
const appList = $("appList");
const formTitle = $("formTitle");
const navRight = $("navRight");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}
function safeImage(value) {
  try {
    const u = new URL(value);
    return ["https:","http:"].includes(u.protocol) ? u.href : "";
  } catch { return ""; }
}
function showMessage(id, message, type="danger") {
  $(id).innerHTML = `<div class="alert alert-${type}">${escapeHTML(message)}</div>`;
}

function clientReady() {
  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    showMessage(
      "loginStatus",
      "Pustaka Supabase belum dimuat. Periksa koneksi internet."
    );
    return false;
  }

  if (!window.supabaseClient) {
    showMessage(
      "loginStatus",
      "Client Supabase belum dibuat. Periksa isi supabase.js."
    );
    return false;
  }

  return true;
}
  

/* LOGIN */
loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (!clientReady()) return;

  loginBtn.disabled = true;
  loginBtn.textContent = "MEMERIKSA LOGIN...";
  $("loginStatus").innerHTML = "";

  try {
    const {error} = await supabaseClient.auth.signInWithPassword({
      email:$("loginEmail").value.trim(),
      password:$("loginPassword").value
    });
    if (error) throw error;
    await showAdmin();
  } catch(error) {
    showMessage("loginStatus","Login gagal: " + error.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> LOGIN';
  }
});

async function showAdmin() {
  loginPanel.style.display = "none";
  adminPanel.style.display = "block";
  navRight.innerHTML = `
    <div class="d-flex align-items-center gap-2 flex-wrap">
      <a href="index.html" class="back-btn"><i class="bi bi-house"></i> Beranda</a>
      <button onclick="logout()" class="logout-btn"><i class="bi bi-box-arrow-right"></i> Keluar</button>
    </div>`;
  await loadApps();
  await loadAdminMusic();
}
async function checkSession() {
  if (!clientReady()) return;
  const {data,error} = await supabaseClient.auth.getSession();
  if (error) {
    showMessage("loginStatus","Gagal memeriksa sesi: " + error.message);
    return;
  }
  if (data.session) await showAdmin();
}
async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}
checkSession();

/* PINDAH MENU */

function showSection(section) {
  const quotes = section === "quotes";
  const announcements = section === "announcements";
  const stats = section === "stats";
  const music = section === "music";
  $("apkPanel").style.display = (!quotes && !announcements && !stats && !music) ? "block" : "none";
  $("quotePanel").style.display = quotes ? "block" : "none";
  $("announcementPanel").style.display = announcements ? "block" : "none";
  $("statsPanel").style.display = stats ? "block" : "none";
  $("musicPanel").style.display = music ? "block" : "none";
  $("apkTab").classList.toggle("active", !quotes && !announcements && !stats && !music);
  $("quoteTab").classList.toggle("active", quotes);
  $("announcementTab").classList.toggle("active", announcements);
  $("statsTab").classList.toggle("active", stats);
  $("musicTab").classList.toggle("active", music);
  if (quotes) loadQuotes();
  if (announcements) loadAnnouncements();
  if (stats) loadDashboardStats();
  if (music) loadAdminMusic();
}

/* TAMBAH / EDIT APK */
form.addEventListener("submit", async e => {
  e.preventDefault();

  if (!window.supabaseClient) {
    showMessage("status","Koneksi Supabase belum tersedia. Periksa supabase.js.");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> MENYIMPAN...';

  try {
    const { data: sessionData, error: sessionError } = await window.supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData?.session) {
      showMessage("status","Sesi admin berakhir. Login kembali.");
      return;
    }

    const appData = {
      name:$("name").value.trim(),
      description:$("description").value.trim(),
      version:$("version").value.trim(),
      size:$("size").value.trim(),
      category:$("category").value,
      icon:$("icon").value.trim(),
      download_url:$("download_url").value.trim()
    };

    if (!appData.name || !appData.download_url) {
      showMessage("status","Nama aplikasi dan URL download wajib diisi.");
      return;
    }

    if (editingId !== null && editingId !== undefined) {
      // select() memastikan kita mengetahui apakah baris benar-benar diperbarui.
      const { data, error } = await window.supabaseClient
        .from("apps")
        .update(appData)
        .eq("id", editingId)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error("Tidak ada data APK yang diperbarui. ID mungkin tidak cocok atau izin UPDATE/RLS Supabase menolak perubahan.");
      }

      showMessage("status","APK berhasil diperbarui!","success");
    } else {
      const { error } = await window.supabaseClient
        .from("apps")
        .insert([appData]);

      if (error) throw error;
      showMessage("status","APK berhasil ditambahkan!","success");
    }

    resetAppForm();
    await loadApps();
  } catch(error) {
    console.error("Gagal menyimpan APK:", error);
    showMessage("status","Gagal menyimpan APK: " + (error?.message || "Kesalahan tidak diketahui."));
  } finally {
    saveBtn.disabled = false;
    updateAppButton();
  }
});

async function loadApps() {
  const {data,error} = await supabaseClient.from("apps").select("*").order("created_at",{ascending:false});
  if (error) {
    appList.innerHTML = `<div class="empty">Gagal memuat APK: ${escapeHTML(error.message)}</div>`;
    return;
  }
  if (!data?.length) {
    appList.innerHTML = '<div class="empty">Belum ada APK.</div>';
    return;
  }
  appList.innerHTML = data.map(app => {
    const icon = safeImage(app.icon) || "https://placehold.co/100x100?text=APK";
    return `
      <div class="item-card">
        <div class="d-flex align-items-center gap-3">
          <img src="${escapeHTML(icon)}" class="app-icon" alt="" onerror="this.onerror=null;this.src='https://placehold.co/100x100?text=APK'">
          <div class="flex-grow-1">
            <div class="item-name">${escapeHTML(app.name)}</div>
            <div class="item-info">${escapeHTML(app.category || "Lainnya")}${app.version ? " • Versi "+escapeHTML(app.version):""}${app.size ? " • "+escapeHTML(app.size):""}</div>
          </div>
        </div>
        <div class="d-flex gap-2 mt-3">
          <button class="small-comic btn-edit" onclick="editApp('${escapeHTML(app.id)}')"><i class="bi bi-pencil"></i> Edit</button>
          <button class="small-comic btn-delete" onclick="deleteApp('${escapeHTML(app.id)}')"><i class="bi bi-trash"></i> Hapus</button>
        </div>
      </div>`;
  }).join("");
}
async function editApp(id) {
  const {data,error} = await supabaseClient.from("apps").select("*").eq("id",id).single();
  if (error) return alert(error.message);
  editingId = id;
  ["name","description","version","size","category","icon","download_url"].forEach(key => {
    $(key).value = data[key] || (key === "category" ? "Lainnya" : "");
  });
  formTitle.textContent = "Edit APK!";
  cancelBtn.style.display = "block";
  updateAppButton();
  window.scrollTo({top:0,behavior:"smooth"});
}
async function deleteApp(id) {
  if (!confirm("Yakin ingin menghapus APK ini?")) return;
  const {error} = await supabaseClient.from("apps").delete().eq("id",id);
  if (error) return alert("Gagal menghapus APK: " + error.message);
  await loadApps();
}
function resetAppForm() {
  editingId = null;
  form.reset();
  formTitle.textContent = "Tambah APK!";
  cancelBtn.style.display = "none";
  updateAppButton();
}
function updateAppButton() {
  saveBtn.innerHTML = editingId
    ? '<i class="bi bi-save"></i> SIMPAN PERUBAHAN'
    : '<i class="bi bi-plus-circle"></i> TAMBAHKAN APK';
}
cancelBtn.addEventListener("click",() => {
  resetAppForm();
  statusBox.innerHTML = "";
});

/* KATA SAD: TAMBAH / EDIT */
$("quoteForm").addEventListener("submit",async e => {
  e.preventDefault();
  const {data:{session}} = await supabaseClient.auth.getSession();
  if (!session) {
    showMessage("quoteStatus","Sesi admin berakhir. Login kembali.");
    return;
  }

  const quote = $("quoteText").value.trim();
const author = $("quoteAuthor").value.trim();

if (!quote) {
  return showMessage("quoteStatus","Isi kata-kata terlebih dahulu.");
}

  $("quoteSaveBtn").disabled = true;
  $("quoteSaveBtn").textContent = "MENYIMPAN...";

  try {
    const result = editingQuoteId
  ? await supabaseClient.from("sad_quotes")
      .update({quote, author})
      .eq("id", editingQuoteId)
  : await supabaseClient.from("sad_quotes")
      .insert([{quote, author}]);
    if (result.error) throw result.error;

    showMessage("quoteStatus",editingQuoteId ? "Kata berhasil diperbarui!" : "Kata berhasil ditambahkan!","success");
    resetQuoteForm();
    await loadQuotes();
  } catch(error) {
    showMessage("quoteStatus","Gagal menyimpan kata: " + error.message);
  } finally {
    $("quoteSaveBtn").disabled = false;
    updateQuoteButton();
  }
});

async function loadQuotes() {
  $("quoteList").innerHTML = '<div class="empty">Memuat kata-kata...</div>';
  const {data,error} = await supabaseClient
    .from("sad_quotes").select("*").order("created_at",{ascending:false});

  if (error) {
    $("quoteList").innerHTML = `<div class="empty">Gagal memuat kata: ${escapeHTML(error.message)}</div>`;
    return;
  }
  if (!data?.length) {
    $("quoteList").innerHTML = '<div class="empty">Belum ada kata sad. Tambahkan kata pertama di atas.</div>';
    return;
  }

  $("quoteList").innerHTML = data.map(item => `
    <div class="item-card">
      <div class="quote-text">💔 ${escapeHTML(item.quote)}</div>
<div class="item-info mt-2">✍️ ${escapeHTML(item.author || "Tanpa nama")}</div>
      <div class="d-flex gap-2 mt-3">
        <button class="small-comic btn-edit" onclick="editQuote('${escapeHTML(item.id)}')"><i class="bi bi-pencil"></i> Edit</button>
        <button class="small-comic btn-delete" onclick="deleteQuote('${escapeHTML(item.id)}')"><i class="bi bi-trash"></i> Hapus</button>
      </div>
    </div>`).join("");
}
async function editQuote(id) {
  const {data,error} = await supabaseClient.from("sad_quotes").select("*").eq("id",id).single();
  if (error) return alert("Gagal membuka kata: " + error.message);
  editingQuoteId = id;
  $("quoteText").value = data.quote || "";
  $("quoteAuthor").value = data.author || "";
  $("quoteFormTitle").textContent = "Edit Kata Sad!";
  $("quoteCancelBtn").style.display = "block";
  updateQuoteButton();
  window.scrollTo({top:0,behavior:"smooth"});
}
async function deleteQuote(id) {
  if (!confirm("Yakin ingin menghapus kata sad ini?")) return;
  const {error} = await supabaseClient.from("sad_quotes").delete().eq("id",id);
  if (error) return alert("Gagal menghapus kata: " + error.message);
  await loadQuotes();
}
function resetQuoteForm() {
  editingQuoteId = null;
  $("quoteForm").reset();
  $("quoteFormTitle").textContent = "Tambah Kata Sad!";
  $("quoteCancelBtn").style.display = "none";
  updateQuoteButton();
}
function updateQuoteButton() {
  $("quoteSaveBtn").innerHTML = editingQuoteId
    ? '<i class="bi bi-save"></i> SIMPAN PERUBAHAN'
    : '<i class="bi bi-plus-circle"></i> TAMBAH KATA';
}
$("quoteCancelBtn").addEventListener("click",() => {
  resetQuoteForm();
  $("quoteStatus").innerHTML = "";
});

  
/* DASHBOARD STATISTIK ADMIN */
async function loadDashboardStats() {
  const client = window.supabaseClient;
  const status = $("statsStatus");
  if (!client) { status.innerHTML = '<div class="alert alert-danger">Supabase belum terhubung.</div>'; return; }
  status.innerHTML = '<div class="alert alert-info">Memuat statistik...</div>';
  ["statsApps","statsDownloads","statsReviews","statsRatings"].forEach(id => $(id).textContent = "…");
  const errors = [];
  async function readTable(table) {
    const {data,error} = await client.from(table).select("*");
    if (error) { errors.push(table + ": " + error.message); return null; }
    return data || [];
  }
  const [apps, downloads, reviews, ratings] = await Promise.all([
    readTable("apps"), readTable("app_downloads"), readTable("app_reviews"), readTable("app_ratings")
  ]);
  const fmt = n => Number(n || 0).toLocaleString("id-ID");
  $("statsApps").textContent = apps ? fmt(apps.length) : "—";
  $("statsDownloads").textContent = downloads ? fmt(downloads.length) : "—";
  $("statsReviews").textContent = reviews ? fmt(reviews.length) : "—";
  $("statsRatings").textContent = ratings ? fmt(ratings.length) : "—";
  const appNames = new Map((apps || []).map(app => [String(app.id), app.name || app.title || String(app.id)]));
  const counts = new Map();
  (downloads || []).forEach(item => { const id = String(item.app_id ?? ""); if (id) counts.set(id, (counts.get(id) || 0) + 1); });
  const popular = [...counts.entries()].map(([id,count]) => ({name:appNames.get(id) || ("APK ID " + id),count})).sort((a,b)=>b.count-a.count).slice(0,7);
  $("statsPopular").innerHTML = popular.length ? popular.map(item => {
    const max = Math.max(1, ...popular.map(x => x.count));
    return `<div class="stats-row"><div class="stats-row-name">${escapeHTML(item.name)}</div><div class="stats-track"><div class="stats-fill" style="width:${Math.round(item.count/max*100)}%"></div></div><div class="stats-count">${fmt(item.count)}</div></div>`;
  }).join("") : `<div class="empty">${downloads ? "Belum ada catatan klik unduhan." : "Data unduhan tidak dapat dibaca."}</div>`;
  const latest = [...(apps || [])].sort((a,b)=>new Date(b.created_at || 0)-new Date(a.created_at || 0)).slice(0,7);
  $("statsLatest").innerHTML = apps ? (latest.length ? latest.map(app => `<div class="item-card"><div class="item-name">${escapeHTML(app.name || app.title || "APK tanpa nama")}</div><div class="item-info">${escapeHTML(app.version || "Versi tidak dicantumkan")} · ${escapeHTML(app.created_at ? new Date(app.created_at).toLocaleString("id-ID") : "Tanggal tidak tersedia")}</div></div>`).join("") : '<div class="empty">Belum ada APK.</div>') : '<div class="empty">Data aplikasi gagal dimuat.</div>';
  const recent = [...(downloads || [])].sort((a,b)=>new Date(b.created_at || 0)-new Date(a.created_at || 0)).slice(0,10);
  $("statsRecent").innerHTML = downloads ? (recent.length ? recent.map(item => `<div class="item-card"><div class="item-name">${escapeHTML(appNames.get(String(item.app_id)) || item.app_id || "APK tidak dikenal")}</div><div class="item-info">${escapeHTML(item.created_at ? new Date(item.created_at).toLocaleString("id-ID") : "Waktu tidak tersedia")}</div></div>`).join("") : '<div class="empty">Belum ada aktivitas unduhan.</div>') : '<div class="empty">Data aktivitas tidak dapat dimuat.</div>';
  status.innerHTML = errors.length ? `<div class="alert alert-warning">Statistik dimuat sebagian. Periksa tabel atau izin RLS:<br>${errors.map(escapeHTML).join("<br>")}</div>` : '<div class="alert alert-success">Statistik berhasil diperbarui.</div>';
}

/* ADMIN MUSIC: CRUD lagu memakai Supabase client dan sesi admin yang sama */
let editingMusicId = null;
const adminMusicForm = document.getElementById("adminMusicForm");
function isValidWebUrl(value) {
  try { const u = new URL(value); return u.protocol === "https:" || u.protocol === "http:"; }
  catch { return false; }
}
if (adminMusicForm) {
  adminMusicForm.addEventListener("submit", async event => {
    event.preventDefault();
    const client = window.supabaseClient;
    if (!client) return showMessage("musicAdminStatus", "Supabase belum terhubung. Periksa supabase.js.");
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData?.session) return showMessage("musicAdminStatus", "Sesi admin tidak ditemukan. Silakan login kembali.");
    const title = $("musicTitle").value.trim();
    const artist = $("musicArtist").value.trim();
    const audio_url = $("musicUrl").value.trim();
    const cover_url = $("musicCover").value.trim();
    if (!title || !isValidWebUrl(audio_url) || (cover_url && !isValidWebUrl(cover_url))) {
      return showMessage("musicAdminStatus", "Judul wajib diisi. URL MP3 dan sampul harus berupa tautan HTTP/HTTPS yang valid.");
    }
    const btn = $("musicSaveBtn");
    btn.disabled = true;
    btn.textContent = "MENYIMPAN...";
    try {
      const payload = { title, artist: artist || null, audio_url, cover_url: cover_url || null };
      const result = editingMusicId !== null
        ? await client.from("music_tracks").update(payload).eq("id", editingMusicId).select("id").maybeSingle()
        : await client.from("music_tracks").insert([payload]).select("id").maybeSingle();
      if (result.error) throw result.error;
      if (editingMusicId !== null && !result.data) throw new Error("Tidak ada baris yang diperbarui. Periksa ID lagu dan izin UPDATE/RLS.");
      showMessage("musicAdminStatus", editingMusicId !== null ? "Lagu berhasil diperbarui." : "Lagu berhasil ditambahkan.", "success");
      resetAdminMusicForm();
      await loadAdminMusic();
    } catch (error) {
      showMessage("musicAdminStatus", "Gagal menyimpan lagu: " + (error?.message || "Kesalahan tidak diketahui."));
    } finally {
      btn.disabled = false;
      updateAdminMusicButton();
    }
  });
}
async function loadAdminMusic() {
  const list = $("adminMusicList");
  if (!list || !window.supabaseClient) return;
  list.innerHTML = '<div class="empty">Memuat daftar musik...</div>';
  const { data, error } = await window.supabaseClient.from("music_tracks").select("*").order("created_at", { ascending: false });
  if (error) {
    list.innerHTML = `<div class="empty">Gagal memuat musik: ${escapeHTML(error.message)}. Pastikan tabel music_tracks dibuat di Supabase.</div>`;
    return;
  }
  if (!data?.length) {
    list.innerHTML = '<div class="empty">Belum ada lagu. Tambahkan lagu pertama melalui formulir di atas.</div>';
    return;
  }
  list.innerHTML = data.map(track => {
    const cover = safeImage(track.cover_url) || "https://placehold.co/100x100?text=Music";
    const audio = safeImage(track.audio_url);
    return `<div class="item-card">
      <div class="d-flex align-items-center gap-3">
        <img src="${escapeHTML(cover)}" class="app-icon" alt="" onerror="this.onerror=null;this.src='https://placehold.co/100x100?text=Music'">
        <div class="flex-grow-1">
          <div class="item-name">${escapeHTML(track.title)}</div>
          <div class="item-info">${escapeHTML(track.artist || "Artis tidak dicantumkan")}</div>
          ${audio ? `<audio controls preload="none" style="width:100%;margin-top:8px" src="${escapeHTML(audio)}"></audio>` : ""}
        </div>
      </div>
      <div class="d-flex gap-2 mt-3">
        <button type="button" class="small-comic btn-edit" onclick="editAdminMusic('${escapeHTML(track.id)}')"><i class="bi bi-pencil"></i> Edit</button>
        <button type="button" class="small-comic btn-delete" onclick="deleteAdminMusic('${escapeHTML(track.id)}')"><i class="bi bi-trash"></i> Hapus</button>
      </div>
    </div>`;
  }).join("");
}
async function editAdminMusic(id) {
  const { data, error } = await window.supabaseClient.from("music_tracks").select("*").eq("id", id).single();
  if (error) return alert("Gagal membuka lagu: " + error.message);
  editingMusicId = id;
  $("musicTitle").value = data.title || "";
  $("musicArtist").value = data.artist || "";
  $("musicUrl").value = data.audio_url || "";
  $("musicCover").value = data.cover_url || "";
  $("musicFormTitle").textContent = "Edit Musik!";
  $("musicCancelBtn").style.display = "block";
  updateAdminMusicButton();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
async function deleteAdminMusic(id) {
  if (!confirm("Yakin ingin menghapus lagu ini?")) return;
  const { error } = await window.supabaseClient.from("music_tracks").delete().eq("id", id);
  if (error) return alert("Gagal menghapus lagu: " + error.message);
  await loadAdminMusic();
}
function resetAdminMusicForm() {
  editingMusicId = null;
  adminMusicForm.reset();
  $("musicFormTitle").textContent = "Tambah Musik!";
  $("musicCancelBtn").style.display = "none";
  updateAdminMusicButton();
}
function updateAdminMusicButton() {
  $("musicSaveBtn").innerHTML = editingMusicId !== null
    ? '<i class="bi bi-save"></i> SIMPAN PERUBAHAN'
    : '<i class="bi bi-plus-circle"></i> TAMBAHKAN LAGU';
}
$("musicCancelBtn").addEventListener("click", () => {
  resetAdminMusicForm();
  $("musicAdminStatus").innerHTML = "";
});

async function loadAnnouncements() {
  const list = document.getElementById("announcementList");

  if (!list) return;

  list.innerHTML = '<div class="empty">Memuat pengumuman...</div>';

  if (!window.supabaseClient) {
    list.innerHTML = '<div class="empty">Supabase belum terhubung.</div>';
    return;
  }

  const { data, error } = await window.supabaseClient
    .from("site_notifications")
    .select("id, title, message, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat pengumuman:", error);
    list.innerHTML =
      '<div class="empty">Gagal memuat pengumuman. Periksa izin Supabase.</div>';
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML =
      '<div class="empty">Belum ada pengumuman.</div>';
    return;
  }

  list.innerHTML = data.map(item => `
    <div class="admin-box comic" style="margin-bottom:12px">
      <h5>${escapeHTML(item.title)}</h5>
      <p>${escapeHTML(item.message)}</p>
      <small>${new Date(item.created_at).toLocaleString("id-ID")}</small>
      <br>
      <button type="button" class="btn-comic btn-red"
        onclick="deleteAnnouncement(${Number(item.id)})">
        <i class="bi bi-trash-fill"></i> HAPUS
      </button>
    </div>
  `).join("");
}

async function deleteAnnouncement(id) {
  if (!confirm("Yakin ingin menghapus pengumuman ini?")) return;

  const client = window.supabaseClient;

  if (!client) {
    alert("Supabase belum terhubung.");
    return;
  }

  const { error } = await client
    .from("site_notifications")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Gagal menghapus pengumuman:", error);
    alert("Pengumuman gagal dihapus. Periksa izin admin di Supabase.");
    return;
  }

  alert("Pengumuman berhasil dihapus.");
  loadAnnouncements();
}

const announcementForm =
  document.getElementById("announcementForm");

if (announcementForm) {
  announcementForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const client = window.supabaseClient;
    const title = document.getElementById("announcementTitle").value.trim();
    const message = document.getElementById("announcementMessage").value.trim();
    const status = document.getElementById("announcementStatus");

    if (!client) {
      status.textContent = "Supabase belum terhubung.";
      return;
    }

    if (!title || !message) {
      status.textContent = "Judul dan isi pengumuman wajib diisi.";
      return;
    }

    const { data: sessionData } = await client.auth.getSession();

    if (!sessionData.session) {
      status.textContent = "Silakan login sebagai admin terlebih dahulu.";
      return;
    }

    const saveButton = document.getElementById("announcementSaveBtn");
    saveButton.disabled = true;
    status.textContent = "Menerbitkan pengumuman...";

    const { error } = await client
      .from("site_notifications")
      .insert([{ title, message, active: true }]);

    saveButton.disabled = false;

    if (error) {
      console.error("Gagal menerbitkan pengumuman:", error);
      status.textContent =
        "Gagal menerbitkan. Periksa izin INSERT di Supabase.";
      return;
    }

    announcementForm.reset();
    status.textContent = "Pengumuman berhasil diterbitkan!";
    await loadAnnouncements();
  });
}
  
