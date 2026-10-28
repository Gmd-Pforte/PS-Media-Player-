/* =====================================================================
   PS MUSIC STREAM – Live-Effekte (ps-live.js)
   Reine Darstellung: Partikel, Puls im Takt, Farben vom Cover,
   Einblenden beim Scrollen, Tab-Leiste, Wellenform, Schallplatte.
   Greift nicht in Anmeldung, Wiedergabe, Playlists oder Upload ein –
   Bedienelemente der App werden nur per .click() ausgelöst.
   ===================================================================== */
(()=>{'use strict';
const d=document,$=id=>d.getElementById(id),rootStyle=d.documentElement.style;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const audioEl=$('ps-audio')||$('profile-audio'),player=$('player');
if(!audioEl||!player)return;

/* ---------- Hilfsfunktionen ---------- */
const hash=s=>{let h=2166136261;for(const c of String(s||''))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
const PALS=[['#ff7a59','#e0569f'],['#8b6cf6','#3fd0c9'],['#ffc46b','#ff5f6d'],['#5ee7df','#b490ca'],['#f857a6','#ff5858'],['#4facfe','#7a5cff'],['#c3ff68','#2fb58f'],['#ff9a8b','#a18cd1']];
function setColors(a,b){rootStyle.setProperty('--c1',a);rootStyle.setProperty('--c2',b)}
function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0;const l=(mx+mn)/2;if(mx!==mn){const dd=mx-mn;s=l>.5?dd/(2-mx-mn):dd/(mx+mn);h=mx===r?(g-b)/dd+(g<b?6:0):mx===g?(b-r)/dd+2:(r-g)/dd+4;h*=60}return[h,s,l]}
const vivid=([h,s,l])=>`hsl(${Math.round(h)} ${Math.round(Math.max(s,.55)*100)}% ${Math.round(Math.min(.66,Math.max(.48,l))*100)}%)`;
const setCls=(el,cls,on)=>{if(el.classList.contains(cls)!==on)el.classList.toggle(cls,on)};
function currentSong(){try{return typeof directSong!=='undefined'?directSong:null}catch{return null}}
function emojiOf(text){const t=String(text||'').trim();return t?[...t][0]:'✦'}

/* ---------- Zustand: spielt / Player sichtbar / angemeldet ---------- */
let playing=false;
const setPlaying=v=>{playing=v;setCls(d.body,'psl-playing',v)};
audioEl.addEventListener('playing',()=>setPlaying(true));
audioEl.addEventListener('play',()=>setPlaying(true));
for(const ev of ['pause','ended','emptied'])audioEl.addEventListener(ev,()=>setPlaying(false));
const syncPlayer=()=>d.body.classList.toggle('psl-player-on',!player.hidden);
new MutationObserver(syncPlayer).observe(player,{attributes:true,attributeFilter:['hidden']});syncPlayer();
const content=$('listener-content');
const syncLogin=()=>d.body.classList.toggle('psl-logged-in',!!content&&!content.classList.contains('hidden'));
if(content)new MutationObserver(syncLogin).observe(content,{attributes:true,attributeFilter:['class']});syncLogin();

/* ---------- Songwechsel: Farben, Markierung, Schallplatte ---------- */
let curKey='',bpm=108,t0=performance.now(),peaks=[];
function makePeaks(h){const out=[];let v=.5;for(let i=0;i<72;i++){const r=((h>>>(i%24))&255)/255;v=Math.max(.18,Math.min(1,v*.55+r*.45+Math.sin(i*.33+h%7)*.12));out.push(v)}return out}
function markNow(){const s=currentSong();const want=new Set(s?.key?d.querySelectorAll('[data-song="'+CSS.escape(String(s.key))+'"]'):[]);d.querySelectorAll('.psl-now').forEach(e=>{if(!want.has(e))e.classList.remove('psl-now')});want.forEach(e=>setCls(e,'psl-now',true))}
function extractColors(src){
  if(!src||!/^https:/i.test(src))return;
  const im=new Image();im.crossOrigin='anonymous';im.decoding='async';
  im.onload=()=>{try{
    const c=d.createElement('canvas');c.width=c.height=24;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0,24,24);
    const px=x.getImageData(0,0,24,24).data,cand=[];
    for(let i=0;i<px.length;i+=4){const hsl=rgbToHsl(px[i],px[i+1],px[i+2]);if(hsl[2]<.12||hsl[2]>.94)continue;cand.push({hsl,score:hsl[1]*.75+(1-Math.abs(hsl[2]-.55))*.25})}
    if(!cand.length)return;cand.sort((a,b)=>b.score-a.score);
    const a=cand[0],b=cand.find(p=>{const dh=Math.abs(p.hsl[0]-a.hsl[0]);return dh>35&&dh<325})||cand[Math.min(cand.length-1,Math.floor(cand.length/3))];
    setColors(vivid(a.hsl),vivid(b.hsl));
  }catch(e){/* Bild ohne Freigabe – Ersatzfarben bleiben */}};
  im.src=src;
}
function onSongChange(){
  const s=currentSong(),key=String(s?.key||$('ptitle')?.textContent||'');if(!key||key===curKey)return;
  curKey=key;const h=hash(key);bpm=92+h%36;t0=performance.now();peaks=makePeaks(h);
  const pal=PALS[h%PALS.length];setColors(pal[0],pal[1]);
  const img=$('ps-cover-large')?.querySelector('img');
  if(img)extractColors(img.currentSrc||img.src);
  const lbl=$('psl-vinyl-label');if(lbl){lbl.replaceChildren();if(img){const c=new Image();c.src=img.src;c.alt='';lbl.append(c)}}
  markNow();
}
const ptitle=$('ptitle');if(ptitle)new MutationObserver(onSongChange).observe(ptitle,{childList:true,characterData:true,subtree:true});

/* ---------- Künstlerprofil: Farben vom Profilbild ---------- */
const photo=$('photo');
if(photo){const f=()=>{const im=photo.querySelector('img');if(im)extractColors(im.src)};new MutationObserver(f).observe(photo,{childList:true});f()}

/* ---------- Vorschau: Links zu Künstlerprofilen auf die Vorschau-Version lenken ---------- */
if(/vorschau\.html$/.test(location.pathname)&&$('artists')){
  const fix=()=>$('artists').querySelectorAll('a[href^="profile.html"]').forEach(a=>a.setAttribute('href',a.getAttribute('href').replace(/^profile\.html/,'profil-vorschau.html')));
  new MutationObserver(fix).observe($('artists'),{childList:true});fix();
}

/* ---------- Anzeigen für Wiederholen und Stumm ---------- */
const loopBtn=$('ps-loop'),muteBtn=$('ps-mute');
if(loopBtn){const f=()=>{loopBtn.dataset.pslMode=/eins/i.test(loopBtn.textContent)?'one':loopBtn.classList.contains('active')?'all':'off'};new MutationObserver(f).observe(loopBtn,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']});f()}
if(muteBtn){const f=()=>{muteBtn.toggleAttribute('data-psl-muted',/🔇/.test(muteBtn.textContent))};new MutationObserver(f).observe(muteBtn,{childList:true,characterData:true,subtree:true});f()}

/* ---------- Einblenden beim Scrollen ---------- */
const io=(!reduce&&'IntersectionObserver' in window)?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('psl-in');io.unobserve(e.target)}}),{threshold:.06,rootMargin:'0px 0px -4% 0px'}):null;
function reveal(el,delay){if(!io||!el||el.classList.contains('psl-rv'))return;el.classList.add('psl-rv');if(delay)el.style.transitionDelay=delay+'s';io.observe(el)}
d.querySelectorAll('.psl-block .ps-section-heading,.ps-dashboard-metrics>div,.ps-dashboard-section-title,.ps-dashboard-recent-title').forEach((el,i)=>reveal(el,(i%3)*.06));
const revealOnce=['featured-grid','artists','albums','songs','ps-dashboard-covers','ps-dashboard-recent','ps-my-music-list','ps-unified-stats-body','pl-list'];
for(const id of revealOnce){
  const box=$(id);if(!box)continue;
  const run=()=>{if(box.dataset.pslShown||!box.children.length)return;box.dataset.pslShown='1';[...box.children].forEach((c,i)=>reveal(c,Math.min(i,8)*.05))};
  new MutationObserver(()=>{run();markNow();if(id==='featured-grid')buildTicker()}).observe(box,{childList:true});run();
}

