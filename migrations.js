/* Mini business-data migration; encrypted envelope remains version 1. */
const MKMigrations={
 currentVersion:6,
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
 validateSplits(data){
  const categories=['食材','コンビニ','カフェ・外食','美容','化粧品・ケア品','服・靴・小物','日用品','雑貨','医療','プロテイン・サプリ','トレーニング','交通・ガソリン','家族','推し活','宿泊','交際費','娯楽','手数料','その他'];
  if(!Array.isArray(data.txs))throw Error('記録の形式が正しくありません。');
  for(const t of data.txs){
   if(!t||typeof t!=='object')throw Error('記録の形式が正しくありません。');
   if(t.categorySplits===undefined)continue;
   const rows=t.categorySplits;
   if(!['expense','lend','borrowed'].includes(t.type)||!Number.isSafeInteger(t.amount)||t.amount<0||!Array.isArray(rows)||rows.length<2||rows.length>categories.length||rows.some(r=>!r||!categories.includes(r.category)||!Number.isSafeInteger(r.amount)||r.amount<0)||new Set(rows.map(r=>r.category)).size!==rows.length||t.category!==rows[0].category||rows.reduce((n,r)=>n+BigInt(r.amount),0n)!==BigInt(t.amount)||(t.points!==undefined&&(!Number.isSafeInteger(t.points)||t.points<0||t.points>t.amount)))throw Error('カテゴリ内訳・合計・ポイントが正しくありません。');
  }
 },
 validateGroups(data){
const pays=[['cash','現金'],['paypay','PayPay'],['dpay','d払い'],['dcard','dカード'],['id','iD'],['rakuten','楽天カード'],['lumine','ルミネカード'],['epos','エポスカード'],['starbucks','Starbucks'],['suica','Suica'],['seibu','西武信用金庫'],['smbc','三井住友銀行'],['rakbank','楽天銀行'],['yucho','ゆうちょ'],['rakutenpay','楽天Pay'],['edy','楽天Edy'],['paypal','PayPal'],['other','その他']];
const cats=['食材','コンビニ','カフェ・外食','美容','化粧品・ケア品','服・靴・小物','日用品','雑貨','医療','プロテイン・サプリ','トレーニング','交通・ガソリン','家族','推し活','宿泊','交際費','娯楽','手数料','その他'];
const balances={seibu:{name:'西武信用金庫',v:0},rakbank:{name:'楽天銀行',v:0},smbc:{name:'三井住友銀行',v:0},yucho:{name:'ゆうちょ',v:0},cash:{name:'現金',v:0},paypay:{name:'PayPay',v:0},suica:{name:'Suica',v:0},starbucks:{name:'Starbucks',v:0},rakutencash:{name:'楽天Pay残高',v:0}};
function mkValidRecordDate(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v}
function mkValidPaymentDetails(points,gross,rate,count){return Number.isSafeInteger(points)&&points>=0&&points<=gross&&Number.isFinite(rate)&&rate>=0&&rate<=100&&[1,2,3,6].includes(count)}
function mkValidateSplits(t){} // All records have already passed validateSplits.
function mkMemberValidate(groups){
 if(groups===undefined)return;
 if(!Array.isArray(groups)||groups.length>1000)throw Error('グループ設定を確認してください。');
 const ids=new Set(),names=new Set(),valid=s=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=60;
 for(const g of groups){
  if(!g||typeof g!=='object'||Array.isArray(g)||!valid(g.id)||!valid(g.name)||ids.has(g.id)||names.has(g.name)||!Array.isArray(g.members)||g.members.length>100||g.members.some(n=>!valid(n))||new Set(g.members).size!==g.members.length)throw Error('メンバー設定の名前や重複を確認してください。');
  ids.add(g.id);names.add(g.name);
 }
}
function mkGroupValidate(t){
 const c={pays,accounts:Object.keys(balances).map(id=>({id})),rakutenSources:[["rakuten"],["rakbank"],["rakutencash"]]};
 if(t.paymentGroupId===undefined)return;
 const str=x=>typeof x==='string'&&x.trim().length>0&&x.length<=60;
 if(!str(t.paymentGroupId)||!str(t.groupName)||!['lend','receive','repay'].includes(t.type)||!mkValidRecordDate(t.date))throw Error('グループ記録の形式が正しくありません。');
 if(!Number.isSafeInteger(t.amount)||t.amount<0)throw Error('金額を確認してください。');
 const hasPay=k=>c.pays.some(x=>x[0]===k);
 if(t.type==='lend'){
  for(const n of [t.groupTotal,t.gross,t.points,t.paid,t.billed])if(!Number.isSafeInteger(n)||n<0)throw Error('会計の金額を確認してください。');
  if(t.groupTotal<1||t.gross>t.groupTotal||t.amount>t.groupTotal||t.points>Math.min(t.gross,t.amount)||t.paid!==t.gross-t.points||!mkValidPaymentDetails(t.points,t.gross,t.discount,t.installments)||t.billed!==Math.round(t.paid*(1-t.discount/100)))throw Error('会計総額・自分の支払・負担・ポイントを確認してください。');
  if(t.amount>0&&!cats.includes(t.category))throw Error('自分の負担分のカテゴリを選んでください。');
  if(t.gross>0&&!hasPay(t.payment))throw Error('支払方法を選んでください。');
  if(t.payment==='rakutenpay'&&!c.rakutenSources.some(x=>x[0]===t.rakutenPaySource))throw Error('楽天Payの支払元を選んでください。');
  if(!Array.isArray(t.groupParticipants)||t.groupParticipants.length>100)throw Error('参加者の内訳を確認してください。');
  const names=new Set();let paid=BigInt(t.gross),share=BigInt(t.amount);
  for(const r of t.groupParticipants){if(!str(r.name)||names.has(r.name)||!Number.isSafeInteger(r.paid)||r.paid<0||!Number.isSafeInteger(r.share)||r.share<0)throw Error('参加者名の重複や金額を確認してください。');names.add(r.name);paid+=BigInt(r.paid);share+=BigInt(r.share)}
  if(t.groupParticipants.length&&(paid!==BigInt(t.groupTotal)||share!==BigInt(t.groupTotal)))throw Error('参加者の内訳は、自分を含めた支払額・負担額をそれぞれ会計総額に合わせてください。');
 }else if(t.amount<1||!str(t.person)||!c.accounts.some(x=>x.id===t.payment))throw Error('相手・金額・実際にお金が動く口座や残高を選んでください。');
 mkValidateSplits(t);
}
mkMemberValidate(data.mkPaymentGroups);for(const t of data.txs)mkGroupValidate(t);
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
  if(data.mkPaymentGroups===undefined){if(version>=6)throw Error('メンバー設定がありません。');data.mkPaymentGroups=[];}
  data.miniSchemaVersion=this.currentVersion;
  this.renameCategories(data);this.validateSplits(data);this.validateGroups(data);return data;
 },
 upgrade(envelope){
  if(!envelope||typeof envelope!=='object'||!Number.isInteger(envelope.schemaVersion))throw Error('Unversioned database');
  if(![1,2,3,4,5,6].includes(envelope.schemaVersion))throw Error('Unsupported data version');
  return {...envelope,schemaVersion:6,data:this.upgradeState(envelope.data)};
 }
};
