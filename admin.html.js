(() => {
"use strict";
const $ = id => document.getElementById(id);
let client = null, editing = null, apps = [];
const msg = (id, text) => { const el = $(id); if (el) el.textContent = text || ""; };
const validUrl = value => { try { return ["http:","https:"].includes(new URL(value).protocol); } catch { return false; } };
const showLogin = () => { $("loginPanel").classList.remove("hidden"); $("adminArea").classList.add("hidden"); };
const showAdmin = () => { $("loginPanel").classList.add("hidden"); $("adminArea").classList.remove("hidden"); };
async function getSession() {
  if (!client) return null;
  const {data,error} = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}
async function loadApps() {
  msg("list","Memuat daftar APK...");
  const {data,error} = await client.from("apps").select("*").order("created_at",{ascending:false});
  if (error) { msg("list","Gagal memuat APK: "+error.message); return; }
  apps = data || [];
  const root = $("list"); root.replaceChildren();
  if (!apps.length) { root.textContent = "Belum ada APK."; return; }
  apps.forEach(app => {
    const item = document.createElement("div"); item.className = "item";
    const info = document.createElement("div"), title = document.createElement("strong"), meta = document.createElement("small");
    title.textContent = app.name || "APK";
    meta.textContent = [app.category,app.version,app.size].filter(Boolean).join(" · ");
    info.append(title,meta);
    const actions = document.createElement("div"); actions.className = "actions";
    const edit = document.createElement("button"); edit.type="button"; edit.className="secondary"; edit.textContent="Edit";
    edit.onclick = () => {
      editing = app.id;
      ["name","category","version","size","icon","download_url","description"].forEach(k => $(k).value = app[k] ?? "");
      $("formTitle").textContent="Edit APK"; $("saveBtn").textContent="Simpan Perubahan";
      $("cancelBtn").classList.remove("hidden"); msg("formStatus","Mengedit: "+app.name);
      window.scrollTo({top:0,behavior:"smooth"});
    };
    const del = document.createElement("button"); del.type="button"; del.className="danger"; del.textContent="Hapus";
    del.onclick = async () => {
      if (!confirm("Hapus APK ini secara permanen?")) return;
      try { if (!await getSession()) throw Error("Sesi admin berakhir. Silakan login ulang.");
        const {error} = await client.from("apps").delete().eq("id",app.id);
        if (error) throw error; await loadApps();
      } catch(e) { alert("Gagal menghapus APK: "+e.message); }
    };
    actions.append(edit,del); item.append(info,actions); root.append(item);
  });
}
async function loadNotices() {
  const root=$("noticeList"); root.textContent="Memuat notifikasi...";
  const {data,error}=await client.from("notifications").select("id,title,message,created_at").order("created_at",{ascending:false}).limit(100);
  if(error){root.textContent="Gagal memuat notifikasi: "+error.message;return;}
  root.replaceChildren();
  if(!data?.length){root.textContent="Belum ada notifikasi.";return;}
  data.forEach(n=>{
    const item=document.createElement("div");item.className="item";
    const info=document.createElement("div"),title=document.createElement("strong"),body=document.createElement("small");
    title.textContent=n.title||"Pengumuman";body.textContent=(n.message||"").slice(0,150);info.append(title,body);
    const del=document.createElement("button");del.type="button";del.className="danger";del.textContent="Hapus";
    del.onclick=async()=>{if(!confirm("Hapus notifikasi ini?"))return;const {error}=await client.from("notifications").delete().eq("id",n.id);if(error){alert(error.message);return;}await loadNotices();};
    item.append(info,del);root.append(item);
  });
}
async function loadAdmin(){await loadApps();await loadNotices();}
function resetForm(){editing=null;$("appForm").reset();$("formTitle").textContent="Tambah APK Baru";$("saveBtn").textContent="Simpan APK";$("cancelBtn").classList.add("hidden");}
async function init(){
  // Tampilkan form login lebih dulu; jangan biarkan kegagalan JS mengosongkan halaman.
  showLogin();
  $("loginForm").addEventListener("submit",async e=>{
    e.preventDefault();const btn=$("loginBtn");btn.disabled=true;msg("loginStatus","Menghubungkan ke Supabase...");
    try{
      if(!client)throw Error("Supabase belum terbaca. Periksa supabase.js dan koneksi internet.");
      const {error}=await client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
      if(error)throw error;showAdmin();msg("loginStatus","");await loadAdmin();
    }catch(err){showLogin();msg("loginStatus","Login gagal: "+err.message);}
    finally{btn.disabled=false;}
  });
  $("logout").addEventListener("click",async()=>{try{if(client)await client.auth.signOut();}finally{showLogin();msg("loginStatus","Kamu sudah keluar.");}});
  $("cancelBtn").addEventListener("click",()=>{resetForm();msg("formStatus","");});
  $("appForm").addEventListener("submit",async e=>{
    e.preventDefault();const btn=$("saveBtn");btn.disabled=true;
    try{
      if(!await getSession())throw Error("Sesi admin berakhir. Silakan login ulang.");
      const row={};["name","category","version","size","icon","download_url","description"].forEach(k=>row[k]=$(k).value.trim());
      if(!row.name||!validUrl(row.download_url))throw Error("Nama APK dan URL unduhan http/https yang valid wajib diisi.");
      if(row.icon&&!validUrl(row.icon))throw Error("URL ikon harus berupa http/https yang valid.");
      const result=editing!==null?await client.from("apps").update(row).eq("id",editing):await client.from("apps").insert([row]);
      if(result.error)throw result.error;
      msg("formStatus",editing!==null?"APK berhasil diperbarui.":"APK berhasil ditambahkan.");resetForm();await loadApps();
    }catch(err){msg("formStatus","Gagal: "+err.message);}finally{btn.disabled=false;}
  });
  $("noticeForm").addEventListener("submit",async e=>{
    e.preventDefault();const btn=$("noticeSave");btn.disabled=true;
    try{
      if(!await getSession())throw Error("Sesi admin berakhir. Silakan login ulang.");
      const title=$("noticeTitle").value.trim(),message=$("noticeMessage").value.trim();
      if(!title||!message)throw Error("Judul dan isi notifikasi wajib diisi.");
      const {error}=await client.from("notifications").insert([{title,message}]);if(error)throw error;
      msg("noticeStatus","Notifikasi berhasil diterbitkan.");$("noticeForm").reset();await loadNotices();
    }catch(err){msg("noticeStatus","Gagal: "+err.message);}finally{btn.disabled=false;}
  });
  client=window.supabaseClient||null;
  if(!client){msg("loginStatus","Form login tersedia, tetapi konfigurasi Supabase belum terbaca. Pastikan supabase.js ada di folder yang sama.");return;}
  try{if(await getSession()){showAdmin();await loadAdmin();}}
  catch(err){showLogin();msg("loginStatus","Koneksi Supabase bermasalah: "+err.message);}
}
document.addEventListener("DOMContentLoaded",init);
})();