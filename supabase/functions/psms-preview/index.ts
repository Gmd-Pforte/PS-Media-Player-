// @ts-nocheck
/* =====================================================================
   PS MUSIC STREAM – Edge Function "psms-preview"
   Erstellt Hörproben ausschließlich auf dem Server:
   - nur angemeldete, nicht gesperrte Künstler
   - nur für eigene Songs
   - schneidet höchstens 30 Sekunden aus der privaten MP3 (ganze Frames)
   - speichert im öffentlichen Bucket "ps-music-previews"
   - löscht die alte Hörprobe und verwaiste Dateien des Künstlers
   Aufruf: POST /functions/v1/psms-preview
     { "song_id": "<uuid>", "start": 45 }      → Hörprobe erstellen/ersetzen
     { "song_id": "<uuid>", "action": "delete" } → Hörprobe entfernen
   ===================================================================== */

const PREVIEW_LEN = 30;          // Sekunden (Obergrenze, wird serverseitig erzwungen)
const MAX_BYTES = 1363148;       // muss zum Bucket-Limit passen
const AUDIO_BUCKET = "ps-music-audio";
const PREVIEW_BUCKET = "ps-music-previews";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/* ---------- MP3-Frames ---------- */
const SR = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
const BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
export function parseFrames(u) {
  let p = 0;
  if (u[0] === 0x49 && u[1] === 0x44 && u[2] === 0x33) {
    const size = ((u[6] & 127) << 21) | ((u[7] & 127) << 14) | ((u[8] & 127) << 7) | (u[9] & 127);
    p = 10 + size + ((u[5] & 16) ? 10 : 0);
  }
  const frames = [];
  while (p + 4 <= u.length) {
    if (u[p] === 0xff && (u[p + 1] & 0xe0) === 0xe0) {
      const ver = (u[p + 1] >> 3) & 3, layer = (u[p + 1] >> 1) & 3, bri = (u[p + 2] >> 4) & 15, sri = (u[p + 2] >> 2) & 3, pad = (u[p + 2] >> 1) & 1;
      if (ver !== 1 && layer === 1 && bri > 0 && bri < 15 && sri < 3) {
        const br = (ver === 3 ? BR1 : BR2)[bri] * 1000, sr = SR[ver][sri], spf = ver === 3 ? 1152 : 576;
        const len = Math.floor(((ver === 3 ? 144 : 72) * br) / sr) + pad;
        if (len > 4 && p + len <= u.length) { frames.push({ off: p, len, dur: spf / sr }); p += len; continue; }
      }
    }
    p++;
  }
  if (frames.length) {
    const f = frames[0];
    const head = new TextDecoder("latin1").decode(u.subarray(f.off, f.off + Math.min(f.len, 200)));
    if (/Xing|Info|VBRI/.test(head)) frames.shift();
  }
  return { frames, total: frames.reduce((n, f) => n + f.dur, 0) };
}
export function cut(u, startSec) {
  const { frames, total } = parseFrames(u);
  if (frames.length < 50) throw new Error("MP3 konnte nicht gelesen werden");
  const maxStart = Math.max(0, total - PREVIEW_LEN);
  const wanted = Number.isFinite(startSec) ? startSec : Math.round(total * 0.3);
  const start = Math.max(0, Math.min(Math.floor(wanted), Math.floor(maxStart)));
  const parts = [];
  let t = 0, bytes = 0, len = 0;
  for (const f of frames) {
    if (t >= start) {
      if (len + f.dur > PREVIEW_LEN + 0.05 || bytes + f.len > MAX_BYTES) break;
      parts.push(u.subarray(f.off, f.off + f.len)); bytes += f.len; len += f.dur;
    }
    t += f.dur;
  }
  if (!parts.length) throw new Error("Für diese Stelle konnte keine Hörprobe erstellt werden");
  const out = new Uint8Array(bytes);
  let o = 0;
  for (const part of parts) { out.set(part, o); o += part.length; }
  return { bytes: out, start, length: len, total };
}

