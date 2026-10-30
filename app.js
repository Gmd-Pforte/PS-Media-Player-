const $=id=>document.getElementById(id);try{const fragment=new URLSearchParams(location.hash.slice(1));if(fragment.get('access_token')&&fragment.get('refresh_token')){const callbackSession={access_token:fragment.get('access_token'),refresh_token:fragment.get('refresh_token'),expires_at:Math.floor(Date.now()/1000)+Number(fragment.get('expires_in')||3600)};localStorage.setItem('psms_listener_session',JSON.stringify(callbackSession));history.replaceState({},'',location.pathname+location.search)}}catch(e){console.warn('Auth-Weiterleitung:',e)}let db={albums:[],singles:[]},artistProfiles=[];const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const uid=()=>globalThis.crypto?.randomUUID?.()||String(Date.now()+Math.random());const allSongs=()=>db.singles;function safeImg(u){try{const x=new URL(u);return x.protocol==='https:'?x.href:''}catch{return ''}}function cover(src){src=safeImg(src);return src?'<img class="cover" src="'+esc(src)+'" alt="Albumcover">':'<span class="cover">♫</span>'}function emitDownload(obj,name){const u=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}function readCover(file){return new Promise((resolve,reject)=>{if(!file)return resolve(null);if(!file.type.startsWith('image/'))return reject(Error('Bitte Bild wählen'));const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{const c=document.createElement('canvas'),scale=Math.min(1,480/Math.max(im.width,im.height));c.width=Math.max(1,im.width*scale|0);c.height=Math.max(1,im.height*scale|0);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',.7))};im.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Cover konnte nicht geladen werden'))};im.src=url})}
let catalogReady=false;let selected=null;const psViewKey='psms_listener_view';function saveListenerView(view,id){sessionStorage.setItem(psViewKey,JSON.stringify({view,id:id||null}))}
function songButton(s,n){const artist=artistProfiles.find(a=>a.artist_name===s.artist);const artwork=safeImg(s.cover_url)||safeImg(artist?.logo_url)||s.cover;return '<div class="ps-song-row"><button class="song" data-song="'+esc(s.key)+'">'+cover(artwork)+'<span class="info"><strong>'+esc((n?n+'. ':'')+s.title)+'</strong><small>'+esc(s.artist||'PS AI MUSIC')+'</small></span><span>▶</span></button><button class="btn secondary small ps-add-song" data-add="'+esc(s.key)+'" title="Zu Playlist hinzufügen">＋</button></div>'}
function renderArtists(q){const root=$('artists');if(!root)return;const items=artistProfiles.filter(a=>a.artist_name.toLowerCase().includes(q));root.innerHTML=items.map(a=>'<a class="artist-card" href="profile.html?id='+encodeURIComponent(a.user_id)+'"><div class="artist-photo">'+(safeImg(a.logo_url)?'<img src="'+esc(safeImg(a.logo_url))+'" alt="">':'<span>♫</span>')+'</div><strong>'+esc(a.artist_name)+'</strong><small>Zum Künstlerprofil ↗</small></a>').join('')||'<p class="empty">Noch keine Künstlerprofile vorhanden.</p>';}function render(){const q=($('q').value||'').toLowerCase().trim();renderArtists(q);const grouped=new Map();for(const t of db.singles){if(!t.album_title)continue;const key=t.artist+'::'+t.album_title;if(!grouped.has(key))grouped.set(key,{key,title:t.album_title,artist:t.artist,cover:t.cover_url,tracks:[]});grouped.get(key).tracks.push(t)}db.albums=[...grouped.values()].map(a=>({...a,tracks:a.tracks.sort((x,y)=>(x.track_position??999999)-(y.track_position??999999)||String(x.created_at||'').localeCompare(String(y.created_at||'')))}));renderFeatured(q);const albums=db.albums.filter(a=>(a.title+' '+a.artist).toLowerCase().includes(q));$('albums').innerHTML=albums.length?albums.map(a=>'<button class="tile" data-album="'+esc(a.key)+'">'+cover(a.cover)+'<strong>'+esc(a.title)+'</strong><small>'+a.tracks.length+' Titel · '+esc(a.artist)+'</small></button>').join(''):'<div class="empty">Noch keine Alben vorhanden.</div>';const tracks=allSongs().filter(s=>!s.album_title&&(s.title+' '+s.artist).toLowerCase().includes(q));$('songs').innerHTML=tracks.length?tracks.map(s=>songButton(s)).join(''):'<div class="empty">Noch keine Songs veröffentlicht.</div>';}
function renderFeatured(q){
 const area=$('featured-grid');if(!area)return;
 const singles=allSongs().filter(t=>!t.album_title).map(t=>({type:'single',title:t.title,artist:t.artist,art:t.cover_url,track:t}));
 const albums=db.albums.map(a=>({type:'album',title:a.title,artist:a.artist,art:a.cover,album:a}));
 const picks=[...albums,...singles].filter(t=>(t.title+' '+t.artist+(t.album?.tracks||[]).map(x=>' '+x.title).join('')).toLowerCase().includes(q)).slice(0,8);
 area.innerHTML=picks.length?picks.map(t=>{const a=artistProfiles.find(x=>x.artist_name===t.artist);const art=t.art||a?.logo_url;
 const destination=t.type==='album'?'data-album="'+esc(t.album.key)+'"':'data-song="'+esc(t.track.key)+'"';
 return '<button class="ps-feature-card" '+destination+'><div class="ps-feature-art">'+cover(art)+'<span class="ps-card-play">'+(t.type==='album'?'↗':'▶')+'</span></div><span class="ps-feature-label">'+(t.type==='album'?'ALBUM · '+t.album.tracks.length+' TITEL':'SINGLE')+'</span><strong>'+esc(t.title)+'</strong><small>'+esc(t.artist)+'</small></button>'}).join(''):'<p class="empty">Hier erscheinen neue Singles, Alben und EPs.</p>'
}
function showAlbum(id){const a=db.albums.find(a=>a.key===id);if(!a)return;selected=id;saveListenerView('album',id);$('homeview').classList.add('hidden');$('albumview').classList.remove('hidden');$('albumhead').innerHTML=cover(a.cover)+'<div><span class="eyebrow">Album</span><h1>'+esc(a.title)+'</h1><p>'+esc(a.artist)+' · '+a.tracks.length+' Songs</p>'+'</div>';$('albumtracks').innerHTML=a.tracks.map((t,i)=>songButton({...t,artist:a.artist,cover:a.cover},i+1)).join('')||'<div class="empty">Keine Songs</div>';const playAll=document.createElement('button');playAll.type='button';playAll.className='btn ps-play-release';playAll.textContent='▶ Veröffentlichung abspielen';playAll.onclick=()=>{const songs=a.tracks.filter(t=>t.audio_url);if(!songs.length)return alert('Keine abspielbaren Songs vorhanden.');currentQueue=songs;queueOriginal=[...songs];queueSource='album';playHistory=[];shuffle=false;$('ps-shuffle').classList.remove('active');renderQueue();playDirect(songs[0])};$('albumhead').append(playAll);$('albumtracks').onclick=e=>{if(e.target.closest('[data-song]')){currentQueue=a.tracks.filter(t=>t.audio_url);queueOriginal=[...currentQueue];queueSource='album';shuffle=false;$('ps-shuffle').classList.remove('active');renderQueue()}};scrollTo(0,0)}
$('back').onclick=()=>{saveListenerView('home');$('albumview').classList.add('hidden');$('homeview').classList.remove('hidden')};
document.addEventListener('click',e=>{const a=e.target.closest('[data-album]');if(a)showAlbum(a.dataset.album);const b=e.target.closest('[data-song]');if(b){const s=allSongs().find(x=>x.key===b.dataset.song);if(s){const album=db.albums.find(a=>a.tracks.some(t=>t.key===s.key));currentQueue=album?album.tracks.filter(t=>t.audio_url):allSongs().filter(x=>x.audio_url);if(currentQueue.length<2){currentQueue=allSongs().filter(x=>x.audio_url)}queueOriginal=[...currentQueue];queueSource=album?'album':'all';play(s)}}});$('q').oninput=()=>{render();psShowSearchSuggestions()};
function psShowSearchSuggestions(){
 const q=($('q').value||'').trim().toLocaleLowerCase('de');
 const wrap=$('q').closest('.ps-header-search');if(!wrap)return;
 let result=document.getElementById('ps-search-suggestions');
 if(!result){result=document.createElement('div');result.id='ps-search-suggestions';result.setAttribute('role','region');result.setAttribute('aria-label','Suchergebnisse');wrap.append(result)}
 result.replaceChildren();result.hidden=!q;if(!q)return;
 const artists=artistProfiles.filter(a=>(a.artist_name||'').toLocaleLowerCase('de').includes(q)).slice(0,8);
 const songs=allSongs().filter(t=>(t.title+' '+t.artist).toLocaleLowerCase('de').includes(q)).slice(0,7);
 const albums=db.albums.filter(a=>(a.title+' '+a.artist).toLocaleLowerCase('de').includes(q)).slice(0,5);
 const heading=(label)=>{const h=document.createElement('div');h.className='ps-search-suggestion-heading';h.textContent=label;result.append(h)};
 if(artists.length){heading('Künstler');for(const a of artists){const link=document.createElement('a');link.className='ps-search-suggestion-item';link.href='profile.html?id='+encodeURIComponent(a.user_id);link.textContent='♫  '+a.artist_name;result.append(link)}}
 if(albums.length){heading('Alben & EPs');for(const a of albums){const btn=document.createElement('button');btn.type='button';btn.className='ps-search-suggestion-item';btn.textContent='▣  '+a.title+' · '+a.artist;btn.onclick=()=>{result.hidden=true;const tile=[...document.querySelectorAll('[data-album]')].find(el=>el.getAttribute('data-album')===a.key);if(tile){tile.click()}else{$('open-home')?.click();setTimeout(()=>document.querySelector('[data-album="'+CSS.escape(a.key)+'"]')?.click(),100)}};result.append(btn)}}
 if(songs.length){heading('Songs');for(const t of songs){const btn=document.createElement('button');btn.type='button';btn.className='ps-search-suggestion-item';btn.textContent='♫  '+t.title+' · '+t.artist;btn.onclick=()=>{result.hidden=true;play(t)};result.append(btn)}}
 if(!artists.length&&!songs.length&&!albums.length){const p=document.createElement('p');p.className='ps-search-suggestion-empty';p.textContent='Keine passenden Künstler, Alben oder Songs gefunden.';result.append(p)}
}
$('q').addEventListener('keydown',e=>{if(e.key==='Escape'){const r=document.getElementById('ps-search-suggestions');if(r)r.hidden=true;$('q').blur()}});
document.addEventListener('click',e=>{if(!e.target.closest('.ps-header-search')){const r=document.getElementById('ps-search-suggestions');if(r)r.hidden=true}});

