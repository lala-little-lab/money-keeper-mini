const MK_MONEY_FIELDS=new Set(['amount','gross','mine','theirs','recAmount','newEventBudget','newEventCatAmount','wishPrice','loanExtraAmount','editExtraAmount','editGross','editMine','editOther','editAmount','moneyPromptValue','transferFee','editTransferFee','recordFee','editRecordFee']);
let moneyPromptSave=null,moneyPromptMin=0;
function moneyNum(value){if(typeof value==='number')return Number.isFinite(value)?value:0;const raw=String(value??'').replace(/[¥￥,，\s]/g,'').replace(/[^0-9.\-]/g,'');return Math.trunc(Number(raw))||0}
function moneyFormatted(value){const raw=String(value??'').replace(/[−－]/g,'-');let neg=raw.trim().startsWith('-')?'-':'';let digits=raw.split('.')[0].replace(/\D/g,'');if(!digits)return neg;return neg+Number(digits).toLocaleString('ja-JP')}
function formatMoneyElement(input,keepCaret=false){
 if(!input||input.dataset.moneyReady!=='1'||input.type==='number')return;
 const original=input.value;
 if(!original)return;
 const next=moneyFormatted(original);
 if(original===next)return;
 let before=0;
 try{before=original.slice(0,input.selectionStart??original.length).replace(/\D/g,'').length}catch(_){before=original.replace(/\D/g,'').length}
 input.value=next;
 if(keepCaret&&document.activeElement===input){let pos=0,count=0;while(pos<next.length&&count<before){if(/[0-9]/.test(next[pos]))count++;pos++}try{input.setSelectionRange(pos,pos)}catch(_){}}
}
function attachMoneyInput(input){
 if(input.dataset.moneyReady==='1')return;
 input.dataset.moneyReady='1';input.type='text';input.inputMode='numeric';input.autocomplete='off';
 let wrapper=input.parentElement;
 if(!wrapper.classList.contains('money-input')){
  wrapper=document.createElement('div');wrapper.className='money-input mk-money-input';
  input.parentNode.insertBefore(wrapper,input);wrapper.appendChild(input);
 }else wrapper.classList.add('mk-money-input');
 if(!wrapper.querySelector('.money-prefix')){let prefix=document.createElement('span');prefix.className='money-prefix';prefix.textContent='¥';wrapper.insertBefore(prefix,input)}
 input.addEventListener('input',()=>formatMoneyElement(input,true));
 input.addEventListener('blur',()=>formatMoneyElement(input));
}
function refreshMoneyInputs(){document.querySelectorAll('input[data-money-ready="1"]').forEach(input=>{if(document.activeElement!==input)formatMoneyElement(input)})}
function initMoneyInputs(){document.querySelectorAll('input').forEach(input=>{if(MK_MONEY_FIELDS.has(input.id)||input.id.startsWith('actual-')||input.id==='mkInlineBudgetAmount')attachMoneyInput(input)})}
let moneyPromptAllowBlank=false;
function openMoneyPrompt(title,current,cb,opt={}){
 moneyPromptSave=cb;moneyPromptMin=opt.min??0;moneyPromptAllowBlank=!!opt.allowBlankAsZero;
 $('moneyPromptTitle').textContent=title;$('moneyPromptValue').value=String(current??'');$('moneyPromptHint').textContent=opt.hint||'';$('moneyPromptError').textContent='';
 $('moneyPromptModal').classList.remove('hidden');initMoneyInputs();formatMoneyElement($('moneyPromptValue'));$('moneyPromptValue').focus({preventScroll:true});
}
function closeMoneyPrompt(){$('moneyPromptModal').classList.add('hidden');moneyPromptSave=null}
function saveMoneyPrompt(){let input=$('moneyPromptValue');const raw=input.value,n=raw.trim()?moneyNum(raw):(moneyPromptAllowBlank?0:NaN);if(!Number.isSafeInteger(n)||n<moneyPromptMin){$('moneyPromptError').textContent='金額を確認してね';return}const cb=moneyPromptSave;closeMoneyPrompt();if(cb)cb(n)}