/* ---------- Zahlen hochzählen ---------- */
const counting=new WeakMap();
function countUp(el){
  if(reduce||!el)return;const final=el.textContent.trim();if(!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(final))return;
  const target=Number(final.replace(/\./g,''));if(!target||counting.get(el)===final)return;counting.set(el,final);
  const start=performance.now(),dur=Math.min(1400,500+target*4);let last=final;
  const step=now=>{if(el.textContent!==last&&el.textContent!==final){counting.delete(el);return}
    const p=Math.min(1,(now-start)/dur),v=Math.round(target*(1-Math.pow(1-p,3)));last=p<1?v.toLocaleString('de-DE'):final;el._pslWrite=last;el.textContent=last;if(p<1)requestAnimationFrame(step)};
  requestAnimationFrame(step);
}
for(const id of ['ps-dashboard-streams','ps-dashboard-song-count','ps-dashboard-release-count']){const el=$(id);if(el)new MutationObserver(()=>{const t=el.textContent.trim();if(t===el._pslWrite)return;if(counting.get(el)!==t)countUp(el)}).observe(el,{childList:true,characterData:true,subtree:true})}
const statsBody=$('ps-unified-stats-body');if(statsBody)new MutationObserver(()=>statsBody.querySelectorAll('.ps-stats-number').forEach(countUp)).observe(statsBody,{childList:true});

