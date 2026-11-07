let editingId = null;
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
  showSection("apk");
  await loadApps();
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
  const selected = ["apk", "announcements", "stats"].includes(section) ? section : "apk";
  const panels = {
    apk: $("apkPanel"),
    announcements: $("announcementPanel"),
    stats: $("statsPanel")
  };
  const tabs = {
    apk: $("apkTab"),
    announcements: $("announcementTab"),
    stats: $("statsTab")
  };

  Object.entries(panels).forEach(([name, panel]) => {
    if (!panel) return;
    const visible = name === selected;
    panel.hidden = !visible;
    panel.style.display = visible ? "block" : "none";
  });
  Object.entries(tabs).forEach(([name, tab]) => {
    if (tab) tab.classList.toggle("active", name === selected);
  });

  if (selected === "announcements") loadAnnouncements();
  if (selected === "stats") loadDashboardStats();
}

// Jadikan fungsi tersedia secara global dan pasang klik langsung agar menu
// tetap bekerja meskipun atribut onclick dibatasi oleh browser/kebijakan halaman.
window.showSection = showSection;
document.querySelectorAll("[data-admin-section]").forEach(button => {
  button.addEventListener("click", () => showSection(button.dataset.adminSection));
});

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
      // Hitung baris yang terkena update tanpa meminta SELECT atas baris tersebut.
      // Ini menghindari hasil kosong palsu ketika kebijakan SELECT lebih ketat daripada UPDATE.
      const targetId = editingId;
      const { error, count } = await window.supabaseClient
        .from("apps")
        .update(appData, { count: "exact" })
        .eq("id", targetId);

      if (error) throw error;

      if (count === 0) {
        throw new Error("Tidak ada APK yang berubah. Periksa ID APK serta kebijakan UPDATE dan USING/WITH CHECK pada RLS tabel apps di Supabase.");
      }

      showMessage("status","APK berhasil diperbarui tanpa menghapus data lama!","success");
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
  appList.innerHTML = '<div class="empty">Memuat daftar APK...</div>';
  let data, error;
  try {
    ({data,error} = await supabaseClient.from("apps").select("*").order("created_at",{ascending:false}));
  } catch (requestError) {
    appList.innerHTML = `<div class="empty">Koneksi gagal: ${escapeHTML(requestError.message || "Periksa internet")}</div>`;
    return;
  }
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
          <button type="button" class="small-comic btn-edit" data-edit-app="${escapeHTML(String(app.id))}"><i class="bi bi-arrow-repeat"></i> UPDATE APK</button>
          <button type="button" class="small-comic btn-delete" data-delete-app="${escapeHTML(String(app.id))}"><i class="bi bi-trash"></i> Hapus</button>
        </div>
      </div>`;
  }).join("");
  appList.querySelectorAll("[data-edit-app]").forEach(button => {
    button.addEventListener("click", () => editApp(button.dataset.editApp));
  });
  appList.querySelectorAll("[data-delete-app]").forEach(button => {
    button.addEventListener("click", () => deleteApp(button.dataset.deleteApp));
  });
}
async function editApp(id) {
  const client = window.supabaseClient;
  if (!client) {
    showMessage("status", "Supabase belum terhubung. Periksa supabase.js.");
    return;
  }

  try {
    const { data, error } = await client
      .from("apps")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Data APK tidak ditemukan atau akun admin tidak memiliki izin membaca data ini.");

    editingId = data.id;
    ["name", "description", "version", "size", "category", "icon", "download_url"].forEach(key => {
      $(key).value = data[key] ?? (key === "category" ? "Lainnya" : "");
    });

    formTitle.textContent = "Perbarui APK!";
    const notice = $("appEditNotice");
    if (notice) {
      notice.style.display = "block";
      notice.textContent = `Mode update aktif untuk: ${data.name || "APK tanpa nama"}. Ubah data lalu tekan Simpan Perubahan. APK lama tidak perlu dihapus.`;
    }
    cancelBtn.style.display = "block";
    statusBox.innerHTML = "";
    updateAppButton();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    showMessage("status", "Gagal membuka APK untuk diperbarui: " + (error?.message || "Kesalahan tidak diketahui."));
  }
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
  const notice = $("appEditNotice");
  if (notice) notice.style.display = "none";
  cancelBtn.style.display = "none";
  updateAppButton();
}
function updateAppButton() {
  saveBtn.innerHTML = editingId !== null && editingId !== undefined
    ? '<i class="bi bi-save"></i> SIMPAN UPDATE APK'
    : '<i class="bi bi-plus-circle"></i> TAMBAHKAN APK';
}
cancelBtn.addEventListener("click",() => {
  resetAppForm();
  statusBox.innerHTML = "";
});

/* DASHBOARD STATISTIK ADMIN */

function renderDownloadsChart(downloads) {
  const target = $("statsDownloadsChart");
  const totalNode = $("statsChartTotal");
  if (!target || !totalNode) return;
  const days = [];
  const now = new Date();
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    days.push({ key, label: date.toLocaleDateString("id-ID", { weekday:"short" }), count:0 });
  }
  const dayMap = new Map(days.map(day => [day.key, day]));
  (downloads || []).forEach(item => {
    if (!item.created_at) return;
    const date = new Date(item.created_at);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    const day = dayMap.get(key);
    if (day) day.count++;
  });
  const total = days.reduce((sum, day) => sum + day.count, 0);
  totalNode.textContent = total.toLocaleString("id-ID");
  if (!days.some(day => day.count > 0)) {
    target.innerHTML = '<div class="empty">Belum ada catatan klik unduhan bertanggal dalam 7 hari terakhir.</div>';
    return;
  }
  const max = Math.max(1, ...days.map(day => day.count));
  const points = days.map((day, index) => ({...day, x:44 + index*91, y:184 - (day.count/max)*132}));
  const line = points.map((point,index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const area = `${line} L ${points[6].x} 190 L ${points[0].x} 190 Z`;
  const grid = [52,96,140,184].map(y => `<line class="stats-chart-grid" x1="35" y1="${y}" x2="600" y2="${y}"></line>`).join("");
  const labels = points.map(point => `<text class="stats-chart-label" x="${point.x}" y="218" text-anchor="middle">${escapeHTML(point.label)}</text>`).join("");
  const values = points.map(point => point.count ? `<text class="stats-chart-value" x="${point.x}" y="${Math.max(28,point.y-12)}" text-anchor="middle">${point.count.toLocaleString("id-ID")}</text>` : "").join("");
  const dots = points.map(point => `<circle class="stats-chart-dot" cx="${point.x}" cy="${point.y}" r="5"></circle>`).join("");
  target.innerHTML = `<svg class="stats-chart-svg" viewBox="0 0 640 235" role="img" aria-label="Jumlah klik unduhan per hari: ${points.map(p => `${p.label} ${p.count}`).join(", ")}">
    <defs><linearGradient id="statsChartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#2457a6" stop-opacity=".22"></stop><stop offset="100%" stop-color="#2457a6" stop-opacity="0"></stop></linearGradient></defs>
    ${grid}<path class="stats-chart-area" d="${area}"></path><path class="stats-chart-line" d="${line}"></path>${dots}${values}${labels}
  </svg>`;
}

async function loadDashboardStats() {
  const client = window.supabaseClient;
  const status = $("statsStatus");
  if (!client) {
    status.innerHTML = '<div class="alert alert-danger">Supabase belum terhubung.</div>';
    return;
  }
  status.innerHTML = '<div class="alert alert-info">Memuat statistik...</div>';
  ["statsApps","statsDownloads","statsReviews","statsRatings"].forEach(id => $(id).textContent = "…");
  const errors = [];
  async function readTable(table) {
    try {
      const { data, error } = await client.from(table).select("*");
      if (error) { errors.push(table + ": " + error.message); return null; }
      return data || [];
    } catch (error) {
      errors.push(table + ": " + (error?.message || "Koneksi gagal"));
      return null;
    }
  }
  try {
    const [apps, downloads, reviews, ratings] = await Promise.all([
      readTable("apps"), readTable("app_downloads"), readTable("app_reviews"), readTable("app_ratings")
    ]);
    renderDownloadsChart(downloads);
    const fmt = n => Number(n || 0).toLocaleString("id-ID");
    $("statsApps").textContent = apps ? fmt(apps.length) : "—";
    $("statsDownloads").textContent = downloads ? fmt(downloads.length) : "—";
    $("statsReviews").textContent = reviews ? fmt(reviews.length) : "—";
    $("statsRatings").textContent = ratings ? fmt(ratings.length) : "—";
    const appNames = new Map((apps || []).map(app => [String(app.id), app.name || app.title || String(app.id)]));
    const counts = new Map();
    (downloads || []).forEach(item => {
      const id = String(item.app_id ?? "");
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    });
    const popular = [...counts.entries()].map(([id,count]) => ({name:appNames.get(id) || ("APK ID " + id),count})).sort((a,b)=>b.count-a.count).slice(0,7);
    $("statsPopular").innerHTML = popular.length ? popular.map(item => {
      const max = Math.max(1, ...popular.map(x => x.count));
      return `<div class="stats-row"><div class="stats-row-name">${escapeHTML(item.name)}</div><div class="stats-track"><div class="stats-fill" style="width:${Math.round(item.count/max*100)}%"></div></div><div class="stats-count">${fmt(item.count)}</div></div>`;
    }).join("") : `<div class="empty">${downloads ? "Belum ada catatan klik unduhan." : "Data unduhan tidak dapat dibaca."}</div>`;
    const latest = [...(apps || [])].sort((a,b)=>new Date(b.created_at || 0)-new Date(a.created_at || 0)).slice(0,7);
    $("statsLatest").innerHTML = apps ? (latest.length ? latest.map(app => `<div class="item-card"><div class="item-name">${escapeHTML(app.name || app.title || "APK tanpa nama")}</div><div class="item-info">${escapeHTML(app.version || "Versi tidak dicantumkan")} · ${escapeHTML(app.created_at ? new Date(app.created_at).toLocaleString("id-ID") : "Tanggal tidak tersedia")}</div></div>`).join("") : '<div class="empty">Belum ada APK.</div>') : '<div class="empty">Data aplikasi gagal dimuat.</div>';
    const recent = [...(downloads || [])].sort((a,b)=>new Date(b.created_at || 0)-new Date(a.created_at || 0)).slice(0,10);
    $("statsRecent").innerHTML = downloads ? (recent.length ? recent.map(item => `<div class="item-card"><div class="item-name">${escapeHTML(appNames.get(String(item.app_id)) || item.app_id || "APK tidak dikenal")}</div><div class="item-info">${escapeHTML(item.created_at ? new Date(item.created_at).toLocaleString("id-ID") : "Waktu tidak tersedia")}</div></div>`).join("") : '<div class="empty">Belum ada aktivitas unduhan.</div>') : '<div class="empty">Data aktivitas tidak dapat dimuat.</div>';
    status.innerHTML = errors.length ? `<div class="alert alert-warning">Sebagian statistik tidak dapat dibaca. Detail: ${errors.map(escapeHTML).join(" | ")}</div>` : '<div class="alert alert-success">Statistik berhasil diperbarui.</div>';
  } catch (error) {
    console.error("Gagal memuat dashboard statistik:", error);
    status.innerHTML = `<div class="alert alert-danger">Statistik gagal dimuat: ${escapeHTML(error?.message || "Kesalahan tidak diketahui")}</div>`;
  }
}

async function loadAnnouncements() {
  const list = document.getElementById("announcementList");

  if (!list) return;

  list.innerHTML = '<div class="empty">Memuat pengumuman...</div>';

  if (!window.supabaseClient) {
    list.innerHTML = '<div class="empty">Supabase belum terhubung.</div>';
    return;
  }

  let data, error;
  try {
    ({ data, error } = await window.supabaseClient
      .from("notifications")
      .select("id, title, message, created_at")
      .order("created_at", { ascending: false }));
  } catch (requestError) {
    console.error("Koneksi pengumuman gagal:", requestError);
    list.innerHTML = `<div class="empty">Koneksi pengumuman gagal: ${escapeHTML(requestError.message || "Periksa internet")}</div>`;
    return;
  }

  if (error) {
    console.error("Gagal memuat pengumuman:", error);
    list.innerHTML = `<div class="empty">Gagal memuat pengumuman: ${escapeHTML(error.message || "Kesalahan Supabase")}</div>`;
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
        data-delete-announcement="${Number(item.id)}">
        <i class="bi bi-trash-fill"></i> HAPUS
      </button>
    </div>
  `).join("");
  document.getElementById("announcementList").querySelectorAll("[data-delete-announcement]").forEach(button => {
    button.addEventListener("click", () => deleteAnnouncement(Number(button.dataset.deleteAnnouncement)));
  });
}

async function deleteAnnouncement(id) {
  if (!confirm("Yakin ingin menghapus pengumuman ini?")) return;

  const client = window.supabaseClient;

  if (!client) {
    alert("Supabase belum terhubung.");
    return;
  }

  const { error } = await client
    .from("notifications")
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
      .from("notifications")
      .insert([{ title, message }]);

    saveButton.disabled = false;

    if (error) {
      console.error("Gagal menerbitkan pengumuman:", error);
      status.textContent = "Gagal menerbitkan: " + (error.message || "Periksa izin INSERT/RLS tabel notifications.");
      return;
    }

    announcementForm.reset();
    status.textContent = "Pengumuman berhasil diterbitkan!";
    await loadAnnouncements();
  });
}


// Fungsi penting tersedia untuk pemeriksaan dan pemanggilan dari antarmuka.
window.loadAnnouncements = loadAnnouncements;
window.loadDashboardStats = loadDashboardStats;
