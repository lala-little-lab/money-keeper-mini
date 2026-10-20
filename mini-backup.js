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
  const a=document.createElement('a');a.href=url;a.download='money-keeper-mini-'+new Date().toISOString().slice(0,10)+'.encrypted.json';document.body.appendChild(a);a.click();a.remove();
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
   await MKStorage.save(state);
   status.textContent='復元データを保存しました。画面を再読み込みします。';
   location.reload();
  }catch(e){status.textContent='復元失敗：ファイル・パスワード・形式を確認してください。 '+e.message}
  finally{imp.disabled=false;card.querySelector('#miniImportPassword').value=''}
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