function play(s){if(!verifiedListener){location.href='listener.html';return}if(s.audio_url)playDirect(s)}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||!event.data||event.data.type!=='psms-profile-play')return;
 const profileFrame=document.querySelector('.ps-internal-profile iframe');
 if(!profileFrame||event.source!==profileFrame.contentWindow)return;
 const songId=event.data.songId;
 if(typeof songId!=='string'||!/^[a-f0-9-]{36}$/i.test(songId))return;
 const song=allSongs().find(t=>t.key===songId);
 if(!song||!verifiedListener)return;
 play(song);
 const player=$('player');
 if(player&&!player.classList.contains('expanded'))$('expand').click();
});$('expand').onclick=()=>{const yes=$('player').classList.toggle('expanded');document.body.classList.toggle('ps-full-player-open',yes);$('expand').textContent=yes?'⌄ Minimieren':'⤢ Vollplayer';$('expand').setAttribute('aria-label',yes?'Vollplayer minimieren':'Vollplayer öffnen')};$('close').onclick=()=>{stopDirect();$('player').hidden=true;$('player').classList.remove('expanded');document.body.classList.remove('ps-full-player-open')};render();
let psmsCatalogFingerprint='',psmsCatalogLoading=false;
async function psmsSyncCatalog(initial=false){
 if(psmsCatalogLoading||document.hidden&&!initial)return;psmsCatalogLoading=true;
 try{
 const [artists,profiles]=await Promise.all([
 request('psms_artist_songs?select=id,title,audio_url,cover_url,album_title,track_position,owner_id,created_at,psms_artists(artist_name)&hidden=eq.false&audio_url=not.is.null&order=created_at.desc'),
 request('psms_artists?select=user_id,artist_name,logo_url,banner_url,bio&order=created_at.desc')
 ]);
 const fingerprint=JSON.stringify([artists,profiles]);
 if(initial||fingerprint!==psmsCatalogFingerprint){
 psmsCatalogFingerprint=fingerprint;artistProfiles=profiles||[];
 db={albums:[],singles:(artists||[]).map(t=>({key:t.id,title:t.title,artist:t.psms_artists?.artist_name||'Künstler',audio_url:t.audio_url,cover_url:t.cover_url,album_title:t.album_title,track_position:t.track_position,created_at:t.created_at}))};
 catalogReady=true;render();psShowSearchSuggestions();
 if(verifiedListener){const stored=JSON.parse(sessionStorage.getItem(psViewKey)||'null');if(initial)restoreListenerView();else if(stored?.view==='album'&&stored.id&&db.albums.some(a=>a.key===stored.id)){const y=window.scrollY;showAlbum(stored.id);window.scrollTo(0,y)}loadEditorialSpotlight()}
 }
 }catch(err){console.warn('Musikkatalog-Synchronisierung:',err);if(initial&&!catalogReady)$('songs').textContent='Musikbibliothek vorübergehend nicht erreichbar.'}
 finally{psmsCatalogLoading=false}
}
psmsSyncCatalog(true);
setInterval(()=>psmsSyncCatalog(),20000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)psmsSyncCatalog()});
window.addEventListener('pageshow',()=>psmsSyncCatalog());