/* ---------- Begrüßung im Künstler-Überblick ---------- */
const hello=$('psl-dash-hello');if(hello){const h=new Date().getHours();hello.textContent=h<5?'Gute Nacht.':h<11?'Guten Morgen.':h<18?'Schön, dass du da bist.':'Guten Abend.'}

/* ---------- Laufband mit echten Neuheiten ---------- */
function buildTicker(){
  const box=$('psl-ticker');if(!box)return;const cards=[...d.querySelectorAll('#featured-grid .ps-feature-card')].slice(0,8);
  if(cards.length<2){box.replaceChildren();return}
  const make=()=>cards.map(card=>{const b=d.createElement('button');b.type='button';b.tabIndex=-1;
    const attr=card.dataset.song!=null?'song':'album';b.dataset[attr]=card.dataset[attr];
    const isAlbum=attr==='album';b.append(isAlbum?'💿 Neues Album: ':'✦ Neu: ');
    const t=d.createElement('b');t.textContent=card.querySelector('strong')?.textContent||'';b.append(t,' · '+(card.querySelector('small')?.textContent||''));return b});
  box.replaceChildren(...make(),...make());
}

/* ---------- Navigation: Tab-Leiste, Künstler-Reiter, Seitenleiste ---------- */
d.addEventListener('click',e=>{const t=e.target.closest('[data-psl-click]');if(!t)return;const target=$(t.dataset.pslClick);if(target){e.preventDefault();target.click()}});
const VIEWS=['ps-unified-overview','ps-unified-music','ps-unified-stats','ps-unified-profile','playlistview','albumview','homeview'];
const NAV_FOR={homeview:'open-home',albumview:'open-home',playlistview:'open-playlists','ps-unified-overview':'ps-open-overview','ps-unified-music':'ps-sub-releases','ps-unified-stats':'ps-open-stats','ps-unified-profile':'ps-sub-profile'};
function activeView(){for(const id of VIEWS){const el=$(id);if(el&&!el.classList.contains('hidden'))return id}return 'homeview'}
const UNI=['ps-unified-overview','ps-unified-music','ps-unified-stats','ps-unified-profile'];
const isOpen=id=>{const el=$(id);return !!el&&!el.classList.contains('hidden')};
function syncNav(){
  if(['homeview','playlistview','albumview'].some(isOpen)){const open=UNI.filter(isOpen);if(open.length){open.forEach(id=>$(id).classList.add('hidden'));setCls(d.body,'ps-artist-view',false);return}}
  const v=activeView();setCls(d.body,'psl-artist-zone',v.startsWith('ps-unified-'));const tab=v.startsWith('ps-unified-')?'studio':v==='playlistview'?'library':'home';
  d.querySelectorAll('#psl-tabbar [data-psl-tab]').forEach(b=>setCls(b,'psl-active',b.dataset.pslTab===tab));
  d.querySelectorAll('.psl-artist-tabs [data-psl-view]').forEach(b=>setCls(b,'psl-active',b.dataset.pslView===v));
  d.querySelectorAll('.ps-main-nav button').forEach(b=>{setCls(b,'ps-nav-active',false);setCls(b,'psl-active',b.id===NAV_FOR[v])});
}
for(const id of VIEWS){const el=$(id);if(el)new MutationObserver(syncNav).observe(el,{attributes:true,attributeFilter:['class']})}
const nav=$('ps-main-navigation');if(nav)new MutationObserver(syncNav).observe(nav,{attributes:true,subtree:true,attributeFilter:['class']});
syncNav();
const overviewBtn=$('ps-open-overview');
const syncArtist=()=>{const isArtist=!!overviewBtn&&!overviewBtn.hidden;d.body.classList.toggle('psl-is-artist',isArtist);d.querySelectorAll('.psl-tab-studio').forEach(b=>b.hidden=!isArtist)};
if(overviewBtn)new MutationObserver(syncArtist).observe(overviewBtn,{attributes:true,attributeFilter:['hidden']});syncArtist();