const cats=['食材','コンビニ','カフェ・外食','美容','化粧品・ボディケア・ネイル','服・靴・バッグ・アクセサリー','日用品','雑貨','医療','プロテイン・サプリ','トレーニング','交通・ガソリン','家族','推し活','宿泊','交際費','娯楽','手数料','その他'];
const pays=[['cash','現金'],['paypay','PayPay'],['dpay','d払い'],['dcard','dカード'],['id','iD'],['rakuten','楽天カード'],['lumine','ルミネカード'],['epos','エポスカード'],['starbucks','Starbucks'],['suica','Suica'],['seibu','西武信用金庫'],['smbc','三井住友銀行'],['rakbank','楽天銀行'],['yucho','ゆうちょ'],['rakutenpay','楽天Pay'],['edy','楽天Edy'],['paypal','PayPal'],['other','その他']];
const incomePays=[['seibu','西武信金'],['smbc','三井住友'],['rakbank','楽天銀行'],['yucho','ゆうちょ'],['cash','現金'],['paypay','PayPay'],['suica','Suica'],['starbucks','Starbucks'],['other','その他']];
const balances={seibu:{name:'西武信用金庫',v:0},rakbank:{name:'楽天銀行',v:0},smbc:{name:'三井住友銀行',v:0},yucho:{name:'ゆうちょ',v:0},cash:{name:'現金',v:0},paypay:{name:'PayPay',v:0},suica:{name:'Suica',v:0},starbucks:{name:'Starbucks',v:0},rakutencash:{name:'楽天Pay残高',v:0}};
let rakutenPaySource='rakuten';
let recurring=[];
let eventsData=[];
let loanActivePerson='',loanExpandedPerson='',lastSavedLoanPerson='',loanArchiveView=false,loanOrganize=false,loanAddToGroupId='',loanArchivedPeople=[],loanFoldAfter={},loanFoldExpanded={},loanSelectedIds=new Set(),histMoreOpen=false;
let loanExtraPerson='',loanExtraDirection='lend';
let loanGroups=[],loanGroupSerial=0;
let mkTodos=[],mkTodoHidden={};
let txs=[],loans=[],cashbook=[],snapshots=[],wishes=[],billAdjustments={},billItemAdjustments={},deletedEventNames=[],mode='expense',loanKind='lend',loanSection='advance',category='',payment='',eventTag='',discount=0,installments=1,from='',to='',chargeTarget='',chargeSource='',histTab='spend',histType='all',histCat='',histPay='',histEvent='',histPeriod='',histStart='',histEnd='',histKeyword='',editingId='',openEventId='',newEventCat='',newEventCatBudgets={},recType='normal',recCategory='',recurringEditIndex=-1,monthlyBudget=190000,transferFeeSide='from',chargeDefaults={paypay:'seibu',suica:'lumine',starbucks:'dcard',rakutencash:'rakbank'},categoryBudgets={},monthlyBudgetHistory={},categoryBudgetHistory={},analysisMonth=new Date().toLocaleDateString('sv-SE').slice(0,7);
const $=id=>document.getElementById(id),yen=n=>'¥'+Math.round(Number(n)||0).toLocaleString('ja-JP');$('date').value=new Date().toISOString().slice(0,10);
// Browser history integration: a navigation is one history entry, not a reload.
let mkRestoringNavigation=false;
function mkNavigationButton(id){
 const main=['home','record','history','due','budget','other'];
 const index=main.includes(id)?main.indexOf(id):5;
 return document.querySelectorAll('.bottom .nav')[index]||null;
}
function mkDisplayPage(id,b){
 if(!$(id)||!$(id).classList.contains('page'))return;
 try{sessionStorage.setItem('mk-last-page',id)}catch(_){}
 document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
 $(id).classList.add('active');
 document.querySelectorAll('.bottom .nav').forEach(x=>x.classList.remove('active'));
 const button=b||mkNavigationButton(id);if(button)button.classList.add('active');
 if($('mkBackAnalysis'))$('mkBackAnalysis').classList.add('hidden');
 scrollTo(0,0);
}
function nav(id,b){
 if(!$(id)||!$(id).classList.contains('page'))return;
 const current=document.querySelector('.page.active')?.id;
 if(!mkRestoringNavigation&&current!==id){
  try{history.pushState({mkPage:id},'',location.href)}catch(_){}
 }
 mkDisplayPage(id,b);
}
window.addEventListener('popstate',function(event){
 if(event.state?.memo){mkMemoOrigin=event.state.memo.origin||'other';mkMemoHide();mkMemoView=event.state.memo.view||'words';mkMemoScope=event.state.memo.scope||'';if(mkMemoView==='groups'&&mkMemoScope&&!mkMemoData.groups.some(g=>g.id===mkMemoScope))mkMemoScope='';mkMemoRender();mkDisplayPage('memoManager',mkNavigationButton('memoManager'));if(event.state.memo.modal)mkMemoHistory(true);return;}
 if(document.querySelector('.page.active')?.id==='memoManager')mkMemoHide();

 const id=event.state&&event.state.mkPage;
 if(!id||!$(id)||!$(id).classList.contains('page'))return;
 // Do not silently discard a modal's draft on Back. Close it explicitly.
 const modalOpen=[...document.querySelectorAll('.modal')].some(el=>!el.classList.contains('hidden'));
 const todo=$('mkTodoModal');
 const trend=$('mkTrendOverlay');
 if(modalOpen||(todo&&!todo.hidden)||(trend&&!trend.classList.contains('hidden'))){
  try{history.forward()}catch(_){}
  return;
 }
 mkRestoringNavigation=true;
 try{mkDisplayPage(id,mkNavigationButton(id))}finally{mkRestoringNavigation=false}
});
function openOther(id){nav(id,document.querySelectorAll('.nav')[5])}function backOther(){nav('other',document.querySelectorAll('.nav')[5])}function openLoansFromOther(){loanExpandedPerson='';loanActivePerson='';loanArchiveView=false;loanOrganize=false;loanAddToGroupId='';loanSelectedIds.clear();openOther('loans');renderLoans()}
function total(){return Object.values(balances).reduce((s,x)=>s+x.v,0)}function renderBalances(){$('cashTotal').textContent=yen(total());$('prePay').textContent=yen(total());$('balanceList').innerHTML=Object.values(balances).map(x=>`<div class="row item"><span>${x.name}</span><strong>${yen(x.v)}</strong></div>`).join('')}
function openPicker(title,items,cb){$('pickerTitle').textContent=title;$('pickerList').innerHTML='';items.forEach(it=>{let b=document.createElement('button');b.className='pickitem';b.textContent=it.label;b.onclick=()=>{closePicker();cb(it.value,it.label)};$('pickerList').appendChild(b)});const picker=$('pickerModal');picker.style.zIndex=!$('mkRecurringModal').classList.contains('hidden')?'130':'';picker.classList.remove('hidden')}function closePicker(){$('pickerModal').classList.add('hidden');$('pickerModal').style.zIndex=''}
function adjustBalance(){openPicker('残高を合わせる口座',Object.entries(balances).map(([k,v])=>({label:v.name,value:k})),(k,l)=>{openMoneyPrompt(l+' の実際の残高',balances[k].v,(n)=>{let d=n-balances[k].v;balances[k].v=n;cashbook.unshift({date:$('date').value,text:'残高調整：'+l,delta:d});renderAll()},{min:-999999999})})}
function saveSnapshot(){snapshots.unshift({date:$('date').value,value:total()});$('snapshotList').innerHTML=snapshots.map(s=>`<div class="row item"><span>${s.date}</span><strong>${yen(s.value)}</strong></div>`).join('')}
function setMode(m,b){mode=m;document.querySelectorAll('.mode-choice').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('loanSections').classList.toggle('hidden',m!=='loan');$('loanGroups').classList.toggle('hidden',m!=='loan');updateForm()}function setLoanSection(sec,b){loanSection=sec;document.querySelectorAll('#loanSections .mini').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('loanAdvance').classList.toggle('hidden',sec!=='advance');$('loanSettle').classList.toggle('hidden',sec!=='settle');$('loanLendBorrow').classList.toggle('hidden',sec!=='lendborrow');loanKind=sec==='advance'?'lend':sec==='settle'?'repay':'loanLend';document.querySelectorAll('.loan-detail-row').forEach(r=>r.querySelectorAll('.mini').forEach((x,i)=>x.classList.toggle('active',i===0)));updateForm()}function setLoanKind(k,b){loanKind=k;b.parentElement.querySelectorAll('.mini').forEach(x=>x.classList.remove('active'));b.classList.add('active');updateForm()}
function updateForm(){let lk=mode==='loan'?loanKind:'',isLoan=mode==='loan',isLend=isLoan&&lk==='lend';$('recordTopGrid').classList.toggle('loan-person-layout',isLoan);$('lendBox').classList.toggle('hidden',!isLend);$('lendPersonTop').classList.toggle('hidden',!isLend);$('personTop').classList.toggle('hidden',!(isLoan&&!isLend));$('normalAmount').classList.toggle('hidden',isLend);$('transferBox').classList.toggle('hidden',mode!=='transfer');$('transferFeeBox').classList.toggle('hidden',mode!=='transfer');$('recordFeeBox').classList.toggle('hidden',!(mode==='expense'||(mode==='loan'&&['repay','receive'].includes(lk))));$('chargeBox').classList.toggle('hidden',mode!=='charge');$('categoryField').classList.toggle('hidden',mode==='income'||mode==='transfer'||mode==='charge'||(mode==='loan'&&['repay','receive','loanBorrow','loanLend'].includes(lk)));$('paymentField').classList.toggle('hidden',mode==='transfer'||mode==='charge'||(mode==='loan'&&lk==='borrowed'));$('amountLabel').textContent=mode==='income'?'入金額':mode==='transfer'?'移動金額':mode==='charge'?'チャージ金額':mode==='loan'&&lk==='borrowed'?'自分の負担額':mode==='loan'&&lk==='repay'?'返した金額':mode==='loan'&&lk==='receive'?'返された金額':mode==='loan'&&lk==='loanBorrow'?'借りる金額':mode==='loan'&&lk==='loanLend'?'貸す金額':'金額';$('paymentLabel').textContent=mode==='income'?'入金先':mode==='loan'&&['receive','loanBorrow'].includes(lk)?'受取方法':'支払方法';renderPayBtns();renderPersonCandidates();mkRefreshRakPaySource()}
function calcLend(src){let g=moneyNum($('gross').value),m=moneyNum($('mine').value),t=moneyNum($('theirs').value);if(src==='g'){if($('mine').value!=='')$('theirs').value=Math.max(0,g-m);else if($('theirs').value!=='')$('mine').value=Math.max(0,g-t)}if(src==='m'&&$('gross').value!=='')$('theirs').value=Math.max(0,g-m);if(src==='t'&&$('gross').value!=='')$('mine').value=Math.max(0,g-t);refreshMoneyInputs()}
function payButton(k,label,extra=''){return `<button class="mini ${payment===k?'active':''}" ${extra||`onclick="pickPay('${k}',this)"`}>${label}</button>`}
function renderPayBtns(){
if(mode==='income'){$('otherPays').classList.add('hidden');$('payBtns').innerHTML=`<div class="income-pay-row">${payButton('seibu','西武信金')}${payButton('smbc','三井住友')}${payButton('rakbank','楽天銀行')}${payButton('yucho','ゆうちょ')}</div><div class="income-pay-row">${payButton('cash','現金')}${payButton('paypay','PayPay')}${payButton('suica','Suica')}${payButton('starbucks','Starbucks')}</div><div class="income-pay-row" style="max-width:25%">${payButton('other','その他')}</div>`;return}
let open=!$('otherPays').classList.contains('hidden');
$('payBtns').innerHTML=`<div class="pay-row">${payButton('cash','現金')}${payButton('paypay','PayPay')}${payButton('dcard','dカード')}${payButton('id','iD')}</div><div class="pay-row">${payButton('rakuten','楽天カード')}${payButton('lumine','ルミネカード')}${payButton('epos','エポスカード')}</div><div class="pay-row">${payButton('starbucks','Starbucks')}${payButton('suica','Suica')}${payButton('dpay','d払い')}<button id="morePayBtn" class="more-pay" type="button" onclick="toggleOtherPays()">${open?'閉じる':'もっと見る'}</button></div>`;
$('otherPays').innerHTML=`<div class="pay-row">${payButton('seibu','西武信金')}${payButton('smbc','三井住友')}${payButton('rakbank','楽天銀行')}${payButton('yucho','ゆうちょ')}</div><div class="pay-row">${payButton('rakutenpay','楽天Pay')}${payButton('edy','楽天Edy')}${payButton('paypal','PayPal')}${payButton('other','その他')}</div>`}
function toggleOtherPays(){let box=$('otherPays');box.classList.toggle('hidden');let b=$('morePayBtn');if(b)b.textContent=box.classList.contains('hidden')?'もっと見る':'閉じる'}
function toggleOptional(){let box=$('optionalInner');box.classList.toggle('hidden');$('optionalMark').textContent=box.classList.contains('hidden')?'＋':'−'}
function mkChooseRakPaySource(k){rakutenPaySource=k;mkRefreshRakPaySource()}
function mkRefreshRakPaySource(){const box=$('mkRakPaySource');if(!box)return;box.classList.toggle('hidden',!(mode==='expense'&&payment==='rakutenpay'));$('mkRakPayCard').classList.toggle('active',rakutenPaySource==='rakuten');$('mkRakPayBank').classList.toggle('active',rakutenPaySource==='rakbank');$('mkRakPayCash').classList.toggle('active',rakutenPaySource==='rakutencash')}
function pickPay(k,b){payment=k;document.querySelectorAll('#payBtns .mini,#otherPays .mini').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('installmentField').classList.toggle('hidden',!['dcard','rakuten','epos','lumine'].includes(k));mkRefreshRakPaySource()}
function pickInstallment(n,b){installments=n;document.querySelectorAll('#installmentField .mini').forEach(x=>x.classList.remove('active'));b.classList.add('active')}
function pickCategory(){openPicker('カテゴリを選択',cats.map(c=>({label:c,value:c})),(v,l)=>{category=v;$('categoryBtn').firstElementChild.textContent=l})}
function pickEvent(){openPicker('特別費イベント',[{label:'なし',value:''},...eventsData.filter(e=>!e.archived).map(e=>({label:e.name,value:e.name}))],(v,l)=>{eventTag=v;$('eventBtn').firstElementChild.textContent=l;$('fxBox').classList.toggle('hidden',true)})}
function autoTagEvent(){if(eventTag)return;let d=$('date').value;if(!d)return;let hit=eventsData.filter(e=>!e.archived&&e.start&&e.end&&d>=e.start&&d<=e.end);if(hit.length===1){eventTag=hit[0].name;$('eventBtn').firstElementChild.textContent=eventTag;$('fxBox').classList.toggle('hidden',true)}}
function pickAccount(w){openPicker(w==='from'?'移動元':'移動先',Object.entries(balances).map(([k,v])=>({label:v.name,value:k})),(v,l)=>{if(w==='from'){from=v;$('fromBtn').firstElementChild.textContent=l}else{to=v;$('toBtn').firstElementChild.textContent=l}})}
function chargeSourceLabel(k){return ({dcard:'dカード',epos:'エポスカード',lumine:'ルミネカード',cash:'現金',seibu:'西武信金',smbc:'三井住友',rakbank:'楽天銀行',yucho:'ゆうちょ'})[k]||k}
function chargeSourceButton(k,label){return `<button class="mini ${chargeSource===k?'active':''}" onclick="selectChargeSource('${k}',this)">${label}</button>`}
function renderCharge(){let targets=[['paypay','PayPay'],['suica','Suica'],['starbucks','Starbucks'],['rakutencash','楽天Pay残高']];$('chargeTargets').innerHTML=targets.map(x=>`<button class="mini ${chargeTarget===x[0]?'active':''}" onclick="selectChargeTarget('${x[0]}',this)">${x[1]}</button>`).join('');$('chargeSources').className='';$('chargeSources').innerHTML=`<div class="charge-source-row">${chargeSourceButton('dcard','dカード')}${chargeSourceButton('epos','エポスカード')}${chargeSourceButton('lumine','ルミネカード')}${chargeSourceButton('cash','現金')}</div><div class="charge-source-row">${chargeSourceButton('seibu','西武信金')}${chargeSourceButton('smbc','三井住友')}${chargeSourceButton('rakbank','楽天銀行')}${chargeSourceButton('yucho','ゆうちょ')}</div>`;updateChargeHint()}
function selectChargeTarget(k,b){chargeTarget=k;chargeSource=chargeDefaults[k]||'';renderCharge()}
function selectChargeSource(k,b){chargeSource=k;renderCharge()}
function changeChargeDefault(){if(!chargeTarget)return;let opts=[['dcard','dカード'],['epos','エポスカード'],['lumine','ルミネカード'],['cash','現金'],['seibu','西武信金'],['smbc','三井住友'],['rakbank','楽天銀行'],['yucho','ゆうちょ']].map(x=>({value:x[0],label:x[1]}));openPicker('いつものチャージ元',opts,(v,l)=>{chargeDefaults[chargeTarget]=v;chargeSource=v;renderCharge()})}
function updateChargeHint(){if(!chargeTarget){$('chargeDefaultHint').textContent='チャージ先を選ぶと、いつものチャージ元を自動選択します。';return}let d=chargeDefaults[chargeTarget];$('chargeDefaultHint').innerHTML='いつものチャージ元：'+chargeSourceLabel(d)+' <button type="button" class="inline-setting" onclick="changeChargeDefault()">設定変更</button>'}
function pickDiscount(v,b){discount=v;document.querySelectorAll('#discountBtns .mini').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('customDiscount').classList.toggle('hidden',v!=='custom')}function disc(){return discount==='custom'?Number($('customDiscount').value||0):Number(discount||0)}function acct(k){return balances[k]?k:null}function move(d,text,delta,k,refId=''){if(!k)return;balances[k].v+=delta;cashbook.unshift({date:d,text,delta,refId})}
function setTransferFeeSide(side,b){transferFeeSide=side;document.querySelectorAll('#transferFeePayer .mini').forEach(x=>x.classList.remove('active'));if(b)b.classList.add('active')}
function toggleTransferFeePayer(){let fee=moneyNum($('transferFee').value);$('transferFeePayer').classList.toggle('hidden',fee<=0)}
function saveRecord(){let d=$('date').value,a=moneyNum($('amount').value),memo=$('memo').value.trim(),pts=Number($('points').value||0),dc=disc(),txid='tx'+Date.now()+Math.random().toString(36).slice(2,7);$('recordError').textContent='';if(mode==='expense'){if(a<=0||!category||!payment)return err('金額・カテゴリ・支払方法を確認してね');let fee=moneyNum($('recordFee').value);if(fee<0)return err('手数料は0円以上にしてね');let paid=Math.max(0,a-pts),billed=Math.round(paid*(1-dc/100))+fee;if(payment==='rakutenpay'&&rakutenPaySource==='rakutencash'&&balances.rakutencash.v<paid+fee)return err('楽天Pay残高が不足しています。ホームの「残高を合わせる」で残高を確認してね');let t={id:txid,date:d,type:'expense',amount:a,paid,billed,fee,category,payment,memo,points:pts,discount:dc,eventTag,installments, ...(payment==='rakutenpay'?{rakutenPaySource}: {})};txs.unshift(t);const payAccount=payment==='rakutenpay'?rakutenPaySource:payment;if(acct(payAccount))move(d,category+(memo?'・'+memo:''),-(paid+fee),payAccount,txid)}else if(mode==='income'){if(a<=0||!payment)return err('入金額と入金先を確認してね');let t={id:txid,date:d,type:'income',amount:a,payment,memo};txs.unshift(t);if(acct(payment))move(d,'入金'+(memo?'・'+memo:''),a,payment,txid)}else if(mode==='transfer'){let fee=moneyNum($('transferFee').value),feeSide=fee>0?transferFeeSide:'from';if(a<=0||!from||!to||from===to||fee<0)return err('金額・移動元・移動先・手数料を確認してね');if(fee>0&&feeSide==='to'&&a<=fee)return err('移動先から手数料を引く場合は、移動金額より小さい手数料にしてね');let t={id:txid,date:d,type:'transfer',amount:a,fee,feeSide,from,to};txs.unshift(t);if(feeSide==='to'){balances[from].v-=a;balances[to].v+=a-fee}else{balances[from].v-=a+fee;balances[to].v+=a}if(fee>0)cashbook.unshift({date:d,text:'振込手数料',delta:-fee,refId:txid})}else if(mode==='charge'){if(a<=0||!chargeTarget||!chargeSource)return err('金額・チャージ先・チャージ元を確認してね');let t={id:txid,date:d,type:'charge',amount:a,target:chargeTarget,source:chargeSource,billed:Math.round(a*(1-dc/100)),discount:dc};txs.unshift(t);balances[chargeTarget].v+=a;if(acct(chargeSource)){balances[chargeSource].v-=a}else{cashbook.unshift({date:d,text:(pays.find(x=>x[0]===chargeSource)||['',chargeSource])[1]+'→'+balances[chargeTarget].name+'チャージ',delta:a,refId:txid})}}else if(mode==='loan'){if(loanKind==='lend'){let g=moneyNum($('gross').value),m=moneyNum($('mine').value),t=moneyNum($('theirs').value),p=$('lendPerson').value.trim();if(g<=0||t<=0||Math.round(m+t)!==Math.round(g)||!p||!category||!payment)return err('立替の入力を確認してね');lastSavedLoanPerson=p;let tx={id:txid,date:d,type:'lend',amount:m,gross:g,category,payment,person:p,other:t,memo,eventTag};txs.unshift(tx);if(acct(payment))move(d,category+'（'+p+'分を立替）',-g,payment,txid)}else{let p=$('person').value.trim();if(a<=0||!p)return err('金額と相手を確認してね');lastSavedLoanPerson=p;let fee=['repay','receive'].includes(loanKind)?moneyNum($('recordFee').value):0;if(fee<0)return err('手数料は0円以上にしてね');if(loanKind==='borrowed'){if(!category)return err('カテゴリを選んでね');txs.unshift({id:txid,date:d,type:'borrowed',amount:a,category,person:p,memo,eventTag})}else{if(!payment)return err('支払・受取方法を選んでね');let tx={id:txid,date:d,type:loanKind,amount:a,fee,person:p,payment,memo};txs.unshift(tx);if(acct(payment)){if(loanKind==='repay')move(d,p+'へ返済',-(a+fee),payment,txid);if(loanKind==='receive')move(d,p+'から返済',a-fee,payment,txid);if(loanKind==='loanBorrow')move(d,p+'から借入',a,payment,txid);if(loanKind==='loanLend')move(d,p+'へ貸付',-a,payment,txid)}}}}if(mode==='loan')reviveArchivedLoanPersonOnNewRecord(lastSavedLoanPerson);renderAll();$('goLoansBtn').classList.toggle('hidden',mode!=='loan');$('savedModal').classList.remove('hidden')}
function err(s){$('recordError').textContent=s}function continueRecord(){$('savedModal').classList.add('hidden');clearFields();scrollTo(0,0)}function goHistory(){$('savedModal').classList.add('hidden');clearFields();nav('history',document.querySelectorAll('.nav')[2])}function goLoans(){$('savedModal').classList.add('hidden');if(lastSavedLoanPerson){loanActivePerson=lastSavedLoanPerson;loanExpandedPerson=lastSavedLoanPerson}loanArchiveView=false;loanOrganize=false;loanAddToGroupId='';loanSelectedIds.clear();clearFields();openOther('loans');renderLoans()}function clearFields(){['amount','gross','mine','theirs','lendPerson','person','memo','points','customDiscount','nzd','transferFee','recordFee'].forEach(id=>{if($(id))$(id).value=''});category='';eventTag='';payment='';rakutenPaySource='rakuten';mkRefreshRakPaySource();$('categoryBtn').firstElementChild.textContent='選んでください';$('eventBtn').firstElementChild.textContent='なし';$('optionalInner').classList.add('hidden');if($('optionalMark'))$('optionalMark').textContent='＋';$('otherPays').classList.add('hidden');$('fxBox').classList.add('hidden')}
function isLoanExtra(t){return t.type==='loanExtraLend'||t.type==='loanExtraBorrow'}
function typeGroup(t){return ['lend','borrowed','repay','receive','loanBorrow','loanLend','loanExtraLend','loanExtraBorrow','loanAdjustment'].includes(t.type)?'loan':t.type}
function txAmount(t){return t.type==='lend'?Number(t.gross||0):Number(t.amount||0)}
function reverseTxEffect(t){let a=Number(t.amount||0);if(t.type==='expense'&&acct(t.payment==='rakutenpay'?t.rakutenPaySource:t.payment))balances[t.payment==='rakutenpay'?t.rakutenPaySource:t.payment].v+=Number(t.paid??a)+Number(t.fee||0);else if(t.type==='income'&&acct(t.payment))balances[t.payment].v-=a;else if(t.type==='transfer'){let fee=Number(t.fee||0),side=t.feeSide||'from';if(side==='to'){if(balances[t.from])balances[t.from].v+=a;if(balances[t.to])balances[t.to].v-=a-fee}else{if(balances[t.from])balances[t.from].v+=a+fee;if(balances[t.to])balances[t.to].v-=a}}else if(t.type==='charge'){if(balances[t.target])balances[t.target].v-=a;if(acct(t.source))balances[t.source].v+=a}else if(t.type==='lend'&&acct(t.payment))balances[t.payment].v+=Number(t.paid??t.gross??0);else if(t.type==='repay'&&acct(t.payment))balances[t.payment].v+=a+Number(t.fee||0);else if(t.type==='receive'&&acct(t.payment))balances[t.payment].v-=a-Number(t.fee||0);else if(t.type==='loanBorrow'&&acct(t.payment))balances[t.payment].v-=a;else if(t.type==='loanLend'&&acct(t.payment))balances[t.payment].v+=a;cashbook=cashbook.filter(x=>x.refId!==t.id)}
function applyTxEffect(t){let a=Number(t.amount||0);if(t.type==='expense'&&acct(t.payment==='rakutenpay'?t.rakutenPaySource:t.payment))move(t.date,t.category+(t.memo?'・'+t.memo:''),-(Number(t.paid??a)+Number(t.fee||0)),t.payment==='rakutenpay'?t.rakutenPaySource:t.payment,t.id);else if(t.type==='income'&&acct(t.payment))move(t.date,'入金'+(t.memo?'・'+t.memo:''),a,t.payment,t.id);else if(t.type==='transfer'){let fee=Number(t.fee||0),side=t.feeSide||'from';if(side==='to'){if(balances[t.from])balances[t.from].v-=a;if(balances[t.to])balances[t.to].v+=a-fee}else{if(balances[t.from])balances[t.from].v-=a+fee;if(balances[t.to])balances[t.to].v+=a}if(fee>0)cashbook.unshift({date:t.date,text:'振込手数料',delta:-fee,refId:t.id})}else if(t.type==='charge'){if(balances[t.target])balances[t.target].v+=a;if(acct(t.source))balances[t.source].v-=a;else cashbook.unshift({date:t.date,text:(pays.find(x=>x[0]===t.source)||['',t.source])[1]+'→'+(balances[t.target]?.name||t.target)+'チャージ',delta:a,refId:t.id})}else if(t.type==='lend'&&acct(t.payment))move(t.date,t.category+'（'+t.person+'分を立替）',-Number(t.gross||0),t.payment,t.id);else if(t.type==='repay'&&acct(t.payment))move(t.date,t.person+'へ返済',-(a+Number(t.fee||0)),t.payment,t.id);else if(t.type==='receive'&&acct(t.payment))move(t.date,t.person+'から返済',a-Number(t.fee||0),t.payment,t.id);else if(t.type==='loanBorrow'&&acct(t.payment))move(t.date,t.person+'から借入',a,t.payment,t.id);else if(t.type==='loanLend'&&acct(t.payment))move(t.date,t.person+'へ貸付',-a,t.payment,t.id)}
function deleteHistoryRecord(id){let t=txs.find(x=>x.id===id);if(!t)return;let group=loanGroupForTx(id);if(group?.adjustmentId){alert('清算済みグループの記録は、グループ解除で清算調整を取り消してから削除してね');return;}let label=typeGroup(t)==='loan'?'この貸し借り記録':'この記録';if(!confirm(isLoanExtra(t)?'この記録外の貸し借りを削除しますか？\n貸し借り残高だけ再計算します。':label+'を削除しますか？\n\n関連する残高・カード請求予定・貸し借り残高も連動して戻します。'))return;reverseTxEffect(t);txs=txs.filter(x=>x.id!==id);renderAll()}
function toggleHistMore(){histMoreOpen=!histMoreOpen;if($('histFilterExtra'))$('histFilterExtra').classList.toggle('hidden',!histMoreOpen);if($('histMoreBtn'))$('histMoreBtn').textContent=histMoreOpen?'閉じる':'もっと';renderHistFilterStatus()}function renderHistFilterStatus(){let n=[histPeriod,histCat,histPay,histEvent].filter(Boolean).length;let reset=$('mkHistReset');if(reset){let active=!!((histKeyword||'').trim()||histType!=='all'||histStart||histEnd||n);reset.disabled=!active;reset.classList.toggle('is-inactive',!active)}let el=$('histFilterStatus');if(!el)return;el.textContent=n?'絞り込み中 '+n+'件':'';el.classList.toggle('hidden',!n||histMoreOpen)}
function resetHistoryFilters(){
 histKeyword='';histType='all';histPeriod='';histCat='';histPay='';histEvent='';histStart='';histEnd='';
 if($('histKeyword'))$('histKeyword').value='';
 if($('histStart'))$('histStart').value='';
 if($('histEnd'))$('histEnd').value='';
 if($('histCustomDates'))$('histCustomDates').classList.add('hidden');
 [['histPeriodBtn','期間'],['histCatBtn','カテゴリ'],['histPayBtn','支払方法'],['histEventBtn','特別費']].forEach(([id,label])=>{if($(id))$(id).textContent=label+'：すべて'});
 document.querySelectorAll('#histTypeBtns .mini').forEach(b=>b.classList.toggle('active',b.textContent.trim()==='すべて'));
 renderHistory();
}
function setHistory(t){histTab=t;$('histSpendBtn').classList.toggle('active',t==='spend');$('histCashBtn').classList.toggle('active',t==='cash');$('historyFilters').classList.toggle('hidden',t!=='spend');$('spendHistory').classList.toggle('hidden',t!=='spend');$('cashHistory').classList.toggle('hidden',t!=='cash');if($('histFilterExtra'))$('histFilterExtra').classList.toggle('hidden',!histMoreOpen);renderHistFilterStatus();renderHistory()}
function setHistType(t,b){histType=t;document.querySelectorAll('#histTypeBtns .mini').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderHistory()}
function histEventNames(){return [...new Set([...eventsData.map(e=>e.name),...deletedEventNames,...txs.map(t=>t.eventTag).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,'ja'))}
function pickHistCat(){openPicker('カテゴリで絞り込み',[{label:'すべて',value:''},...cats.map(c=>({label:c,value:c}))],(v,l)=>{histCat=v;$('histCatBtn').textContent='カテゴリ：'+l;renderHistFilterStatus();renderHistory()})}
function pickHistPay(){openPicker('支払方法で絞り込み',[{label:'すべて',value:''},...pays.map(x=>({label:x[1],value:x[0]}))],(v,l)=>{histPay=v;$('histPayBtn').textContent='支払方法：'+l;renderHistFilterStatus();renderHistory()})}
function pickHistEvent(){openPicker('特別費で絞り込み',[{label:'すべて',value:''},{label:'特別費なし',value:'__none'},...histEventNames().map(n=>({label:n,value:n}))],(v,l)=>{histEvent=v;$('histEventBtn').textContent='特別費：'+l;renderHistFilterStatus();renderHistory()})}
function monthRange(offset=0){let n=new Date(),y=n.getFullYear(),m=n.getMonth()+offset;let a=new Date(y,m,1),b=new Date(y,m+1,0);return [dateISO(a.getFullYear(),a.getMonth()+1,1),dateISO(b.getFullYear(),b.getMonth()+1,b.getDate())]}
function pickHistPeriod(){openPicker('期間で絞り込み',[{label:'すべて',value:''},{label:'今月',value:'thisMonth'},{label:'先月',value:'lastMonth'},{label:'過去3ヶ月',value:'3months'},{label:'今年',value:'year'},{label:'期間指定',value:'custom'}],(v,l)=>{histPeriod=v;$('histPeriodBtn').textContent='期間：'+l;$('histCustomDates').classList.toggle('hidden',v!=='custom');renderHistFilterStatus();renderHistory()})}
function historyDateMatch(d){if(!histPeriod)return true;let today=new Date(),isoToday=dateISO(today.getFullYear(),today.getMonth()+1,today.getDate()),a='',b='';if(histPeriod==='thisMonth')[a,b]=monthRange(0);else if(histPeriod==='lastMonth')[a,b]=monthRange(-1);else if(histPeriod==='3months'){let x=new Date(today.getFullYear(),today.getMonth()-2,1);a=dateISO(x.getFullYear(),x.getMonth()+1,1);b=isoToday}else if(histPeriod==='year'){a=dateISO(today.getFullYear(),1,1);b=isoToday}else if(histPeriod==='custom'){a=histStart||'0000-01-01';b=histEnd||'9999-12-31'}return d>=a&&d<=b}
function canonicalPay(k){
 const val=String(k??'').trim();if(!val)return '';
 const hit=pays.find(([code,label])=>code===val||label===val);if(hit)return hit[0];
 const aliases={'bank':'bank','銀行':'bank','財布':'cash','現金':'cash','PayPay':'paypay','paypay':'paypay','西武信金':'seibu','三井住友':'smbc','楽天銀行':'rakbank'};
 return aliases[val]||val;
}
function payName(k){const code=canonicalPay(k);return code==='bank'?'銀行':(pays.find(x=>x[0]===code)||['',k||''])[1]}
function recordTitle(t){if(t.type==='expense')return t.category||'支出';if(t.type==='income')return '入金';if(t.type==='transfer')return '資金移動';if(t.type==='charge')return 'チャージ';let names={lend:'私が立替',borrowed:'相手が立替',repay:'返した',receive:'返された',loanBorrow:'借りる',loanLend:'貸す'};return names[t.type]||t.type}
function recordMeta(t){let a=[];if(t.type==='expense'){if(t.payment)a.push(payName(t.payment)+(t.payment==='rakutenpay'?'（'+(t.rakutenPaySource==='rakutencash'?'楽天Pay残高':t.rakutenPaySource==='rakbank'?'楽天銀行':'楽天カード')+'）':''));if(t.points)a.push('✨'+Number(t.points).toLocaleString()+'pt');if(t.discount)a.push('引落時'+t.discount+'%OFF')}else if(t.type==='income'){if(t.payment)a.push(payName(t.payment))}else if(t.type==='transfer'){a.push((balances[t.from]?.name||t.from)+' → '+(balances[t.to]?.name||t.to));if(Number(t.fee||0)>0)a.push('手数料 '+yen(t.fee)+'（'+((t.feeSide||'from')==='to'?'移動先':'移動元')+'）')}else if(t.type==='charge'){a.push((balances[t.target]?.name||t.target)+' ← '+payName(t.source))}else{if(t.person)a.push(t.person);if(t.payment)a.push(payName(t.payment));if(t.type==='lend'){a.push('相手分 '+yen(t.other));if(t.points)a.push('✨'+Number(t.points).toLocaleString()+'pt');if(t.discount)a.push('引落時'+t.discount+'%OFF')}}if(Number(t.fee||0)>0&&t.type!=='transfer')a.push('手数料 '+yen(t.fee));if(t.eventTag)a.push(t.eventTag);if(t.memo)a.push(t.memo);return a.join('・')}
function historyRecordMeta(t){let a=[];if(t.type==='expense'){if(t.payment)a.push(payName(t.payment)+(t.payment==='rakutenpay'?'（'+(t.rakutenPaySource==='rakutencash'?'楽天Pay残高':t.rakutenPaySource==='rakbank'?'楽天銀行':'楽天カード')+'）':''));if(t.points)a.push('✨'+Number(t.points).toLocaleString()+'pt');if(t.discount)a.push('引落時'+t.discount+'%OFF')}else if(t.type==='income'){if(t.payment)a.push(payName(t.payment))}else if(t.type==='transfer'){a.push((balances[t.from]?.name||t.from)+' → '+(balances[t.to]?.name||t.to));if(Number(t.fee||0)>0)a.push('手数料 '+yen(t.fee)+'（'+((t.feeSide||'from')==='to'?'移動先':'移動元')+'）')}else if(t.type==='charge'){a.push((balances[t.target]?.name||t.target)+' ← '+payName(t.source))}else{if(t.person)a.push(t.person);if(t.payment)a.push(payName(t.payment));if(t.type==='lend'){a.push('相手分 '+yen(t.other));if(t.points)a.push('✨'+Number(t.points).toLocaleString()+'pt');if(t.discount)a.push('引落時'+t.discount+'%OFF')}}if(Number(t.fee||0)>0&&t.type!=='transfer')a.push('手数料 '+yen(t.fee));if(t.eventTag)a.push(t.eventTag);return a.join('・')}
function renderHistory(){renderHistFilterStatus();if(histTab==='spend'){let q=(histKeyword||'').trim().toLowerCase();let terms=q.match(/(?:[¥￥]?[0-9][0-9,，]*円?|[^\s　]+)/g)||[];let arr=txs.filter(t=>!isLoanExtra(t)&&t.type!=='loanAdjustment').filter(t=>histType==='all'||typeGroup(t)===histType).filter(t=>!histCat||t.category===histCat||(histCat==='手数料'&&['expense','transfer','repay','receive'].includes(t.type)&&Number(t.fee||0)>0)).filter(t=>!histPay||[t.payment,t.source,t.from,t.to].some(v=>canonicalPay(v)===histPay)).filter(t=>!histEvent||(histEvent==='__none'?!t.eventTag:t.eventTag===histEvent)).filter(t=>historyDateMatch(t.date)).filter(t=>terms.every(term=>{const plain=term.replace(/[¥￥円,，]/g,'');const corpus=[t.memo,t.category,t.eventTag,t.person,recordTitle(t),recordMeta(t)].filter(Boolean).join(' ').toLowerCase();return /^\d+$/.test(plain)?String(Math.abs(txAmount(t))).includes(plain):corpus.includes(term)}));$('spendHistory').innerHTML=arr.length?arr.map(t=>{let meta=[t.date,historyRecordMeta(t)].filter(Boolean).join('・');return `<div class="item"><div class="history-item-main"><div class="history-item-title">${safeHtml(recordTitle(t))}</div><div class="history-item-amt">${yen(txAmount(t))}</div></div><div class="history-item-sub"><div class="history-item-left"><div class="history-item-meta">${safeHtml(meta)}</div>${t.memo?`<div class="history-item-note">${safeHtml(t.memo)}</div>`:''}</div><div class="history-actions"><button class="ghost sm" onclick="editRecord('${t.id}')">編集</button><button class="ghost sm danger" onclick="deleteHistoryRecord('${t.id}')">削除</button></div></div></div>`}).join(''):'<div class="small" style="margin-top:12px">該当記録なし</div>'}else{let opening=0,rows=[...cashbook].reverse(),r=opening,calc=rows.map(x=>{r+=x.delta;return {...x,r}}).reverse();$('cashHistory').innerHTML=calc.length?`<table class="passbook"><thead><tr><th>日付</th><th>内容</th><th>出金</th><th>入金</th><th>残高</th></tr></thead><tbody>${calc.map(x=>`<tr><td>${x.date.slice(5).replace('-','/')}</td><td>${x.text}</td><td>${x.delta<0?yen(-x.delta):''}</td><td>${x.delta>0?yen(x.delta):''}</td><td>${yen(x.r)}</td></tr>`).join('')}</tbody></table>`:'<div class="small" style="margin-top:12px">まだ手元資金の動きはありません。</div>'}}
function selectOptions(items,val){return items.map(x=>`<option value="${x[0]}" ${x[0]===val?'selected':''}>${x[1]}</option>`).join('')}
function editRecord(id){let t=txs.find(x=>x.id===id);if(!t)return;let group=loanGroupForTx(id);if(group?.adjustmentId){alert('清算済みグループの記録は、グループ解除で清算調整を取り消してから編集してね');return;}editingId=id;const editKind=document.getElementById('editRecordKind');if(editKind)editKind.textContent='｜'+recordTitle(t);
 if(isLoanExtra(t)){
  $('editBody').innerHTML=`<div class="small" style="margin-bottom:9px">登録日：${safeHtml(t.date)}（変更なし）</div><div class="field"><label>貸し・借り</label><select id="editExtraType"><option value="loanExtraLend" ${t.type==='loanExtraLend'?'selected':''}>貸し</option><option value="loanExtraBorrow" ${t.type==='loanExtraBorrow'?'selected':''}>借り</option></select></div><div class="field"><label>金額</label><input id="editExtraAmount" type="text" inputmode="numeric" min="1" step="1" value="${Number(t.amount)}"></div><div class="field"><label>相手</label><input id="editExtraPerson" maxlength="60" value="${safeHtml(t.person)}"></div><div class="field"><label>メモ（任意）</label><input id="editExtraMemo" maxlength="300" value="${safeHtml(t.memo||'')}"></div>`;
  compactEditLayout(t);$('editError').textContent='';$('editModal').classList.remove('hidden');return;
 }
 let h=`<div class="field"><label>日付</label><input id="editDate" type="date" value="${t.date}"></div>`;if(t.type==='lend'){h+=`<div class="grid2"><div class="field"><label>会計総額</label><input id="editGross" type="text" value="${t.gross||0}"></div><div class="field"><label>自分の分</label><input id="editMine" type="text" value="${t.amount||0}"></div></div><div class="field"><label>相手の分</label><input id="editOther" type="text" value="${t.other||0}"></div>`}else h+=`<div class="field"><label>金額</label><input id="editAmount" type="text" value="${t.amount||0}"></div>`;if(['expense','lend','borrowed'].includes(t.type))h+=`<div class="field"><label>カテゴリ</label><select id="editCategory">${selectOptions(cats.map(c=>[c,c]),t.category||'')}</select></div>`;if(['expense','income','lend','repay','receive','loanBorrow','loanLend'].includes(t.type)){let ep=t.type==='income'?incomePays:pays;let el=t.type==='income'?'入金先':'支払・受取方法';h+=`<div class="field"><label>${el}</label><select id="editPayment">${selectOptions(ep,t.payment||'')}</select></div>`;}if(['expense','lend'].includes(t.type))h+=`<div class="field" id="editRakPaySourceField" style="${t.payment==='rakutenpay'?'':'display:none'}"><label>楽天Payの支払元</label><select id="editRakPaySource"><option value="rakuten" ${(t.rakutenPaySource||'rakuten')==='rakuten'?'selected':''}>楽天カード</option><option value="rakbank" ${t.rakutenPaySource==='rakbank'?'selected':''}>楽天銀行</option><option value="rakutencash" ${t.rakutenPaySource==='rakutencash'?'selected':''}>楽天Pay残高</option></select></div>`;if(['expense','repay','receive'].includes(t.type))h+=`<div class="field"><label>手数料（任意）</label><input id="editRecordFee" type="text" inputmode="numeric" value="${t.fee||0}"></div>`;if(['expense','lend'].includes(t.type))h+=`<div class="grid2"><div class="field"><label>ポイント使用</label><input id="editPoints" type="number" inputmode="numeric" min="0" step="1" value="${t.points||0}"></div><div class="field"><label>引落時割引（%）</label><input id="editDiscount" type="number" inputmode="decimal" min="0" max="100" step="0.1" value="${t.discount||0}"></div></div><div class="field"><label>分割回数</label><select id="editInstallments">${selectOptions([[1,'1回'],[2,'2回'],[3,'3回'],[6,'6回']],Number(t.installments||1))}</select></div>`;if(t.type==='transfer')h+=`<div class="grid2"><div class="field"><label>移動元</label><select id="editFrom">${selectOptions(Object.entries(balances).map(([k,v])=>[k,v.name]),t.from)}</select></div><div class="field"><label>移動先</label><select id="editTo">${selectOptions(Object.entries(balances).map(([k,v])=>[k,v.name]),t.to)}</select></div></div><div class="field"><label>手数料（任意）</label><input id="editTransferFee" type="text" inputmode="numeric" value="${t.fee||0}"></div><div class="field"><label>手数料の引落先</label><select id="editTransferFeeSide"><option value="from" ${(t.feeSide||'from')==='from'?'selected':''}>移動元</option><option value="to" ${(t.feeSide||'from')==='to'?'selected':''}>移動先</option></select></div>`;if(t.type==='charge')h+=`<div class="grid2"><div class="field"><label>チャージ先</label><select id="editTarget">${selectOptions([['paypay','PayPay'],['suica','Suica'],['starbucks','Starbucks'],['rakutencash','楽天Pay残高']],t.target)}</select></div><div class="field"><label>チャージ元</label><select id="editSource">${selectOptions(pays,t.source)}</select></div></div>`;if(typeGroup(t)==='loan')h+=`<div class="field"><label>相手</label><input id="editPerson" value="${t.person||''}"></div>`;if(['expense','lend','borrowed'].includes(t.type))h+=`<div class="field"><label>特別費イベント</label><select id="editEvent"><option value="">なし</option>${eventsData.map(e=>`<option value="${e.name}" ${e.name===t.eventTag?'selected':''}>${e.name}</option>`).join('')}</select></div>`;if(!['transfer','charge'].includes(t.type))h+=`<div class="field"><label>店名・メモ</label><input id="editMemo" value="${(t.memo||'').replace(/"/g,'&quot;')}"></div>`;if(t.type!=='lend'){h=h.replace(/^(<div class="field"><label>日付<\/label>.*?<\/div>)(<div class="field"><label>金額<\/label>.*?<\/div>)/,'<div class="grid2">$1$2</div>')} $('editBody').innerHTML=h;compactEditLayout(t);if($('editPayment')&&$('editRakPaySourceField'))$('editPayment').addEventListener('change',()=>{$('editRakPaySourceField').style.display=$('editPayment').value==='rakutenpay'?'':'none'});$('editError').textContent='';$('editModal').classList.remove('hidden')}
function compactEditLayout(t){
 const root=$('editBody');if(!root)return;
 const original=[...root.querySelectorAll('.field')];
 const fields=new Map();for(const el of original){const control=el.querySelector('[id]');if(control)fields.set(control.id,el)}
 const used=new Set();
 const take=id=>{const el=fields.get(id);if(el&&!used.has(id)){used.add(id);el.remove();return el}return null};
 const row=(ids,parent=root)=>{const cells=ids.map(take).filter(Boolean);if(!cells.length)return;const wrap=document.createElement('div');wrap.className='mk-edit-pair';cells.forEach(c=>wrap.appendChild(c));parent.appendChild(wrap)};
 const single=(id,parent=root)=>{const el=take(id);if(el)parent.appendChild(el)};
 root.replaceChildren();
 if(t.type==='lend'){
  row(['editDate','editGross']);row(['editMine','editOther']);row(['editPerson','editCategory']);row(['editPayment','editMemo']);
 }else if(isLoanExtra(t)){
  row(['editExtraType','editExtraAmount']);row(['editExtraPerson','editExtraMemo']);
 }else if(t.type==='transfer'){
  row(['editDate','editAmount']);row(['editFrom','editTo']);row(['editTransferFee','editTransferFeeSide']);
 }else if(t.type==='charge'){
  row(['editDate','editAmount']);row(['editTarget','editSource']);
 }else if(t.type==='expense'){
  row(['editDate','editAmount']);row(['editCategory','editPayment']);row(['editMemo','editRakPaySource']);
 }else if(t.type==='income'){
  row(['editDate','editAmount']);row(['editPayment','editMemo']);
 }else{
  row(['editDate','editAmount']);row(['editPayment','editPerson']);row(['editMemo','editRecordFee']);
 }
 if(['expense','lend'].includes(t.type)){
  const details=document.createElement('details');details.className='mk-edit-details';
  const summary=document.createElement('summary');summary.textContent='詳細設定';details.appendChild(summary);
  const hint=document.createElement('div');hint.className='mk-edit-detail-hint';
  const vals=[];if(Number(t.points))vals.push(Number(t.points).toLocaleString()+'pt');if(Number(t.discount))vals.push('引落時'+t.discount+'%OFF');if(Number(t.installments||1)>1)vals.push(t.installments+'回払い');if(Number(t.fee))vals.push('手数料'+Number(t.fee).toLocaleString()+'円');if(t.eventTag)vals.push(t.eventTag);
  hint.textContent=vals.length?vals.join(' ・ '):'ポイント・割引・分割・手数料・特別費';details.appendChild(hint);
  row(['editPoints','editDiscount'],details);
  if(t.type==='lend')row(['editInstallments','editEvent'],details);
  else row(['editInstallments','editRecordFee'],details);
  if(t.type==='lend')single('editRecordFee',details);
  else single('editEvent',details);
  root.appendChild(details);
 }else{
  row(['editRecordFee','editEvent']);
 }
 for(const [id,el] of fields){if(!used.has(id)){el.remove();root.appendChild(el);used.add(id)}}
}
function deleteEditingRecord(){
 const id=editingId;if(!id)return;
 // Reuse the same deletion confirmation and balance recalculation as History.
 deleteHistoryRecord(id);
 if(!txs.some(t=>t.id===id))closeEditRecord();
}
function closeEditRecord(){editingId='';$('editModal').classList.add('hidden')}
function saveEditedRecord(){let t=txs.find(x=>x.id===editingId);if(!t)return;
 if(isLoanExtra(t)){
  let amount=moneyNum($('editExtraAmount').value),person=$('editExtraPerson').value.trim();let group=loanGroupForTx(t.id);if(group&&group.person!==person){$('editError').textContent='グループ化された履歴は相手を変更できません。先にグループを解除してね';return;}
  if(!Number.isSafeInteger(amount)||amount<=0||!person){$('editError').textContent='相手と1円以上の金額を入力してね';return}
  t.type=$('editExtraType').value;t.amount=amount;t.person=person;t.memo=$('editExtraMemo').value.trim();
  loanArchiveView=false;loanActivePerson=person;loanExpandedPerson=person;
  closeEditRecord();renderAll();return;
 }
 let old={...t};let group=loanGroupForTx(t.id);if(group&&$('editPerson')&&$('editPerson').value.trim()!==group.person){$('editError').textContent='グループ化された履歴は相手を変更できません。先にグループを解除してね';return;}let d=$('editDate').value;if(!d){$('editError').textContent='日付を確認してね';return}reverseTxEffect(old);t.date=d;if(t.type==='lend'){let g=moneyNum($('editGross').value),m=moneyNum($('editMine').value),o=moneyNum($('editOther').value);if(g<=0||m<0||o<0||Math.round(m+o)!==Math.round(g)){Object.assign(t,old);applyTxEffect(old);$('editError').textContent='会計総額＝自分の分＋相手の分になるようにしてね';return}t.gross=g;t.amount=m;t.other=o}else{let a=moneyNum($('editAmount').value);if(a<=0){Object.assign(t,old);applyTxEffect(old);$('editError').textContent='金額を確認してね';return}t.amount=a}if($('editCategory'))t.category=$('editCategory').value;if($('editPayment'))t.payment=$('editPayment').value;if(['expense','lend'].includes(t.type))t.rakutenPaySource=t.payment==='rakutenpay'?$('editRakPaySource').value:undefined;if($('editRecordFee'))t.fee=moneyNum($('editRecordFee').value);if($('editFrom'))t.from=$('editFrom').value;if($('editTo'))t.to=$('editTo').value;if($('editTransferFee'))t.fee=moneyNum($('editTransferFee').value);if($('editTransferFeeSide'))t.feeSide=$('editTransferFeeSide').value;if($('editTarget'))t.target=$('editTarget').value;if($('editSource'))t.source=$('editSource').value;if($('editPerson'))t.person=$('editPerson').value.trim();if($('editEvent'))t.eventTag=$('editEvent').value;if($('editMemo'))t.memo=$('editMemo').value.trim();if(['expense','lend'].includes(t.type)){const points=Number($('editPoints').value),dc=Number($('editDiscount').value),n=Number($('editInstallments').value),gross=t.type==='lend'?Number(t.gross):Number(t.amount);if(!Number.isSafeInteger(points)||points<0||points>gross||!Number.isFinite(dc)||dc<0||dc>100||![1,2,3,6].includes(n)){Object.assign(t,old);applyTxEffect(old);$('editError').textContent='ポイント・割引率・分割回数を確認してね';return}t.points=points;t.discount=dc;t.installments=n;t.paid=gross-points;t.billed=Math.round(t.paid*(1-dc/100))+Number(t.fee||0)}if(t.type==='charge')t.billed=Math.round(Number(t.amount)*(1-Number(t.discount||0)/100));if(Number(t.fee||0)<0){Object.assign(t,old);applyTxEffect(old);$('editError').textContent='手数料は0円以上にしてね';return}if(t.type==='expense'&&t.payment==='rakutenpay'&&t.rakutenPaySource==='rakutencash'&&balances.rakutencash.v<Number(t.paid||0)+Number(t.fee||0)){Object.assign(t,old);applyTxEffect(old);$('editError').textContent='楽天Pay残高が不足しています';return}if(t.type==='transfer'&&t.from===t.to){Object.assign(t,old);applyTxEffect(old);$('editError').textContent='移動元と移動先は別にしてね';return}if(t.type==='transfer'&&Number(t.fee||0)>0&&(t.feeSide||'from')==='to'&&Number(t.amount||0)<=Number(t.fee||0)){Object.assign(t,old);applyTxEffect(old);$('editError').textContent='移動先から手数料を引く場合は、移動金額より小さい手数料にしてね';return}if(typeGroup(t)==='loan'&&!t.person){Object.assign(t,old);applyTxEffect(old);$('editError').textContent='相手を入力してね';return}applyTxEffect(t);closeEditRecord();renderAll()}
function renderPersonCandidates(){
 const names=[...new Set(txs.filter(t=>typeGroup(t)==='loan'&&!loanArchivedPeople.includes(t.person)).map(t=>t.person).filter(Boolean))];
 const html=names.map(n=>`<button type="button" class="person-candidate" data-name="${safeHtml(n)}" onclick="pickPerson(this.dataset.name)">${safeHtml(n)}</button>`).join('');
 if($('lendPersonCandidates')){$('lendPersonCandidates').innerHTML=html;$('lendPersonCandidates').classList.toggle('hidden',$('lendPersonTop').classList.contains('hidden'));}
 if($('personCandidates')){$('personCandidates').innerHTML=html;$('personCandidates').classList.toggle('hidden',$('personTop').classList.contains('hidden'));}
 updatePersonCandidateSelection();
}
function updatePersonCandidateSelection(){
 for(const [listId,inputId] of [['lendPersonCandidates','lendPerson'],['personCandidates','person']]){
  const list=$(listId),input=$(inputId);if(!list||!input)continue;
  list.querySelectorAll('.person-candidate').forEach(b=>b.classList.toggle('active',b.dataset.name===input.value.trim()));
 }
}
function pickPerson(name){
 if(loanKind==='lend'&&$('lendPerson'))$('lendPerson').value=name;
 else if($('person'))$('person').value=name;
 updatePersonCandidateSelection();
}
function safeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function loanExtraToday(){let n=new Date();return dateISO(n.getFullYear(),n.getMonth()+1,n.getDate())}
function openLoanExtraFromButton(btn){let card=btn.closest('.loan-person-card');if(!card)return;let p=card.dataset.loanPerson;if(!p||loanArchivedPeople.includes(p))return;
 loanExtraPerson=p;loanExtraDirection='lend';$('loanExtraPersonName').textContent='相手：'+p;
 $('loanExtraAmount').value='';$('loanExtraMemo').value='';$('loanExtraError').textContent='';setLoanExtraDirection('lend');$('loanExtraModal').classList.remove('hidden');}
function setLoanExtraDirection(d){loanExtraDirection=d;$('loanExtraLendBtn').classList.toggle('active',d==='lend');$('loanExtraBorrowBtn').classList.toggle('active',d==='borrow')}
function closeLoanExtra(){$('loanExtraModal').classList.add('hidden');loanExtraPerson=''}
function saveLoanExtra(){let amount=moneyNum($('loanExtraAmount').value),memo=$('loanExtraMemo').value.trim(),p=loanExtraPerson;
 if(!p||loanArchivedPeople.includes(p))return;
 if(!Number.isSafeInteger(amount)||amount<=0){$('loanExtraError').textContent='1円以上の整数で金額を入力してね';return}
 let tx={id:'loanExtra'+Date.now()+Math.random().toString(36).slice(2,7),type:loanExtraDirection==='lend'?'loanExtraLend':'loanExtraBorrow',date:loanExtraToday(),person:p,amount,memo};
 txs.unshift(tx);loanActivePerson=p;loanExpandedPerson=p;loanArchiveView=false;loanOrganize=false;loanSelectedIds.clear();
 closeLoanExtra();renderAll();}
function loanImpact(t){if(t.type==='loanAdjustment')return Number(t.delta||0);if(t.type==='lend')return Number(t.other||0);if(t.type==='loanLend'||t.type==='loanExtraLend')return Number(t.amount||0);if(t.type==='loanExtraBorrow')return -Number(t.amount||0);if(['borrowed','loanBorrow','receive'].includes(t.type))return-Number(t.amount||0);if(t.type==='repay')return Number(t.amount||0);return 0}
function loanPeopleAll(){return [...new Set(txs.filter(t=>typeGroup(t)==='loan').map(t=>t.person).filter(Boolean))]}
function loanPersonLastDate(p){let arr=txs.filter(t=>typeGroup(t)==='loan'&&t.person===p);return arr.length?arr[0].date:''}
function recentLoanPerson(){let people=loanPeopleAll().filter(p=>!loanArchivedPeople.includes(p));return people.sort((a,b)=>loanPersonLastDate(b).localeCompare(loanPersonLastDate(a)))[0]||''}
function loanPeopleAll(){return [...new Set(txs.filter(t=>typeGroup(t)==='loan').map(t=>t.person).filter(Boolean))]}
function selectLoanPerson(p){loanActivePerson=p;loanExpandedPerson=p;loanArchiveView=false;loanOrganize=false;loanAddToGroupId='';loanSelectedIds.clear();renderLoans();setTimeout(()=>{let el=document.querySelector(`[data-loan-person="${CSS.escape(p)}"]`);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})},0)}
function toggleLoanCard(p){loanExpandedPerson=loanExpandedPerson===p?'':p;loanActivePerson=p;loanOrganize=false;loanAddToGroupId='';loanSelectedIds.clear();renderLoans()}
function showLoanArchive(){loanArchiveView=true;loanExpandedPerson='';loanOrganize=false;loanAddToGroupId='';loanSelectedIds.clear();renderLoans()}
function toggleLoanOrganize(p){if(loanExpandedPerson!==p)loanExpandedPerson=p;loanActivePerson=p;loanAddToGroupId='';loanOrganize=!loanOrganize;if(!loanOrganize)loanSelectedIds.clear();renderLoans()}
function toggleLoanSelect(id){if(loanSelectedIds.has(id))loanSelectedIds.delete(id);else loanSelectedIds.add(id);renderLoans()}
function reviveArchivedLoanPersonOnNewRecord(p){
 if(!p||!loanArchivedPeople.includes(p))return false;
 // カードの非表示状態のみ解除。グループ、個別アーカイブ、清算調整、折りたたみ状態は触れない。
 loanArchivedPeople=loanArchivedPeople.filter(name=>name!==p);
 loanActivePerson=p;loanExpandedPerson=p;loanArchiveView=false;
 return true;
}
function archiveLoanPerson(p){if(!confirm(p+'をアーカイブしますか？\n\nカードだけを一覧から隠します。履歴・グループ・個別アーカイブはそのまま残ります。'))return;if(!loanArchivedPeople.includes(p))loanArchivedPeople.push(p);if(loanExpandedPerson===p)loanExpandedPerson='';loanActivePerson='';loanOrganize=false;loanSelectedIds.clear();renderLoans();renderPersonCandidates()}
function restoreLoanPerson(p){loanArchivedPeople=loanArchivedPeople.filter(x=>x!==p);loanActivePerson=p;loanExpandedPerson=p;loanArchiveView=false;renderLoans();renderPersonCandidates()}
function toggleLoanFold(p){loanFoldExpanded[p]=!loanFoldExpanded[p];renderLoans()}
function loanStateText(p,es){let bal=es.reduce((sum,e)=>sum+loanImpact(e),0);return bal>0?'返してもらう '+yen(bal):bal<0?'返す '+yen(-bal):'清算済み'}
function loanPayName(k){return k==='bank'?'銀行':payName(k)}
// Step7: グループ化のデータは表示上のまとまり。元取引と残高を二重計算しない。
function loanGroupTx(g){return g.txIds.map(id=>txs.find(t=>t.id===id)).filter(Boolean)}
function loanGroupTotal(g){return loanGroupTx(g).reduce((a,t)=>a+loanImpact(t),0)+ (g.adjustmentId ? loanImpact(txs.find(t=>t.id===g.adjustmentId)||{}) : 0)}
function loanGroupForTx(id){return loanGroups.find(g=>g.txIds.includes(id)||(g.adjustmentId===id))}
function loanCleanGroups(){loanGroups.forEach(g=>{g.txIds=g.txIds.filter(id=>txs.some(t=>t.id===id));if(g.adjustmentId&&!txs.some(t=>t.id===g.adjustmentId))g.adjustmentId=''});loanGroups=loanGroups.filter(g=>g.txIds.length>0)}
function loanAdjustmentLabel(t){let delta=Number(t.delta||0);return '調整額 '+yen(Math.abs(delta))+' ('+(delta>0?'+':'-')+')'}
function loanMakeAdjustment(p,delta,groupId=''){
 const t={id:'adj'+Date.now()+Math.random().toString(36).slice(2,7),type:'loanAdjustment',person:p,date:loanExtraToday(),delta,amount:Math.abs(delta),groupId};
 txs.unshift(t);return t;
}
function makeLoanGroup(p){
 let chosen=txs.filter(t=>t.person===p&&loanSelectedIds.has(t.id)&&typeGroup(t)==='loan'&&t.type!=='loanAdjustment'&&!loanGroupForTx(t.id));
 if(chosen.length<2){alert('グループ化する記録を2件以上選んでね');return}
 loanGroups.push({id:'grp'+(++loanGroupSerial)+'_'+Date.now(),person:p,txIds:chosen.map(t=>t.id),adjustmentId:'',expanded:false,archived:false});
 loanSelectedIds.clear();loanOrganize=false;renderLoans();
}
function startAddToLoanGroup(id){
 let g=loanGroups.find(x=>x.id===id);if(!g)return;
 if(g.adjustmentId){alert('先にチャラ取り消しをしてね');return}
 loanAddToGroupId=id;loanOrganize=false;loanSelectedIds.clear();g.expanded=true;loanExpandedPerson=g.person;renderLoans();
}
function cancelAddToLoanGroup(){loanAddToGroupId='';loanSelectedIds.clear();renderLoans()}
function saveAddToLoanGroup(id){
 let g=loanGroups.find(x=>x.id===id);if(!g||g.adjustmentId)return;
 let chosen=txs.filter(t=>t.person===g.person&&loanSelectedIds.has(t.id)&&typeGroup(t)==='loan'&&t.type!=='loanAdjustment'&&!loanGroupForTx(t.id));
 if(!chosen.length){alert('追加する履歴を選んでね');return}
 g.txIds.push(...chosen.map(t=>t.id));g.expanded=true;loanAddToGroupId='';loanSelectedIds.clear();renderLoans();
}
function cancelLoanGroupSettlement(id){
 let g=loanGroups.find(x=>x.id===id);if(!g||!g.adjustmentId)return;
 if(!confirm('このグループのチャラを取り消しますか？\n\n清算調整だけを取り消し、元の差額に戻します。'))return;
 txs=txs.filter(t=>t.id!==g.adjustmentId);g.adjustmentId='';g.expanded=true;loanAddToGroupId='';loanSelectedIds.clear();renderAll();
}
function toggleLoanGroup(id){let g=loanGroups.find(x=>x.id===id);if(g){g.expanded=!g.expanded;renderLoans()}}
function settleLoanGroup(id){
 let g=loanGroups.find(x=>x.id===id);if(!g||g.adjustmentId)return;
 let total=loanGroupTotal(g);
 if(total===0){alert('このグループはすでに差額0円です');return}
 if(!confirm('このグループの差額 '+yen(Math.abs(total))+' をチャラにしますか？\n\n実際のお金は動かず、清算調整を履歴に残します。'))return;
 let t=loanMakeAdjustment(g.person,-total,g.id);g.adjustmentId=t.id;g.expanded=true;loanOrganize=false;loanSelectedIds.clear();renderAll();
}
function settleLoanPerson(p){
 const total=txs.filter(t=>typeGroup(t)==='loan'&&t.person===p).reduce((a,t)=>a+loanImpact(t),0);
 if(total===0){alert('現在の貸し借り残高は0円です');return}
 if(!confirm(p+'との未清算残高 '+yen(Math.abs(total))+' をここまでチャラにしますか？\n\n清算調整を残し、次のやりとりから新たに計算を続けます。現金・口座・予算は動きません。'))return;
 loanMakeAdjustment(p,-total);loanOrganize=false;loanSelectedIds.clear();loanExpandedPerson=p;renderAll();
}
function releaseLoanGroup(id){
 let g=loanGroups.find(x=>x.id===id);if(!g)return;
 if(g.adjustmentId){
 if(!confirm('このグループを解除しますか？\n\nグループ内の清算調整も取り消し、元の未清算額に戻します。'))return;
 txs=txs.filter(t=>t.id!==g.adjustmentId);
 } else if(!confirm('このグループ化を解除しますか？\n元の記録は残ります。'))return;
 loanGroups=loanGroups.filter(x=>x.id!==id);renderAll();
}
function archiveLoanGroup(id){let g=loanGroups.find(x=>x.id===id);if(!g)return;if(!g.adjustmentId&&loanGroupTotal(g)!==0){alert('未清算のグループはアーカイブできません');return}if(!confirm('この清算済みグループをアーカイブしますか？\n\n記録は削除されず元に戻せます。'))return;g.archived=true;g.expanded=false;renderLoans()}
function restoreLoanGroup(id){let g=loanGroups.find(x=>x.id===id);if(g){g.archived=false;g.expanded=true;renderLoans()}}
function cancelLoanAdjustment(id){
 const t=txs.find(x=>x.id===id&&x.type==='loanAdjustment'&&!x.groupId);if(!t)return;
 if(!confirm('この清算調整を取り消しますか？\n貸し借り残高は調整前の状態に戻ります。'))return;
 txs=txs.filter(x=>x.id!==id);renderAll();
}
function loanTxHtml(e,readOnly=false,inGroup=false){
 let names={lend:'私が立替',borrowed:'相手が立替',repay:'返した',receive:'返された',loanBorrow:'借りる',loanLend:'貸す',loanExtraLend:'貸し（記録外の追加）',loanExtraBorrow:'借り（記録外の追加）'};
 if(e.type==='loanAdjustment')return `<div class="loan-record loan-adjustment"><div class="loan-record-top"><span class="loan-record-kind">清算調整</span><span class="loan-record-amt">${loanAdjustmentLabel(e)}</span></div><div class="loan-record-sub"><span class="loan-record-meta">${safeHtml(e.date)}</span>${!readOnly&&!e.groupId?`<span class="loan-record-actions"><button class="ghost sm" onclick="cancelLoanAdjustment('${e.id}')">取り消す</button></span>`:''}</div></div>`;
 let groupSettled=!!(inGroup&&loanGroupForTx(e.id)?.adjustmentId);let amt=e.type==='lend'?e.other:e.amount,impact=loanImpact(e),amtClass=impact>0?'loan-amt-positive':impact<0?'loan-amt-negative':'',sel=loanSelectedIds.has(e.id),meta=isLoanExtra(e)?e.date+' 登録':[e.date,loanPayName(e.payment||e.source||'')].filter(Boolean).join('・'),selectable=(loanOrganize||!!loanAddToGroupId)&&!readOnly&&!inGroup&&!loanGroupForTx(e.id);
 return `<div class="loan-record ${selectable?'organize':''} ${sel&&selectable?'selected':''}" data-loan-id="${safeHtml(e.id)}" ${selectable?`onclick="if(!event.target.closest('button'))toggleLoanSelect('${e.id}')"`:''}><div class="loan-record-main">${selectable?`<input class="loan-select" type="checkbox" ${sel?'checked':''} aria-label="この記録を選択" >`:''}<div class="loan-record-body"><div class="loan-record-top"><span class="loan-record-kind">${safeHtml(names[e.type]||recordTitle(e))}</span><span class="loan-record-amt ${amtClass}">${yen(amt)}</span></div><div class="loan-record-sub"><span class="loan-record-meta">${safeHtml(meta)}</span>${readOnly||groupSettled?'':`<span class="loan-record-actions"><button class="ghost sm" onclick="editRecord('${e.id}')">編集</button><button class="ghost sm danger" onclick="deleteHistoryRecord('${e.id}')">削除</button></span>`}</div>${e.memo?`<div class="loan-record-note">${safeHtml(e.memo)}</div>`:''}</div></div></div>`;
}
function loanGroupHtml(g,readOnly=false){
 let list=loanGroupTx(g).sort((a,b)=>txs.indexOf(a)-txs.indexOf(b));
 if(g.adjustmentId){let adj=txs.find(t=>t.id===g.adjustmentId);if(adj)list=[adj,...list]}
 let total=loanGroupTotal(g),state=total>0?'返してもらう '+yen(total):total<0?'返す '+yen(-total):'清算済み';
 let adding=loanAddToGroupId===g.id;
 let actions=readOnly?'':g.adjustmentId?`<div class="loan-group-actions"><button class="ghost" onclick="cancelLoanGroupSettlement('${g.id}')">チャラ取り消し</button><button class="ghost" onclick="releaseLoanGroup('${g.id}')">グループ解除</button>${g.archived?'':`<button class="ghost" onclick="archiveLoanGroup('${g.id}')">アーカイブ</button>`}</div>`:total===0?`<div class="loan-group-actions"><button class="ghost" onclick="startAddToLoanGroup('${g.id}')">履歴を追加</button><button class="ghost" onclick="releaseLoanGroup('${g.id}')">グループ解除</button>${g.archived?'':`<button class="ghost" onclick="archiveLoanGroup('${g.id}')">アーカイブ</button>`}</div>`:`<div class="loan-group-actions"><button class="ghost" onclick="settleLoanGroup('${g.id}')">チャラ</button><button class="ghost" onclick="startAddToLoanGroup('${g.id}')">履歴を追加</button><button class="ghost" onclick="releaseLoanGroup('${g.id}')">グループ解除</button></div>`;
 return `<div class="loan-group"><button type="button" class="loan-group-summary" aria-expanded="${g.expanded}" onclick="toggleLoanGroup('${g.id}')"><span><span class="loan-group-summary-title">グループ（${g.txIds.length}件）</span><span class="loan-group-summary-sub">差額：${state}</span></span><span class="loan-group-summary-arrow">${g.expanded?'▲':'▼'}</span></button>${g.expanded?`<div class="loan-group-detail">${list.map(t=>loanTxHtml(t,readOnly,true)).join('')}${adding?`<div class="loan-group-add-note">下の未グループ履歴から追加するものを選んでください。</div>`:''}${actions}${g.adjustmentId?`<div class="loan-group-lock-note">チャラを変更する場合は「チャラ取り消し」を使ってください</div>`:''}</div>`:''}${g.archived&&!readOnly?`<div class="loan-group-restore"><button class="ghost" onclick="restoreLoanGroup('${g.id}')">元に戻す</button></div>`:''}</div>`;
}
function loanRowsForPerson(p,es,readOnly=false){
 loanCleanGroups();
 let chronological=[...es].reverse(),running=0,display=[];
 chronological.forEach(e=>{let before=running;running+=loanImpact(e);display.push({kind:'tx',tx:e});if(before!==0&&running===0)display.push({kind:'settled',date:e.date})});display.reverse();
 const groups=loanGroups.filter(g=>g.person===p),groupByTx={};groups.forEach(g=>{g.txIds.forEach(id=>groupByTx[id]=g);if(g.adjustmentId)groupByTx[g.adjustmentId]=g});
 let used=new Set(),collapsed=[];
 display.forEach(r=>{
 if(r.kind==='settled'){collapsed.push(r);return}
 let g=groupByTx[r.tx.id];if(g){if(!used.has(g.id)){used.add(g.id);if(!g.archived)collapsed.push({kind:'group',group:g})}}else collapsed.push(r);
 });
 const RECENT_TX_COUNT=6;let expanded=!!loanFoldExpanded[p],txSeen=0,cut=collapsed.length;
 for(let i=0;i<collapsed.length;i++){if(collapsed[i].kind!=='settled'){txSeen++;if(txSeen===RECENT_TX_COUNT){cut=i+1;while(cut<collapsed.length&&collapsed[cut].kind==='settled')cut++;break}}}
 let hiddenPart=cut<collapsed.length?collapsed.slice(cut):[],hiddenCount=hiddenPart.filter(x=>x.kind!=='settled').length,visible=expanded?collapsed:collapsed.slice(0,cut);
 let rows=visible.map(r=>r.kind==='settled'?`<div class="settlement-row"><span class="date">${r.date}</span><span>清算済み</span></div>`:r.kind==='group'?loanGroupHtml(r.group,readOnly):loanTxHtml(r.tx,readOnly)).join('');
 let foldControl=hiddenCount?(expanded?`<button class="loan-fold-toggle" onclick="toggleLoanFold('${p.replace(/'/g,"\\'")}')">▲ 過去の履歴を閉じる</button>`:`<button class="loan-fold-toggle" onclick="toggleLoanFold('${p.replace(/'/g,"\\'")}')">▼ 過去の履歴 ${hiddenCount}件</button>`):'';
 let archived=groups.filter(g=>g.archived),archiveHtml=archived.length?`<div class="loan-archive-groups"><div class="loan-archive-groups-title">アーカイブ済みグループ（${archived.length}）</div>${archived.map(g=>loanGroupHtml(g,readOnly)).join('')}</div>`:'';
 return {rows,foldControl,archiveHtml};
}
function renderLoans(){
 loanCleanGroups();
 let esAll=txs.filter(t=>typeGroup(t)==='loan'),allPeople=loanPeopleAll(),activePeople=allPeople.filter(p=>!loanArchivedPeople.includes(p)).sort((a,b)=>loanPersonLastDate(b).localeCompare(loanPersonLastDate(a))),archived=allPeople.filter(p=>loanArchivedPeople.includes(p));
 let tabs=activePeople.map(p=>`<button class="loan-person-tab ${!loanArchiveView&&loanExpandedPerson===p?'active':''}" onclick="selectLoanPerson('${p.replace(/'/g,"\\'")}')">${safeHtml(p)}</button>`).join('');
 if(archived.length)tabs+=`<button class="loan-person-tab archive ${loanArchiveView?'active':''}" aria-pressed="${loanArchiveView}" onclick="showLoanArchive()">アーカイブ</button>`;
 $('loanPersonTabs').innerHTML=tabs;
 if(loanArchiveView){$('loanSummary').innerHTML=archived.length?archived.map(p=>{let es=esAll.filter(x=>x.person===p),state=loanStateText(p,es),open=loanExpandedPerson===p,parts=loanRowsForPerson(p,es,true);return `<div class="loan-person-card is-archived ${open?'':'collapsed'}" data-loan-person="${safeHtml(p)}"><div class="loan-summary-row"><button class="loan-summary-head" type="button" aria-expanded="${open}" onclick="toggleLoanCard('${p.replace(/'/g,"\\'")}')"><span class="loan-summary-left"><span class="loan-summary-name">${safeHtml(p)}</span><span class="loan-current-state">${state}</span></span><span class="loan-summary-arrow">${open?'▲':'▼'}</span></button><button class="loan-restore" type="button" onclick="restoreLoanPerson('${p.replace(/'/g,"\\'")}')">元に戻す</button></div><div class="loan-person-inner"><div class="loan-history-head"><div class="loan-history-title">やりとり履歴（閲覧のみ）</div></div>${parts.rows}${parts.foldControl}${parts.archiveHtml}</div></div>`}).join(''):'<div class="loan-empty">アーカイブ済みの相手はいません。</div>';return}
 if(!activePeople.length){$('loanSummary').innerHTML='<div class="loan-empty">まだ記録はありません。</div>';return}
 let ordered=[...activePeople];if(loanExpandedPerson&&ordered.includes(loanExpandedPerson))ordered=[loanExpandedPerson,...ordered.filter(x=>x!==loanExpandedPerson)];
 $('loanSummary').innerHTML=ordered.map(p=>{let es=esAll.filter(x=>x.person===p),state=loanStateText(p,es),open=loanExpandedPerson===p,parts=loanRowsForPerson(p,es),organizing=loanOrganize&&open;return `<div class="loan-person-card ${open?'':'collapsed'}" data-loan-person="${safeHtml(p)}"><div class="loan-summary-row"><button class="loan-summary-head" type="button" aria-expanded="${open}" onclick="toggleLoanCard('${p.replace(/'/g,"\\'")}')"><span class="loan-summary-left"><span class="loan-summary-name">${safeHtml(p)}</span><span class="loan-current-state">${state}</span></span></button><div class="mk-loan-summary-actions"><button class="mk-loan-todo-btn ${mkTodos.some(t=>t.person===p&&!t.done&&!t.hidden)?'mk-loan-todo-active':''}" type="button" onclick="mkLoanTodoFromButton(this)">${mkTodos.some(t=>t.person===p&&!t.done&&!t.hidden)?'－ やること':'＋ やること'}</button><button class="loan-card-archive" type="button" onclick="archiveLoanPerson('${p.replace(/'/g,"\\'")}')">アーカイブ</button></div><div class="loan-summary-side"><button class="loan-card-arrow" type="button" aria-label="カードを${open?'閉じる':'開く'}" onclick="toggleLoanCard('${p.replace(/'/g,"\\'")}')">${open?'▲':'▼'}</button></div></div><div class="loan-person-inner"><div class="loan-history-head"><div class="loan-history-title">やりとり履歴</div><div class="loan-card-actions"><button class="ghost loan-action-primary" onclick="toggleLoanOrganize('${p.replace(/'/g,"\\'")}')">${organizing?'完了':'整理'}</button><button class="ghost loan-action-primary" onclick="openLoanExtraFromButton(this)">追加</button></div></div>${organizing?`<div class="loan-organize-actions"><div class="loan-organize-note">${loanSelectedIds.size?loanSelectedIds.size+'件選択中':'記録を選択できます'}</div><button class="ghost" onclick="makeLoanGroup('${p.replace(/'/g,"\\'")}')" ${loanSelectedIds.size<2?'disabled':''}>グループ化</button><button class="ghost" onclick="settleLoanPerson('${p.replace(/'/g,"\\'")}')">ここまでチャラ</button></div>`:''}${loanAddToGroupId&&loanGroups.find(g=>g.id===loanAddToGroupId)?.person===p?`<div class="loan-group-add-actions"><div class="loan-organize-note">${loanSelectedIds.size?loanSelectedIds.size+'件選択中':'追加する履歴を選択'}</div><button class="ghost" onclick="cancelAddToLoanGroup()">キャンセル</button><button class="ghost" onclick="saveAddToLoanGroup('${loanAddToGroupId}')" ${loanSelectedIds.size<1?'disabled':''}>追加する</button></div>`:''}${parts.rows}${parts.foldControl}${parts.archiveHtml}</div></div>`}).join('');
}
function finalCardForPayment(p,source){if(p==='rakutenpay')return source==='rakuten'?'rakuten':'';if(['dcard','dpay','id','paypal'].includes(p))return'dcard';if(['rakuten','epos','lumine'].includes(p))return p;return''}
const cardDefs={
 dcard:{name:'dカード',closeDay:15,dueDay:10,account:'西武信用金庫',known:{}},
 rakuten:{name:'楽天カード',closeDay:31,dueDay:27,account:'楽天銀行',known:{}},
 epos:{name:'エポスカード',closeDay:27,dueDay:27,account:'西武信用金庫',known:{}},
 lumine:{name:'ルミネカード',closeDay:5,dueDay:4,account:'三井住友銀行',known:{}}
};
function pad2(n){return String(n).padStart(2,'0')}
function dateISO(y,m,d){return `${y}-${pad2(m)}-${pad2(d)}`}
function addMonthsYM(y,m,add){let z=(y*12+(m-1))+add;return [Math.floor(z/12),z%12+1]}
function dueForPurchase(card,date){let [y,m,d]=date.split('-').map(Number),c=cardDefs[card];if(!c)return'';let add;if(card==='rakuten')add=1;else add=d<=c.closeDay?1:2;let [yy,mm]=addMonthsYM(y,m,add);return dateISO(yy,mm,c.dueDay)}
function nextMonthlyDue(card,due){let [y,m]=due.split('-').map(Number),[yy,mm]=addMonthsYM(y,m,1);return dateISO(yy,mm,cardDefs[card].dueDay)}
function fmtMD(iso){let p=iso.split('-');return Number(p[1])+'/'+Number(p[2])}
function statusForBill(card,due){let adj=billAdjustments[card+'|'+due];if(adj&&adj.status==='confirmed')return'confirmed';if(adj&&adj.status==='cancelled')return billUnconfirmedStatus(card,due);if(cardDefs[card].known[due]!=null)return'confirmed';let c=cardDefs[card], [y,m]=due.split('-').map(Number);let [cy,cm]=addMonthsYM(y,m,-1);let close=dateISO(cy,cm,Math.min(c.closeDay,new Date(cy,cm,0).getDate()));let today=new Date().toISOString().slice(0,10);return today>close?'candidate':'planned'}
function billUnconfirmedStatus(card,due){let c=cardDefs[card],[y,m]=due.split('-').map(Number),[cy,cm]=addMonthsYM(y,m,-1),close=dateISO(cy,cm,Math.min(c.closeDay,new Date(cy,cm,0).getDate()));return new Date().toLocaleDateString('sv-SE')>close?'candidate':'planned'}
function statusText(s){return s==='confirmed'?'確定':s==='candidate'?'確定候補':'予定'}
function allocRecorded(card){let out=[];txs.forEach((t,idx)=>{if(t.type==='expense'){let c=finalCardForPayment(t.payment,t.rakutenPaySource);if(c!==card)return;let baseDue=t.billOverride||dueForPurchase(card,t.date),n=Math.max(1,Number(t.installments||1)),total=Number(t.billed||t.paid||t.amount||0),base=Math.floor(total/n),rem=total-base*n;for(let i=0;i<n;i++){let due=i?nextMonthlyDue(card,baseDue):baseDue;for(let j=1;j<i;j++)due=nextMonthlyDue(card,due);out.push({kind:'tx',idx,date:t.date,label:(t.memo||t.category)+(n>1?`（${i+1}/${n}回）`:''),amount:base+(i<rem?1:0),due})}}else if(t.type==='lend'){let c=finalCardForPayment(t.payment,t.rakutenPaySource);if(c!==card)return;let baseDue=t.billOverride||dueForPurchase(card,t.date),n=Math.max(1,Number(t.installments||1)),total=Number(t.billed??t.gross??0),base=Math.floor(total/n),rem=total-base*n;for(let i=0;i<n;i++){let due=baseDue;for(let j=0;j<i;j++)due=nextMonthlyDue(card,due);out.push({kind:'tx',idx,date:t.date,label:(t.memo||t.category||'立替')+'（立替・'+(t.person||'相手')+'）'+(n>1?`（${i+1}/${n}回）`:''),amount:base+(i<rem?1:0),due})}}else if(t.type==='charge'){let c=finalCardForPayment(t.source);if(c!==card)return;let due=t.billOverride||dueForPurchase(card,t.date);out.push({kind:'charge',idx,date:t.date,label:(balances[t.target]?.name||t.target)+'チャージ',amount:Number(t.billed||t.amount||0),due})}});return out}
function timingDay(r){let m=String(r.timing).match(/(^|[^0-9])(\d{1,2})日/);return m?Number(m[2]):null}
function recurringForDue(card,due){let c=cardDefs[card],[y,m]=due.split('-').map(Number),[py,pm]=addMonthsYM(y,m,-1),items=[];recurring.forEach((r,i)=>{if(r.paused||r.target!==card)return;if(r.timing.includes('ヶ月')){let nx=(r.timing.match(/次回(\d{1,2})\/(\d{1,2})/)||[]);if(!nx.length)return;let d=dateISO(y,Number(nx[1]),Number(nx[2]));if(dueForPurchase(card,d)!==due)return;items.push({kind:'rec',idx:i,date:d,label:r.name,amount:r.amount,due});return}let day=timingDay(r);if(!day)return;let days=new Date(py,pm,0).getDate(),d=dateISO(py,pm,Math.min(day,days));if(dueForPurchase(card,d)===due)items.push({kind:'rec',idx:i,date:d,label:r.name,amount:r.amount,due})});return items}
function billItemKey(x,due){return x.kind+'|'+x.idx+'|'+due}
function itemsForBill(card,due){return [...allocRecorded(card).filter(x=>x.due===due),...recurringForDue(card,due)].map(x=>{let a=billItemAdjustments[billItemKey(x,due)];return a!=null?{...x,originalAmount:x.amount,amount:a}:x})}
function predictedAmount(card,due){return itemsForBill(card,due).reduce((s,x)=>s+x.amount,0)}
function amountForBill(card,due){let a=billAdjustments[card+'|'+due];if(a&&a.status==='cancelled')return predictedAmount(card,due);if(a&&a.amount!=null)return a.amount;if(cardDefs[card].known[due]!=null)return cardDefs[card].known[due];return predictedAmount(card,due)}
let mkBillOffset={};
let mkPaidBills={};
const mkAccountForBill={'西武信用金庫':'seibu','楽天銀行':'rakbank','三井住友銀行':'smbc','ゆうちょ':'yucho'};
function mkIsPaid(card,due){return !!mkPaidBills[card+'|'+due]}
function mkConfirmWithdrawal(card,due){
 const key=card+'|'+due,c=cardDefs[card],amount=amountForBill(card,due),account=mkAccountForBill[c.account];
 if(mkIsPaid(card,due)){alert('この引落はすでに反映済みです。');return}
 if(statusForBill(card,due)!=='confirmed'){alert('先に請求額を確定してください。');return}
 if(due>new Date().toLocaleDateString('sv-SE')){alert('引落日以降に確認してください。');return}
 if(!account||!balances[account]||!Number.isSafeInteger(amount)||amount<=0){alert('引落口座または金額を確認してください。');return}
 if(!confirm(c.name+'の'+fmtMD(due)+'引落を確認しましたか？\n'+c.account+'から'+yen(amount)+'を差し引きます。\n※月の支出には再計上しません。'))return;
 balances[account].v-=amount;cashbook.unshift({date:due,text:c.name+' 引落（確認済み）',delta:-amount,mkBillKey:key});
 mkPaidBills[key]={date:due,amount,account,confirmedAt:new Date().toISOString()};
 renderAll();openBillDetail(card);
}