let verifiedListener=null;let streamSequence=0;let streamReported=false;let streamPending=false;let streamSongId=null;let listenedSeconds=0;let lastPlayhead=null;
const audio=$('ps-audio');let queueSource='all';let queueOriginal=[];let directSong=null;let repeatOne=false;let repeatMode=0;let previousVolume=.8;let currentQueue=[];let playHistory=[];let playlists=[];let shuffle=false;audio.volume=.8;
function stopDirect(){++streamSequence;audio.pause();audio.removeAttribute('src');audio.load();directSong=null}
function formatTime(n){if(!Number.isFinite(n))return '0:00';return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0')}
function linkPlayerArtist(song){
 const artist=artistProfiles.find(a=>a.artist_name===song.artist);
 for(const id of ['partist','ps-artist-large']){
  const el=$(id);if(!el)continue;
  el.textContent=song.artist||'Künstler';
  if(!artist?.user_id)continue;
  el.style.cursor='pointer';
  el.style.textDecoration='underline';
  el.style.textUnderlineOffset='3px';
  el.setAttribute('role','link');el.setAttribute('tabindex','0');
  el.setAttribute('aria-label','Künstlerprofil von '+song.artist+' öffnen');
  const go=e=>{e?.stopPropagation();const url='profile.html?id='+encodeURIComponent(artist.user_id);const a=document.createElement('a');a.href=url;a.style.display='none';document.body.append(a);a.click();a.remove()};
  el.onclick=go;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go(e)}};
 }
}

