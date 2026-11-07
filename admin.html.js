"use strict";
const $=id=>document.getElementById(id),client=window.supabaseClient;
let editing=null,items=[];
function message(id,s){$(id).textContent=s}
function safeUrl(v){try{const u=new URL(v);return ["https:","http:"].includes(u.protocol)}catch{return false}}
async function session(){if(!client)return null;const {data,error}=await client.auth.getSession();if(error)throw error;return data.session}
function toggle(isAdmin){$("loginPanel").classList.toggle("hidden",isAdmin);$("adminArea").classList.toggle("hidden",!isAdmin)}
async function start(){try{toggle(Boolean(await session()));if(await session())await load()}catch(e){message("loginStatus",e.message)}}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginBtn").disabled=true;try{if(!client)throw Error("Konfigurasi Supabase tidak ditemukan.");const {error}=await client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error)throw error;toggle(true);await load()}catch(e){message("loginStatus",e.message)}finally{$("loginBtn").disabled=false}});
$("logout").addEventListener("click",async()=>{await client.auth.signOut();editing=null;toggle(false)});
async function load(){message("list","Memuat daftar APK...");const {data,error}=await client.from("apps").select("*").order("created_at",{ascending:false});if(error){message("list","Gagal memuat: "+error.message);return}items=data||[];render()}
function render(){const root=$("list");root.replaceChildren();if(!items.length){root.textContent="Belum ada APK.";return}for(const a of items){const el=document.createElement("div");el.className="item";const info=document.createElement("div");const strong=document.createElement("strong");strong.textContent=a.name||"APK";const small=document.createElement("small");small.textContent=[a.category,a.version,a.size].filter(Boolean).join(" · ");info.append(strong,small);const buttons=document.createElement("div");buttons.className="actions";const edit=document.createElement("button");edit.textContent="Edit";edit.className="secondary";edit.onclick=()=>editApp(a.id);const del=document.createElement("button");del.textContent="Hapus";del.className="danger";del.onclick=()=>deleteApp(a.id);buttons.append(edit,del);el.append(info,buttons);root.append(el)}}
function editApp(id){const a=items.find(x=>String(x.id)===String(id));if(!a)return;editing=a.id;for(const k of ["name","category","version","size","icon","download_url","description"]){$(k).value=a[k]??""}$("formTitle").textContent="Edit APK";$("saveBtn").textContent="Simpan Perubahan";$("cancelBtn").classList.remove("hidden");message("formStatus","Mengedit: "+a.name);window.scrollTo({top:0,behavior:"smooth"})}
function reset(){editing=null;$("appForm").reset();$("formTitle").textContent="Tambah APK Baru";$("saveBtn").textContent="Simpan APK";$("cancelBtn").classList.add("hidden")}
$("cancelBtn").addEventListener("click",()=>{reset();message("formStatus","")});
$("appForm").addEventListener("submit",async e=>{e.preventDefault();$("saveBtn").disabled=true;try{if(!await session())throw Error("Sesi admin berakhir. Silakan login ulang.");const a={};for(const k of ["name","category","version","size","icon","download_url","description"])a[k]=$(k).value.trim();if(!a.name||!safeUrl(a.download_url))throw Error("Nama APK dan URL unduhan http/https yang valid wajib diisi.");if(a.icon&&!safeUrl(a.icon))throw Error("URL ikon harus berupa http/https yang valid.");let result;if(editing!==null){result=await client.from("apps").update(a,{count:"exact"}).eq("id",editing);if(!result.error&&result.count===0)throw Error("Tidak ada data diperbarui. Periksa izin UPDATE/RLS di Supabase.")}else{result=await client.from("apps").insert([a])}if(result.error)throw result.error;message("formStatus",editing!==null?"APK berhasil diperbarui.":"APK berhasil ditambahkan.");reset();await load()}catch(e){message("formStatus","Gagal: "+e.message)}finally{$("saveBtn").disabled=false}});
async function deleteApp(id){if(!confirm("Hapus APK ini secara permanen?"))return;try{if(!await session())throw Error("Sesi admin berakhir.");const {error}=await client.from("apps").delete().eq("id",id);if(error)throw error;await load()}catch(e){alert("Gagal menghapus: "+e.message)}}


// Pengelolaan pengumuman pengunjung
async function loadNotices(){
 const root=$("noticeList");if(!root)return;root.textContent="Memuat notifikasi...";
 const {data,error}=await client.from("notifications").select("id,title,message,created_at").order("created_at",{ascending:false}).limit(100);
 if(error){root.textContent="Gagal memuat notifikasi: "+error.message;return}
 root.replaceChildren();
 if(!data?.length){root.textContent="Belum ada notifikasi.";return}
 data.forEach(n=>{
  const el=document.createElement("div");el.className="item";
  const info=document.createElement("div"),strong=document.createElement("strong"),small=document.createElement("small");
  strong.textContent=n.title||"Pengumuman";small.textContent=(n.message||"").slice(0,150);info.append(strong,small);
  const del=document.createElement("button");del.className="danger";del.textContent="Hapus";
  del.onclick=async()=>{if(!confirm("Hapus notifikasi ini?"))return;const {error}=await client.from("notifications").delete().eq("id",n.id);if(error){alert(error.message);return}loadNotices()};
  el.append(info,del);root.append(el);
 });
}
const noticeForm=$("noticeForm");
if(noticeForm)noticeForm.addEventListener("submit",async e=>{
 e.preventDefault();const btn=$("noticeSave");btn.disabled=true;
 try{
  if(!await session())throw Error("Sesi admin berakhir. Silakan login ulang.");
  const title=$("noticeTitle").value.trim(),messageText=$("noticeMessage").value.trim();
  if(!title||!messageText)throw Error("Judul dan isi notifikasi wajib diisi.");
  const {error}=await client.from("notifications").insert([{title,message:messageText}]);
  if(error)throw error;
  message("noticeStatus","Notifikasi berhasil diterbitkan.");noticeForm.reset();await loadNotices();
 }catch(e){message("noticeStatus","Gagal: "+e.message)}finally{btn.disabled=false}
});
const oldStart=start;
start=async function(){await oldStart();if(await session())await loadNotices()};
start();