function visibleBills(card){let known=Object.keys(cardDefs[card].known).sort();let today=new Date().toISOString().slice(0,10),current=known.find(d=>d>=today)||'';if(!current){let [y,m,d]=today.split('-').map(Number),c=cardDefs[card],candidate=dateISO(y,m,c.dueDay);if(candidate<today){let [yy,mm]=addMonthsYM(y,m,1);candidate=dateISO(yy,mm,c.dueDay)}current=candidate}let offset=mkBillOffset[card]||0;for(let j=0;j<Math.abs(offset);j++)current=nextMonthlyDue(card,current);if(offset<0){current=known.find(d=>d>=today)||dateISO(...addMonthsYM(Number(today.slice(0,4)),Number(today.slice(5,7)),0),cardDefs[card].dueDay);for(let j=0;j<-offset;j++){let [yy,mm]=current.split('-').map(Number);[yy,mm]=addMonthsYM(yy,mm,-1);current=dateISO(yy,mm,cardDefs[card].dueDay)}}let next=nextMonthlyDue(card,current);return[current,next]}
function mkShiftBill(card,step){mkBillOffset[card]=(mkBillOffset[card]||0)+step;renderAll();openBillDetail(card)}
function renderBillItems(card,due){let items=itemsForBill(card,due);if(!items.length)return '<div class="small" style="margin-top:7px">この引落分に紐づく記録はまだありません。</div>';return items.map(x=>`<div class="billline"><span>${fmtMD(x.date)}</span><span>${x.label}${x.originalAmount!=null?'<div class="item-meta">記録上 '+yen(x.originalAmount)+' → 請求 '+yen(x.amount)+'</div>':''}</span><span class="amt">${yen(x.amount)}</span>${x.kind==='tx'||x.kind==='charge'?`<span></span><span class="bill-actions"><button class="ghost bill-edit" onclick="editBillItemAmount('${x.kind}',${x.idx},'${card}','${due}')">請求額だけ修正</button><button class="ghost" onclick="editRecord(txs[${x.idx}].id);closeBillDetail()">記録を編集</button><button class="ghost" onclick="moveBillItem('${x.kind}',${x.idx},'${card}','${due}')">翌月へ</button><button class="ghost" onclick="moveBillItem('${x.kind}',${x.idx},'${card}','${due}',-1)">前月へ</button></span><span></span>`:''}</div>`).join('')}
function editBillItemAmount(kind,idx,card,due){if(mkIsPaid(card,due)){alert('引落済みの請求額は変更できません。');return}let item=itemsForBill(card,due).find(x=>x.kind===kind&&x.idx===idx);if(!item)return;openMoneyPrompt('請求額だけ修正',item.amount,(v)=>{billItemAdjustments[billItemKey(item,due)]=v;renderAll();openBillDetail(card)},{min:0,hint:'元の支出記録の購入金額は変わりません。'})}
function moveBillItem(kind,idx,card,due,direction=1){if(mkIsPaid(card,due)){alert('引落済みの請求は移動できません。');return}let next=nextMonthlyDue(card,due);if(direction<0){let [y,m]=due.split('-').map(Number);[y,m]=addMonthsYM(y,m,-1);next=dateISO(y,m,cardDefs[card].dueDay)}if(kind==='tx')txs[idx].billOverride=next;else if(kind==='charge')txs[idx].billOverride=next;renderAll();openBillDetail(card)}
function reconcileBox(card,due){let st=statusForBill(card,due),pred=predictedAmount(card,due),actual=amountForBill(card,due);return `<div class="reconcile"><div class="subhead">カード会社の確定額と照合</div><div class="small">アプリ予測 ${yen(pred)}。通知・明細の確定額を入力して照合できます。</div><div class="field"><label>実際の請求確定額</label><input id="actual-${card}-${due}" type="text" inputmode="numeric" value="${st==='confirmed'&&actual?actual:''}" placeholder="金額"></div><div class="grid2"><button class="outline" onclick="checkBillAmount('${card}','${due}')">差額を見る</button><button class="btn" onclick="confirmBillAmount('${card}','${due}')">この金額で確定</button></div><div id="diff-${card}-${due}" class="small" style="margin-top:7px"></div></div>`}
function checkBillAmount(card,due){let el=$('actual-'+card+'-'+due),n=moneyNum(el.value),pred=predictedAmount(card,due),d=n-pred,out=$('diff-'+card+'-'+due);if(n<0||!el.value){out.textContent='確定額を入力してね';return}out.innerHTML=d===0?'✓ アプリ予測と一致しています。':`差額 ${d>0?'+':''}${yen(d)}。内訳を見て翌月へ移す記録がないか確認するか、実額で確定できます。`}
function confirmBillAmount(card,due){if(mkIsPaid(card,due)){alert('引落済みの請求額は変更できません。');return}let el=$('actual-'+card+'-'+due);if(!el.value)return checkBillAmount(card,due);let n=moneyNum(el.value);billAdjustments[card+'|'+due]={amount:n,status:'confirmed'};delete mkTodoHidden['check|'+card+'|'+due];renderAll();openBillDetail(card)}
function mkCancelBillConfirmation(card,due){
 const key=card+'|'+due;
 if(mkIsPaid(card,due)){alert('引落反映済みの請求は、先に引落反映を取り消してください。');return}
 if(statusForBill(card,due)!=='confirmed')return;
 if(!confirm(cardDefs[card].name+' '+fmtMD(due)+'の請求額の確定を取り消しますか？\n請求額は記録・定期支払いからの予測額に戻ります。元の記録や内訳は削除されません。'))return;
 billAdjustments[key]={status:'cancelled'};
 delete mkTodoHidden['check|'+card+'|'+due];
 renderAll();openBillDetail(card);
}
function mkBillDatePassed(due){return due<=new Date().toLocaleDateString('sv-SE')}
function mkUndoWithdrawal(card,due){
 const key=card+'|'+due,entry=mkPaidBills[key];if(!entry)return;
 if(!confirm(cardDefs[card].name+' '+fmtMD(due)+'の引落反映を取り消しますか？\n口座残高を'+yen(entry.amount)+'戻します。'))return;
 if(!balances[entry.account]){alert('引落口座が見つかりません。');return}
 balances[entry.account].v+=entry.amount;
 const index=cashbook.findIndex(x=>x.mkBillKey===key);
 if(index>=0)cashbook.splice(index,1);
 else cashbook.unshift({date:new Date().toLocaleDateString('sv-SE'),text:cardDefs[card].name+' 引落取消（調整）',delta:entry.amount});
 delete mkPaidBills[key];renderAll();openBillDetail(card);
}
function mkBillDetailsBlock(card,due){const items=itemsForBill(card,due);return `<details class="mk-bill-items"><summary>記録一覧 <span class="mk-bill-count">（${items.length}件）</span><span class="mk-bill-expand" aria-hidden="true"></span></summary><div class="mk-bill-items-content">${renderBillItems(card,due)}</div></details>`}
function openBillDetail(card){
 const c=cardDefs[card],[a,b]=visibleBills(card);
 $('billTitle').textContent=c.name+' 請求内訳';
 const nav=`<div class="mk-bill-nav"><button class="outline" onclick="mkShiftBill('${card}',-1)">‹ 前の月</button><button class="outline" onclick="mkShiftBill('${card}',1)">次の月 ›</button></div>`;
 const blocks=[a,b].map((due,i)=>{
  const st=statusForBill(card,due),paid=mkIsPaid(card,due),amt=amountForBill(card,due),pred=predictedAmount(card,due),late=st==='confirmed'&&pred!==amt;
  const head=`<div class="billhead"><div><strong>${fmtMD(due)} 引落し${i===0?'':'予定'}</strong><div class="item-meta">記録＋定期支払いから集計</div></div><div><div style="text-align:right;font-weight:800">${yen(amt)}</div><span class="billstatus ${st}">${paid?'引落済み':statusText(st)}</span></div></div>`;
  if(i===1)return `<div class="billbox mk-bill-preview">${head}<div class="small" style="margin-top:8px">詳しい内訳・操作は「次の月」で確認できます。</div></div>`;
  const warning=late?`<div class="warnbox">確定済み総額は ${yen(amt)} のままです。現在の内訳合計は ${yen(pred)}。追加した記録や未調整の請求額がないか確認できます。</div>`:'';
  const reconciliation=paid?'<div class="small mk-bill-note">請求額確定済み・引落反映済み</div>':st==='confirmed'?`<div class="reconcile"><div class="subhead">カード会社の確定額と照合</div><div class="small">確定額 ${yen(amt)} ／ アプリ内訳 ${yen(pred)}</div><button class="outline mk-bill-small" onclick="mkShowBillReconcile('${card}','${due}')">確定額を修正・再照合</button><div id="mk-reconcile-${card}-${due}" class="hidden">${reconcileBox(card,due)}<div class="mk-bill-cancel-confirm"><button type="button" class="outline mk-bill-small" onclick="mkCancelBillConfirmation('${card}','${due}')">確定を取り消す</button></div></div></div>`:reconcileBox(card,due);
  let withdrawal='';
  if(paid)withdrawal=`<div class="mk-bill-withdraw"><span class="small">✓ 引落済み（口座残高に反映済み）</span><button class="outline mk-bill-small" onclick="mkUndoWithdrawal('${card}','${due}')">反映を取り消す</button></div>`;
  else if(st==='confirmed'&&amt>0)withdrawal=`<div class="mk-bill-withdraw"><button class="outline mk-bill-small" onclick="mkConfirmWithdrawal('${card}','${due}')" ${!mkBillDatePassed(due)?'disabled':''}>引落済みにする</button>${!mkBillDatePassed(due)?'<span class="small">引落日以降に確認できます</span>':''}</div>`;
  return `<div class="billbox">${head}${warning}${reconciliation}${withdrawal}${mkBillDetailsBlock(card,due)}</div>`;
 });
 $('billDetail').innerHTML=nav+blocks.join('');$('billModal').classList.remove('hidden');initMoneyInputs();
}
function mkShowBillReconcile(card,due){$('mk-reconcile-'+card+'-'+due)?.classList.toggle('hidden')}
function closeBillDetail(){$('billModal').classList.add('hidden')}
function cardRow(card){let c=cardDefs[card],[a,b]=visibleBills(card),sa=statusForBill(card,a),sb=statusForBill(card,b);return `<div class="item"><div class="mk-card-heading"><div class="item-title">${c.name}</div><button type="button" class="mk-bill-check" onclick="openBillDetail('${card}')">請求額を確認 ›</button></div><div class="item-meta">締め日：${card==='rakuten'?'月末':c.closeDay+'日'} ／ 引落日：翌月${c.dueDay}日<br>引落口座：${c.account}</div><div class="row"><span>次回引落</span><strong>${fmtMD(a)} ${yen(amountForBill(card,a))}（${statusText(sa)}）</strong></div><div class="row"><span class="small">その次</span><span class="small">${fmtMD(b)} ${yen(amountForBill(card,b))}（${statusText(sb)}）</span></div></div>`}
function renderDue(){
 $('prep').innerHTML='<div class="small">初期データは未登録です。引落口座の準備情報は今後の本番化で設定します。</div>';
 $('cards').innerHTML=['dcard','rakuten','epos','lumine'].map(cardRow).join('');
}
function recurringMeta(r){let cat=r.category?`<span class="cat-mini">${r.category}</span>`:`<span class="cat-mini">支出集計対象外</span>`;if(r.name==='Pairs'||r.name==='Google One')return `${recCycleText(r)}<br>${r.route||''}${cat}`;return `${recCycleText(r)}　${r.route||''}${r.finalSource?' → '+r.finalSource:''}${cat}`}
function renderRecurring(){$('recurringList').innerHTML=recurring.map((r,i)=>`<div class="item"><div class="rec-wrap"><div class="rec-main"><div class="item-title">${r.name}${r.limited?' <span class="pill">期間限定</span>':''}${r.paused?' <span class="pill">停止中</span>':''}</div><div class="item-meta">${recurringMeta(r)}</div></div><div class="rec-side"><strong>${yen(r.amount)}</strong><div class="rec-actions"><button class="ghost sm" onclick="editRecurring(${i})">編集</button><button class="ghost sm mk-recurring-pause" onclick="toggleRecurringPause(${i})">${r.paused?'再開':'停止'}</button></div></div></div></div>`).join('')}
function toggleRecurringForm(force){if(force!==true&& !$('mkRecurringModal').classList.contains('hidden')){cancelRecurringEdit();return}recurringEditIndex=-1;$('mkRecurringDelete').classList.add('hidden');$('mkRecurringModal').classList.remove('hidden')}
function setRecType(t,b){recType=t;document.querySelectorAll('#recTypeBtns .mini').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('limitedFields').classList.toggle('hidden',t!=='limited')}
function pickRecCat(){openPicker('支出カテゴリ',[{label:'支出集計対象外',value:''},...cats.map(c=>({label:c,value:c}))],(v,l)=>{recCategory=v;$('recCatBtn').firstElementChild.textContent=l})}
function routeTarget(route){if(route.includes('dカード'))return'dcard';if(route.includes('楽天カード'))return'rakuten';if(route.includes('エポス'))return'epos';if(route.includes('ルミネ'))return'lumine';if(route.includes('西武信用金庫'))return'seibu';if(route.includes('三井住友銀行'))return'smbc';if(route.includes('楽天銀行'))return'rakbank';return''}
function updateRecCycleFields(){let c=$('recCycle').value;$('recIntervalWrap').classList.toggle('hidden',!['days','weeks','months'].includes(c))}
function recCycleText(r){let names={monthly:'毎月',weekly:'毎週',biweekly:'2週間ごと',months2:'2ヶ月ごと',months3:'3ヶ月ごと',months6:'6ヶ月ごと',yearly:'毎年',days:'指定日数ごと',weeks:'指定週数ごと',months:'指定月数ごと',custom:'その他・不定期'};return (names[r.cycle]||r.timing||'周期未設定')+(r.interval?'（'+r.interval+'）':'')+(r.payRule?'・'+r.payRule:'')}
function saveRecurring(){let name=$('recName').value.trim(),amount=moneyNum($('recAmount').value),cycle=$('recCycle').value,route=$('recRoute').value.trim(),count=Number($('recCount').value||0),interval=Number($('recInterval').value||0),start=$('recStart').value,payRule=$('recPayRule').value.trim(),next=$('recNext').value,endDate=$('recEnd').value,finalSource=$('recFinalSource').value,memo=$('recMemo').value.trim();$('recError').textContent='';if(!name||amount<=0){$('recError').textContent='名前と金額を確認してね';return}if(['days','weeks','months'].includes(cycle)&&interval<=0){$('recError').textContent='指定周期の間隔を入力してね';return}if(start&&endDate&&endDate<start){$('recError').textContent='終了日は開始日以降にしてね';return}let old=recurringEditIndex>=0?recurring[recurringEditIndex]:null;let timing=recCycleText({cycle,interval,payRule});let obj={name,amount,timing,cycle,interval,start,payRule,next,endDate,route,finalSource,memo,target:old?.target||'',category:recCategory,limited:recType==='limited',count:recType==='limited'?count:0,paused:old?!!old.paused:false,event:old?.event||''};if(recType==='limited'&&count<=0&&!endDate){$('recError').textContent='期間限定は回数または終了日を入れてね';return}if(recType==='limited'&&$('recMakeEvent').checked&&count>0){let eventName=old&&old.event?old.event:name;let existing=eventsData.find(e=>e.name===eventName);if(!existing)eventsData.unshift({id:'ev'+Date.now(),name:eventName,start:'',end:'',budget:amount*count,catBudgets:{},archived:false,baseSpent:0});obj.event=eventName}if(recurringEditIndex>=0)recurring[recurringEditIndex]={...recurring[recurringEditIndex],...obj};else recurring.push(obj);cancelRecurringEdit();renderAll()}
function editRecurring(i){let r=recurring[i];recurringEditIndex=i;$('mkRecurringModal').classList.remove('hidden');$('mkRecurringDelete').classList.remove('hidden');$('recName').value=r.name;$('recAmount').value=r.amount;$('recCycle').value=r.cycle||'custom';$('recStart').value=r.start||'';$('recPayRule').value=r.payRule||(!r.cycle?r.timing||'':'');$('recInterval').value=r.interval||'';$('recNext').value=r.next||'';$('recEnd').value=r.endDate||'';$('recRoute').value=r.route||'';$('recFinalSource').value=r.finalSource||'';$('recMemo').value=r.memo||'';updateRecCycleFields();recCategory=r.category||'';$('recCatBtn').firstElementChild.textContent=r.category||'支出集計対象外';recType=r.limited?'limited':'normal';document.querySelectorAll('#recTypeBtns .mini').forEach((b,j)=>b.classList.toggle('active',(j===1)===!!r.limited));$('limitedFields').classList.toggle('hidden',!r.limited);$('recCount').value=r.count||'';$('recMakeEvent').checked=!!r.event;refreshMoneyInputs();scrollTo(0,$('recurringForm').offsetTop-80)}
function cancelRecurringEdit(){recurringEditIndex=-1;recType='normal';recCategory='';['recName','recAmount','recRoute','recCount','recStart','recPayRule','recInterval','recNext','recEnd','recMemo'].forEach(id=>$(id).value='');$('recCycle').value='monthly';$('recFinalSource').value='';updateRecCycleFields();$('recCatBtn').firstElementChild.textContent='選んでください';$('recMakeEvent').checked=false;$('recError').textContent='';$('limitedFields').classList.add('hidden');document.querySelectorAll('#recTypeBtns .mini').forEach((b,j)=>b.classList.toggle('active',j===0));$('mkRecurringModal').classList.add('hidden');$('mkRecurringDelete').classList.add('hidden')}
function mkDeleteRecurring(){if(recurringEditIndex<0)return;if(!confirm('この定期支払いを削除しますか？'))return;recurring.splice(recurringEditIndex,1);cancelRecurringEdit();renderAll()}
function toggleRecurringPause(i){recurring[i].paused=!recurring[i].paused;renderAll()}