async function playDirect(song){
 if(!song.audio_url)return;
 if(!verifiedListener){location.href='listener.html';return}
 if(!/^https:\/\//i.test(song.audio_url))return alert('Ungültige Audio-Adresse.');
 
 $('ps-audio-panel').classList.remove('hidden');$('player').hidden=false;if(!currentQueue.length){currentQueue=allSongs().filter(x=>x.audio_url);queueOriginal=[...currentQueue];queueSource='all'}
 $('ptitle').textContent=song.title;$('partist').textContent=song.artist||'Künstler';
 const artwork=song.cover_url||artistProfiles.find(a=>a.artist_name===song.artist)?.logo_url||song.cover;
 $('pcover').innerHTML=cover(artwork);$('ps-cover-large').innerHTML=cover(artwork);$('ps-title-large').textContent=song.title;$('ps-artist-large').textContent=song.artist||'Künstler';linkPlayerArtist(song);$('player').style.setProperty('--song-cover',safeImg(artwork)?'url("'+safeImg(artwork)+'")':'none');
 if(directSong?.key!==song.key)playHistory.push(song.key);directSong=song;renderQueue();refreshReactions(song.key);streamSongId=song.key;streamReported=false;streamPending=false;listenedSeconds=0;lastPlayhead=null;const thisSequence=++streamSequence;const url=await secureAudioUrl(song.audio_url).catch(e=>{$('ps-audio-status').textContent=e.message;return null});if(!url||thisSequence!==streamSequence)return;audio.src=url;audio.load();
 $('ps-audio-status').textContent='';
 audio.play().catch(()=>{$('ps-audio-status').textContent='Zum Starten bitte ▶ tippen.'});
 // Größe des Players beim Songwechsel beibehalten.
}
function adjacent(dir){
 const tracks=currentQueue.length?currentQueue:allSongs().filter(x=>x.audio_url);
 if(!tracks.length)return;
 const i=tracks.findIndex(x=>x.key===directSong?.key);if(i<0){if(dir>0)playDirect(tracks[0]);return}if(dir<0&&playHistory.length>1){playHistory.pop();const previous=playHistory.pop();const old=tracks.find(x=>x.key===previous);if(old){playDirect(old);return}}
 if(dir>0&&i===tracks.length-1&&repeatMode===0){if(tracks.length===1){const library=allSongs().filter(x=>x.audio_url&&x.key!==directSong?.key);if(library.length){currentQueue=[directSong,...library];queueOriginal=[...currentQueue];queueSource='all';playDirect(library[0]);return}audio.pause();return}playDirect(tracks[0]);return}playDirect(tracks[(i+dir+tracks.length)%tracks.length]);
}
$('ps-play').onclick=()=>audio.paused?audio.play().catch(e=>$('ps-audio-status').textContent=e.message):audio.pause();
$('ps-prev').onclick=()=>adjacent(-1);$('ps-next').onclick=()=>adjacent(1);$('ps-mini-prev').onclick=()=>adjacent(-1);$('ps-mini-next').onclick=()=>adjacent(1);$('ps-mini-play').onclick=()=>$('ps-play').click();
$('ps-loop').onclick=()=>{repeatMode=(repeatMode+1)%3;repeatOne=repeatMode===2;audio.loop=repeatOne;$('ps-loop').textContent=['🔁 Aus','🔁 Alle','🔂 Eins'][repeatMode];$('ps-loop').title=['Wiederholung aus','Warteschlange wiederholen','Titel wiederholen'][repeatMode];$('ps-loop').classList.toggle('active',repeatMode!==0)};
$('ps-volume').oninput=e=>audio.volume=Number(e.target.value)/100;
audio.ontimeupdate=()=>{const ratio=Number.isFinite(audio.duration)&&audio.duration>0?audio.currentTime/audio.duration:0;$('ps-mini-progress-fill').style.width=Math.min(100,100*ratio)+'%';miniSeek.setAttribute('aria-valuenow',String(Math.round(Math.min(100,100*ratio))));if(lastPlayhead!==null&&!audio.paused){const delta=audio.currentTime-lastPlayhead;if(delta>0&&delta<2.5)listenedSeconds+=delta}lastPlayhead=audio.currentTime;if(!streamReported&&!streamPending&&directSong&&streamSongId===directSong.key&&listenedSeconds>=30){const id=directSong.key;streamPending=true;recordStream(id).then(()=>{if(streamSongId===id){streamReported=true;$('ps-audio-status').textContent='✓ Wiedergabe für die Statistik erfasst.'}}).catch(e=>{if(streamSongId===id){$('ps-audio-status').textContent='Stream-Statistik: '+e.message;console.warn('Streamzählung:',e)}}).finally(()=>{if(streamSongId===id)streamPending=false})}$('ps-time').textContent=formatTime(audio.currentTime);if(Number.isFinite(audio.duration)&&audio.duration>0)$('ps-seek').value=Math.round(audio.currentTime/audio.duration*100)};
audio.onloadedmetadata=()=>{$('ps-duration').textContent=formatTime(audio.duration)};audio.onwaiting=()=>{$('ps-audio-status').textContent='Audio wird geladen …'};audio.onplaying=()=>{$('ps-audio-status').textContent=''};
audio.onplay=()=>{$('ps-play').textContent='⏸';$('ps-mini-play').textContent='⏸'};audio.onpause=()=>{$('ps-play').textContent='▶';$('ps-mini-play').textContent='▶'};
audio.onended=()=>{if(!repeatOne)adjacent(1)};
audio.onerror=()=>{$('ps-audio-status').textContent='Audiodatei konnte nicht geladen werden. Bitte erneut versuchen oder einen anderen Titel wählen.'};
$('ps-seek').oninput=e=>{if(Number.isFinite(audio.duration))audio.currentTime=Number(e.target.value)/100*audio.duration};

const psReactions=[['heart','❤️','Gefällt mir'],['fire','🔥','Stark']];
let reactionCurrentSong=null,reactionMyId=null,reactionBusy=false;
function reactionStatus(message){const el=$('ps-reaction-status');if(el)el.textContent=message}
async function reactionSession(){
const ss=await validListenerSession();
if(!ss?.access_token)throw Error('Bitte zuerst als Hörer anmelden.');
if(!reactionMyId){
 const r=await fetch(API+'/auth/v1/user',{headers:{apikey:ANON,Authorization:'Bearer '+ss.access_token}});
 if(!r.ok)throw Error('Bitte melde dich erneut an.');
 const u=await r.json();reactionMyId=u.id;
}
return ss;
}
async function reactionApi(path,options={}){
 const ss=await reactionSession();
 const r=await fetch(API+'/rest/v1/'+path,{...options,headers:{apikey:ANON,Authorization:'Bearer '+ss.access_token,'Content-Type':'application/json',...options.headers}});
 if(!r.ok)throw Error('Reaktion konnte nicht gespeichert werden.');
 const result=await r.text();return result?JSON.parse(result):null;
}
async function refreshReactions(songId){
 reactionCurrentSong=songId;reactionStatus('Reaktionen werden geladen …');
 try{
  const records=await reactionApi('psms_song_reactions?select=user_id,reaction&song_id=eq.'+encodeURIComponent(songId));
  if(reactionCurrentSong!==songId)return;
  const counts=Object.fromEntries(psReactions.map(r=>[r[0],0]));
  for(const vote of records||[])if(Object.hasOwn(counts,vote.reaction))counts[vote.reaction]++;
  const mine=(records||[]).find(v=>v.user_id===reactionMyId)?.reaction||'';
  const root=$('ps-reaction-buttons');root.replaceChildren();
  for(const [key,emoji,label] of psReactions){
   const btn=document.createElement('button');btn.type='button';btn.className='btn secondary small ps-reaction-btn'+(mine===key?' selected':'');
   btn.textContent=emoji+' '+counts[key];btn.title=label;btn.setAttribute('aria-label',label+': '+counts[key]);btn.setAttribute('aria-pressed',String(mine===key));
   btn.onclick=()=>setSongReaction(songId,mine===key?null:key);root.append(btn);
  }
  reactionStatus(mine?'Deine Reaktion ist gespeichert. Nochmals tippen zum Entfernen.':'Tippe auf eine Reaktion.');
 }catch(e){if(reactionCurrentSong===songId)reactionStatus(e.message)}
}
async function setSongReaction(songId,reaction){
 if(reactionBusy)return;reactionBusy=true;reactionStatus('Wird gespeichert …');
 for(const b of $('ps-reaction-buttons').querySelectorAll('button'))b.disabled=true;
 try{
  if(reaction===null){await reactionApi('psms_song_reactions?song_id=eq.'+encodeURIComponent(songId)+'&user_id=eq.'+encodeURIComponent(reactionMyId),{method:'DELETE'});}
  else{await reactionApi('psms_song_reactions?on_conflict=song_id,user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({song_id:songId,user_id:reactionMyId,reaction})});}
  await refreshReactions(songId);
 }catch(e){reactionStatus(e.message)}finally{reactionBusy=false;for(const b of $('ps-reaction-buttons').querySelectorAll('button'))b.disabled=false}
}
function listenerSession(){try{return JSON.parse(localStorage.getItem('psms_listener_session')||'null')}catch{return null}}
async function validListenerSession(){let ss=listenerSession();if(!ss?.access_token)return null;const exp=ss.expires_at||((ss.expires_in&&ss.issued_at)?ss.issued_at+ss.expires_in:0);if(exp&&exp>Date.now()/1000+60)return ss;if(!ss.refresh_token)return ss;const r=await fetch(API+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:HEAD,body:JSON.stringify({refresh_token:ss.refresh_token})});if(!r.ok)throw Error('Deine Anmeldung ist abgelaufen. Bitte erneut anmelden.');const next=await r.json();ss={...ss,...next,expires_at:Math.floor(Date.now()/1000)+(next.expires_in||3600)};localStorage.setItem('psms_listener_session',JSON.stringify(ss));return ss}
async function listenerRequest(path,options={}){const ss=await validListenerSession();if(!ss?.access_token)throw Error('Bitte zuerst als Hörer anmelden.');const r=await fetch(API+'/rest/v1/'+path,{...options,headers:{apikey:ANON,Authorization:'Bearer '+ss.access_token,'Content-Type':'application/json',...options.headers}});if(!r.ok)throw Error('Playlist konnte nicht gespeichert werden: '+(await r.text()).slice(0,180));const body=await r.text();if(!body.trim())return null;try{return JSON.parse(body)}catch{throw Error('Ungültige Antwort vom Playlist-Server. Bitte erneut versuchen.')}}
let activePlaylistId=null;
function showPlaylistLibrary(){ saveListenerView('playlists');$('homeview').classList.add('hidden');$('albumview').classList.add('hidden');$('playlistview').classList.remove('hidden');$('pl-detail').classList.add('hidden');$('pl-list').classList.remove('hidden');refreshPlaylists();window.scrollTo(0,0)}
function hidePlaylistLibrary(){ saveListenerView('home');$('playlistview').classList.add('hidden');$('albumview').classList.add('hidden');$('homeview').classList.remove('hidden');window.scrollTo(0,0)}
async function refreshPlaylists(){
const box=$('pl-list');box.replaceChildren();if(!listenerSession()?.access_token){$('pl-status').textContent='Melde dich als Hörer an, um deine Playlists zu sehen.';const a=document.createElement('a');a.href='listener.html';a.className='btn';a.textContent='Jetzt anmelden →';box.append(a);return}
try{playlists=await listenerRequest('psms_playlists?select=id,name&order=created_at.desc');$('pl-status').textContent=playlists.length?playlists.length+' persönliche Playlists':'Erstelle deine erste Playlist und füge deine Lieblingssongs hinzu.';
for(const p of playlists){const card=document.createElement('div');card.className='ps-pl-card';const icon=document.createElement('div');icon.className='ps-pl-art';icon.textContent='♫';const info=document.createElement('div');info.className='ps-pl-info';const title=document.createElement('strong');title.textContent=p.name;const sub=document.createElement('small');sub.textContent='Eigene Playlist';info.append(title,sub);const open=document.createElement('button');open.className='btn';open.textContent='Öffnen →';open.onclick=()=>openPlaylistDetail(p);const del=document.createElement('button');del.className='btn secondary small';del.textContent='Löschen';del.onclick=async()=>{if(!confirm('Playlist „'+p.name+'“ wirklich löschen?'))return;try{await listenerRequest('psms_playlists?id=eq.'+encodeURIComponent(p.id),{method:'DELETE'});await refreshPlaylists()}catch(e){$('pl-status').textContent=e.message}};card.append(icon,info,open,del);box.append(card)}}
catch(e){$('pl-status').textContent=e.message+' – Bitte gegebenenfalls erneut anmelden.'}}
async function openPlaylistDetail(p){
activePlaylistId=p.id;saveListenerView('playlist',p.id);$('pl-list').classList.add('hidden');$('pl-detail').classList.remove('hidden');
const header=$('pl-detail-header'),root=$('pl-detail-tracks');header.replaceChildren();root.replaceChildren();
const title=document.createElement('h2');title.textContent=p.name;header.append(title);$('pl-status').textContent='Songs werden geladen …';
try{
const items=await listenerRequest('psms_playlist_items?select=id,song_id,position,created_at&playlist_id=eq.'+encodeURIComponent(p.id)+'&order=position.asc,created_at.asc');
const valid=items.map(item=>({item,song:allSongs().find(t=>t.key===item.song_id)}));
const playAll=document.createElement('button');playAll.className='btn';playAll.textContent='▶ Alle abspielen';playAll.disabled=!valid.some(t=>t.song);playAll.onclick=()=>playPlaylist(p.id);header.append(playAll);
$('pl-status').textContent=items.length+' Songs in „'+p.name+'“';
if(!items.length){root.textContent='Noch keine Songs. Über das ＋ neben einem Song kannst du Musik hinzufügen.';return}
for(const {item,song} of valid){const row=document.createElement('div');row.className='ps-pl-track';
const artwork=document.createElement('div');artwork.className='ps-pl-track-cover';const src=song?.cover_url||artistProfiles.find(a=>a.artist_name===song?.artist)?.logo_url;if(src&&safeImg(src)){const img=document.createElement('img');img.src=safeImg(src);img.alt='Cover';artwork.append(img)}else artwork.textContent='♫';
const info=document.createElement('div');info.className='ps-pl-track-info';const title=document.createElement('strong');title.textContent=song?.title||'Nicht mehr verfügbar';const subtitle=document.createElement('small');subtitle.textContent=song?.artist||'Titel nicht verfügbar';info.append(title,subtitle);
const play=document.createElement('button');play.className='btn secondary small';play.textContent='▶';play.disabled=!song;play.onclick=()=>{currentQueue=valid.map(v=>v.song).filter(Boolean);queueOriginal=[...currentQueue];queueSource='playlist';shuffle=false;$('ps-shuffle').classList.remove('active');playHistory=[];renderQueue();playDirect(song)};
const remove=document.createElement('button');remove.className='btn secondary small';remove.textContent='Entfernen';remove.onclick=async()=>{try{await listenerRequest('psms_playlist_items?id=eq.'+encodeURIComponent(item.id),{method:'DELETE'});await openPlaylistDetail(p)}catch(e){$('pl-status').textContent=e.message}};
row.append(artwork,info,play,remove);root.append(row)}}
catch(e){$('pl-status').textContent=e.message}}
async function getListenerUserId(){const ss=await validListenerSession();if(!ss)throw Error('Bitte anmelden.');const r=await fetch(API+'/auth/v1/user',{headers:{apikey:ANON,Authorization:'Bearer '+ss.access_token}});if(!r.ok)throw Error('Bitte erneut anmelden.');const data=await r.json();return data.id}

let pendingPlaylistSong=null;
function togglePlaylistForm(show){$('pl-create-form').classList.toggle('hidden',!show);if(show){$('pl-create-name').focus();$('pl-create-feedback').textContent=''}}
async function saveNewPlaylist(name){const cleaned=name.trim().slice(0,100);if(!cleaned)throw Error('Bitte einen Namen eingeben.');await listenerRequest('psms_playlists',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({name:cleaned,owner_id:await getListenerUserId()})});await refreshPlaylists();return playlists.find(p=>p.name===cleaned)}
function newPlaylist(){togglePlaylistForm(true);if($('playlistview').classList.contains('hidden'))showPlaylistLibrary();togglePlaylistForm(true)}
$('pl-create-form').onsubmit=async e=>{e.preventDefault();const btn=$('pl-create-form').querySelector('[type=submit]');btn.disabled=true;try{const p=await saveNewPlaylist($('pl-create-name').value);$('pl-create-name').value='';togglePlaylistForm(false);$('pl-status').textContent='Playlist erstellt!';if(p&&pendingPlaylistSong){const song=pendingPlaylistSong;pendingPlaylistSong=null;await addToPlaylist(song)}}catch(err){$('pl-create-feedback').textContent=err.message}finally{btn.disabled=false}};
$('pl-create-cancel').onclick=()=>togglePlaylistForm(false);
function closePlaylistSelect(){ $('pl-add-backdrop').classList.add('hidden');pendingPlaylistSong=null }
$('pl-add-close').onclick=closePlaylistSelect;
$('pl-add-backdrop').onclick=e=>{if(e.target===$('pl-add-backdrop'))closePlaylistSelect()};
$('pl-add-new').onclick=()=>{$('pl-add-backdrop').classList.add('hidden');showPlaylistLibrary();togglePlaylistForm(true)};
$('pl-add-confirm').onclick=async()=>{
 const id=$('pl-add-select').value,song=pendingPlaylistSong;if(!id||!song)return;
 const btn=$('pl-add-confirm');btn.disabled=true;
 const name=playlists.find(p=>p.id===id)?.name||'Playlist';
 try{
  await listenerRequest('psms_playlist_items',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({playlist_id:id,song_id:song.key})});
  closePlaylistSelect();$('pl-status').textContent='✓ „'+song.title+'“ wurde zu „'+name+'“ hinzugefügt.';
 }catch(err){
  const message=String(err?.message||err);let confirmed=false;
  if(/Unexpected end of JSON input|Ungültige Antwort vom Playlist-Server/i.test(message)){
   try{const saved=await listenerRequest('psms_playlist_items?select=id&playlist_id=eq.'+encodeURIComponent(id)+'&song_id=eq.'+encodeURIComponent(song.key)+'&limit=1');confirmed=Array.isArray(saved)&&saved.length>0}catch(e){}
  }
  if(confirmed){closePlaylistSelect();$('pl-status').textContent='✓ „'+song.title+'“ wurde zu „'+name+'“ hinzugefügt.'}
  else $('pl-add-status').textContent=/Unexpected end of JSON input|Ungültige Antwort vom Playlist-Server/i.test(message)?'Hinzufügen konnte nicht bestätigt werden. Bitte prüfe die Playlist.':message;
 }finally{btn.disabled=false}
};
async function addToPlaylist(song){if(!song?.audio_url)return;pendingPlaylistSong=song;try{const data=await listenerRequest('psms_playlists?select=id,name&order=created_at.desc');playlists=data||[];const sel=$('pl-add-select');sel.replaceChildren();for(const p of playlists){const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.name;sel.append(opt)}$('pl-add-track').textContent='Song: '+song.title+' · '+(song.artist||'Künstler');$('pl-add-status').textContent=playlists.length?'':'Du hast noch keine Playlist. Erstelle zuerst eine neue.';$('pl-add-confirm').disabled=!playlists.length;$('pl-add-backdrop').classList.remove('hidden')}catch(err){$('pl-status').textContent=err.message;showPlaylistLibrary()}}
async function playPlaylist(id){try{const items=await listenerRequest('psms_playlist_items?select=song_id,position&playlist_id=eq.'+id+'&order=position.asc,created_at.asc');const songs=items.map(item=>allSongs().find(s=>s.key===item.song_id)).filter(Boolean);if(!songs.length){$('pl-status').textContent='Diese Playlist enthält noch keine verfügbaren Songs.';return}currentQueue=songs;queueOriginal=[...songs];queueSource='playlist';shuffle=false;$('ps-shuffle').classList.remove('active');playHistory=[];renderQueue();playDirect(songs[0]);$('pl-status').textContent='Playlist wird abgespielt.'}catch(e){$('pl-status').textContent=e.message}}
$('open-home').onclick=()=>{saveListenerView('home');hidePlaylistLibrary();$('playlistview').classList.add('hidden');$('albumview').classList.add('hidden');$('homeview').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})};$('pl-new').onclick=newPlaylist;$('open-playlists').onclick=showPlaylistLibrary;$('pl-back').onclick=hidePlaylistLibrary;$('pl-detail-back').onclick=()=>{$('pl-detail').classList.add('hidden');$('pl-list').classList.remove('hidden');activePlaylistId=null;saveListenerView('playlists');refreshPlaylists()};$('ps-add-playlist').onclick=()=>addToPlaylist(directSong);
document.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(b)addToPlaylist(allSongs().find(s=>s.key===b.dataset.add))});
$('ps-shuffle').onclick=()=>{shuffle=!shuffle;$('ps-shuffle').classList.toggle('active',shuffle);if(shuffle){const remaining=(queueOriginal.length?queueOriginal:currentQueue.length?currentQueue:allSongs().filter(s=>s.audio_url)).filter(s=>s.audio_url&&s.key!==directSong?.key);for(let i=remaining.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[remaining[i],remaining[j]]=[remaining[j],remaining[i]]}currentQueue=directSong?[directSong,...remaining]:remaining}else currentQueue=queueOriginal.length?[...queueOriginal]:allSongs().filter(s=>s.audio_url);renderQueue()};

