/* PS MUSIC STREAM – Passwortwechsel für eingeloggte Hörer und Künstler.
   Sicherheit: altes Passwort erneut prüfen; keine Passwörter speichern. */
(()=>{'use strict';
const button=document.getElementById('ps-menu-password');if(!button)return;
const API='https://idzooeltxxbnepzkqrbg.supabase.co';
const key=typeof ANON==='string'?ANON:null;
if(!key)return;
const style=document.createElement('style');
style.textContent=`#ps-change-password-overlay{position:fixed;inset:0;z-index:30000;background:rgba(0,0,0,.8);display:grid;place-items:center;padding:18px}#ps-change-password-overlay[hidden]{display:none!important}.ps-password-card{box-sizing:border-box;width:min(100%,450px);max-height:90vh;overflow-y:auto;background:#171322;border:1px solid #655780;border-radius:22px;box-shadow:0 25px 80px #000a;padding:24px;color:#fff}.ps-password-card h2{font-size:22px;margin:0 0 9px}.ps-password-card p{color:#cbc3db;line-height:1.5}.ps-password-card label{display:block;margin:14px 0 5px;font-size:13px}.ps-password-card input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #786c91;border-radius:12px;background:#241d32;color:#fff;font:inherit}.ps-password-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}.ps-password-actions button{border:1px solid #807095;border-radius:12px;padding:11px 15px;background:#31233f;color:#fff;font:inherit;cursor:pointer}.ps-password-actions button[type=submit]{background:#6b4cbb}.ps-password-card [role=status]{min-height:20px;color:#edd7af;font-size:13px}`;
document.head.append(style);
const overlay=document.createElement('div');overlay.id='ps-change-password-overlay';overlay.hidden=true;
overlay.innerHTML='<form class="ps-password-card" autocomplete="off"><h2>Passwort ändern</h2><p>Zur Sicherheit bestätigst du zuerst dein bisheriges Passwort. Es wird kein E-Mail-Link benötigt.</p><label for="ps-old-pass">Bisheriges Passwort</label><input id="ps-old-pass" type="password" autocomplete="current-password" required><label for="ps-new-pass">Neues Passwort (mindestens 12 Zeichen)</label><input id="ps-new-pass" type="password" autocomplete="new-password" minlength="12" required><label for="ps-confirm-pass">Neues Passwort wiederholen</label><input id="ps-confirm-pass" type="password" autocomplete="new-password" minlength="12" required><p role="status" id="ps-password-status"></p><div class="ps-password-actions"><button type="button" id="ps-password-cancel">Abbrechen</button><button type="submit" id="ps-password-save">Ändern</button></div></form>';
document.body.append(overlay);
const $=id=>document.getElementById(id);
const close=()=>{overlay.hidden=true;overlay.querySelector('form').reset();$('ps-password-status').textContent=''};
$('ps-password-cancel').onclick=close;
overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
button.onclick=()=>{document.getElementById('ps-global-menu')?.classList.add('hidden');overlay.hidden=false;$('ps-old-pass').focus()};
overlay.querySelector('form').onsubmit=async e=>{
 e.preventDefault();const status=$('ps-password-status'),save=$('ps-password-save');
 const old=$('ps-old-pass').value,pass=$('ps-new-pass').value,repeat=$('ps-confirm-pass').value;
 if(pass.length<12||pass!==repeat){status.textContent='Neues Passwort muss mindestens 12 Zeichen lang sein und zweimal übereinstimmen.';return}
 if(pass===old){status.textContent='Bitte ein anderes neues Passwort wählen.';return}
 save.disabled=true;status.textContent='Passwort wird sicher geprüft …';
 try{
  const current=await (typeof validListenerSession==='function'?validListenerSession():null);
  if(!current?.access_token)throw Error('Bitte melde dich erneut an.');
  const headers={apikey:key,Authorization:'Bearer '+current.access_token};
  const me=await fetch(API+'/auth/v1/user',{headers});
  if(!me.ok)throw Error('Deine Sitzung ist abgelaufen. Bitte erneut anmelden.');
  const person=await me.json();if(!person.email)throw Error('Kontoadresse konnte nicht geprüft werden.');
  // Den Nachweis des alten Passworts über Supabase Auth prüfen.
  const proof=await fetch(API+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:person.email,password:old})});
  if(!proof.ok)throw Error('Das bisherige Passwort ist nicht korrekt.');
  const verified=await proof.json();
  if(verified.user?.id!==person.id||!verified.access_token)throw Error('Die Kontoprüfung ist fehlgeschlagen.');
  const update=await fetch(API+'/auth/v1/user',{method:'PUT',headers:{apikey:key,Authorization:'Bearer '+verified.access_token,'Content-Type':'application/json'},body:JSON.stringify({password:pass})});
  if(!update.ok){const err=await update.json().catch(()=>({}));throw Error(err.msg||err.error_description||err.message||'Passwort konnte nicht geändert werden.')}
  overlay.querySelector('form').reset();status.textContent='Passwort erfolgreich geändert. Du kannst dein neues Passwort ab jetzt verwenden.';
 }catch(error){status.textContent=error.message||'Passwortwechsel fehlgeschlagen.'}finally{save.disabled=false}
};
})();