function analysisMonthMove(n){const [y,m]=analysisMonth.split('-').map(Number);const d=new Date(y,m-1+n,1);analysisMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');renderBudget()}
function analysisSpend(t){return (['expense','lend','borrowed'].includes(t.type)?Number(t.amount||0):0)+(['expense','repay','receive','transfer'].includes(t.type)?Number(t.fee||0):0)}
function mkFeeOther(t){return ['expense','repay','receive','transfer'].includes(t.type)?Number(t.fee||0):0}
function mkCategorySpend(t,c){return (analysisCat(t)===c?analysisSpend(t)-mkFeeOther(t):0)+(c==='手数料'?mkFeeOther(t):0)}
function analysisRows(month){return txs.filter(t=>typeof t.date==='string'&&t.date.slice(0,7)===month)}
function analysisTotals(month){const a=analysisRows(month);return {expense:a.reduce((s,t)=>s+analysisSpend(t),0),income:a.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount||0),0)}}
function analysisCat(t){return t.type==='transfer'?'その他':t.category||'その他'}
function analysisFixed(t){if(t.costType==='fixed'||t.costType==='variable')return t.costType==='fixed';return /家賃|通信|携帯|保険|サブスク|定期|ジム|医療|病院|薬|Netflix|U-NEXT|Microsoft/i.test(analysisCat(t))}
function analysisBar(label,value,max){return `<div class="analysis-bar-row"><span>${safeHtml(label)}</span><div class="analysis-bar-track"><i style="width:${max?Math.max(0,Math.min(100,value/max*100)):0}%"></i></div><strong>${yen(value)}</strong></div>`}
function mkTrendMonthOffset(month,offset){const [y,m]=month.split('-').map(Number);const d=new Date(y,m-1+offset,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function mkTrendValue(kind,month,category){const rows=analysisRows(month);return rows.reduce((sum,t)=>{const v=analysisSpend(t);return sum+(kind==='expense'?v:mkCategorySpend(t,category))},0)}
let mkInlineBudgetCategory=null;
function mkBudgetAt(month,category){
  if(category===undefined)return Object.prototype.hasOwnProperty.call(monthlyBudgetHistory,month)?monthlyBudgetHistory[month]:null;
  const record=categoryBudgetHistory[month];
  return record&&Object.prototype.hasOwnProperty.call(record,category)?record[category]:null;
}
function mkBudgetLabel(month,category){
  const budget=mkBudgetAt(month,category);
  return budget===null||budget===undefined?'予算未設定':'予算 '+yen(budget);
}
function mkTrendAmount(n){return n>=10000?'¥'+(n/10000).toFixed(n%10000===0?0:1)+'万':yen(n)}
function openAnalysisTrend(kind,category){const overlay=$('mkTrendOverlay');if(!overlay)return;const anchor=analysisMonth;const title=kind==='expense'?'支出総額':category+' の支出';$('mkTrendTitle').textContent=title+'の推移';const months=Array.from({length:36},(_,i)=>mkTrendMonthOffset(anchor,i-35));const values=months.map(m=>mkTrendValue(kind,m,category));const max=Math.max(1,...values);$('mkTrendChart').innerHTML='<div class="mk-trend-plot">'+months.map((m,i)=>`<button type="button" class="mk-trend-column" title="${m} ${yen(values[i])}" onclick="mkTrendHighlight(this)"><span class="mk-trend-amount">${mkTrendAmount(values[i])}</span><span class="mk-trend-bar" style="height:${Math.max(2,values[i]/max*175)}px"></span><span class="mk-trend-month">${m.slice(2,4)}/${m.slice(5)}</span></button>`).join('')+'</div>';
const dates=txs.map(t=>typeof t.date==='string'&&/^\d{4}-\d{2}/.test(t.date)?t.date.slice(0,7):'').filter(Boolean);const earliest=dates.length?dates.sort()[0]:anchor;let all=[];for(let i=0;i<1200;i++){const m=mkTrendMonthOffset(anchor,-i);if(m<earliest)break;all.push(m)}$('mkTrendHistory').innerHTML=all.map(m=>`<div class="row mk-trend-history-row"><span class="mk-trend-history-meta"><span>${m.replace('-','年')}月</span><small>${mkBudgetLabel(m,kind==='expense'?undefined:category)}</small></span><strong>${yen(mkTrendValue(kind,m,category))}</strong></div>`).join('')||'<div class="small">記録はありません。</div>';overlay.classList.remove('hidden');$('mkTrendChart').scrollLeft=$('mkTrendChart').scrollWidth;}
function mkTrendHighlight(el){el.parentElement.querySelectorAll('.mk-trend-column').forEach(x=>x.classList.remove('selected'));el.classList.add('selected')}
function closeAnalysisTrend(){$('mkTrendOverlay').classList.add('hidden')}
function renderBudget(){
const month=analysisMonth,rows=analysisRows(month),tot=analysisTotals(month);
$('analysisMonthLabel').textContent=month.replace('-','年')+'月';
const b=mkBudgetAt(month);
$('monthBudgetValue').textContent=b===null?'予算未設定':yen(b);
$('monthBudgetValue').classList.toggle('mk-unset',b===null);
$('monthSpend').textContent=yen(tot.expense);
$('monthSpendBudget').textContent=yen(tot.expense);
$('monthRemain').textContent=b===null?'予算未設定':yen(b-tot.expense);
$('monthRemain').classList.toggle('mk-unset',b===null);
$('analysisIncome').textContent=yen(tot.income);
$('analysisNet').textContent=yen(tot.income-tot.expense);
$('analysisNet').classList.toggle('mk-negative',tot.income-tot.expense<0);
$('monthRemain').classList.toggle('mk-negative',b!==null&&b-tot.expense<0);
$('monthBudgetProgress').style.setProperty('width',(b>0?Math.min(100,tot.expense/b*100):0)+'%','important');
const map={};rows.forEach(t=>{const v=analysisSpend(t);if(v>0){const c=analysisCat(t),fee=mkFeeOther(t);if(v-fee>0)map[c]=(map[c]||0)+v-fee;if(fee>0)map['手数料']=(map['手数料']||0)+fee}});
const names=[...new Set([...cats,...Object.keys(categoryBudgets),...Object.keys(categoryBudgetHistory[month]||{}),...Object.keys(map)])];
$('budgetRows').innerHTML=names.map(c=>{
 const v=map[c]||0,b=mkBudgetAt(month,c),encoded=encodeURIComponent(c);
 const expanded=mkInlineBudgetCategory===c;
 const edit=`<button class="ghost sm mk-category-action" aria-expanded="${expanded}" onclick="editCategoryBudgetDirect(decodeURIComponent('${encoded}'))">${expanded?'閉じる ▲':'編集'}</button>`;
 const trend=`<button class="ghost sm mk-category-action" onclick="openAnalysisTrend('category',decodeURIComponent('${encoded}'))">推移 ›</button>`;
 const bar=b>0?`<div class="progress mk-category-progress"><div style="width:${Math.min(100,v/b*100)}%"></div></div>`:'';
 const budgetText=b===null||b===undefined?'予算未設定':'予算 '+yen(b);
 const remain=b>0?`<span class="${v>b?'mk-over-budget':''}">${v>b?'超過 '+yen(v-b):'残り '+yen(b-v)}</span>`:'';
 return `<div class="mk-category-row"><div class="row mk-category-top"><strong>${safeHtml(c)}</strong><span class="mk-category-spend"><span class="mk-category-muted">支出</span><button type="button" class="mk-category-link" onclick="mkOpenCategoryHistory(decodeURIComponent('${encoded}'))" title="この月の履歴を見る">${yen(v)} ›</button>${trend}</span></div>${bar}<div class="row mk-category-bottom"><span class="mk-category-budget"><span>${budgetText}</span>${edit}</span>${remain}</div>${expanded?`<form class="mk-inline-budget" onsubmit="saveInlineCategoryBudget(event)"><label for="mkInlineBudgetAmount">選択月の予算</label><div class="mk-inline-budget-entry"><div class="mk-inline-budget-field"><span>¥</span><input id="mkInlineBudgetAmount" type="text" inputmode="numeric" autocomplete="off" value="${b===null||b===undefined?'':b}" placeholder="金額を入力"></div><button type="submit" class="primary mk-inline-budget-confirm">決定</button></div><div class="small">0円で未設定に戻します。</div></form>`:''}</div>`;
}).join('')||'<div class="small">カテゴリはまだありません。</div>';
const sum=names.reduce((total,c)=>{const amount=mkBudgetAt(month,c);return total+(Number.isFinite(Number(amount))&&Number(amount)>0?Number(amount):0)},0);
$('mkCategoryBudgetSum').innerHTML=`<span>設定済みカテゴリ予算の合計</span><strong>${yen(sum)}</strong>`;
}
function mkOpenCategoryHistory(c){
 histTab='spend';histType='all';histCat=c;histPay='';histEvent='';histKeyword='';
 histPeriod='custom';histStart=analysisMonth+'-01';
 const end=new Date(Number(analysisMonth.slice(0,4)),Number(analysisMonth.slice(5,7)),0).getDate();
 histEnd=analysisMonth+'-'+String(end).padStart(2,'0');
 if($('histKeyword'))$('histKeyword').value='';
 if($('histStart'))$('histStart').value=histStart;
 if($('histEnd'))$('histEnd').value=histEnd;
 if($('histPeriodBtn'))$('histPeriodBtn').textContent='期間：'+analysisMonth.replace('-','年')+'月';
 if($('histCatBtn'))$('histCatBtn').textContent='カテゴリ：'+c;
 if($('histPayBtn'))$('histPayBtn').textContent='支払方法：すべて';
 if($('histEventBtn'))$('histEventBtn').textContent='特別費：すべて';
 if($('histCustomDates'))$('histCustomDates').classList.remove('hidden');
 histMoreOpen=true;setHistory('spend');
 nav('history',document.querySelectorAll('.nav')[2]);
}
function mkReturnToAnalysis(){if($('mkBackAnalysis'))$('mkBackAnalysis').classList.add('hidden');nav('budget',document.querySelectorAll('.nav')[4]);}
function editCategoryBudgetDirect(c){
 mkInlineBudgetCategory=mkInlineBudgetCategory===c?null:c;
 renderBudget();
 if(mkInlineBudgetCategory){
  const input=$('mkInlineBudgetAmount');
  if(input){initMoneyInputs();formatMoneyElement(input);input.focus({preventScroll:true});requestAnimationFrame(()=>input.scrollIntoView({block:'center',behavior:'instant'}))}
 }
}
function cancelInlineCategoryBudget(){mkInlineBudgetCategory=null;renderBudget()}
function saveInlineCategoryBudget(e){
 e.preventDefault();
 const input=$('mkInlineBudgetAmount');
 const raw=input?input.value.trim():'';
 const normalized=raw.replace(/[¥￥,，\s]/g,'');
 const n=normalized===''?0:Number(normalized);
 if(!/^[0-9]*$/.test(normalized)||!Number.isSafeInteger(n)||n<0){if(input)input.setCustomValidity('0以上の整数を入力してね');if(input)input.reportValidity();return}
 if(!categoryBudgetHistory[analysisMonth])categoryBudgetHistory[analysisMonth]={};
 categoryBudgetHistory[analysisMonth][mkInlineBudgetCategory]=n||null;
 mkInlineBudgetCategory=null;
 if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
 renderAll();
}
function editMonthlyBudget(){const existing=mkBudgetAt(analysisMonth);openMoneyPrompt('選択月の予算',existing===null?monthlyBudget:existing,(n)=>{monthlyBudgetHistory[analysisMonth]=n||null;monthlyBudget=n;renderAll()},{min:0,hint:'選択月だけに保存。0円で未設定に戻します。'})}
function editCategoryBudget(){openPicker('予算を編集するカテゴリ',cats.map(c=>({label:c+(mkBudgetAt(analysisMonth,c)!==null?'（'+yen(mkBudgetAt(analysisMonth,c))+'）':'（未設定）'),value:c})),(c)=>{openMoneyPrompt(c+' の選択月の予算',mkBudgetAt(analysisMonth,c),(n)=>{if(!categoryBudgetHistory[analysisMonth])categoryBudgetHistory[analysisMonth]={};categoryBudgetHistory[analysisMonth][c]=n||null;renderAll()},{min:0,allowBlankAsZero:true,hint:'選択月だけに保存。0円で未設定に戻します。'})})}
function eventUsed(e){return Number(e.baseSpent||0)+txs.filter(t=>t.eventTag===e.name).reduce((s,t)=>s+Number(t.amount||0),0)}
function eventDateText(e){if(e.start&&e.end)return e.start.slice(5).replace('-','/')+'〜'+e.end.slice(5).replace('-','/');if(e.start)return e.start.slice(5).replace('-','/')+'〜';return '期間未設定'}
function eventCard(e){let used=eventUsed(e),remain=e.budget?e.budget-used:null,open=openEventId===e.id,records=txs.filter(t=>t.eventTag===e.name),autoCats=[...new Set([...Object.keys(e.catBudgets||{}),...records.map(t=>t.category).filter(Boolean)])];return `<div class="card ${open?'eventcard':''}"><button class="event-head" onclick="toggleEvent('${e.id}')"><div class="event-summary"><div><div class="item-title">${e.name}</div><div class="item-meta">${eventDateText(e)}${e.budget?'　使用 '+yen(used)+' / 予算 '+yen(e.budget):'　使用 '+yen(used)}</div></div><span>${open?'▲':'▼'}</span></div></button>${open?`<div class="event-detail">${e.budget?`<div class="row"><span>総予算</span><strong>${yen(e.budget)}</strong></div><div class="row"><span>使用済み</span><strong>${yen(used)}</strong></div><div class="row"><span>残り</span><strong>${yen(remain)}</strong></div><div class="progress"><div style="width:${Math.min(100,used/e.budget*100)}%"></div></div>`:`<div class="row"><span>使用済み</span><strong>${yen(used)}</strong></div>`}<div class="subhead">カテゴリ別</div>${autoCats.length?autoCats.map(c=>{let u=records.filter(t=>t.category===c).reduce((s,t)=>s+Number(t.amount||0),0),b=Number((e.catBudgets||{})[c]||0);return `<div class="item"><div class="row"><strong>${c}</strong><span>${yen(u)}${b?' / '+yen(b):''}</span></div>${b?`<div class="item-meta">残り ${yen(b-u)}</div>`:''}</div>`}).join(''):'<div class="small">カテゴリ別の記録はまだありません。</div>'}<div class="subhead">最近の記録</div>${records.length?records.slice(0,6).map(t=>`<div class="item"><div class="row"><span>${t.category||recordTitle(t)}</span><strong>${yen(txAmount(t))}</strong></div><div style="margin-top:5px"><button class="ghost sm" onclick="editRecord('${t.id}')">編集</button> <button class="ghost sm danger" onclick="deleteHistoryRecord('${t.id}')">削除</button></div></div>`).join(''):'<div class="small">まだ記録はありません。</div>'}<div class="grid2" style="margin-top:10px"><button class="outline" onclick="editEvent('${e.id}')">編集</button><button class="outline" onclick="archiveEvent('${e.id}')">${e.archived?'元に戻す':'アーカイブ'}</button></div>${e.archived?`<button class="outline danger" style="width:100%;margin-top:7px" onclick="deleteEvent('${e.id}')">このイベントを削除</button>`:''}</div>`:''}</div>`}
function renderEvents(){$('activeEvents').innerHTML=eventsData.filter(e=>!e.archived).map(eventCard).join('')||'<div class="small">開催中・予定のイベントはありません。</div>';$('archivedEvents').innerHTML=eventsData.filter(e=>e.archived).map(eventCard).join('')||'<div class="small">まだありません。</div>';renderPastEventNames()}
function toggleEvent(id){openEventId=openEventId===id?'':id;renderEvents()}
function pastEventNameList(){let active=new Set(eventsData.map(e=>e.name));return [...new Set([...deletedEventNames,...txs.map(t=>t.eventTag).filter(Boolean)])].filter(n=>!active.has(n)).sort((a,b)=>a.localeCompare(b,'ja'))}
function renderPastEventNames(){let box=$('pastEventNames');if(!box)return;let vals=pastEventNameList(),q=($('newEventName')?.value||'').trim();let filtered=vals.filter(n=>!q||n.includes(q));box.innerHTML=filtered.length?`<div class="small" style="margin-top:6px">過去に使った特別費名</div><div class="pastnames">${filtered.slice(0,8).map(n=>`<button type="button" class="pastname" onclick="usePastEventName('${n.replace(/'/g,"\\'")}')">${n}</button>`).join('')}</div>`:''}
function usePastEventName(n){$('newEventName').value=n;renderPastEventNames()}
function toggleEventForm(force){let f=$('eventForm');if(force===false)f.classList.add('hidden');else f.classList.toggle('hidden');if(f.classList.contains('hidden'))resetEventForm();else renderPastEventNames()}
function pickNewEventCat(){openPicker('カテゴリを選択',cats.map(c=>({label:c,value:c})),(v,l)=>{newEventCat=v;$('newEventCatBtn').firstElementChild.textContent=l})}
function addNewEventCatBudget(){let a=moneyNum($('newEventCatAmount').value);if(!newEventCat||a<=0)return;newEventCatBudgets[newEventCat]=a;newEventCat='';$('newEventCatAmount').value='';$('newEventCatBtn').firstElementChild.textContent='カテゴリを選ぶ';renderNewEventCatRows()}
function renderNewEventCatRows(){$('newEventCatRows').innerHTML=Object.entries(newEventCatBudgets).map(([c,a])=>`<div class="row item"><span>${c}</span><span>${yen(a)} <button class="ghost sm" onclick="delete newEventCatBudgets['${c}'];renderNewEventCatRows()">削除</button></span></div>`).join('')}
function saveEvent(){let name=$('newEventName').value.trim(),budget=moneyNum($('newEventBudget').value);$('eventError').textContent='';if(!name){$('eventError').textContent='イベント名を入れてね';return}if(eventsData.some(e=>e.name===name&&e.id!==$('eventForm').dataset.editId)){$('eventError').textContent='同じ名前のイベントがあります';return}let id=$('eventForm').dataset.editId;if(id){let e=eventsData.find(x=>x.id===id),oldName=e.name;Object.assign(e,{name,start:$('newEventStart').value,end:$('newEventEnd').value,budget,catBudgets:{...newEventCatBudgets}});if(oldName!==name&&confirm('このイベント名に紐づいている支出記録も「'+name+'」へ変更しますか？'))txs.forEach(t=>{if(t.eventTag===oldName)t.eventTag=name})}else{let pastCount=txs.filter(t=>t.eventTag===name).length;if(pastCount&&!confirm('「'+name+'」に紐づく過去の支出が '+pastCount+'件あります。\n新しいイベントに再び表示しますか？')){let newName=prompt('過去記録とは分けるため、別のイベント名を入力してください。',name+' 2');if(!newName)return;name=newName.trim();if(!name)return}eventsData.unshift({id:'ev'+Date.now(),name,start:$('newEventStart').value,end:$('newEventEnd').value,budget,catBudgets:{...newEventCatBudgets},archived:false,baseSpent:0});deletedEventNames=deletedEventNames.filter(n=>n!==name);openEventId=eventsData[0].id}toggleEventForm(false);renderAll()}
function editEvent(id){let e=eventsData.find(x=>x.id===id);$('eventForm').dataset.editId=id;$('eventFormTitle').textContent='特別費イベントを編集';$('newEventName').value=e.name;$('newEventStart').value=e.start||'';$('newEventEnd').value=e.end||'';$('newEventBudget').value=e.budget||'';newEventCatBudgets={...(e.catBudgets||{})};renderNewEventCatRows();$('eventForm').classList.remove('hidden');refreshMoneyInputs();renderPastEventNames();scrollTo(0,$('eventForm').offsetTop-80)}
function resetEventForm(){$('eventForm').dataset.editId='';$('eventFormTitle').textContent='特別費イベントを追加';['newEventName','newEventStart','newEventEnd','newEventBudget','newEventCatAmount'].forEach(id=>$(id).value='');newEventCat='';newEventCatBudgets={};$('newEventCatBtn').firstElementChild.textContent='カテゴリを選ぶ';renderNewEventCatRows();$('eventError').textContent='';renderPastEventNames()}
function archiveEvent(id){let e=eventsData.find(x=>x.id===id);e.archived=!e.archived;if(e.archived&&openEventId===id)openEventId='';renderAll()}
function deleteEvent(id){let e=eventsData.find(x=>x.id===id);if(!e||!e.archived)return;let linked=txs.filter(t=>t.eventTag===e.name).length;if(!confirm('「'+e.name+'」を削除しますか？\n\nイベントの予算・期間などの設定は消えます。'+(linked?'\n紐づく支出記録 '+linked+'件は削除せず、特別費名を記録側に残します。':'')+'\n必要なら同じ名前でイベントを作り直して復活できます。'))return;deletedEventNames.push(e.name);eventsData=eventsData.filter(x=>x.id!==id);recurring.forEach(r=>{if(r.event===e.name)r.event=''});if(openEventId===id)openEventId='';renderAll()}
let editingWishIndex=-1;
function openWishModal(){
 $('wishModal').classList.remove('hidden');
 initMoneyInputs();
 refreshMoneyInputs();
}
function toggleWishForm(){
 editingWishIndex=-1;
 $('wishName').value='';$('wishPrice').value='';$('wishMemo').value='';
 $('wishFormTitle').textContent='ほしいものを追加';
 $('wishSaveButton').textContent='リストに追加';
 $('wishDeleteButton').classList.add('hidden');
 openWishModal();
}
function cancelWishEdit(){
 $('wishModal').classList.add('hidden');
 editingWishIndex=-1;
 $('wishName').value='';$('wishPrice').value='';$('wishMemo').value='';
}
function addWish(){
 const n=$('wishName').value.trim(),p=moneyNum($('wishPrice').value),memo=$('wishMemo').value.trim();
 if(!n||p<=0){alert('名前と価格を入力してね');return}
 const wish={name:n,price:p,memo};
 if(editingWishIndex>=0&&editingWishIndex<wishes.length)wishes[editingWishIndex]=wish;
 else wishes.unshift(wish);
 cancelWishEdit();renderAll();
}
function editWish(i){
 const w=wishes[i];if(!w)return;
 editingWishIndex=i;
 $('wishName').value=w.name||'';
 $('wishPrice').value=String(w.price||'');
 $('wishMemo').value=w.memo||'';
 $('wishFormTitle').textContent='ほしいものを編集';
 $('wishSaveButton').textContent='保存';
 $('wishDeleteButton').classList.remove('hidden');
 openWishModal();
 formatMoneyElement($('wishPrice'));
}
function deleteEditingWish(){if(editingWishIndex>=0)deleteWish(editingWishIndex)}
function deleteWish(i){
 if(!wishes[i]||!confirm('このほしいものを削除しますか？'))return;
 wishes.splice(i,1);cancelWishEdit();renderAll();
}
function renderWish(){
 if(!$('wishShortcut')||!$('wishList'))return;
 $('wishShortcut').textContent='リストに'+wishes.length+'件登録中';
 $('wishList').innerHTML=wishes.length?wishes.map((w,i)=>`<button type="button" class="mk-wish-row" onclick="editWish(${i})" aria-label="${safeHtml(w.name||'')}を編集"><span class="mk-wish-info"><span class="mk-wish-name">${safeHtml(w.name||'')}</span>${w.memo?`<span class="mk-wish-memo">${safeHtml(w.memo)}</span>`:''}</span><span class="mk-wish-price">${yen(Number(w.price)||0)}</span><span class="mk-wish-chevron" aria-hidden="true">›</span></button>`).join(''):'<div class="small mk-wish-empty">まだ登録されていません。「＋追加」から登録できます。</div>';
}

function renderRecent(){
 let items=txs.filter(t=>!isLoanExtra(t)&&t.type!=='loanAdjustment');
 $('recent').innerHTML=items.length?items.slice(0,6).map(t=>`<div class="item mk-recent-item"><div class="mk-recent-heading"><div class="item-title">${safeHtml(recordTitle(t))}</div><strong>${yen(txAmount(t))}</strong></div><div class="mk-recent-detail"><button class="ghost sm mk-recent-edit" onclick="editRecord('${t.id}')">編集</button><div class="item-meta">${safeHtml(t.date)}${recordMeta(t)?'・'+safeHtml(recordMeta(t)):''}</div></div></div>`).join(''):'<div class="small">まだ記録はありません。</div>';
}
function renderAll(){renderTodos();renderBalances();renderRecent();renderHistory();renderLoans();renderPersonCandidates();renderDue();renderRecurring();renderBudget();renderEvents();renderWish();initMoneyInputs();refreshMoneyInputs();mkQueueSave()}

// Only persisted business data; temporary form/navigation state stays ephemeral.
let mkStorageReady=false, mkSaveTimer=null;

// TODO: derived reminders are computed from app data; manual items are persisted.
function mkToday(){const d=new Date();return dateISO(d.getFullYear(),d.getMonth()+1,d.getDate())}
function mkTodoItems(){
 const today=mkToday(),list=[];
 for(const card of Object.keys(cardDefs)){
  const due=visibleBills(card)[0],amount=amountForBill(card,due),status=statusForBill(card,due);
  if(amount<=0||due<today)continue;
  const key='check|'+card+'|'+due;
  if(status==='candidate'&&!mkTodoHidden[key])list.push({key,title:cardDefs[card].name+'の請求額を確認',due,kind:'check',card,auto:true});
 }
 for(const card of Object.keys(cardDefs)){
   const dates=new Set([...Object.keys(billAdjustments).filter(k=>k.startsWith(card+'|')).map(k=>k.slice(card.length+1)),...visibleBills(card),...Object.keys(cardDefs[card].known)]);
   for(const due of dates){const key='withdraw|'+card+'|'+due;
     if(due>today||mkIsPaid(card,due)||statusForBill(card,due)!=='confirmed'||amountForBill(card,due)<=0)continue;
     list.push({key,title:cardDefs[card].name+'の引落確認',due,kind:'withdraw',card,auto:true,emphasis:true});
   }
 }
 const accountCodes={'西武信用金庫':'seibu','楽天銀行':'rakbank','三井住友銀行':'smbc','ゆうちょ':'yucho'};
 const grouped={};
 for(const card of Object.keys(cardDefs)){
  const due=visibleBills(card)[0],amount=amountForBill(card,due),status=statusForBill(card,due);
  if(amount<=0||due<today||status==='planned')continue;
  const account=accountCodes[cardDefs[card].account];if(!account)continue;
  const k=account+'|'+due;
  if(!grouped[k])grouped[k]={account,due,amount:0,cards:[]};
  grouped[k].amount+=amount;grouped[k].cards.push(card);
 }
 for(const g of Object.values(grouped)){
  const shortage=Math.max(0,g.amount-balances[g.account].v),key='fund|'+g.account+'|'+g.due;
  if(shortage>0&&!mkTodoHidden[key])list.push({key,title:balances[g.account].name+'へ '+yen(shortage)+' 入金',due:g.due,kind:'fund',auto:true,shortage,card:g.cards[0],estimated:g.cards.some(c=>statusForBill(c,g.due)!=='confirmed')});
 }
 for(const t of mkTodos){
  if(t.done||t.hidden)continue;
  if(t.person){const net=txs.filter(x=>x.person===t.person&&typeGroup(x)==='loan').reduce((s,x)=>s+loanImpact(x),0);if(!net||Math.sign(net)!==t.direction)continue;
   list.push({...t,title:t.person+(net<0?'に '+yen(-net)+' 返す':'から '+yen(net)+' 返してもらう'),kind:'loan'});
  }else list.push({...t,kind:'manual'});
 }
 return list.sort((a,b)=>(a.due||'9999-99-99').localeCompare(b.due||'9999-99-99')||Number(b.kind==='fund'||b.emphasis)-Number(a.kind==='fund'||a.emphasis)||Number(b.auto)-Number(a.auto));
}
let mkTodoExpanded=false,mkTodoEditingId=null,mkTodoEditingPerson=null;
function mkTodoEscId(t){return JSON.stringify(t.key||t.id).replace(/"/g,'&quot;')}
function renderTodos(){
 const el=$('mkTodoRows');if(!el)return;const items=mkTodoItems();
 $('todoCount').textContent=items.length+'件';
 el.innerHTML=(mkTodoExpanded?items:items.slice(0,5)).map(t=>{
 const id=mkTodoEscId(t),important=t.kind==='fund'||!!t.emphasis;
 return `<div class="mk-todo-row ${important?'mk-todo-important':''}"><input class="mk-todo-check" type="checkbox" aria-label="${safeHtml(t.title)}を完了" ${t.auto?'disabled title="詳細画面で操作すると自動完了します"':''} onchange="mkTodoComplete(${id},this.checked)"><button class="mk-todo-link" type="button" onclick="mkTodoEditById(${id})"><span class="mk-todo-title">${safeHtml(t.title)}</span>${t.due?`<span class="mk-todo-date">${fmtMD(t.due)}</span>`:''}</button>${t.kind!=='manual'?`<button class="mk-todo-detail" type="button" onclick="mkTodoOpen(${id})">詳細 ›</button>`:''}</div>`
 }).join('')||'<div class="small mk-todo-empty">やることはありません ♡</div>';
 const more=$('mkTodoMore');more.hidden=items.length<=5;more.textContent=mkTodoExpanded?'閉じる ▲':'もっと見る ▼';mkTodoSections();
}
function mkTodoGet(id){return mkTodoItems().find(x=>(x.key||x.id)===id)}
function mkTodoOpen(id){const t=mkTodoGet(id);if(!t)return;if(t.kind==='withdraw'){nav('due',document.querySelectorAll('.nav')[3]);mkBillOffset[t.card]=0;const base=visibleBills(t.card)[0];let [y,m]=base.split('-').map(Number),[ty,tm]=t.due.split('-').map(Number);mkBillOffset[t.card]=(ty-y)*12+(tm-m);openBillDetail(t.card)}else if(t.kind==='check'){nav('due',document.querySelectorAll('.nav')[3]);openBillDetail(t.card)}else if(t.kind==='fund'){nav('due',document.querySelectorAll('.nav')[3])}else if(t.kind==='loan'){loanActivePerson=t.person;loanExpandedPerson=t.person;loanArchiveView=false;openOther('loans');renderLoans()}else mkTodoEdit(t)}
function mkTodoAdd(){mkTodoShow(null,null)}
function mkTodoEditById(id){const t=mkTodoGet(id);if(t)mkTodoEdit(t)}
function mkTodoEdit(t){mkTodoShow(t,null)}
function mkTodoShow(t,person){
 mkTodoEditingId=t?(t.key||t.id):null;mkTodoEditingPerson=person||null;
 $('mkTodoModalTitle').textContent=t?'やることを編集':'やることを追加';
 $('mkTodoTitleInput').value=t?t.title:(person?person+'の清算':'');
 $('mkTodoTitleInput').readOnly=!!person||!!(t&&t.kind!=='manual');
 $('mkTodoEmphasis').checked=!!(t&&t.emphasis);
 const due=t?.due||mkToday();$('mkTodoDateInput').value=due;
 document.querySelector('input[name="mkTodoDueMode"][value="'+(t?.due?'date':'none')+'"]').checked=true;
 $('mkTodoDelete').hidden=!(t||person)||!!t?.auto; $('mkTodoHide').hidden=!(t||person); $('mkTodoHide').textContent=t?.auto?'表示しない':'表示しない';
 $('mkTodoModal').hidden=false;mkTodoValidate();
}
function mkTodoClose(){$('mkTodoModal').hidden=true;mkTodoEditingId=null;mkTodoEditingPerson=null}
function mkTodoValidate(){$('mkTodoSave').disabled=!$('mkTodoTitleInput').value.trim()}
function mkTodoDateMode(){}
function mkTodoChooseDate(){document.querySelector('input[name="mkTodoDueMode"][value="date"]').checked=true}
function mkTodoSave(){
 const title=$('mkTodoTitleInput').value.trim();if(!title)return;
 const due=document.querySelector('input[name="mkTodoDueMode"]:checked').value==='date'?$('mkTodoDateInput').value:'';
 if(document.querySelector('input[name="mkTodoDueMode"]:checked').value==='date'&&!due)return;
 const emphasis=$('mkTodoEmphasis').checked,t=mkTodoEditingId?mkTodoGet(mkTodoEditingId):null;
 if(t){if(t.auto){mkTodoClose();return}else{const item=mkTodos.find(x=>x.id===t.id);if(item){if(!item.person)item.title=title;item.due=due;item.emphasis=emphasis}}}
 else if(mkTodoEditingPerson){const p=mkTodoEditingPerson,net=txs.filter(x=>x.person===p&&typeGroup(x)==='loan').reduce((v,x)=>v+loanImpact(x),0);if(net)mkTodos.push({id:'todo'+Date.now(),person:p,direction:Math.sign(net),due,emphasis,done:false})}
 else mkTodos.push({id:'todo'+Date.now(),title,due,emphasis,done:false});
 mkTodoClose();renderAll();
}
function mkTodoDelete(){
 if(!mkTodoEditingId)return;
 const t=mkTodoGet(mkTodoEditingId);if(!t||t.auto)return;
 if(!confirm('このやることを削除しますか？'))return;
 mkTodos=mkTodos.filter(x=>x.id!==t.id);
 mkTodoClose();renderAll();
}
function mkTodoHide(){
 const t=mkTodoEditingId?mkTodoGet(mkTodoEditingId):null;if(!t)return;
 if(!confirm('このやることを表示しないようにしますか？\nあとから再表示できます。'))return;
 if(t.auto)mkTodoHidden[t.key]=true;
 else {const item=mkTodos.find(x=>x.id===t.id);if(item)item.hidden=true}
 mkTodoClose();renderAll();
}
function mkTodoRestore(id){
 if(id.startsWith('auto:'))delete mkTodoHidden[id.slice(5)];
 else {const t=mkTodos.find(x=>x.id===id);if(t){t.hidden=false;t.done=false}}
 renderAll();
}
function mkTodoDeleteCompleted(id){
 const item=mkTodos.find(t=>t.id===id&&t.done);
 if(!item)return;
 if(!confirm('この完了済みのやることを削除しますか？\n貸し借りなどの記録は削除されません。'))return;
 mkTodos=mkTodos.filter(t=>t.id!==id);
 renderAll();
}
function mkTodoUndo(id){const t=mkTodos.find(x=>x.id===id);if(!t)return;t.done=false;renderAll()}
let mkTodoCompletedOpen=false,mkTodoHiddenOpen=false;
function mkTodoToggleSection(which){if(which==='done')mkTodoCompletedOpen=!mkTodoCompletedOpen;else mkTodoHiddenOpen=!mkTodoHiddenOpen;renderTodos()}
function mkTodoSections(){
 const done=mkTodos.filter(t=>t.done),hidden=mkTodos.filter(t=>t.hidden&&!t.done);
 const autoHidden=Object.keys(mkTodoHidden).filter(k=>mkTodoHidden[k]);
 const completed=$('mkTodoCompleted'),concealed=$('mkTodoConcealed');
 if(completed){completed.innerHTML=done.length?`<button class="mk-todo-section-toggle" onclick="mkTodoToggleSection('done')">完了済み ${done.length}件 ${mkTodoCompletedOpen?'▲':'▼'}</button>${mkTodoCompletedOpen?done.map(t=>`<div class="mk-todo-archive-row"><label><input type="checkbox" checked onchange="mkTodoUndo(${JSON.stringify(t.id).replace(/"/g,'&quot;')})"> <s>${safeHtml(t.title||t.person+'の清算')}</s></label><button type="button" class="outline mk-todo-completed-delete" onclick="mkTodoDeleteCompleted(${JSON.stringify(t.id).replace(/"/g,'&quot;')})">削除</button></div>`).join(''):''}`:''}
 if(concealed){const n=hidden.length+autoHidden.length;concealed.innerHTML=n?`<button class="mk-todo-section-toggle" onclick="mkTodoToggleSection('hidden')">非表示の項目 ${n}件 ${mkTodoHiddenOpen?'▲':'▼'}</button>${mkTodoHiddenOpen?[...hidden.map(t=>({id:t.id,title:t.title||t.person+'の清算'})),...autoHidden.map(k=>({id:'auto:'+k,title:'自動リマインダー（'+k.split('|').slice(1).join(' / ')+'）'}))].map(t=>`<div class="mk-todo-archive-row"><span>${safeHtml(t.title)}</span><button class="outline" onclick="mkTodoRestore(${JSON.stringify(t.id).replace(/"/g,'&quot;')})">再表示</button></div>`).join(''):''}`:''}
}
function mkTodoComplete(id,checked){if(!checked)return;const t=mkTodoGet(id);if(!t)return;
 if(t.auto){renderTodos();return}
 else{const item=mkTodos.find(x=>x.id===id);if(item)item.done=true}
 renderAll();
}
function mkTodoManage(id){mkTodoEditById(id)}
function mkTodoList(){mkTodoExpanded=!mkTodoExpanded;renderTodos()}
function mkLoanTodoFromButton(btn){
 const p=btn.closest('.loan-person-card')?.dataset.loanPerson;if(!p)return;
 const net=txs.filter(x=>x.person===p&&typeGroup(x)==='loan').reduce((v,x)=>v+loanImpact(x),0);if(!net)return;
 const existing=mkTodos.find(t=>t.person===p&&!t.done&&!t.hidden);
 if(existing){
  if(!confirm('「'+p+'」のやること表示を解除しますか？\n貸し借りの記録は削除されません。'))return;
  existing.hidden=true;
 }else{
  // 再登録時は重複させず、非表示の項目を復帰させる。
  const previous=mkTodos.find(t=>t.person===p&&!t.done&&t.hidden);
  if(previous){previous.hidden=false;previous.direction=Math.sign(net);previous.due='';previous.emphasis=false}
  else mkTodos.push({id:'todo'+Date.now(),person:p,direction:Math.sign(net),due:'',emphasis:false,done:false,hidden:false});
 }
 renderAll();
}

// #79 Memo vocabulary management. No record-entry integration in this version.
let mkMemoData={groups:[],words:[]};
let mkMemoView='words',mkMemoScope='',mkMemoEdit=null,mkMemoDuplicate='',mkMemoDrag=null;
function mkMemoValidate(data){return MKMigrations.validateMemo(data)}
function mkMemoId(){return 'memo-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}
let mkMemoOrigin='other';
function mkMemoHistory(replace=false){const state={mkPage:'memoManager',memo:{view:mkMemoView,scope:mkMemoScope,modal:!!mkMemoEdit,origin:mkMemoOrigin}};history[replace?'replaceState':'pushState'](state,'',location.href)}
function mkMemoOpen(origin='other'){mkMemoOrigin=origin;mkMemoScope='';mkMemoView='words';mkMemoRender();openOther('memoManager');mkMemoHistory(true)}
function mkMemoTab(view){if(view===mkMemoView&&!mkMemoScope)return;if(view==='words'){if(mkMemoView!=='words')history.go(mkMemoScope?-2:-1);return}const replace=mkMemoView!=='words'&&!mkMemoScope;mkMemoView=view;mkMemoScope='';mkMemoRender();mkMemoHistory(replace)}
function mkMemoEnter(index){mkMemoScope=mkMemoView==='groups'?mkMemoData.groups[index].id:cats[index];mkMemoRender();mkMemoHistory()}
function mkMemoRows(){return mkMemoScope?mkMemoData.words.filter(w=>mkMemoView==='groups'?w.group===mkMemoScope:w.cats.includes(mkMemoScope)):mkMemoView==='words'?[...mkMemoData.words]:[...mkMemoData.groups]}
function mkMemoPersist(){mkQueueSave();mkMemoRender()}
function mkMemoScrollStrip(texts,className){
 const strip=document.createElement('div');strip.className='mk-memo-strip '+className;
 strip.setAttribute('aria-label',className==='mk-memo-category-strip'?'関連カテゴリ':'登録済みの言葉');strip.tabIndex=0;
 texts.forEach(text=>{const tag=document.createElement('span');tag.className='mk-memo-tag';tag.textContent=text;strip.append(tag)});
 const update=()=>{strip.classList.toggle('has-more',strip.scrollWidth-strip.clientWidth-strip.scrollLeft>2);strip.classList.toggle('has-before',strip.scrollLeft>2)};
 strip.addEventListener('scroll',update,{passive:true});requestAnimationFrame(update);return strip;
}
window.addEventListener('resize',()=>document.querySelectorAll('#mkMemoRows .mk-memo-strip').forEach(s=>s.dispatchEvent(new Event('scroll'))));
function mkMemoRender(){
 if(!$('mkMemoRows'))return;
 const scoped=!!mkMemoScope,wordRows=scoped||mkMemoView==='words',group=mkMemoData.groups.find(g=>g.id===mkMemoScope),allWords=!scoped&&mkMemoView==='words';
 $('mkMemoHeading').textContent=scoped?(mkMemoView==='groups'?'分類：'+(group?.name||''):'カテゴリ：'+mkMemoScope):'🎀 メモ';
 $('mkMemoTabs').hidden=scoped;
 $('mkMemoBack').textContent=scoped?'← 一覧へ':mkMemoView==='words'?(mkMemoOrigin==='record'?'← 記録へ':'← その他へ'):'← 言葉一覧へ';
 $('mkMemoAdd').hidden=!scoped&&mkMemoView==='cats';$('mkMemoAdd').textContent='＋追加';
 $('mkMemoListLabel').textContent=wordRows?'言葉':mkMemoView==='groups'?'分類':'カテゴリ';
 document.querySelectorAll('#mkMemoTabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===mkMemoView));
 const rows=$('mkMemoRows');rows.innerHTML='';
 const list=!scoped&&mkMemoView==='cats'?cats:mkMemoRows();
 const appendRow=(item,i)=>{
  const catRow=!scoped&&mkMemoView==='cats',row=document.createElement('div');row.className='mk-memo-row'+(catRow?' mk-memo-category-row':'')+(wordRows?' mk-memo-word-row':'');row.dataset.id=catRow?String(i):item.id;
  const main=document.createElement(wordRows?'div':'button');main.className='mk-memo-name';
  const title=document.createElement('span');title.className='mk-memo-word';title.textContent=catRow?item:wordRows?item.text:item.name;main.append(title);
  if(!wordRows){main.type='button';main.onclick=()=>mkMemoEnter(i);const arrow=document.createElement('span');arrow.textContent='›';arrow.className='mk-memo-arrow';main.append(arrow)}else{
   const groupName=mkMemoData.groups.find(g=>g.id===item.group)?.name||'';
   if(mkMemoView==='cats'){const meta=document.createElement('span');meta.className='mk-memo-meta';meta.textContent=groupName;main.append(meta)}
   else if(item.cats.length)main.append(mkMemoScrollStrip(item.cats,'mk-memo-category-strip'));
   main.title=[item.text,groupName,...item.cats].join(' / ');
  }
  row.append(main);
  if(catRow){const words=mkMemoData.groups.flatMap(g=>mkMemoData.words.filter(w=>w.group===g.id&&w.cats.includes(item))).map(w=>w.text);if(words.length)row.append(mkMemoScrollStrip(words,'mk-memo-preview'));else{const empty=document.createElement('span');empty.className='mk-memo-preview-empty';empty.textContent='登録なし';row.append(empty)}}
  else{const actions=document.createElement('div');actions.className='history-actions';for(const [label,del] of(wordRows?[['編集',false]]:[['編集',false],['削除',true]])){const b=document.createElement('button');b.type='button';b.className='ghost sm'+(del?' danger':'');b.textContent=label;b.onclick=()=>del?mkMemoDelete('group',item.id):mkMemoForm(wordRows?'word':'group',item.id);actions.append(b)}row.append(actions)}
  if(!catRow&&!allWords){const handle=document.createElement('button');handle.type='button';handle.className='mk-memo-grip';handle.textContent='⠿';handle.setAttribute('aria-label','長押しで並べ替え。上下キーでも移動');handle.addEventListener('pointerdown',e=>mkMemoDragStart(e,row));handle.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();mkMemoReorder(i,i+(e.key==='ArrowUp'?-1:1))}});row.append(handle)}
  rows.append(row);
 };
 if(allWords){mkMemoData.groups.forEach(g=>{const words=list.filter(w=>w.group===g.id);if(!words.length)return;const heading=document.createElement('div');heading.className='mk-memo-section-title';heading.textContent=g.name;rows.append(heading);words.forEach(appendRow)})}else list.forEach(appendRow);
 if(!list.length)rows.innerHTML='<div class="small mk-memo-empty">'+(wordRows?'言葉はまだありません。〔＋追加〕から登録できます。':'分類はまだありません。〔＋追加〕から登録してください。')+'</div>';
 $('mkMemoHint').textContent=list.length&&!allWords&&!(mkMemoView==='cats'&&!scoped)?'右のつまみを長押しして並べ替え':'';
}

function mkMemoBack(){history.back()}
function mkMemoForm(kind,id='',defaults=null){
 const item=(kind==='group'?mkMemoData.groups:mkMemoData.words).find(x=>x.id===id);
 const alreadyOpen=!!mkMemoEdit;mkMemoEdit={kind,id};mkMemoDuplicate='';
 $('mkMemoModal').classList.toggle('mk-memo-group-form',kind==='group');$('mkMemoDeleteWord').hidden=kind!=='word'||!id;
 $('mkMemoCategories').closest('details').open=false;
 $('mkMemoFormTitle').textContent=(kind==='group'?'分類':'言葉')+'を'+(id?'編集':'追加');
 $('mkMemoTextLabel').textContent=kind==='group'?'分類名':'言葉';
 $('mkMemoText').value=item?(kind==='group'?item.name:item.text):'';
 $('mkMemoWordFields').hidden=kind==='group';$('mkMemoNext').hidden=kind==='group'||!!id;
 $('mkMemoFeedback').textContent='';$('mkMemoDuplicateActions').hidden=true;
 const chosen=item?.group||defaults?.group||(mkMemoView==='groups'&&mkMemoScope?mkMemoScope:'');
 $('mkMemoGroup').innerHTML='<option value="">分類を選択</option>'+mkMemoData.groups.map(g=>`<option value="${safeHtml(g.id)}">${safeHtml(g.name)}</option>`).join('');$('mkMemoGroup').value=chosen;
 const selected=item?.cats||defaults?.cats||(mkMemoView==='cats'&&mkMemoScope?[mkMemoScope]:[]);
 $('mkMemoCategories').innerHTML=cats.map((c,i)=>`<label class="mk-memo-cat"><input type="checkbox" value="${i}" ${selected.includes(c)?'checked':''}><span>${safeHtml(c)}</span></label>`).join('');
 $('mkMemoInlineGroup').value='';mkMemoToggleInlineGroup(false);
 $('mkMemoModal').classList.remove('hidden');document.body.classList.add('mk-memo-modal-open');mkMemoViewport();if(!alreadyOpen)mkMemoHistory();
}
function mkMemoClose(){mkMemoHide();if(history.state?.memo?.modal)history.back()}
function mkMemoHide(){$('mkMemoModal').classList.add('hidden');document.body.classList.remove('mk-memo-modal-open');mkMemoEdit=null;document.activeElement?.blur()}
function mkMemoDeleteEditing(){if(!mkMemoEdit?.id)return;const id=mkMemoEdit.id;mkMemoDelete('word',id);if(!mkMemoData.words.some(w=>w.id===id))mkMemoClose()}
function mkMemoViewport(){const m=$('mkMemoModal');if(!m||m.classList.contains('hidden'))return;const v=window.visualViewport;m.style.top=(v?.offsetTop||0)+'px';m.style.height=(v?.height||innerHeight)+'px'}
window.visualViewport?.addEventListener('resize',mkMemoViewport);window.visualViewport?.addEventListener('scroll',mkMemoViewport);window.addEventListener('resize',mkMemoViewport);
function mkMemoToggleInlineGroup(open){const box=$('mkMemoInlineGroupBox'),button=$('mkMemoInlineGroupToggle');const show=typeof open==='boolean'?open:box.hidden;box.hidden=!show;button.textContent=show?'閉じる':'＋追加';button.setAttribute('aria-expanded',String(show));if(show)$('mkMemoInlineGroup').focus()}
function mkMemoNewGroupInline(){const name=$('mkMemoInlineGroup').value.trim();if(!name){$('mkMemoFeedback').textContent='分類名を入力してください。';return}let g=mkMemoData.groups.find(x=>x.name.trim()===name);if(!g){g={id:mkMemoId(),name};mkMemoData.groups.push(g);mkMemoPersist()}const opt=document.createElement('option');opt.value=g.id;opt.textContent=g.name;if(![...$('mkMemoGroup').options].some(o=>o.value===g.id))$('mkMemoGroup').append(opt);$('mkMemoGroup').value=g.id;mkMemoToggleInlineGroup(false);$('mkMemoInlineGroup').value='';$('mkMemoInlineGroupToggle').focus();$('mkMemoFeedback').textContent=''}
function mkMemoSave(next=false){
 if(!mkMemoEdit)return;const text=$('mkMemoText').value.trim(),{kind,id}=mkMemoEdit;
 $('mkMemoFeedback').textContent='';$('mkMemoDuplicateActions').hidden=true;mkMemoDuplicate='';
 if(!text){$('mkMemoFeedback').textContent=(kind==='group'?'分類名':'言葉')+'を入力してください。';return}
 const list=kind==='group'?mkMemoData.groups:mkMemoData.words,dupe=list.find(x=>x.id!==id&&(kind==='group'?x.name:x.text).trim()===text);
 if(dupe){$('mkMemoFeedback').textContent='「'+text+'」は登録済みです。'+(kind==='word'?' 分類：'+mkMemoData.groups.find(g=>g.id===dupe.group)?.name:'');if(kind==='word'){mkMemoDuplicate=dupe.id;$('mkMemoDuplicateActions').hidden=false;const cat=mkMemoView==='cats'?mkMemoScope:'';$('mkMemoLinkDuplicate').hidden=!cat;$('mkMemoLinkDuplicate').disabled=dupe.cats.includes(cat);$('mkMemoLinkDuplicate').textContent=dupe.cats.includes(cat)?'このカテゴリには関連づけ済みです':'このカテゴリを関連づける'}return}
 const group=$('mkMemoGroup').value,links=[...document.querySelectorAll('#mkMemoCategories input:checked')].map(x=>cats[Number(x.value)]);
 if(kind==='word'&&!mkMemoData.groups.some(g=>g.id===group)){$('mkMemoFeedback').textContent='分類を選択または追加してください。';return}
 const value=kind==='group'?{id:id||mkMemoId(),name:text}:{id:id||mkMemoId(),text,group,cats:links};const index=list.findIndex(x=>x.id===id);if(index<0)list.push(value);else list[index]=value;
 mkMemoPersist();if(next){mkMemoForm('word','',{group,cats:links});$('mkMemoFeedback').textContent='保存しました。続けて登録できます。';$('mkMemoText').focus()}else mkMemoClose();
}
function mkMemoEditDuplicate(){if(mkMemoDuplicate)mkMemoForm('word',mkMemoDuplicate)}
function mkMemoLinkDuplicate(){const w=mkMemoData.words.find(x=>x.id===mkMemoDuplicate);if(!w||mkMemoView!=='cats'||!mkMemoScope)return;if(!w.cats.includes(mkMemoScope))w.cats.push(mkMemoScope);mkMemoPersist();mkMemoClose()}
function mkMemoDelete(kind,id){const list=kind==='group'?mkMemoData.groups:mkMemoData.words,item=list.find(x=>x.id===id);if(!item)return;const count=mkMemoData.words.filter(w=>w.group===id).length;if(!confirm(kind==='group'?'分類「'+item.name+'」を削除しますか？'+(count?'\n中の言葉 '+count+'件も削除されます。':''):'「'+item.text+'」をリストから削除しますか？'))return;
 if(kind==='group'){mkMemoData.groups=mkMemoData.groups.filter(g=>g.id!==id);mkMemoData.words=mkMemoData.words.filter(w=>w.group!==id)}else mkMemoData.words=mkMemoData.words.filter(w=>w.id!==id);mkMemoPersist()
}
// Reorder only the visible subset, retaining positions of words in other groups.
function mkMemoReorder(from,to){if(!mkMemoScope&&mkMemoView==='words')return;const visible=mkMemoRows();if(to<0||to>=visible.length||from===to)return;const ids=new Set(visible.map(x=>x.id));visible.splice(to,0,visible.splice(from,1)[0]);if(!mkMemoScope&&mkMemoView==='groups')mkMemoData.groups=visible;else {let i=0;mkMemoData.words=mkMemoData.words.map(w=>ids.has(w.id)?visible[i++]:w)}mkMemoPersist()}
function mkMemoDragStart(e,row){
 if(e.button!==0||mkMemoDrag)return;e.preventDefault();
 const grip=$('mkMemoRows');grip.setPointerCapture(e.pointerId);
 const d={row,grip,id:e.pointerId,x:e.clientX,y:e.clientY,lastY:e.clientY,active:false,ghost:null,raf:0};mkMemoDrag=d;
 d.timer=setTimeout(()=>{d.active=true;const r=row.getBoundingClientRect();d.offset=d.y-r.top;d.ghost=row.cloneNode(true);d.ghost.classList.add('mk-memo-floating');Object.assign(d.ghost.style,{width:r.width+'px',left:r.left+'px',top:r.top+'px'});document.body.append(d.ghost);row.classList.add('mk-memo-placeholder');d.raf=requestAnimationFrame(mkMemoDragFrame)},330);
 grip.addEventListener('pointermove',mkMemoDragMove);grip.addEventListener('pointerup',mkMemoDragEnd);grip.addEventListener('pointercancel',mkMemoDragCancel);grip.addEventListener('lostpointercapture',mkMemoDragCancel);
}
function mkMemoDragMove(e){const d=mkMemoDrag;if(!d)return;d.lastY=e.clientY;if(!d.active&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>10)mkMemoDragCancel()}
function mkMemoDragFrame(){const d=mkMemoDrag;if(!d?.active)return;d.ghost.style.top=(d.lastY-d.offset)+'px';const bottom=document.querySelector('.bottom').getBoundingClientRect().top;if(d.lastY<95)window.scrollBy(0,-7);else if(d.lastY>bottom-45)window.scrollBy(0,7);
 const siblings=[...$('mkMemoRows').children],before=new Map(siblings.map(x=>[x,x.getBoundingClientRect().top]));
 const target=siblings.find(x=>x!==d.row&&d.lastY<x.getBoundingClientRect().top+x.offsetHeight/2);
 if(target)$('mkMemoRows').insertBefore(d.row,target);else $('mkMemoRows').append(d.row);
 for(const el of siblings){if(el===d.row)continue;const delta=before.get(el)-el.getBoundingClientRect().top;if(delta)el.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration:160,easing:'ease-out'})}
 d.raf=requestAnimationFrame(mkMemoDragFrame);
}
function mkMemoDragEnd(){mkMemoDragFinish(true)}function mkMemoDragCancel(){mkMemoDragFinish(false)}
function mkMemoDragFinish(save){const d=mkMemoDrag;if(!d)return;mkMemoDrag=null;clearTimeout(d.timer);cancelAnimationFrame(d.raf);d.grip.removeEventListener('pointermove',mkMemoDragMove);d.grip.removeEventListener('pointerup',mkMemoDragEnd);d.grip.removeEventListener('pointercancel',mkMemoDragCancel);d.grip.removeEventListener('lostpointercapture',mkMemoDragCancel);d.ghost?.remove();d.row.classList.remove('mk-memo-placeholder');if(d.grip.hasPointerCapture(d.id))d.grip.releasePointerCapture(d.id);
 if(d.active&&save){const visible=mkMemoRows(),from=visible.findIndex(x=>x.id===d.row.dataset.id),to=[...$('mkMemoRows').children].indexOf(d.row);mkMemoReorder(from,to)}mkMemoRender();
}


