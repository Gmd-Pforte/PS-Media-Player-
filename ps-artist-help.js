/* PS MUSIC STREAM – Künstler-Hilfe und Versionshinweise.
   Neue Meldungen in RELEASE_NOTES ergänzen, Anleitungen in GUIDES. */
(()=>{'use strict';
const RELEASE_VERSION='2026.10.30.1';
const RELEASE_NOTES=[
 {date:'30.10.2026',title:'Bessere Navigation und Fortschrittsleiste',text:'Die Künstlernavigation ist übersichtlicher. Hilfe und Updates findest du im Kontomenü. Die Fortschrittsleiste ist auf PC und Handy leichter bedienbar.'},
 {date:'29.10.2026',title:'Kontosicherheit für Künstler',text:'Im Kontomenü oder unter Kontosicherheit lässt sich eine persönliche Sicherheitsfrage festlegen oder ändern. Kurze Antworten ab zwei Zeichen werden akzeptiert. Die Sicherheitsfrage allein setzt noch kein Passwort zurück.'},
 {date:'29.10.2026',title:'Passwort selbst ändern',text:'Angemeldete Nutzer können im Kontomenü ihr Passwort ändern. Dazu wird das bisherige Passwort bestätigt; ein E-Mail-Link ist nicht nötig.'},
 {date:'Oktober 2026',title:'Eigene Streaming-Adresse',text:'PS MUSIC STREAM ist unter stream.psaimusic2024.de erreichbar. Künstlerstudio, Songs und Anmeldung bleiben erhalten.'},
 {date:'Oktober 2026',title:'Veröffentlichungen und Hörproben',text:'Singles, EPs und Alben können im Künstlerstudio verwaltet werden. Für Songs lassen sich Hörproben festlegen. Auch Titeldaten und Reihenfolge können bearbeitet werden.'},
 {date:'Oktober 2026',title:'Künstlerstatistiken',text:'Im Studio werden Streams und Reaktionen angezeigt. Euro-Beträge sind derzeit reine Simulationen, keine auszahlbaren Einnahmen.'}
];
const GUIDES=[
 {title:'Erste Schritte im Künstlerstudio',body:'Nach der Anmeldung öffnest du über „Künstlerbereich“ dein Studio. Unter „Dein Überblick“ siehst du deinen Einstieg. Die Unterpunkte führen zu Veröffentlichungen, Profil und Statistiken.'},
 {title:'Musik veröffentlichen',body:'Öffne „Meine Musik“ und nutze „Musik veröffentlichen“ beziehungsweise „Hochladen“. Wähle Audiodateien und ein Cover, gib Titel und Angaben ein und kontrolliere vor dem Speichern die Reihenfolge. Je nach Anzahl und gewähltem Veröffentlichungstyp entsteht eine Single, EP oder ein Album.'},
 {title:'Single, EP und Album verwalten',body:'Unter „Veröffentlichungen“ findest du deine Musik. Öffne einen Eintrag, um Titel, Reihenfolge und weitere verfügbare Angaben zu ändern. Löschen ist dauerhaft – prüfe vorher genau, welchen Song du ausgewählt hast.'},
 {title:'Hörprobe festlegen',body:'Öffne einen vorhandenen Song in „Meine Musik“ und nutze „Hörprobe“. Wähle die gewünschte Startstelle und speichere sie. Öffentliche Hörproben dauern höchstens ungefähr 30 Sekunden.'},
 {title:'Künstlerprofil bearbeiten',body:'Im Bereich „Künstlerprofil“ kannst du die verfügbaren Profilangaben verwalten, darunter Profilbild und Banner. Prüfe die Darstellung anschließend auch auf einem Handy.'},
 {title:'Streams und Reaktionen verstehen',body:'Im Menü „Statistiken“ findest du vorhandene Wiedergabezahlen und Reaktionen. Der angezeigte virtuelle Euro-Wert ist nur ein Rechenbeispiel und keine Auszahlung oder Gutschrift.'},
 {title:'Passwort und Sicherheitsfrage',body:'Öffne das Kontomenü oder „Kontosicherheit“. Beim Passwortwechsel bestätigst du zuerst das bisherige Passwort. Bei der Sicherheitsfrage wählst du eine Frage und gibst deine persönliche Antwort ein; beim späteren Ändern wird dein Kontopasswort verlangt. Die Antwort wird nicht offen angezeigt.'},
 {title:'Musik teilen',body:'Nutze die Teilen-Funktion bei Song oder Album. Andere können über den Link deine Veröffentlichung und gegebenenfalls die Hörprobe öffnen.'},
 {title:'Probleme melden',body:'Nutze „Feedback und Hilfe“ im Kontomenü, wenn eine Veröffentlichung, Anmeldung oder Wiedergabe nicht wie erwartet funktioniert. Beschreibe möglichst genau die betroffene Funktion.'}
];
const sidebar=document.getElementById('ps-open-artist-help');if(!sidebar)return;
const style=document.createElement('style');style.textContent=`#ps-artist-help-overlay[hidden]{display:none!important}#ps-artist-help-overlay{position:fixed;inset:0;z-index:32000;background:rgba(0,0,0,.83);display:grid;place-items:center;padding:14px}.ps-ah-sheet{width:min(760px,100%);height:min(85vh,850px);display:flex;flex-direction:column;background:#15121f;border:1px solid #64537e;border-radius:22px;color:#f7f2ff;box-shadow:0 20px 65px #000b;overflow:hidden}.ps-ah-head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:19px 21px;border-bottom:1px solid #42344f}.ps-ah-head h2{font-size:22px;margin:0}.ps-ah-head p{font-size:12px;color:#bcb2cc;margin:5px 0 0}.ps-ah-head button,.ps-ah-tabs button{background:#30253f;color:white;border:1px solid #65537d;border-radius:11px;padding:9px 13px;cursor:pointer}.ps-ah-tabs{display:flex;gap:9px;padding:13px 21px;border-bottom:1px solid #42344f}.ps-ah-tabs button[aria-selected=true]{background:#7652c2;border-color:#9c83d0}.ps-ah-content{padding:18px 21px;overflow:auto;overscroll-behavior:contain}.ps-ah-card{padding:17px;border:1px solid #40354e;background:#201a2c;border-radius:14px;margin-bottom:12px}.ps-ah-card h3{margin:5px 0 10px;font-size:17px}.ps-ah-card time{font-size:12px;color:#bea7e6}.ps-ah-card p{margin:0;color:#d9d1e1;line-height:1.65;font-size:14px}.ps-ah-card details summary{font-size:16px;cursor:pointer;font-weight:700}.ps-ah-card details p{margin-top:13px}.ps-ah-small{color:#baadc9;font-size:12px;margin:0 0 15px}`;document.head.append(style);
const overlay=document.createElement('div');overlay.id='ps-artist-help-overlay';overlay.hidden=true;overlay.innerHTML='<section class="ps-ah-sheet" role="dialog" aria-modal="true" aria-label="Künstler-Hilfe und Updates"><div class="ps-ah-head"><div><h2>📘 Künstler-Info & Hilfe</h2><p>Neues bei PS MUSIC STREAM und Anleitungen für dein Studio</p></div><button id="ps-ah-close" aria-label="Schließen">✕</button></div><div class="ps-ah-tabs"><button type="button" id="ps-ah-news" aria-selected="true">Was ist neu?</button><button type="button" id="ps-ah-guides" aria-selected="false">Anleitungen</button></div><div class="ps-ah-content" id="ps-ah-body"></div></section>';document.body.append(overlay);
const body=document.getElementById('ps-ah-body'),news=document.getElementById('ps-ah-news'),guides=document.getElementById('ps-ah-guides');
function para(text){const p=document.createElement('p');p.textContent=text;return p}
function show(which){news.setAttribute('aria-selected',String(which==='news'));guides.setAttribute('aria-selected',String(which==='guides'));body.replaceChildren();const intro=document.createElement('p');intro.className='ps-ah-small';intro.textContent=which==='news'?'Änderungen und neue Funktionen – neueste zuerst.':'Hier findest du Hilfe zu den wichtigsten Bereichen im Künstlerstudio.';body.append(intro);
if(which==='news'){for(const note of RELEASE_NOTES){const card=document.createElement('article');card.className='ps-ah-card';const time=document.createElement('time');time.textContent=note.date;const h=document.createElement('h3');h.textContent=note.title;card.append(time,h,para(note.text));body.append(card)}}
else for(const guide of GUIDES){const card=document.createElement('article');card.className='ps-ah-card';const details=document.createElement('details');const title=document.createElement('summary');title.textContent=guide.title;details.append(title,para(guide.body));card.append(details);body.append(card)}}
news.onclick=()=>show('news');guides.onclick=()=>show('guides');
const close=()=>{if(overlay.dataset.releaseNotice){try{localStorage.setItem(overlay.dataset.releaseNotice,'1')}catch{}delete overlay.dataset.releaseNotice}overlay.hidden=true;document.body.style.removeProperty('overflow')};document.getElementById('ps-ah-close').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close()});
let verified=false;async function artistVerified(){if(verified)return true;const keys=['psms_artist_session','psms_listener_session','psms_public_session'];for(const key of keys){let ss;try{ss=JSON.parse(localStorage.getItem(key)||'null')}catch{}if(!ss?.access_token)continue;const headers={apikey:ANON,Authorization:'Bearer '+ss.access_token};const r=await fetch(API+'/auth/v1/user',{headers}).catch(()=>null);if(!r?.ok)continue;const user=await r.json();if(user.user_metadata?.psms_role==='artist'){verified=true;return true}const match=await fetch(API+'/rest/v1/psms_artists?select=user_id&user_id=eq.'+encodeURIComponent(user.id)+'&limit=1',{headers}).catch(()=>null);if(match?.ok&&(await match.json()).length){verified=true;return true}}return false}
async function open(){if(!(await artistVerified()))return;overlay.hidden=false;document.body.style.overflow='hidden';show('news');document.getElementById('ps-ah-close').focus()}
sidebar.onclick=open;
let autoCheckPending=false;
async function checkReleaseNotice(){
 if(autoCheckPending||!overlay.hidden)return;
 const artistMenu=document.getElementById('ps-artist-submenu');
 if(!artistMenu||artistMenu.hidden)return;
 const key='psms_artist_release_seen_'+RELEASE_VERSION;
 try{if(localStorage.getItem(key)==='1')return}catch{}
 autoCheckPending=true;
 try{
  if(!(await artistVerified())||!overlay.hidden)return;
  show('news');overlay.hidden=false;document.body.style.overflow='hidden';
  overlay.dataset.releaseNotice=key;
  document.getElementById('ps-ah-close').focus();
 }finally{autoCheckPending=false}
}
function updateVisibility(){
 const artistMenu=document.getElementById('ps-artist-submenu');
 const visible=!!artistMenu&&!artistMenu.hidden;
 sidebar.hidden=!visible;
 if(visible)setTimeout(checkReleaseNotice,1100);
}
const menu=document.getElementById('ps-artist-submenu');if(menu){new MutationObserver(updateVisibility).observe(menu,{attributes:true,attributeFilter:['hidden']});}updateVisibility();
})();