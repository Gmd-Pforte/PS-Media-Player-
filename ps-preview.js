/* =====================================================================
   PS MUSIC STREAM – Hörproben (ps-preview.js)
   Schneidet aus einer MP3 einen ~30-Sekunden-Ausschnitt, ohne neu zu
   kodieren (ganze MP3-Frames), und speichert ihn öffentlich im Speicher
   "ps-music-previews". Der vollständige Song bleibt geschützt.
   ===================================================================== */
(()=>{'use strict';
const PREVIEW_LEN=30, MAX_BYTES=1363148, BUCKET='ps-music-previews';
const SR={3:[44100,48000,32000],2:[22050,24000,16000],0:[11025,12000,8000]};
const BR1=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320],BR2=[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];

/* MP3-Frames finden: [{off,len,dur}] */
function parseFrames(buf){
  const u=new Uint8Array(buf);let p=0;
  if(u[0]===0x49&&u[1]===0x44&&u[2]===0x33){const size=(u[6]&127)<<21|(u[7]&127)<<14|(u[8]&127)<<7|(u[9]&127);p=10+size+((u[5]&16)?10:0)}
  const frames=[];
  while(p+4<=u.length){
    if(u[p]===0xFF&&(u[p+1]&0xE0)===0xE0){
      const ver=(u[p+1]>>3)&3,layer=(u[p+1]>>1)&3,bri=(u[p+2]>>4)&15,sri=(u[p+2]>>2)&3,pad=(u[p+2]>>1)&1;
      if(ver!==1&&layer===1&&bri>0&&bri<15&&sri<3){
        const br=(ver===3?BR1:BR2)[bri]*1000,sr=SR[ver][sri],spf=ver===3?1152:576,len=Math.floor((ver===3?144:72)*br/sr)+pad;
        if(len>4&&p+len<=u.length){frames.push({off:p,len,dur:spf/sr});p+=len;continue}
      }
    }
    p++;
  }
  // Ersten Frame überspringen, wenn er nur Infos enthält (Xing/Info/VBRI) – sonst zeigt der Ausschnitt eine falsche Länge
  if(frames.length){const f=frames[0],s=new TextDecoder('latin1').decode(u.subarray(f.off,f.off+Math.min(f.len,200)));if(/Xing|Info|VBRI/.test(s))frames.shift()}
  return {u,frames,total:frames.reduce((n,f)=>n+f.dur,0)};
}
function defaultStart(total){return Math.max(0,Math.min(Math.floor(total-PREVIEW_LEN),Math.round(total*.3)))}
/* Ausschnitt ab startSec als MP3-Blob */
function cut(buf,startSec){
  const {u,frames,total}=parseFrames(buf);
  if(frames.length<50)throw Error('Die MP3-Datei konnte nicht gelesen werden.');
  const start=Math.max(0,Math.min(startSec??defaultStart(total),Math.max(0,total-PREVIEW_LEN)));
  const parts=[];let t=0,bytes=0,len=0;
  for(const f of frames){if(t>=start&&len<PREVIEW_LEN){if(bytes+f.len>MAX_BYTES)break;parts.push(u.subarray(f.off,f.off+f.len));bytes+=f.len;len+=f.dur}t+=f.dur;if(len>=PREVIEW_LEN)break}
  if(!parts.length)throw Error('Für diese Stelle konnte keine Hörprobe erstellt werden.');
  return {blob:new Blob(parts,{type:'audio/mpeg'}),start:Math.round(start),total,length:len};
}

/* ---------- Server ---------- */
let enabledPromise=null;
function enabled(){
  if(!enabledPromise)enabledPromise=fetch(API+'/rest/v1/psms_artist_songs?select=preview_url&limit=1',{headers:{apikey:ANON}}).then(r=>r.ok).catch(()=>false);
  return enabledPromise;
}
async function token(){
  const ss=typeof validListenerSession==='function'?await validListenerSession():null;
  if(!ss?.access_token)throw Error('Bitte erneut anmelden.');return ss.access_token;
}
let myId=null;
async function uid(tok){if(myId)return myId;const r=await fetch(API+'/auth/v1/user',{headers:{apikey:ANON,Authorization:'Bearer '+tok}});if(!r.ok)throw Error('Sitzung abgelaufen.');myId=(await r.json()).id;return myId}
async function save(songId,blob,start){
  if(!await enabled())throw Error('Hörproben sind in der Datenbank noch nicht eingerichtet.');
  const tok=await token(),me=await uid(tok),path=me+'/'+songId+'-'+Date.now()+'.mp3';
  const up=await fetch(API+'/storage/v1/object/'+BUCKET+'/'+path,{method:'POST',headers:{apikey:ANON,Authorization:'Bearer '+tok,'Content-Type':'audio/mpeg'},body:blob});
  if(!up.ok)throw Error('Hörprobe konnte nicht gespeichert werden ('+up.status+').');
  const url=API+'/storage/v1/object/public/'+BUCKET+'/'+path;
  const r=await fetch(API+'/rest/v1/psms_artist_songs?id=eq.'+encodeURIComponent(songId)+'&owner_id=eq.'+encodeURIComponent(me),{method:'PATCH',headers:{apikey:ANON,Authorization:'Bearer '+tok,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({preview_url:url,preview_start:start})});
  if(!r.ok)throw Error('Hörprobe konnte dem Song nicht zugeordnet werden.');
  return url;
}
/* Direkt beim Hochladen: aus der ausgewählten Datei */
async function fromFile(file,songId){if(!await enabled())return null;const c=cut(await file.arrayBuffer());return save(songId,c.blob,c.start)}

/* ---------- Editor: Stelle der Hörprobe wählen ---------- */
const fmt=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
async function openEditor(tracks){
  tracks=(tracks||[]).filter(t=>t?.id&&t.audio_url);if(!tracks.length)return alert('Keine Songs mit Audiodatei gefunden.');
  document.getElementById('psl-preview-editor')?.remove();
  const back=el('div','ps-release-editor-backdrop');back.id='psl-preview-editor';back.setAttribute('role','dialog');back.setAttribute('aria-modal','true');back.setAttribute('aria-label','Hörprobe festlegen');
  const panel=el('div','ps-release-editor-panel psl-pv');back.append(panel);
  const head=el('div','psl-pv-head');const h=el('h2',null,'🎧 Hörprobe festlegen');const x=el('button','psl-pv-x','✕');x.type='button';x.setAttribute('aria-label','Schließen');head.append(h,x);
  const hint=el('p',null,'Diese 30 Sekunden hören Leute, die deinen geteilten Song ohne Konto öffnen. Wähle am besten den Refrain.');
  const sel=el('select');tracks.forEach((t,i)=>{const o=el('option',null,(i+1)+'. '+t.title);o.value=t.id;sel.append(o)});
  const selWrap=el('label',null,'Song');selWrap.append(sel);if(tracks.length<2)selWrap.hidden=true;
  const stage=el('div','psl-pv-stage');const bars=el('div','psl-pv-bars');for(let i=0;i<60;i++)bars.append(el('i'));
  const win=el('div','psl-pv-win');stage.append(bars,win);
  const range=el('input');range.type='range';range.min='0';range.step='1';range.disabled=true;range.setAttribute('aria-label','Startpunkt der Hörprobe');
  const times=el('div','psl-pv-times');const tStart=el('strong',null,'0:00'),tTotal=el('span',null,'–');times.append(tStart,tTotal);
  const actions=el('div','psl-pv-actions');const play=el('button','btn secondary','▶ Probe anhören');play.type='button';const saveBtn=el('button','btn','Hörprobe speichern');saveBtn.type='button';actions.append(play,saveBtn);
  const status=el('p','psl-pv-status','Song wird geladen …');status.setAttribute('role','status');
  panel.append(head,hint,selWrap,stage,range,times,actions,status);document.body.append(back);
  let buf=null,total=0,audio=null,blobUrl=null,current=null;
  const stop=()=>{if(audio){audio.pause();audio=null}if(blobUrl){URL.revokeObjectURL(blobUrl);blobUrl=null}play.textContent='▶ Probe anhören';win.classList.remove('psl-playing')};
  const close=()=>{stop();back.remove()};x.onclick=close;back.addEventListener('click',e=>{if(e.target===back)close()});
  const paintWin=()=>{const s=Number(range.value);tStart.textContent='Start '+fmt(s)+' → '+fmt(Math.min(total,s+PREVIEW_LEN));win.style.left=(total?s/total*100:0)+'%';win.style.width=(total?Math.min(PREVIEW_LEN,total)/total*100:100)+'%'};
  range.oninput=()=>{stop();paintWin()};
  async function load(){
    stop();buf=null;range.disabled=true;play.disabled=saveBtn.disabled=true;status.textContent='Song wird geladen …';
    current=tracks.find(t=>t.id===sel.value)||tracks[0];
    if(!await enabled()){status.textContent='Hörproben sind noch nicht eingerichtet. Bitte zuerst den SQL-Schritt in Supabase ausführen und die Seite neu laden.';return}
    try{
      const src=typeof secureAudioUrl==='function'?await secureAudioUrl(current.audio_url):current.audio_url;
      const r=await fetch(src);if(!r.ok)throw Error('Song konnte nicht geladen werden.');buf=await r.arrayBuffer();
      const info=parseFrames(buf);total=info.total;if(info.frames.length<50)throw Error('Die MP3-Datei konnte nicht gelesen werden.');
      // grobe Lautstärke-Ansicht aus den Frame-Größen
      const n=bars.children.length,per=Math.ceil(info.frames.length/n);let mx=1;const vals=[];
      for(let i=0;i<n;i++){let s=0;for(const f of info.frames.slice(i*per,(i+1)*per))s+=f.len;vals.push(s);mx=Math.max(mx,s)}
      [...bars.children].forEach((b,i)=>b.style.height=(25+70*vals[i]/mx)+'%');
      range.max=String(Math.max(0,Math.floor(total-PREVIEW_LEN)));
      let start=current.preview_start;
      if(start==null){try{const q=await fetch(API+'/rest/v1/psms_artist_songs?select=preview_start&id=eq.'+encodeURIComponent(current.id),{headers:{apikey:ANON,Authorization:'Bearer '+await token()}});const row=q.ok?(await q.json())[0]:null;start=row?.preview_start}catch{}}
      range.value=String(start??defaultStart(total));tTotal.textContent='Länge '+fmt(total);paintWin();
      range.disabled=false;play.disabled=saveBtn.disabled=false;status.textContent=start!=null?'Gespeicherte Hörprobe geladen. Verschiebe den Regler, um eine andere Stelle zu wählen.':'Verschiebe den Regler zu deiner Lieblingsstelle.';
    }catch(e){status.textContent=e.message}
  }
  sel.onchange=load;
  play.onclick=()=>{if(audio){stop();return}try{const c=cut(buf,Number(range.value));blobUrl=URL.createObjectURL(c.blob);audio=new Audio(blobUrl);audio.onended=stop;audio.play().catch(()=>{});play.textContent='⏸ Stopp';win.classList.add('psl-playing')}catch(e){status.textContent=e.message}};
  saveBtn.onclick=async()=>{saveBtn.disabled=true;status.textContent='Hörprobe wird gespeichert …';try{const c=cut(buf,Number(range.value));await save(current.id,c.blob,c.start);current.preview_start=c.start;status.textContent='✓ Hörprobe gespeichert ('+fmt(c.start)+' bis '+fmt(c.start+c.length)+').'}catch(e){status.textContent=e.message}finally{saveBtn.disabled=false}};
  load();
}

window.psPreview={enabled,parseFrames,cut,defaultStart,save,fromFile,openEditor,PREVIEW_LEN};
})();