function mkState(){return {
  miniSchemaVersion:MKMigrations.currentVersion,mkMemoData,
  txs,loans,cashbook,snapshots,wishes,recurring,eventsData,mkTodos,mkTodoHidden,
  billAdjustments,billItemAdjustments,mkPaidBills,deletedEventNames,
  loanArchivedPeople,loanGroups,loanGroupSerial,
  monthlyBudget,categoryBudgets,monthlyBudgetHistory,categoryBudgetHistory,chargeDefaults,
  balances:Object.fromEntries(Object.entries(balances).map(([key,val])=>[key,val.v]))
}}
function mkRestoreState(state){
  state=MKMigrations.upgradeState(state);
  mkMemoData=state.mkMemoData;
  const arrayKeys=['txs','loans','cashbook','snapshots','wishes','recurring','eventsData','deletedEventNames','loanArchivedPeople','loanGroups'];
  for(const key of arrayKeys)if(state[key]!==undefined&&!Array.isArray(state[key]))throw new Error('Invalid '+key);
  for(const key of arrayKeys)if(state[key]!==undefined){switch(key){
    case 'txs':txs=state[key];break;case 'loans':loans=state[key];break;
    case 'cashbook':cashbook=state[key];break;case 'snapshots':snapshots=state[key];break;
    case 'wishes':wishes=state[key];break;case 'recurring':recurring=state[key];break;
    case 'eventsData':eventsData=state[key];break;case 'deletedEventNames':deletedEventNames=state[key];break;
    case 'loanArchivedPeople':loanArchivedPeople=state[key];break;case 'loanGroups':loanGroups=state[key];break;
  }}
  if(state.balances&&typeof state.balances==='object')for(const [key,val] of Object.entries(state.balances)){
    if(balances[key]&&Number.isFinite(val))balances[key].v=val;
  }
  if(Array.isArray(state.mkTodos))mkTodos=state.mkTodos;
  if(state.mkTodoHidden&&typeof state.mkTodoHidden==='object')mkTodoHidden=state.mkTodoHidden;
  if(state.billAdjustments&&typeof state.billAdjustments==='object')billAdjustments=state.billAdjustments;
  if(state.mkPaidBills&&typeof state.mkPaidBills==='object'&&!Array.isArray(state.mkPaidBills))mkPaidBills=state.mkPaidBills;
  if(state.billItemAdjustments&&typeof state.billItemAdjustments==='object')billItemAdjustments=state.billItemAdjustments;
  if(state.categoryBudgets&&typeof state.categoryBudgets==='object')categoryBudgets=state.categoryBudgets;
  if(state.monthlyBudgetHistory&&typeof state.monthlyBudgetHistory==='object')monthlyBudgetHistory=state.monthlyBudgetHistory;
  if(state.categoryBudgetHistory&&typeof state.categoryBudgetHistory==='object')categoryBudgetHistory=state.categoryBudgetHistory;
  if(state.chargeDefaults&&typeof state.chargeDefaults==='object')chargeDefaults=state.chargeDefaults;
  if(Number.isFinite(state.monthlyBudget))monthlyBudget=state.monthlyBudget;
  if(Number.isSafeInteger(state.loanGroupSerial))loanGroupSerial=state.loanGroupSerial;
}
// Persist a snapshot immediately on every data-changing render. The storage layer
// serializes writes; no 200ms debounce window where closing loses the change.
let mkPendingSaves=0, mkSaveFailed=false;
function mkSaveStatus(message,failed=false){
  const el=document.getElementById('miniSaveStatus');
  if(el){el.textContent=message;el.style.color=failed?'#b94242':'#52645a';}
}
function mkQueueSave(){
  if(!mkStorageReady||mkSaveFailed)return;
  let snapshot;
  try{snapshot=mkState();}catch(e){mkSaveFailed=true;mkSaveStatus('保存失敗：入力を中止してください',true);alert('保存データを準備できませんでした。画面を閉じずに確認してください。');return;}
  mkPendingSaves++;
  mkSaveStatus('保存中…');
  MKStorage.save(snapshot).then(()=>{
    mkPendingSaves--;
    if(!mkSaveFailed&&mkPendingSaves===0)mkSaveStatus('保存済み ✓');
  }).catch(e=>{
    mkPendingSaves--;
    if(mkSaveFailed)return;
    mkSaveFailed=true;mkStorageReady=false;
    console.error('Money Keeper Mini: 保存失敗',e);
    mkSaveStatus('保存失敗：入力を中止してください',true);
    alert('保存に失敗しました。これ以上の入力はせず、画面を閉じずにバックアップ方法を確認してください。');
  });
}
window.addEventListener('beforeunload',e=>{
  if(mkPendingSaves>0){e.preventDefault();e.returnValue='';}
});
// Some edit actions re-render only their own component; persist those as well.
function mkWrapSave(name){const fn=globalThis[name];if(typeof fn!=='function')return;
  globalThis[name]=function(...args){const result=fn.apply(this,args);mkQueueSave();return result};
}
['saveSnapshot','addWish','editMonthlyBudget','editCategoryBudget'].forEach(mkWrapSave);
// Step2 draft: restore persisted data before the first render.
async function mkBoot(){
  let lastRequestedPage='';try{lastRequestedPage=sessionStorage.getItem('mk-last-page')||''}catch(_){}
  await MKStorage.unlock();
  try {
    const saved=await MKStorage.load();
    if(saved) mkRestoreState(saved);
    mkStorageReady=true;
    mkSaveStatus('読み込み完了');
  } catch(e) {
    console.error('Money Keeper: 保存データの読み込みに失敗',e);
    mkStorageReady=false;
    alert('保存データを読み込めませんでした。安全のため、この画面では保存を停止しています。再読み込みして確認してください。');
  }
  // Mini: NZ旅行 is a built-in selectable event; do not modify existing matching metadata.
  if(!eventsData.some(e=>e.name==='NZ旅行'))eventsData.push({id:'mini-event-nz-trip',name:'NZ旅行',start:'',end:'',budget:0,catBudgets:{},archived:false,baseSpent:0});
  deletedEventNames=deletedEventNames.filter(name=>name!=='NZ旅行');
  renderPayBtns();renderCharge();renderAll();updateForm();initMoneyInputs();mkDisplayPage('record',mkNavigationButton('record'));
  try{const last=lastRequestedPage;if(['record','history','budget','other','events','memoManager'].includes(last)&&$(last)?.classList.contains('page')){const navBtn=document.querySelector(`.nav[onclick*="'${last}'"]`);nav(last,navBtn||null);if(['loans','events','wish'].includes(last)){const otherNav=document.querySelectorAll('.nav')[5];if(otherNav)otherNav.classList.add('active')}}}catch(_){}
  mkMemoRender();
  if(document.querySelector('.page.active')?.id==='memoManager'){history.replaceState({mkPage:'other'},'',location.href);mkMemoView='words';mkMemoScope='';mkMemoHistory();}
  new MutationObserver(()=>initMoneyInputs()).observe(document.body,{childList:true,subtree:true});
}
mkBoot();