const miniSeek=$('ps-mini-progress');miniSeek.setAttribute('role','slider');miniSeek.setAttribute('tabindex','0');miniSeek.setAttribute('aria-label','Wiedergabeposition');miniSeek.setAttribute('aria-valuemin','0');miniSeek.setAttribute('aria-valuemax','100');let miniSeeking=false;function seekMiniAt(clientX){if(!Number.isFinite(audio.duration)||audio.duration<=0)return;const rect=miniSeek.getBoundingClientRect();if(!rect.width)return;const position=Math.max(0,Math.min(1,(clientX-rect.left)/rect.width));audio.currentTime=position*audio.duration;$('ps-mini-progress-fill').style.width=position*100+'%';miniSeek.setAttribute('aria-valuenow',String(Math.round(position*100)))}miniSeek.addEventListener('pointerdown',e=>{if(!Number.isFinite(audio.duration)||audio.duration<=0)return;miniSeeking=true;miniSeek.setPointerCapture?.(e.pointerId);seekMiniAt(e.clientX)});miniSeek.addEventListener('pointermove',e=>{if(miniSeeking)seekMiniAt(e.clientX)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])miniSeek.addEventListener(ev,()=>{miniSeeking=false});miniSeek.addEventListener('keydown',e=>{if(!Number.isFinite(audio.duration)||audio.duration<=0)return;const delta=e.key==='ArrowRight'?5:e.key==='ArrowLeft'?-5:0;if(delta){e.preventDefault();audio.currentTime=Math.max(0,Math.min(audio.duration,audio.currentTime+delta))}});
function renderQueue(){const root=$('ps-queue-list');if(!root)return;root.replaceChildren();for(const song of currentQueue){const button=document.createElement('button');button.type='button';button.className='ps-queue-entry'+(directSong?.key===song.key?' active':'');button.textContent=(directSong?.key===song.key?'▶ ':'♫ ')+song.title+' – '+(song.artist||'Künstler');button.onclick=()=>playDirect(song);root.append(button)}if(!currentQueue.length)root.textContent='Keine Titel in der Warteschlange.'}
$('ps-queue-toggle').onclick=()=>{const panel=$('ps-queue-panel');panel.classList.toggle('hidden');$('ps-queue-toggle').setAttribute('aria-expanded',String(!panel.classList.contains('hidden')));renderQueue()};
$('ps-mute').onclick=()=>{if(audio.muted||audio.volume===0){audio.muted=false;audio.volume=previousVolume||.8;$('ps-volume').value=Math.round(audio.volume*100);$('ps-mute').textContent='🔊'}else{previousVolume=audio.volume;audio.muted=true;$('ps-mute').textContent='🔇'}};
function renderSession(){const el=$('listener-session');if(!el)return;const ss=listenerSession();el.replaceChildren();if(!ss?.access_token){const a=document.createElement('a');a.href='listener.html';a.className='btn secondary small';a.textContent='👤 Anmelden / Registrieren';el.append(a);return}const a=document.createElement('a');a.href='listener.html';a.className='btn secondary small';a.textContent='👤 Mein Konto';const b=document.createElement('button');b.className='btn secondary small';b.textContent='Abmelden';b.onclick=async()=>{await fetch(API+'/auth/v1/logout',{method:'POST',headers:{apikey:ANON,Authorization:'Bearer '+ss.access_token}}).catch(()=>{});['psms_listener_session','psms_artist_session','psms_public_session'].forEach(k=>localStorage.removeItem(k));verifiedListener=null;stopDirect();location.replace('listener.html')};el.append(a,b)}
renderSession();refreshPlaylists();validateListenerGate();

