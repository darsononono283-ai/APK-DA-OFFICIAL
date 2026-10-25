// Pemeriksaan terjadwal tautan unduhan melalui GitHub Actions (backend), bukan browser pengunjung.
// Required GitHub Actions secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Optional: table columns expected: apps.id, apps.name, apps.download_url
const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secrets.");
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const res = await fetch(`${base}/rest/v1/apps?select=id,name,download_url`, { headers });
if (!res.ok) {
  console.error(`Supabase read failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
const apps = await res.json();
const rows = apps.filter(a => typeof a.download_url === "string" && /^https?:\/\//i.test(a.download_url));
let dead = 0;
for (const app of rows) {
  let status = 0, ok = false, note = "";
  try {
    let r = await fetch(app.download_url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(12000) });
    status = r.status;
    // Some hosts reject HEAD, retry GET with range header.
    if ([403, 405, 501].includes(status)) {
      r = await fetch(app.download_url, { method: "GET", headers: { Range: "bytes=0-0" }, redirect: "follow", signal: AbortSignal.timeout(12000) });
      status = r.status;
    }
    ok = r.ok || status === 206;
    note = ok ? "OK" : `HTTP ${status}`;
  } catch (e) { note = e.name === "TimeoutError" ? "TIMEOUT" : String(e.message || e); }
  console.log(`${ok ? "OK" : "CHECK"} | ${app.name || app.id} | ${note} | ${app.download_url}`);
  if (!ok) dead++;
}
console.log(`Checked ${rows.length} links; ${dead} need review.`);
if (dead > 0) process.exitCode = 2;