/* Budget modal uses the visual viewport itself rather than scrolling the page.
   Keep the background stationary; backdrop taps still dismiss the modal. */
(function mkBudgetViewportModal(){
 const modal=document.getElementById('moneyPromptModal');
 if(!modal)return;
 const vv=window.visualViewport;
 let raf=0,locked=false,oldBodyOverflow='',oldHtmlOverflow='';
 function update(){
  raf=0;
  const open=!modal.classList.contains('hidden');
  if(!open){
   modal.style.removeProperty('top');
   modal.style.removeProperty('height');
   modal.style.removeProperty('bottom');
   if(locked){document.body.style.overflow=oldBodyOverflow;document.documentElement.style.overflow=oldHtmlOverflow;locked=false;}
   return;
  }
  if(!locked){oldBodyOverflow=document.body.style.overflow;oldHtmlOverflow=document.documentElement.style.overflow;document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';locked=true;}
  // On Android the keyboard reduces visualViewport.height. Position the entire
  // sheet in that visible region; do not use scrollIntoView or page scroll.
  const top=vv?vv.offsetTop:0;
  const height=vv?vv.height:window.innerHeight;
  modal.style.top=top+'px';
  modal.style.height=height+'px';
  modal.style.bottom='auto';
 }
 function queue(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(update)}
 new MutationObserver(()=>{queue();setTimeout(queue,90);setTimeout(queue,280);setTimeout(queue,550)}).observe(modal,{attributes:true,attributeFilter:['class']});
 if(vv){vv.addEventListener('resize',queue);vv.addEventListener('scroll',queue)}
 window.addEventListener('resize',queue);
 document.addEventListener('focusin',e=>{if(modal.contains(e.target)){queue();setTimeout(queue,130);setTimeout(queue,400)}});
 // Do not allow touch gestures on the dim backdrop to scroll the page.
 modal.addEventListener('touchmove',e=>{if(e.target===modal)e.preventDefault()},{passive:false});
 queue();
})();

// Give the current app screen a browser-history identity after initialization.
setTimeout(()=>{try{const active=document.querySelector('.page.active')?.id||'home';if(!history.state?.mkPage)history.replaceState({mkPage:active},'',location.href)}catch(_){}},0);


