let editingId = null;
const $ = id => document.getElementById(id);
const loginForm = $("loginForm");
const loginPanel = $("loginPanel");
const adminPanel = $("adminPanel");
const loginBtn = $("loginBtn");
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
  return window.supabase && typeof window.supabase.createClient === "function" && window.supabaseClient;
}

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
}

async function checkSession() {
  if (!clientReady()) return;
  const {data} = await supabaseClient.auth.getSession();
  if (data.session) await showAdmin();
}
async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}
checkSession();

function showSection(section) {
  const announcements = section === "announcements";
  const stats = section === "stats";
  $("apkPanel").style.display = (!announcements && !stats) ? "block" : "none";
  $("announcementPanel").style.display = announcements ? "block" : "none";
  $("statsPanel").style.display = stats ? "block" : "none";
  $("apkTab").classList.toggle("active", !announcements && !stats);
  $("announcementTab").classList.toggle("active", announcements);
  $("statsTab").classList.toggle("active", stats);
  if (announcements) loadAnnouncements();
  if (stats) loadDashboardStats();
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  if (!clientReady()) return;
  saveBtn.disabled = true;
  saveBtn.textContent = "MENYIMPAN...";

  try {
    const appData = {
      name:$("name").value.trim(),
      description:$("description").value.trim(),
      version:$("version").value.trim(),
      size:$("size").value.trim(),
      category:$("category").value,
      icon:$("icon").value.trim(),
      download_url:$("download_url").value.trim()
    };

    if (editingId !== null) {
      const { error } = await supabaseClient.from("apps").update(appData).eq("id", editingId);
      if (error) throw error;
      showMessage("status","APK berhasil diperbarui!","success");
    } else {
      const { error } = await supabaseClient.from("apps").insert([appData]);
      if (error) throw error;
      showMessage("status","APK berhasil ditambahkan!","success");
    }
    resetAppForm();
    await loadApps();
  } catch(error) {
    showMessage("status","Gagal menyimpan APK: " + error.message);
  } finally {
    saveBtn.disabled = false;
    updateAppButton();
  }
});

async function loadApps() {
  appList.innerHTML = '<div class="empty">Memuat daftar APK...</div>';
  const {data,error} = await supabaseClient.from("apps").select("*").order("created_at",{ascending:false});
  if (error) { appList.innerHTML = `<div class="empty">Gagal memuat APK</div>`; return; }
  if (!data?.length) { appList.innerHTML = '<div class="empty">Belum ada APK.</div>'; return; }
  
  appList.innerHTML = data.map(app => {
    const icon = safeImage(app.icon) || "https://placehold.co/100x100?text=APK";
    return `
      <div class="item-card">
        <div class="d-flex align-items-center gap-3">
          <img src="${escapeHTML(icon)}" class="app-icon" alt="">
          <div class="flex-grow-1">
            <div class="item-name">${escapeHTML(app.name)}</div>
            <div class="item-info">${escapeHTML(app.category || "Lainnya")} • Versi ${escapeHTML(app.version || "-")}</div>
          </div>
        </div>
        <div class="d-flex gap-2 mt-3">
          <button type="button" class="small-comic btn-edit" onclick="editApp('${app.id}')">Edit</button>
          <button type="button" class="small-comic btn-delete" onclick="deleteApp('${app.id}')">Hapus</button>
        </div>
      </div>`;
  }).join("");
}

async function editApp(id) {
  const { data, error } = await supabaseClient.from("apps").select("*").eq("id", id).single();
  if (error) return alert("Gagal membuka APK");
  editingId = data.id;
  ["name", "description", "version", "size", "category", "icon", "download_url"].forEach(key => {
    $(key).value = data[key] ?? "";
  });
  formTitle.textContent = "Perbarui APK!";
  cancelBtn.style.display = "block";
  updateAppButton();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteApp(id) {
  if (!confirm("Yakin ingin menghapus APK ini?")) return;
  const {error} = await supabaseClient.from("apps").delete().eq("id",id);
  if (error) return alert("Gagal menghapus APK");
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
  saveBtn.innerHTML = editingId !== null ? 'SIMPAN UPDATE APK' : 'TAMBAHKAN APK';
}
cancelBtn.addEventListener("click", resetAppForm);

async function loadDashboardStats() {
  const {data: apps} = await supabaseClient.from("apps").select("id", {count: "exact"});
  const {data: downloads} = await supabaseClient.from("app_downloads").select("id", {count: "exact"});
  $("statsApps").textContent = apps ? apps.length : 0;
  $("statsDownloads").textContent = downloads ? downloads.length : 0;
}

async function loadAnnouncements() {
  const list = document.getElementById("announcementList");
  const { data } = await supabaseClient.from("site_notifications").select("*").order("created_at", { ascending: false });
  if (!data?.length) { list.innerHTML = '<div class="empty">Belum ada pengumuman.</div>'; return; }
  list.innerHTML = data.map(item => `
    <div class="admin-box comic mb-3">
      <h5>${escapeHTML(item.title)}</h5>
      <p>${escapeHTML(item.message)}</p>
      <button class="btn-comic btn-red mt-2" onclick="deleteAnnouncement('${item.id}')">Hapus</button>
    </div>`).join("");
}

async function deleteAnnouncement(id) {
  await supabaseClient.from("site_notifications").delete().eq("id", id);
  loadAnnouncements();
}

document.getElementById("announcementForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const title = $("announcementTitle").value.trim();
  const message = $("announcementMessage").value.trim();
  await supabaseClient.from("site_notifications").insert([{ title, message, active: true }]);
  e.target.reset();
  loadAnnouncements();
});
