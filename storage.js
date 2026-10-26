/* Mini isolated encrypted IndexedDB. Test draft. */
const MKStorage=(()=>{
 const DB='money-keeper-mini-encrypted-v1', STORE='app_state', KEY='primary';
 const encoder=new TextEncoder(), decoder=new TextDecoder();
 let key=null, dbPromise=null, queue=Promise.resolve();
 const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
 const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const random=n=>crypto.getRandomValues(new Uint8Array(n));
 async function derive(pass,salt){const material=await crypto.subtle.importKey('raw',encoder.encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
 async function open(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return dbPromise}
 async function get(id=KEY){const db=await open();return new Promise((res,rej)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
 async function put(v,id=KEY){const db=await open();return new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(v,id);t.oncomplete=res;t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})}
 async function remove(id){const db=await open();return new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).delete(id);t.oncomplete=res;t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})}
 async function encrypt(data,saveKey=key){const iv=random(12), ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},saveKey,encoder.encode(JSON.stringify(data)));return {iv:b64(iv),ciphertext:b64(ciphertext)}}
 async function decrypt(payload){return JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(payload.iv)},key,unb64(payload.ciphertext))))}
 const AUTH='unlock-24h', TTL=24*60*60*1000, REVOKE='mk-mini-unlock-revocation';
 let active=false, locking=null, expiresAt=0, startedAt=0, monotonicEnd=0, timer=null, initialResolve=null, initialized=false, generation=0;
 let remembered=false,authenticating=false;
 let channel=null;try{channel=new BroadcastChannel('mk-mini-lock')}catch(_){}
 function revocation(){return localStorage.getItem(REVOKE)||''}
 function authValid(a){return a&&a.version===1&&Number.isFinite(a.createdAt)&&a.expiresAt===a.createdAt+TTL&&Date.now()>=a.createdAt&&Date.now()<a.expiresAt&&a.revocation===revocation()&&a.key instanceof CryptoKey&&!a.key.extractable&&a.key.algorithm.name==='AES-GCM'&&a.key.usages.includes('decrypt')&&a.key.usages.includes('encrypt')}
 function expired(){return active&&(Date.now()<startedAt||Date.now()>=expiresAt||performance.now()>=monotonicEnd)}
 function lockUI(message){const d=document.getElementById('miniLock');if(!d.open)d.showModal();document.getElementById('miniPassword').value='';document.getElementById('miniLockHelp').textContent=message;}
 function paintSession(note=''){
  const el=document.getElementById('miniSessionStatus');if(!el)return;
  el.textContent=note||(active?'解除保持：'+new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(expiresAt))+'まで（日本時間）':'ロック中');
 }
 async function forgetRemembered(){
  let markerOK=false;try{localStorage.setItem(REVOKE,crypto.randomUUID());markerOK=true}catch(_){}
  try{await remove(AUTH)}catch(e){if(!markerOK)throw e}
 }
 function announce(){try{channel?.postMessage('lock')}catch(_){} }
 async function lock(reason='manual',broadcast=true){
  if(locking)return locking;
  active=false;generation++;clearTimeout(timer);lockUI(reason==='expired'?'24時間が経過しました。パスワードを入力してください。':'ロックしました。パスワードを入力してください。');
  const button=document.getElementById('miniUnlock');button.disabled=true;window.dispatchEvent(new Event('mk-mini-locked'));paintSession();
  if(broadcast)announce();
  locking=(async()=>{try{await forgetRemembered();await queue.catch(()=>{});key=null;remembered=false;document.getElementById('miniLockError').textContent='';button.textContent='解除／初回設定';button.onclick=passwordUnlock;}
   catch(e){key=null;document.getElementById('miniLockError').textContent='解除情報の削除に失敗しました。再読み込みせず「ロックをやり直す」を押してください。';button.textContent='ロックをやり直す';button.onclick=()=>lock(reason);}
   finally{locking=null;button.disabled=false}})();
  return locking;
 }
 function activate(candidate,salt,createdAt,deadline,note=''){
  key=candidate;MKStorage._salt=salt;startedAt=createdAt;expiresAt=deadline;monotonicEnd=performance.now()+Math.max(0,deadline-Date.now());active=true;
  document.getElementById('miniPassword').value='';document.getElementById('miniLock').close();
  clearTimeout(timer);timer=setTimeout(()=>lock('expired'),Math.max(0,deadline-Date.now()));paintSession(note);window.dispatchEvent(new Event('mk-mini-unlocked'));
  if(initialResolve){initialResolve();initialResolve=null}
 }
 async function passwordUnlock(){
  const button=document.getElementById('miniUnlock'),input=document.getElementById('miniPassword'),error=document.getElementById('miniLockError');button.disabled=true;error.textContent='';const attempt=generation;authenticating=true;
  try{
   const stored=await get(),pass=input.value;if(!stored&&pass.length<12)throw Error('初回は12文字以上にしてください。');
   const salt=stored?unb64(stored.salt):random(16),candidate=await derive(pass,salt);
   if(stored)await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(stored.iv)},candidate,unb64(stored.ciphertext));
   if(attempt!==generation)throw Error('ロック状態が変わりました。もう一度入力してください。');
   const createdAt=Date.now(),deadline=createdAt+TTL;let note='';
   try{await put({version:1,key:candidate,salt:b64(salt),createdAt,expiresAt:deadline,revocation:revocation()},AUTH);remembered=true}
   catch(e){remembered=false;await forgetRemembered();note='解除保持を保存できませんでした。次回はパスワードを入力してください。'}
   if(attempt!==generation){await forgetRemembered();throw Error('ロック状態が変わりました。もう一度入力してください。')}
   activate(candidate,b64(salt),createdAt,deadline,note);
  }catch(e){input.value='';error.textContent='解除できません。パスワードと保存状態を確認してください。';}
  finally{authenticating=false;button.disabled=false}
 }
 async function checkSession(){
  if(!active)return;
  if(expired()){await lock('expired');return}
  if(!remembered)return;
  try{const auth=await get(AUTH);if(!authValid(auth)||auth.salt!==MKStorage._salt)await lock('remote',false)}catch(_){await lock('remote',false)}
 }
 async function unlock(){
  const d=document.getElementById('miniLock');if(!d.open)d.showModal();
  if(!initialized){initialized=true;d.addEventListener('cancel',e=>e.preventDefault());
   document.getElementById('miniPassword').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();document.getElementById('miniUnlock').click()}});
   for(const type of ['pointerdown','keydown','click'])document.addEventListener(type,e=>{if(expired()){e.preventDefault();e.stopImmediatePropagation();lock('expired')}},true);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkSession()});window.addEventListener('focus',checkSession);window.addEventListener('pageshow',checkSession);
   window.addEventListener('storage',e=>{if(e.key===REVOKE&&(active||authenticating))lock('remote',false)});if(channel)channel.onmessage=e=>{if(e.data==='lock'&&(active||authenticating))lock('remote',false)};
  }
  document.getElementById('miniUnlock').onclick=passwordUnlock;
  const result=new Promise(resolve=>{initialResolve=resolve});
  try{
   const stored=await get(),auth=await get(AUTH);
   document.getElementById('miniLockHelp').textContent=stored?'保存データのパスワードを入力してください。':'初回用パスワードを12文字以上で設定してください。';
   if(stored&&authValid(auth)&&auth.salt===stored.salt){await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(stored.iv)},auth.key,unb64(stored.ciphertext));remembered=true;activate(auth.key,auth.salt,auth.createdAt,auth.expiresAt);return result}
   if(auth)await forgetRemembered();
  }catch(_){document.getElementById('miniLockError').textContent='自動解除できません。パスワードを入力してください。';}
  return result;
 }
 async function load(){const payload=await get();return payload?MKMigrations.upgradeState(await decrypt(payload)):null}
 function save(data){if(!active||expired()){if(active)lock('expired');return Promise.reject(Error('ロック中です。パスワードを入力してください。'))}let snapshot;try{snapshot=MKMigrations.upgradeState(data)}catch(e){return Promise.reject(e)}const saveKey=key,salt=MKStorage._salt;queue=queue.catch(()=>{}).then(async()=>{const item=await encrypt(snapshot,saveKey);await put({...item,salt,format:'mini-encrypted-v1'})});return queue}
 async function exportEncrypted(data){await save(data);await queue;return {format:'money-keeper-mini-encrypted',version:1,exportedAt:new Date().toISOString(),payload:await get()}}
 function validateBackupState(state){
  const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  if(!plain(state)||!Array.isArray(state.txs)||!Array.isArray(state.eventsData))throw Error('記録またはイベント情報が不正です');
  if(state.txs.length>200000||state.eventsData.length>10000)throw Error('記録件数が多すぎます');
  const ids=new Set();
  for(const t of state.txs){
    if(!plain(t)||typeof t.id!=='string'||!t.id||ids.has(t.id)||
       typeof t.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||
       typeof t.type!=='string'||!['expense','income','transfer','charge','lend','borrowed','repay','receive','loanBorrow','loanLend'].includes(t.type)||
       typeof t.amount!=='number'||!Number.isFinite(t.amount)||t.amount<0||
       (t.eventTag!==undefined&&typeof t.eventTag!=='string'))throw Error('記録の形式が不正です');
    ids.add(t.id);
  }
  for(const e of state.eventsData){if(!plain(e)||typeof e.name!=='string')throw Error('イベント情報が不正です');}
  for(const name of ['loans','cashbook','snapshots','wishes','recurring','deletedEventNames','loanArchivedPeople','loanGroups']){
    if(state[name]!==undefined&&!Array.isArray(state[name]))throw Error(name+' の形式が不正です');
  }
  if(state.balances!==undefined){
    if(!plain(state.balances)||Object.values(state.balances).some(x=>typeof x!=='number'||!Number.isFinite(x)))throw Error('残高情報が不正です');
  }
  return MKMigrations.upgradeState(state);
 }
 async function importEncrypted(obj,password){if(obj?.format!=='money-keeper-mini-encrypted'||obj.version!==1)throw Error('未対応の形式');const item=obj.payload;const candidate=await derive(password,unb64(item.salt));const decoded=JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(item.iv)},candidate,unb64(item.ciphertext))));return validateBackupState(decoded)}
 return {unlock,load,save,exportEncrypted,importEncrypted,lock,paintSession,isUnlocked:()=>active};
})();