/* ---------- Upload-Schritte hervorheben ---------- */
const upContent=$('ps-upload-step-content'),upFwd=$('ps-upload-forward'),upBack=$('ps-upload-back');
if(upContent&&upFwd&&upBack){const steps=d.querySelectorAll('.ps-upload-steps span');
  const f=()=>{const step=/veröffentlichen/i.test(upFwd.textContent)?2:upBack.hidden?0:1;steps.forEach((s,i)=>setCls(s,'psl-done',i<=step))};
  new MutationObserver(f).observe(upContent,{childList:true});new MutationObserver(f).observe(upFwd,{childList:true,characterData:true,subtree:true});f()}

/* ---------- Mini-Player: Tippen öffnet den Vollplayer ---------- */
const expandBtn=$('expand');
d.querySelector('.player .phead .info')?.addEventListener('click',()=>{if(!player.classList.contains('expanded'))expandBtn?.click()});
$('pcover')?.addEventListener('click',()=>{if(!player.classList.contains('expanded'))expandBtn?.click()});
let sy=null;
player.addEventListener('touchstart',e=>{sy=(player.classList.contains('expanded')&&player.scrollTop<=0&&e.target.closest('.ps-album-stage,.phead'))?e.touches[0].clientY:null},{passive:true});
player.addEventListener('touchend',e=>{if(sy!==null&&e.changedTouches[0].clientY-sy>90&&player.classList.contains('expanded'))expandBtn?.click();sy=null},{passive:true});

/* ---------- Zufällig reinhören ---------- */
$('psl-random')?.addEventListener('click',()=>{const list=[...d.querySelectorAll('#homeview .song[data-song],#homeview .ps-feature-card[data-song]')];if(list.length)list[Math.floor(Math.random()*list.length)].click();else location.hash='music'});

/* ---------- Fliegende Emojis ---------- */
function burst(x,y,emoji,n=10){if(reduce)return;for(let k=0;k<n;k++){const s=d.createElement('span');s.className='psl-fly';s.textContent=emoji;const a=Math.random()*Math.PI*2,dist=50+Math.random()*70;
  s.style.left=(x-9)+'px';s.style.top=(y-9)+'px';s.style.setProperty('--dx',Math.cos(a)*dist+'px');s.style.setProperty('--dy',(Math.sin(a)*dist-40)+'px');s.style.setProperty('--r',(Math.random()*90-45)+'deg');s.style.animationDelay=(k*.02)+'s';
  d.body.append(s);setTimeout(()=>s.remove(),1200)}}
d.addEventListener('click',e=>{
  const r=e.target.closest('.ps-reaction-btn');if(r&&!r.disabled){burst(e.clientX,e.clientY,emojiOf(r.textContent),12);return}
  if(e.target.closest('.ps-add-song,#ps-add-playlist,#pl-add-confirm'))burst(e.clientX,e.clientY,'✦',6);
},true);

/* ---------- 3D-Neigung (Maus) und Lichtkegel ---------- */
let tilted=null;
d.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse'||reduce)return;
  const card=e.target.closest('.ps-feature-card');
  if(tilted&&tilted!==card){tilted.style.transform='';tilted=null}
  if(card){const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;card.style.transform=`rotateY(${(x-.5)*12}deg) rotateX(${(.5-y)*10}deg)`;card.style.setProperty('--mx',x*100+'%');card.style.setProperty('--my',y*100+'%');tilted=card}
},{passive:true});
const hero=$('psl-hero'),spot=hero?.querySelector('.psl-spot');
let pointer={x:-999,y:-999};
hero?.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();pointer={x:e.clientX-r.left,y:e.clientY-r.top};if(spot){spot.style.left=pointer.x+'px';spot.style.top=pointer.y+'px'}},{passive:true});
hero?.addEventListener('pointerleave',()=>pointer={x:-999,y:-999});

