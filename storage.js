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
 async function get(){const db=await open();return new Promise((res,rej)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).get(KEY);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
 async function put(v){const db=await open();return new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(v,KEY);t.oncomplete=res;t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})}
 async function encrypt(data){const iv=random(12), ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify(data)));return {iv:b64(iv),ciphertext:b64(ciphertext)}}
 async function decrypt(payload){return JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(payload.iv)},key,unb64(payload.ciphertext))))}
 async function unlock(){const stored=await get();return new Promise((resolve)=>{const help=document.getElementById('miniLockHelp'),button=document.getElementById('miniUnlock'),input=document.getElementById('miniPassword'),error=document.getElementById('miniLockError');help.textContent=stored?'保存データのパスワードを入力してください。':'初回用パスワードを12文字以上で設定してください。';button.onclick=async()=>{button.disabled=true;error.textContent='';try{const pass=input.value;if(!stored&&pass.length<12)throw Error('12文字以上にしてください');const salt=stored?unb64(stored.salt):random(16);const candidate=await derive(pass,salt);if(stored){await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(stored.iv)},candidate,unb64(stored.ciphertext))}key=candidate;MKStorage._salt=b64(salt);input.value='';document.getElementById('miniLock').remove();resolve()}catch(e){error.textContent='解除できません。パスワードを確認してください。'}finally{button.disabled=false}};input.addEventListener('keydown',e=>{if(e.key==='Enter')button.click()})})}
 async function load(){const payload=await get();return payload?MKMigrations.upgradeState(await decrypt(payload)):null}
 function save(data){let snapshot;try{snapshot=MKMigrations.upgradeState(data)}catch(e){return Promise.reject(e)}queue=queue.catch(()=>{}).then(async()=>{if(!key)throw Error('Locked');const item=await encrypt(snapshot);await put({...item,salt:MKStorage._salt,format:'mini-encrypted-v1'})});return queue}
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
 return {unlock,load,save,exportEncrypted,importEncrypted};
})();
