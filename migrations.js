/* Mini business-data migration; encrypted envelope remains version 1. */
const MKMigrations={
 currentVersion:4,
  renameCategories(data){
    const aliases={'化粧品・ボディケア・ネイル':'化粧品・ケア品','化粧品・ボディケア品':'化粧品・ケア品','化粧品・ボディケア':'化粧品・ケア品','服・靴・バッグ・アクセサリー':'服・靴・小物'};
    const name=x=>Object.hasOwn(aliases,x)?aliases[x]:x;
    const keys=obj=>{if(!obj||typeof obj!=='object'||Array.isArray(obj))return;for(const old of Object.keys(obj)){const next=name(old);if(next!==old){if(Object.hasOwn(obj,next)&&obj[next]!==obj[old])throw Error('旧名称と新名称の予算が重複しています：'+old+'／'+next+'。保存データは変更していません。');if(!Object.hasOwn(obj,next))obj[next]=obj[old];delete obj[old]}}};
    for(const key of ['txs','recurring','loans','cashbook'])if(Array.isArray(data[key]))for(const row of data[key])if(row&&typeof row.category==='string')row.category=name(row.category);
    keys(data.categoryBudgets);
    if(data.categoryBudgetHistory)Object.values(data.categoryBudgetHistory).forEach(keys);
    if(Array.isArray(data.eventsData))for(const event of data.eventsData){keys(event.catBudgets);if(Array.isArray(event.selectedCats))event.selectedCats=[...new Set(event.selectedCats.map(name))]}
    if(Array.isArray(data.mkMemoData?.words))for(const word of data.mkMemoData.words)if(Array.isArray(word.cats))word.cats=[...new Set(word.cats.map(name))];
    return data;
  },

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
  if(data.mkEventFixed===undefined){
   if(version>=3)throw Error('特別費の固定設定がありません。');
   data.mkEventFixed={};
  }
  if(!data.mkEventFixed||typeof data.mkEventFixed!=='object'||Array.isArray(data.mkEventFixed)||Object.values(data.mkEventFixed).some(v=>typeof v!=='boolean'))throw Error('特別費の固定設定が正しくありません。');
  if(Array.isArray(data.eventsData))for(const e of data.eventsData){
   if(!e||typeof e!=='object')throw Error('特別費イベントの形式が正しくありません。');
   if(e.selectedCats===undefined){
    e.selectedCats=Object.keys(e.catBudgets||{});
   }
   if(!Array.isArray(e.selectedCats)||e.selectedCats.some(c=>typeof c!=='string'))throw Error('特別費のカテゴリ設定が正しくありません。');
  }
  data.miniSchemaVersion=this.currentVersion;
  return this.renameCategories(data);
 },
 upgrade(envelope){
  if(!envelope||typeof envelope!=='object'||!Number.isInteger(envelope.schemaVersion))throw Error('Unversioned database');
  if(![1,2,3,4].includes(envelope.schemaVersion))throw Error('Unsupported data version');
  return {...envelope,schemaVersion:4,data:this.upgradeState(envelope.data)};
 }
};