/* ---------- Partikel, Puls, Wellen ---------- */
const pc=$('psl-particles'),px=pc?.getContext('2d');let parts=[],heroVisible=true,pw=0,ph=0;
function sizeParticles(){if(!pc)return;const r=pc.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);pw=r.width;ph=r.height;if(!pw)return;pc.width=pw*dpr;pc.height=ph*dpr;px.setTransform(dpr,0,0,dpr,0,0);
  parts=Array.from({length:Math.min(110,Math.round(pw/9))},()=>({x:Math.random()*pw,y:Math.random()*ph,r:.6+Math.random()*2,s:.15+Math.random()*.5,o:.2+Math.random()*.6,h:Math.random()<.5}))}
if(pc){sizeParticles();addEventListener('resize',sizeParticles,{passive:true});if('IntersectionObserver' in window)new IntersectionObserver(es=>{heroVisible=es[0].isIntersecting;if(heroVisible&&!pw)sizeParticles()}).observe(pc)}
const waveBox=d.querySelector('.psl-wave');const bars=[];
if(waveBox){for(let i=0;i<16;i++){const s=d.createElement('span');s.style.animationDelay=(-(i*.13)%1.2)+'s';s.style.animationDuration=(.9+(i%4)*.2)+'s';waveBox.append(s);bars.push(s)}}
const wc=$('psl-wave-canvas'),wx=wc?.getContext('2d');
let beat=0,lastBeatWrite=-1,lastFrame=0;
function beatAt(now){const spb=60000/bpm,ph1=((now-t0)%spb)/spb,ph2=((now-t0)%(spb/2))/(spb/2);return Math.min(1,Math.exp(-ph1*5.5)*.8+Math.exp(-ph2*9)*.22+(Math.sin(now/1900)+1)*.07)}
function frame(now){
  requestAnimationFrame(frame);
  if(d.hidden||now-lastFrame<30)return;lastFrame=now;
  const target=(playing&&!reduce)?beatAt(now):0;beat+=(target-beat)*(target>beat?.5:.12);
  if(Math.abs(beat-lastBeatWrite)>.01){rootStyle.setProperty('--beat',beat.toFixed(3));lastBeatWrite=beat}
  if(playing&&bars.length)bars.forEach((s,i)=>{s.style.height=(14+Math.abs(Math.sin(now/(180+i*23)+i))*50*(.4+beat)+beat*30)+'%'});
  else if(bars.length&&bars[0].style.height)bars.forEach(s=>s.style.height='');
  if(px&&heroVisible&&pw&&!reduce){
    px.clearRect(0,0,pw,ph);const cs=getComputedStyle(d.documentElement),c1=cs.getPropertyValue('--c1').trim()||'#8b6cf6',c2=cs.getPropertyValue('--c2').trim()||'#e0569f';
    for(const p of parts){p.y-=p.s*(1+beat*4);p.x+=Math.sin(p.y/40)*.2;
      const dx=p.x-pointer.x,dy=p.y-pointer.y,dd=dx*dx+dy*dy;if(dd<6400){const f=(6400-dd)/6400*2.2,m=Math.sqrt(dd+1);p.x+=dx/m*f;p.y+=dy/m*f}
      if(p.y<-5){p.y=ph+5;p.x=Math.random()*pw}
      px.globalAlpha=Math.min(1,p.o*(.6+beat));px.fillStyle=p.h?c1:c2;px.beginPath();px.arc(p.x,p.y,p.r*(1+beat*.7),0,6.283);px.fill()}
    px.globalAlpha=1;
  }
  if(wx&&player.classList.contains('expanded')){
    if(!peaks.length)peaks=makePeaks(hash(curKey||'ps'));
    const w=wc.clientWidth,h=wc.clientHeight,dpr=Math.min(2,devicePixelRatio||1);if(!w)return;if(wc.width!==Math.round(w*dpr)){wc.width=Math.round(w*dpr);wc.height=Math.round(h*dpr)}
    wx.setTransform(dpr,0,0,dpr,0,0);wx.clearRect(0,0,w,h);
    const n=peaks.length,bw=w/n,dur=audioEl.duration,prog=Number.isFinite(dur)&&dur>0?audioEl.currentTime/dur:0;
    for(let k=0;k<n;k++){const near=Math.abs(k/n-prog)<.05?beat*.5:0,ht=Math.max(3,Math.min(1,peaks[k]*.72+near)*h);
      wx.fillStyle=k/n<=prog?'#fff':'rgba(255,255,255,.24)';const x=k*bw+bw*.2,y=(h-ht)/2;
      if(wx.roundRect){wx.beginPath();wx.roundRect(x,y,bw*.6,ht,2);wx.fill()}else wx.fillRect(x,y,bw*.6,ht)}
  }
}
requestAnimationFrame(frame);
})();
