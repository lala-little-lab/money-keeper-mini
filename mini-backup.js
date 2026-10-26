// Japan-time filename, independent of the device timezone. Same-second exports get a suffix.
let mkBackupLastStamp='',mkBackupSameSecond=0;
function mkMiniBackupFilename(date=new Date()){
 const stamp=new Date(date.getTime()+9*60*60*1000).toISOString().slice(0,19).replace(/[-:]/g,'').replace('T','_');
 if(stamp===mkBackupLastStamp)mkBackupSameSecond++;else{mkBackupLastStamp=stamp;mkBackupSameSecond=0}
 return 'MK_mini_'+stamp+(mkBackupSameSecond?'_'+(mkBackupSameSecond+1):'')+'.encrypted.json';
}
/* Mini encrypted export and explicit replacement restore. No plaintext backup. */
(()=>{
function mount(){
 const page=document.querySelector('#record section');if(!page)return;
 const card=document.createElement('div');card.className='card';
 card.innerHTML=`<div class="mid">🔐 Miniバックアップ</div>
 <p class="small">暗号化ファイルを端末に保存できます。復元は現在のMiniデータをすべて置き換えます。事前に必ず今のバックアップを保存してください。</p>
 <button class="outline" id="miniExport" type="button">暗号化バックアップを保存</button>
 <div class="field"><label for="miniImportFile">暗号化バックアップから復元（全置換）</label><input id="miniImportFile" type="file" accept=".json,application/json"></div>
 <div class="field"><label for="miniImportPassword">バックアップ作成時のパスワード</label><input id="miniImportPassword" type="password" autocomplete="off"></div>
 <button class="outline" id="miniImport" type="button">復元する（現在のデータを置換）</button>
 <p class="small" id="miniBackupStatus" role="status" aria-live="polite"></p>`;
 page.appendChild(card);
 const status=card.querySelector('#miniBackupStatus');
 const exp=card.querySelector('#miniExport');
 exp.onclick=async()=>{exp.disabled=true;status.textContent='暗号化ファイルを準備中…';try{
  const obj=await MKStorage.exportEncrypted(mkState());
  const url=URL.createObjectURL(new Blob([JSON.stringify(obj)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=mkMiniBackupFilename();document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent='ダウンロードを開始しました。ファイルが保存されたか確認してください。';
 }catch(e){status.textContent='バックアップ失敗：'+e.message}finally{exp.disabled=false}};
 const imp=card.querySelector('#miniImport');
 imp.onclick=async()=>{
  const file=card.querySelector('#miniImportFile').files[0];const pass=card.querySelector('#miniImportPassword').value;
  if(!file||!pass){status.textContent='バックアップファイルとパスワードを指定してください。';return}
  imp.disabled=true;status.textContent='ファイルとパスワードを確認中…';
  try{
   if(file.size>20*1024*1024)throw Error('ファイルサイズが大きすぎます');
   const obj=JSON.parse(await file.text());
   const state=await MKStorage.importEncrypted(obj,pass);
   if(!state||!Array.isArray(state.txs)||!Array.isArray(state.eventsData))throw Error('Miniのバックアップ形式ではありません');
   const ok=confirm('現在のMiniデータをすべてバックアップの内容で置き換えます。現在のデータをバックアップ済みですか？ この操作は取り消せません。');
   if(!ok){status.textContent='復元をキャンセルしました。';return}
   // Replace only after successful authenticated decryption and user confirmation.
   const wasReady=mkStorageReady;
   mkStorageReady=false;
   try{await MKStorage.save(state)}catch(error){mkStorageReady=wasReady;throw error}
   status.textContent='復元データを保存しました。画面を再読み込みします。';
   location.reload();
  }catch(e){status.textContent='復元失敗：ファイル・パスワード・形式を確認してください。 '+e.message}
  finally{imp.disabled=false;card.querySelector('#miniImportPassword').value=''}
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();

/* #07: Only registered memo vocabulary from full #85; never restore its accounts. */
const MKMemoImport={
 plan(payload,current,allowedCats){
  if(payload?.format!=='money-keeper-backup'||payload.backupVersion!==1||payload.schemaVersion!==1)throw Error('本体 #85のバックアップを選んでください。');
  const source=structuredClone(payload.data?.mkMemoData);
  if(!source)throw Error('登録済みメモ候補のデータがありません。');
  MKMigrations.validateMemo(source);MKMigrations.validateMemo(current);
  if(source.groups.length>1000||source.words.length>10000)throw Error('メモ候補の件数が多すぎます。');
  MKMigrations.renameCategories({mkMemoData:source});
  const unknown=[...new Set(source.words.flatMap(w=>w.cats).filter(c=>!allowedCats.includes(c)))];
  if(unknown.length)throw Error('対応できないカテゴリがあります：'+unknown.join('、')+'。取り込みは行いません。');
  const next=structuredClone(current),rows=[],groupMap=new Map(),used=new Set([...next.groups,...next.words].map(x=>x.id));
  const newId=()=>{let id;do{id='memo-'+crypto.randomUUID()}while(used.has(id));used.add(id);return id};
  let addedGroups=0,addedWords=0,duplicates=0,addedLinks=0,conflicts=0;
  for(const g of source.groups){let existing=next.groups.find(x=>x.name.trim()===g.name.trim());if(!existing){existing={id:newId(),name:g.name.trim()};next.groups.push(existing);addedGroups++;rows.push('分類を追加：'+existing.name)}groupMap.set(g.id,existing.id)}
  for(const word of source.words){
   const existing=next.words.find(w=>w.text.trim()===word.text.trim()),targetGroup=groupMap.get(word.group),catNames=[...new Set(word.cats)];
   if(!existing){next.words.push({id:newId(),text:word.text.trim(),group:targetGroup,cats:catNames});addedWords++;rows.push('言葉を追加：'+word.text.trim()+' ／ '+next.groups.find(g=>g.id===targetGroup).name+' ／ '+(catNames.join('、')||'カテゴリ関連なし'));continue}
   duplicates++;const links=catNames.filter(c=>!existing.cats.includes(c));existing.cats.push(...links);addedLinks+=links.length;
   let note='登録済み：'+existing.text+(links.length?' ／ 関連を追加：'+links.join('、'):' ／ 関連の変更なし');
   if(existing.group!==targetGroup){conflicts++;note+=' ／ 分類はminiの「'+next.groups.find(g=>g.id===existing.group).name+'」を維持（本体：'+next.groups.find(g=>g.id===targetGroup).name+'）'}rows.push(note);
  }
  MKMigrations.validateMemo(next);
  return {next,rows,addedGroups,addedWords,duplicates,addedLinks,conflicts,changed:JSON.stringify(next)!==JSON.stringify(current)};
 }
};
(()=>{
 function mount(){
  const section=document.querySelector('#memoManager section');if(!section)return;
  const card=document.createElement('details');card.className='card mk-memo-import';
  card.innerHTML=`<summary>本体からメモ候補を取り込む</summary><p class="small">本体 #85のバックアップから、登録済みの言葉・分類・関連カテゴリを追加します。記録や特別費イベントは取り込みません。</p><p class="small">取り込み前に、現在のminiの暗号化バックアップを保存してください。</p><label for="mkMemoImportFile">本体 #85のバックアップ（JSON）</label><input id="mkMemoImportFile" type="file" accept=".json,application/json"><button type="button" class="outline" id="mkMemoImportPreview">取り込み内容を確認</button><p class="small" id="mkMemoImportStatus" role="status" aria-live="polite"></p>`;
  section.append(card);
  const dialog=document.createElement('dialog');dialog.id='mkMemoImportDialog';dialog.className='mk-memo-import-dialog';dialog.setAttribute('aria-labelledby','mkMemoImportTitle');
  dialog.innerHTML=`<h2 id="mkMemoImportTitle">メモ候補の取り込み確認</h2><p class="small" id="mkMemoImportCounts"></p><p class="small">既存の言葉は残します。同じ言葉の分類はminiを優先します。</p><ul id="mkMemoImportRows"></ul><p class="small" id="mkMemoImportError" role="status" aria-live="polite"></p><div class="row"><button type="button" class="outline" id="mkMemoImportCancel">キャンセル</button><button type="button" class="btn" id="mkMemoImportCommit">取り込む</button></div>`;
  document.body.append(dialog);
  const file=card.querySelector('input'),preview=card.querySelector('button'),status=card.querySelector('[role=status]'),commit=$('mkMemoImportCommit'),cancel=$('mkMemoImportCancel');let plan=null,baseline='',busy=false;
  function ready(){if(!mkStorageReady||mkSaveFailed)throw Error('保存が利用できません。取り込みを中止しました。');if(mkPendingSaves)throw Error('保存中です。「保存済み」になってからもう一度お試しください。')}
  function close(){if(busy)return;dialog.close();plan=null;baseline=''}
  cancel.onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
  file.onchange=()=>{status.textContent='';plan=null};
  preview.onclick=async()=>{preview.disabled=true;status.textContent='';try{
   ready();const f=file.files[0];if(!f)throw Error('本体のバックアップを選んでください。');if(f.size>10*1024*1024)throw Error('ファイルが大きすぎます（10MBまで）。');
   const payload=JSON.parse(await f.text());ready();baseline=JSON.stringify(mkMemoData);plan=MKMemoImport.plan(payload,mkMemoData,cats);
   $('mkMemoImportCounts').textContent=`分類追加 ${plan.addedGroups}件・言葉追加 ${plan.addedWords}件・登録済み ${plan.duplicates}件・関連追加 ${plan.addedLinks}件・分類の相違 ${plan.conflicts}件`;
   const list=$('mkMemoImportRows');list.replaceChildren();for(const text of plan.rows){const li=document.createElement('li');li.textContent=text;list.append(li)}
   $('mkMemoImportError').textContent=plan.changed?'内容を確認して「取り込む」を押してください。':'追加・変更する内容はありません。';commit.disabled=!plan.changed;dialog.showModal();
  }catch(e){status.textContent='取り込みできません：'+e.message;plan=null}finally{preview.disabled=false}};
  commit.onclick=async()=>{
   if(busy||!plan)return;
   try{ready();if(JSON.stringify(mkMemoData)!==baseline)throw Error('メモ候補が変更されました。一度キャンセルして、内容を確認し直してください。')}
   catch(e){$('mkMemoImportError').textContent=e.message;commit.disabled=true;return}
   busy=true;commit.disabled=true;cancel.disabled=true;mkStorageReady=false;mkPendingSaves++;mkSaveStatus('メモ候補を保存中…');$('mkMemoImportError').textContent='保存中…';
   const snapshot=structuredClone(mkState());snapshot.mkMemoData=plan.next;
   try{
    await MKStorage.save(snapshot);
   }catch(e){
    $('mkMemoImportError').textContent='保存できませんでした。既存のメモ候補は変更していません。キャンセルして再度お試しください。';mkSaveStatus('メモ取り込み失敗：既存データを保持',true);return;
   }finally{mkPendingSaves--;mkStorageReady=!mkSaveFailed;busy=false;cancel.disabled=false}
   mkMemoData=plan.next;mkMemoRender();mkCandidateRender();mkSaveStatus('保存済み ✓');status.textContent='メモ候補を取り込み、暗号化保存しました。';file.value='';close();
  };
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();

// #08: An explicit lock never deletes business data or changes the password.
(()=>{const section=document.querySelector('#other section');if(!section)return;
 const card=document.createElement('div');card.className='card';card.innerHTML='<div class="mid">🔐 ロック</div><p class="small" id="miniSessionStatus">保存状態を確認中…</p><p class="small">解除後24時間は再入力不要です。共有する端末では、使い終わったらロックしてください。</p><button type="button" class="outline" id="miniLockNow">今すぐロック</button>';section.append(card);MKStorage.paintSession();
 document.getElementById('miniLockNow').onclick=()=>MKStorage.lock();
})();

// #09: Inspect obsolete event metadata; never auto-clean on load or restore.
function mkEventCleanupPlan(state){
 const used=new Set(state.txs.map(t=>t.eventTag).filter(Boolean)),names=new Set(state.eventsData.map(e=>e.name)),ids=new Set(state.eventsData.map(e=>e.id));
 return {names:[...new Set(state.deletedEventNames.filter(n=>!used.has(n)&&!names.has(n)))],fixedIds:Object.keys(state.mkEventFixed).filter(id=>!ids.has(id))};
}
(()=>{
 const section=document.querySelector('#events section');if(!section)return;
 const card=document.createElement('details');card.className='card mk-event-cleanup';card.innerHTML='<summary>削除済みイベントの情報を整理</summary><p class="small">残っている記録で使われていない削除済みの名前と、削除済みイベントの固定設定だけを整理します。現在のイベント・記録・メモ候補・予算は残します。</p><p class="small">先に現在の暗号化バックアップを保存してください。</p><button type="button" class="outline" id="mkEventCleanupPreview">整理する内容を確認</button><p class="small" id="mkEventCleanupStatus" role="status" aria-live="polite"></p>';section.append(card);
 const dialog=document.createElement('dialog');dialog.id='mkEventCleanupDialog';dialog.className='mk-memo-import-dialog';dialog.setAttribute('aria-labelledby','mkEventCleanupTitle');dialog.innerHTML='<h2 id="mkEventCleanupTitle">削除済みイベント情報の整理</h2><p class="small" id="mkEventCleanupCounts"></p><ul id="mkEventCleanupRows"></ul><p class="small">ここに表示した内部情報を削除して暗号化保存します。取り消す場合は整理前のバックアップからの全置換復元が必要です。</p><p class="small" id="mkEventCleanupError" role="status" aria-live="polite"></p><div class="row"><button type="button" class="outline" id="mkEventCleanupCancel">キャンセル</button><button type="button" class="btn" id="mkEventCleanupCommit">削除する</button></div>';document.body.append(dialog);
 const preview=$('mkEventCleanupPreview'),commit=$('mkEventCleanupCommit'),cancel=$('mkEventCleanupCancel'),status=$('mkEventCleanupStatus'),error=$('mkEventCleanupError');let plan=null,baseline='',busy=false;
 function ready(){if(!mkStorageReady||mkSaveFailed||!MKStorage.isUnlocked())throw Error('保存を利用できません。ロックや保存状態を確認してください。');if(mkPendingSaves)throw Error('保存中です。「保存済み」になってから確認してください。')}
 function close(){if(busy)return;dialog.close();plan=null;baseline=''}cancel.onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 preview.onclick=()=>{status.textContent='';try{ready();const state=structuredClone(mkState());baseline=JSON.stringify(state);plan=mkEventCleanupPlan(state);$('mkEventCleanupCounts').textContent=`不要な名前 ${plan.names.length}件・削除済みイベントの固定設定 ${plan.fixedIds.length}件`;
  const list=$('mkEventCleanupRows');list.replaceChildren();for(const name of plan.names){const li=document.createElement('li');li.textContent='削除する名前：'+name;list.append(li)}if(plan.fixedIds.length){const li=document.createElement('li');li.textContent=plan.fixedIds.length+'件の固定設定（対象イベントは削除済みのため、名前は残っていません）';list.append(li)}
  commit.disabled=!(plan.names.length||plan.fixedIds.length);error.textContent=commit.disabled?'整理する情報はありません。':'対象を確認してから削除してください。';dialog.showModal();
 }catch(e){status.textContent=e.message;plan=null}};
 commit.onclick=async()=>{if(busy||!plan)return;let snapshot;
  try{ready();snapshot=structuredClone(mkState());if(JSON.stringify(snapshot)!==baseline)throw Error('データが変更されました。キャンセルして確認し直してください。')}
  catch(e){error.textContent=e.message;commit.disabled=true;return}
  const removed=new Set(plan.names);snapshot.deletedEventNames=snapshot.deletedEventNames.filter(n=>!removed.has(n));for(const id of plan.fixedIds)delete snapshot.mkEventFixed[id];
  busy=true;commit.disabled=true;cancel.disabled=true;mkStorageReady=false;mkPendingSaves++;mkSaveStatus('整理した情報を保存中…');error.textContent='保存中…';
  try{await MKStorage.save(snapshot)}catch(e){error.textContent='保存できませんでした。整理前の情報を保持しています。キャンセルして再度お試しください。';mkSaveStatus('整理失敗：元のデータを保持',true);return}
  finally{mkPendingSaves--;mkStorageReady=MKStorage.isUnlocked()&&!mkSaveFailed;if(!MKStorage.isUnlocked()&&!mkSaveFailed)mkReadyBeforeLock=true;busy=false;cancel.disabled=false}
  deletedEventNames=snapshot.deletedEventNames;mkEventFixed=snapshot.mkEventFixed;renderPastEventNames();mkRenderEventSuggestion();mkSaveStatus('保存済み ✓');status.textContent='表示した不要な情報を削除し、暗号化保存しました。';close();
 };
})();
