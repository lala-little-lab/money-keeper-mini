/* Mini business-data migration; encrypted envelope remains version 1. */
const MKMigrations={
 currentVersion:2,
 validateMemo(data){
 if(!data||!Array.isArray(data.groups)||!Array.isArray(data.words))throw Error('メモリストの形式が正しくありません。');
 const ids=new Set(),names=new Set();
 for(const g of data.groups){if(!g||typeof g.id!=='string'||!g.id||ids.has(g.id)||typeof g.name!=='string'||!g.name.trim()||names.has(g.name.trim()))throw Error('メモの分類が正しくありません。');ids.add(g.id);names.add(g.name.trim())}
 const wid=new Set(),wn=new Set();
 for(const w of data.words){if(!w||typeof w.id!=='string'||!w.id||wid.has(w.id)||typeof w.text!=='string'||!w.text.trim()||wn.has(w.text.trim())||!ids.has(w.group)||!Array.isArray(w.cats)||w.cats.some(c=>typeof c!=='string'))throw Error('メモの言葉が正しくありません。');wid.add(w.id);wn.add(w.text.trim())}
 return data;
},
 upgradeState(state){
  if(!state||typeof state!=='object'||Array.isArray(state))throw Error('保存データの形式が正しくありません。');
  const version=state.miniSchemaVersion===undefined?1:state.miniSchemaVersion;
  if(!Number.isInteger(version)||version<1||version>this.currentVersion)throw Error('未対応のMiniデータ形式です。');
  const data=structuredClone(state);
  if(data.mkMemoData===undefined){
   if(version>=2)throw Error('メモ管理データがありません。');
   data.mkMemoData={groups:[],words:[]};
  }
  this.validateMemo(data.mkMemoData);
  data.miniSchemaVersion=this.currentVersion;
  return data;
 },
 upgrade(envelope){
  if(!envelope||typeof envelope!=='object'||!Number.isInteger(envelope.schemaVersion))throw Error('Unversioned database');
  if(envelope.schemaVersion!==1&&envelope.schemaVersion!==2)throw Error('Unsupported data version');
  return {...envelope,schemaVersion:2,data:this.upgradeState(envelope.data)};
 }
};