/* ---------- Server-Hilfen ---------- */
function env(name) {
  const v = typeof Deno !== "undefined" ? Deno.env.get(name) : globalThis.process?.env?.[name];
  if (!v) throw new Error("Server-Konfiguration fehlt: " + name);
  return v;
}
export async function handler(req) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Nur POST erlaubt" }, 405);
  try {
    const URL_ = env("SUPABASE_URL"), KEY = env("SUPABASE_SERVICE_ROLE_KEY");
    const svc = { apikey: KEY, Authorization: "Bearer " + KEY };
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Bitte anmelden" }, 401);

    // 1. Wer ruft auf?
    const who = await fetch(URL_ + "/auth/v1/user", { headers: { apikey: KEY, Authorization: "Bearer " + jwt } });
    if (!who.ok) return json({ error: "Sitzung abgelaufen – bitte erneut anmelden" }, 401);
    const user = await who.json();

    const body = await req.json().catch(() => ({}));
    const songId = String(body.song_id || "");
    if (!UUID.test(songId)) return json({ error: "Ungültige Song-ID" }, 400);

    // 2. Nicht gesperrter Künstler?
    const ar = await fetch(URL_ + "/rest/v1/psms_artists?select=user_id,suspended&user_id=eq." + encodeURIComponent(user.id), { headers: svc });
    const artist = ar.ok ? (await ar.json())[0] : null;
    if (!artist || artist.suspended) return json({ error: "Keine Künstlerberechtigung" }, 403);

    // 3. Eigener Song?
    const sr = await fetch(URL_ + "/rest/v1/psms_artist_songs?select=id,owner_id,audio_url,preview_url&id=eq." + encodeURIComponent(songId), { headers: svc });
    const song = sr.ok ? (await sr.json())[0] : null;
    if (!song) return json({ error: "Song nicht gefunden" }, 404);
    if (song.owner_id !== user.id) return json({ error: "Das ist nicht dein Song" }, 403);

    const prefixPublic = URL_ + "/storage/v1/object/public/" + PREVIEW_BUCKET + "/";
    const removeObjects = async (paths) => {
      const list = paths.filter(Boolean);
      if (!list.length) return;
      await fetch(URL_ + "/storage/v1/object/" + PREVIEW_BUCKET, { method: "DELETE", headers: { ...svc, "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: list }) }).catch(() => {});
    };
    const oldPath = song.preview_url?.startsWith(prefixPublic) ? song.preview_url.slice(prefixPublic.length) : null;
    const patchSong = (fields) =>
      fetch(URL_ + "/rest/v1/psms_artist_songs?id=eq." + encodeURIComponent(songId), { method: "PATCH", headers: { ...svc, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(fields) });

    // Hörprobe entfernen
    if (body.action === "delete") {
      const r = await patchSong({ preview_url: null, preview_start: null });
      if (!r.ok) return json({ error: "Hörprobe konnte nicht entfernt werden" }, 500);
      await removeObjects([oldPath]);
      return json({ ok: true, removed: true });
    }

    // 4. Volle MP3 aus dem privaten Speicher laden
    const audioPrefix = URL_ + "/storage/v1/object/public/" + AUDIO_BUCKET + "/";
    if (!song.audio_url?.startsWith(audioPrefix)) return json({ error: "Audioquelle wird nicht unterstützt" }, 400);
    const audioPath = decodeURIComponent(song.audio_url.slice(audioPrefix.length));
    if (!audioPath || audioPath.includes("..")) return json({ error: "Ungültige Audiodatei" }, 400);
    const dl = await fetch(URL_ + "/storage/v1/object/authenticated/" + AUDIO_BUCKET + "/" + audioPath.split("/").map(encodeURIComponent).join("/"), { headers: svc });
    if (!dl.ok) return json({ error: "Song konnte nicht geladen werden (" + dl.status + ")" }, 502);
    const full = new Uint8Array(await dl.arrayBuffer());

    // 5. Schneiden (Länge serverseitig erzwungen)
    const start = body.start === undefined || body.start === null ? undefined : Number(body.start);
    const c = cut(full, start);

    // 6. Speichern, Song aktualisieren, Altes aufräumen
    const newPath = user.id + "/" + songId + "-" + Date.now() + ".mp3";
    const up = await fetch(URL_ + "/storage/v1/object/" + PREVIEW_BUCKET + "/" + newPath, { method: "POST", headers: { ...svc, "Content-Type": "audio/mpeg", "x-upsert": "false", "cache-control": "31536000" }, body: c.bytes });
    if (!up.ok) return json({ error: "Hörprobe konnte nicht gespeichert werden (" + up.status + ")" }, 502);
    const previewUrl = prefixPublic + newPath;
    const pr = await patchSong({ preview_url: previewUrl, preview_start: c.start });
    if (!pr.ok) { await removeObjects([newPath]); return json({ error: "Hörprobe konnte dem Song nicht zugeordnet werden" }, 500); }
    const stale = [];
    if (oldPath && oldPath !== newPath) stale.push(oldPath);
    // verwaiste Dateien im Ordner des Künstlers (z. B. von gelöschten Songs)
    try {
      const ls = await fetch(URL_ + "/storage/v1/object/list/" + PREVIEW_BUCKET, { method: "POST", headers: { ...svc, "Content-Type": "application/json" }, body: JSON.stringify({ prefix: user.id + "/", limit: 1000 }) });
      const files = ls.ok ? await ls.json() : [];
      const own = await fetch(URL_ + "/rest/v1/psms_artist_songs?select=preview_url&owner_id=eq." + encodeURIComponent(user.id), { headers: svc });
      const used = new Set(((own.ok ? await own.json() : []) || []).map((r) => r.preview_url).filter(Boolean));
      for (const f of files || []) {
        const p = user.id + "/" + f.name;
        if (f.name && p !== newPath && !used.has(prefixPublic + p) && !stale.includes(p)) stale.push(p);
      }
    } catch (_) { /* Aufräumen ist optional */ }
    await removeObjects(stale);
    return json({ ok: true, preview_url: previewUrl, start: c.start, length: Math.round(c.length * 100) / 100, total: Math.round(c.total), cleaned: stale.length });
  } catch (e) {
    return json({ error: e?.message || "Unbekannter Fehler" }, 500);
  }
}

if (typeof Deno !== "undefined") Deno.serve(handler);
