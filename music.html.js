
(()=>{const $=id=>document.getElementById(id),player=$("audioPlayer"),list=$("trackList"),status=$("playerStatus");let tracks=[],currentIndex=-1;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const safeUrl=v=>{try{const u=new URL(v);return ["http:","https:"].includes(u.protocol)?u.href:""}catch{return ""}};
function render(){const q=$("musicSearch").value.trim().toLowerCase();const filtered=tracks.map((t,i)=>({...t,_index:i})).filter(t=>(t.title+" "+(t.artist||"")).toLowerCase().includes(q));
if(!filtered.length){list.innerHTML='<div class="empty">'+(q?'Lagu tidak ditemukan.':'Belum ada lagu yang ditambahkan admin.')+'</div>';return}
list.innerHTML=filtered.map(t=>{const cover=safeUrl(t.cover_url)||"https://placehold.co/100x100?text=Music";return `<article class="track"><img class="cover" src="${esc(cover)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/100x100?text=Music'"><div class="track-info"><strong>${esc(t.title)}</strong><small>${esc(t.artist||"Artis tidak dicantumkan")}</small></div><button class="play" data-play="${t._index}" type="button"><i class="bi bi-play-fill"></i> Putar</button></article>`}).join("");
list.querySelectorAll("[data-play]").forEach(b=>b.addEventListener("click",()=>playTrack(Number(b.dataset.play))))}
function playTrack(i){const t=tracks[i];if(!t)return;const url=safeUrl(t.audio_url);if(!url){status.textContent="URL audio tidak valid.";return}currentIndex=i;player.src=url;player.style.display="block";$("nowTitle").textContent=t.title;$("nowArtist").textContent=t.artist||"Artis tidak dicantumkan";status.textContent="Siap memutar lagu.";player.play().catch(()=>status.textContent="Tekan tombol putar di pemutar audio.")}
player.addEventListener("ended",()=>{if(currentIndex>=0&&currentIndex+1<tracks.length)playTrack(currentIndex+1)});$("musicSearch").addEventListener("input",render);
async function loadTracks(){if(!window.supabaseClient){status.textContent="Supabase belum terhubung. Periksa supabase.js.";list.innerHTML='<div class="empty">Client Supabase tidak ditemukan.</div>';return}
const {data,error}=await window.supabaseClient.from("music_tracks").select("id,title,artist,audio_url,cover_url,created_at").order("created_at",{ascending:false});
if(error){status.textContent="Gagal memuat lagu. Periksa tabel music_tracks dan izin SELECT.";list.innerHTML='<div class="empty">'+esc(error.message)+'</div>';return}
tracks=data||[];status.textContent=tracks.length?"Pilih lagu dari daftar untuk memutar.":"Belum ada lagu di koleksi.";render()}loadTracks()})();