async function validateListenerGate(){const gate=$('listener-gate'),content=$('listener-content');gate.classList.add('hidden');content.classList.add('hidden');try{const ss=await validListenerSession();if(!ss?.access_token)throw Error('Login erforderlich');const r=await fetch(API+'/auth/v1/user',{headers:{apikey:ANON,Authorization:'Bearer '+ss.access_token}});if(!r.ok)throw Error('Sitzung ungültig');const user=await r.json();verifiedListener=user.id;const artistReturn=$('ps-back-to-artist');if(artistReturn){artistReturn.hidden=true;try{const lookup=await fetch(API+'/rest/v1/psms_artists?select=user_id&user_id=eq.'+encodeURIComponent(user.id)+'&limit=1',{headers:{apikey:ANON,Authorization:'Bearer '+ss.access_token}});const artistRows=lookup.ok?await lookup.json():[];const isArtist=user.user_metadata?.psms_role==='artist'||artistRows.length>0;if(isArtist){artistReturn.hidden=false;localStorage.setItem('psms_artist_session',JSON.stringify(ss))}}catch(err){console.warn('Künstlerzuordnung:',err)}}content.classList.remove('hidden');renderSession();if(catalogReady){restoreListenerView();loadEditorialSpotlight()}return true}catch(e){verifiedListener=null;const back=$('ps-back-to-artist');if(back)back.hidden=true;stopDirect();$('player').hidden=true;gate.classList.remove('hidden');renderSession();return false}}
async function secureAudioUrl(raw){if(!verifiedListener)throw Error('Anmeldung erforderlich');const ss=await validListenerSession();if(!ss)throw Error('Bitte anmelden');const u=new URL(raw),prefix='/storage/v1/object/public/ps-music-audio/';const idx=u.pathname.indexOf(prefix);if(u.origin!==API||idx<0)throw Error('Audioquelle wird nicht unterstützt');const path=decodeURIComponent(u.pathname.slice(idx+prefix.length));if(!path||path.includes('..'))throw Error('Ungültige Audiodatei');const r=await fetch(API+'/storage/v1/object/sign/ps-music-audio/'+path,{method:'POST',headers:{apikey:ANON,Authorization:'Bearer '+ss.access_token,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});if(!r.ok)throw Error('Musikzugriff verweigert – bitte erneut anmelden');const d=await r.json();return API+'/storage/v1'+d.signedURL}

async function recordStream(songId){if(!verifiedListener||!songId)return;const ss=await validListenerSession();if(!ss?.access_token)return;const r=await fetch(API+'/rest/v1/rpc/psms_record_stream',{method:'POST',headers:{apikey:ANON,Authorization:'Bearer '+ss.access_token,'Content-Type':'application/json'},body:JSON.stringify({p_song_id:songId})});if(!r.ok)throw Error((await r.text()).slice(0,220)||'Stream konnte nicht erfasst werden');return r.json()}

async function restoreListenerView(){if(!verifiedListener||!catalogReady)return;let saved;try{saved=JSON.parse(sessionStorage.getItem(psViewKey)||'null')}catch{}if(!saved)return;if(saved.view==='album'&&saved.id)showAlbum(saved.id);else if(saved.view==='playlists'||saved.view==='playlist'){showPlaylistLibrary();if(saved.view==='playlist'&&saved.id){const found=playlists.find(p=>p.id===saved.id);if(found)await openPlaylistDetail(found);else{await refreshPlaylists();const p=playlists.find(x=>x.id===saved.id);if(p)await openPlaylistDetail(p)}}}}


async function loadEditorialSpotlight(){
 const root=$('editorial-spotlight');if(!root||!verifiedListener)return;
 try{
  const slots=await listenerRequest('psms_editorial_slots?select=slot,song_id,heading,message&enabled=eq.true&order=slot.asc');
  const picks=(slots||[]).map(slot=>({slot,song:allSongs().find(x=>x.key===slot.song_id)})).filter(x=>x.song);
  root.replaceChildren();if(!picks.length){root.classList.add('hidden');return}
  const top=document.createElement('div');top.className='ps-editorial-slider-header';
  const heading=document.createElement('h2');heading.textContent='✦ Redaktion empfiehlt';
  const controls=document.createElement('div');controls.className='ps-editorial-arrows';
  const prev=document.createElement('button'),next=document.createElement('button');
  prev.textContent='❮';next.textContent='❯';prev.type=next.type='button';prev.setAttribute('aria-label','Vorherige Empfehlung');next.setAttribute('aria-label','Nächste Empfehlung');controls.append(prev,next);top.append(heading,controls);
  const slider=document.createElement('div');slider.className='ps-editorial-slider';
  for(const {slot,song} of picks){
   const card=document.createElement('article');card.className='ps-editorial-slide';const artist=artistProfiles.find(a=>a.artist_name===song.artist);
   const art=document.createElement('div');art.className='ps-editorial-slide-art';const url=safeImg(song.cover_url||artist?.logo_url);
   if(url){const img=document.createElement('img');img.src=url;img.alt='Cover zu '+song.title;art.append(img)}else art.textContent='♫';
   const content=document.createElement('div');content.className='ps-editorial-slide-content';
   const label=document.createElement('span');label.className='ps-editorial-kicker';label.textContent='✦ EMPFEHLUNG '+slot.slot;
   const title=document.createElement('h3');title.textContent=song.title;
   const name=document.createElement('p');name.className='ps-editorial-artist';name.textContent=song.artist;
   const note=document.createElement('p');note.className='ps-editorial-slide-note';note.textContent=slot.message||'Unsere Redaktion empfiehlt diesen Song.';
   const play=document.createElement('button');play.className='btn';play.textContent='▶ Jetzt anhören';play.onclick=()=>{currentQueue=allSongs().filter(t=>t.artist===song.artist&&t.audio_url);playDirect(song)};
   content.append(label,title,name,note,play);card.append(art,content);slider.append(card)
  }
  prev.onclick=()=>slider.scrollBy({left:-slider.clientWidth*.85,behavior:'smooth'});
  next.onclick=()=>slider.scrollBy({left:slider.clientWidth*.85,behavior:'smooth'});
  root.append(top,slider);root.classList.remove('hidden')
 }catch(e){console.warn('Redaktionsempfehlungen:',e)}
}
