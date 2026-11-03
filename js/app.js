// ================= 应用：状态 / 渲染 / 交互 =================
const KEY='weekend-v2';
const DEF_PREFS={city:'sh',day:0,people:4,budget:150,likes:['exhibit','walk','food'],avoid:[]};
const fresh=()=>({v:2,prefs:{...DEF_PREFS,likes:[...DEF_PREFS.likes],avoid:[]},activePlan:null,teams:[],checks:[],liked:[],myGuides:[],gsort:'hot',libType:'all',seeded:false});
let S=fresh();
try{const raw=localStorage.getItem(KEY);if(raw)S=Object.assign(fresh(),JSON.parse(raw));}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WD=weekendDates();
const clone=o=>JSON.parse(JSON.stringify(o));
const money=v=>v===0?'免费':'¥'+v;
const num=v=>Math.round(v*10)/10;
const short=a=>{const n=a.n.split(/ · | — | → /)[0];return n.length>9?n.slice(0,9)+'…':n;};
const skLabel=k=>{const [d,s]=k.split('_');return WD[d].label+SLOTS[s].n;};
const avColor=n=>COLORS[NAMES.indexOf(n)]||COLORS[n.length%COLORS.length];
const avatar=n=>`<div class="av" style="background:${avColor(n)}">${esc(n[0])}</div>`;

function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),2200);}
function copy(text){try{navigator.clipboard.writeText(text).then(()=>toast('已复制，去群里粘贴吧'),()=>showCopy(text));}catch(e){showCopy(text);}}
function showCopy(text){openSheet(`<h2>复制下面的内容</h2><textarea style="width:100%;height:200px">${esc(text)}</textarea><div class="acts"><button class="btn" onclick="closeSheet()">好的</button></div>`);}
function openSheet(html,cls=''){const s=$('#sheet');s.className='sheet '+cls;s.innerHTML=html;s.scrollTop=0;$('#mask').classList.add('on');}
window.closeSheet=()=>{$('#mask').classList.remove('on');CUR=null;};
$('#mask').addEventListener('click',e=>{if(e.target.id==='mask')closeSheet();});

// ---------- 首页：方案 ----------
let PLANS=[],CUR=null;
const regen=()=>{PLANS=generatePlans(S.prefs);};

function routeLine(p){return p.stops.map(s=>{const a=actOf(s);return `<span class="${s.warn?'w':''}">${TYPES[a.t][1]} ${esc(short(a))}</span>`;}).join('<i>→</i>');}
function planCard(p,i){
  return `<div class="card pcard ${i===0?'top':''}" onclick="openPlan(${i})">${i===0?'<div class="ribbon">最推荐</div>':''}
  <div class="row nowrap"><div class="grow"><h3>${esc(p.title)}</h3><div class="tags">${p.tags.map(t=>`<span class="tag ${t==='雨天友好'||t==='0元'?'g':t==='需预约'?'o':''}">${t}</span>`).join('')}</div></div>
  <div class="score"><b>${p.match}</b><div>匹配度</div></div></div>
  <div class="route">${routeLine(p)}</div>
  <div class="pfoot"><span>人均 <b>¥${p.cost.total}</b></span><span>${p.stops.length} 站</span><span>约 ${p.hours} 小时</span><span class="grow"></span><span class="more">看路线 ›</span></div></div>`;
}

function renderHome(){
  const P=S.prefs,ws=WEATHER[P.city];
  $('#city').innerHTML=Object.entries(CITIES).map(([k,c])=>`<option value="${k}" ${k===P.city?'selected':''}>${c.name}</option>`).join('');
  $('#wx').innerHTML=ws.map((d,i)=>{const bad=['am','pm','eve'].some(k=>isBad(d[k]));
    return `<div class="wday ${i===P.day?'on':''}" onclick="setDay(${i})"><div class="row nowrap"><b>${WD[i].label}</b><span class="meta">${WD[i].date}</span><span class="grow"></span><span class="tag ${bad?'o':'g'}">${bad?'有雨':'适合出门'}</span></div>
    <div class="wslots">${['am','pm','eve'].map(k=>`<div class="${isBad(d[k])?'bad':''}"><span>${SLOTS[k].n}</span><i>${d[k].i}</i><b>${d[k].t}°</b><em>${d[k].rain>=30?d[k].rain+'%':'&nbsp;'}</em></div>`).join('')}</div></div>`;}).join('');
  $('#cond').innerHTML=`<span>👥 ${P.people}人</span><span>💰 ${P.budget>=UNLIMITED?'预算不限':'≤¥'+P.budget}</span><span>❤️ ${P.likes.map(t=>TYPES[t][0]).join('/')||'都行'}</span>${P.avoid.length?`<span>🚫 ${P.avoid.map(k=>AVOIDS[k]).join('/')}</span>`:''}<b>调整 ›</b>`;
  const d=ws[P.day],bad=['am','pm','eve'].filter(k=>isBad(d[k]));
  $('#headline').innerHTML=`<div class="meta">${CITIES[P.city].name} · ${WD[P.day].label} ${WD[P.day].date} · ${bad.length?`${bad.map(k=>SLOTS[k].n).join('、')}${d[bad[0]].w}（${d[bad[0]].rain}%）`:`${d.pm.w} ${d.am.t}~${d.pm.t}°C`}</div>
    <h2>${PLANS.length?`${bad.length?'有雨也不怕，':''}为你准备了 ${PLANS.length} 套方案`:'没有找到合适的方案'}</h2>`;
  $('#plans').innerHTML=PLANS.length?(S.onboarded?'':'<div class="coach" id="coach">👇 点开最推荐的方案，看看时间轴、花费拆分和雨天备选</div>')+PLANS.map(planCard).join(''):`<div class="card empty">条件有点严格，试试放宽预算或兴趣<br><br><button class="btn pri" onclick="openCond()">调整条件</button></div>`;
  renderLib();
}
function renderLib(){
  const P=S.prefs,list=ACTS.filter(a=>a.city===P.city&&(S.libType==='all'||a.t===S.libType));
  $('#libtypes').innerHTML=[['all','全部']].concat(Object.entries(TYPES).map(([k,v])=>[k,v[1]+' '+v[0]])).map(([k,n])=>`<span class="chip sm ${S.libType===k?'on':''}" onclick="setLib('${k}')">${n}</span>`).join('');
  $('#lib').innerHTML=list.map(a=>`<div class="lib-it" onclick="actDetail('${a.id}')"><div class="emo" style="background:${TYPES[a.t][2]}">${TYPES[a.t][1]}</div><div class="grow"><b>${esc(a.n)}</b><div class="meta">📍${a.area} · ${a.in?'室内':'户外'} · ${money(a.p)} · ${a.min}-${a.max}人</div></div><span class="src">${a.src}</span></div>`).join('');
}
window.setLib=k=>{S.libType=k;save();renderLib();};
window.setDay=i=>{S.prefs.day=i;save();regen();renderHome();};
window.actDetail=id=>{const a=findAct(id);openSheet(`<div class="sheet-hd"><h2>${TYPES[a.t][1]} ${esc(a.n)}</h2><button class="x" onclick="closeSheet()">✕</button></div>
  <div class="tags"><span class="tag">${TYPES[a.t][0]}</span><span class="tag ${a.in?'':'g'}">${a.in?'室内':'户外'}</span><span class="tag o">${money(a.p)}/人</span><span class="tag">${a.min}-${a.max}人</span>${a.book?'<span class="tag o">需预约</span>':''}${a.queue?'<span class="tag">排队较久</span>':''}</div>
  <p class="meta">📍 ${a.area} · ⏱ ${a.dur}h · 可安排在 ${a.slots.map(s=>SLOTS[s].n).join('/')} · 来源：${a.src}</p>
  <p style="margin:10px 0">${esc(a.desc)}</p><div class="why">🎓 ${esc(a.stu)}</div>
  <div class="acts"><button class="btn pri" onclick="planAround('${a.id}')">✨ 以它为中心生成方案</button><button class="btn ghost" onclick="checkIn('${a.id}')">📍 打卡</button></div>`);};
window.planAround=id=>{const a=findAct(id);const p=planFromStops([id],S.prefs,'围绕「'+short(a)+'」的方案');
  // 补一顿饭
  const meal=candidates(a.slots.includes('eve')?'dinner':'lunch',S.prefs,{prevArea:a.area})[0];
  if(meal){p.stops.push({aid:meal.a.id,slot:a.slots.includes('eve')?'dinner':'lunch',area:meal.a.area});const o={am:0,lunch:1,pm:2,dinner:3,eve:4};p.stops.sort((x,y)=>o[x.slot]-o[y.slot]);recalc(p,S.prefs);}
  PLANS.unshift(p);PLANS=PLANS.slice(0,4);renderHome();openPlan(0);};

// ---------- 条件面板 ----------
window.openCond=()=>{const P=S.prefs;openSheet(`<div class="sheet-hd"><h2>这周末的条件</h2><button class="x" onclick="closeSheet()">✕</button></div>
  <div class="field"><label>哪天</label><div class="seg">${WD.map((d,i)=>`<button class="${P.day===i?'on':''}" onclick="setPref('day',${i})">${d.label} ${d.date}</button>`).join('')}</div></div>
  <div class="field row nowrap"><label class="grow" style="margin:0">几个人</label><div class="stepper"><button onclick="setPref('people',-1)">−</button><span>${P.people}</span><button onclick="setPref('people',1)">+</button></div></div>
  <div class="field"><label>人均预算（含门票、交通、餐饮）<b style="float:right;color:var(--ink)">${P.budget>=UNLIMITED?'不限':'≤ ¥'+P.budget}</b></label><input type="range" min="0" max="${UNLIMITED}" step="10" value="${P.budget}" oninput="setPref('budget',+this.value,true)" onchange="setPref('budget',+this.value)"></div>
  <div class="field"><label>想玩（可多选）</label><div class="chips">${Object.entries(TYPES).map(([k,v])=>`<span class="chip ${P.likes.includes(k)?'on':''}" onclick="setPref('likes','${k}')">${v[1]} ${v[0]}</span>`).join('')}</div></div>
  <div class="field"><label>不想要</label><div class="chips">${Object.entries(AVOIDS).map(([k,v])=>`<span class="chip ${P.avoid.includes(k)?'on no':''}" onclick="setPref('avoid','${k}')">${v}</span>`).join('')}</div></div>
  <div class="sheet-cta"><button class="btn pri grow" onclick="closeSheet()">看 ${PLANS.length} 套方案</button></div>`);};
window.setPref=(k,v,live)=>{const P=S.prefs;
  if(k==='people')P.people=Math.min(10,Math.max(1,P.people+v));
  else if(k==='likes'||k==='avoid')P[k]=P[k].includes(v)?P[k].filter(x=>x!==v):[...P[k],v];
  else P[k]=v;
  save();regen();renderHome();
  if(live){document.querySelector('.field label b').textContent=P.budget>=UNLIMITED?'不限':'≤ ¥'+P.budget;$('.sheet-cta .btn').textContent=`看 ${PLANS.length} 套方案`;}
  else openCond();};

// ---------- 方案详情 ----------
window.openPlan=i=>{if(!S.onboarded){S.onboarded=true;save();const h=$('#coach');h&&h.remove();}CUR={plan:PLANS[i],ctx:'home'};renderPlanSheet();};
window.openTeamPlan=tid=>{const t=S.teams.find(x=>x.id===tid);CUR={plan:t.plan,ctx:'team',tid};renderPlanSheet();};
function curPrefs(){
  if(CUR.ctx==='team'){const t=S.teams.find(x=>x.id===CUR.tid),m=mergePrefs(t.members,t.plan.city);
    return m&&m.n>=2?{...m.prefs,day:CUR.plan.day}:{...S.prefs,city:CUR.plan.city,day:CUR.plan.day,people:t.members.length};}
  return {...S.prefs,city:CUR.plan.city,day:CUR.plan.day};
}
function renderPlanSheet(){
  const p=CUR.plan,pr=curPrefs(),day=WEATHER[p.city][p.day],rainy=['am','pm','eve'].some(k=>isBad(day[k]));
  const unl=pr.budget>=UNLIMITED,over=!unl&&p.cost.total>pr.budget,pct=unl?60:Math.min(100,p.cost.total/Math.max(1,pr.budget)*100);
  const tl=p.stops.map((s,i)=>{const a=actOf(s),w=wxOf(p.city,p.day,s.slot),meal=SLOTS[s.slot].meal,l=p.legs[i-1];
    const leg=i?`<div class="tl-leg">${l.i} ${l.mode} ${l.min} 分钟${l.cost?' · ¥'+l.cost:''}</div>`:'';
    const warn=s.warn?`<div class="warn"><span>⚠️ ${SLOTS[s.slot].n}${w.i}${w.w}，降水 ${w.rain}%</span><button class="btn sm" onclick="doRain(${i})">换成雨天备选</button></div>`
      :(!a.in&&!meal&&rainy?`<div class="hint">天气有变？<a onclick="doRain(${i})">换成室内备选</a></div>`:'');
    const go=i===0?`<div class="tl-leg">🏠 从市中心出发 · ${p.go.i} ${p.go.mode} ${p.go.min} 分钟${p.go.cost?' · ¥'+p.go.cost:''}</div>`:'';
    const back=i===p.stops.length-1?`<div class="tl-leg">${p.back.i} 返程 ${p.back.min} 分钟${p.back.cost?' · ¥'+p.back.cost:''} · 预计 ${toHM(toMin(s.end)+p.back.min)} 到家</div>`:'';
    return go+leg+`<div class="tl-stop ${s.rain?'swapped':''}"><div class="tl-time">${s.start}<small>${SLOTS[s.slot].n}</small></div>
      <div class="tl-dot" style="background:${TYPES[a.t][2]}">${TYPES[a.t][1]}</div>
      <div class="tl-body"><div class="row nowrap"><b class="grow">${esc(a.n)}</b>${s.rain?'<span class="tag g">雨天备选</span>':''}</div>
      <div class="meta">📍${a.area} · ${a.in?'室内':'户外'} · ${money(a.p)}${a.p?'/人':''} · ${s.start}-${s.end}${a.book?' · <span class="o">需预约</span>':''}</div>
      <div class="meta">💡 ${esc(a.stu)}　${esc(a.desc)}</div>${warn}
      <div class="tl-ft"><span class="src">来源 · ${a.src}</span><a class="swap" onclick="doSwap(${i})">↻ 换一个</a></div></div></div>`+back;}).join('');
  openSheet(`<div class="sheet-hd"><h2>${esc(p.title)}</h2><button class="x" onclick="closeSheet()">✕</button></div>
  <div class="meta">${CITIES[p.city].name} · ${WD[p.day].label} ${WD[p.day].date} · ${p.stops.length} 站 · 约 ${p.hours} 小时 · 匹配度 <b style="color:var(--pri)">${p.match}</b></div>
  <div class="why big">${p.reasons.map(r=>`<div>${r}</div>`).join('')}</div>
  <div class="tl">${tl}</div>
  <div class="card cost"><div class="sec-title"><span>💰 人均花费</span><span>${pr.people} 人合计 ¥${Math.round(p.cost.total*pr.people)}</span></div>
    <div class="cost-grid"><div><span>门票</span><b>¥${p.cost.ticket}</b></div><div><span>交通·含往返</span><b>¥${num(p.cost.transport)}</b></div><div><span>餐饮</span><b>¥${p.cost.food}</b></div><div class="tot"><span>合计</span><b>¥${p.cost.total}</b></div></div>
    ${unl?'':`<div class="bbar ${over?'over':''}"><i style="width:${pct}%"></i></div><div class="meta">预算 ¥${pr.budget}/人 · ${over?'超出 ¥'+(p.cost.total-pr.budget)+'，试试「换一个」最贵的那站':'还剩 ¥'+(pr.budget-p.cost.total)}</div>`}</div>
  <div class="sheet-cta">${CUR.ctx==='team'?`<button class="btn pri grow" onclick="closeSheet()">好的</button>`:`<button class="btn pri grow" onclick="teamFromPlan()">👥 发到群里组局</button><button class="btn ghost" onclick="goSolo()">🚶 我自己去</button>`}</div>`,'full');
}
function afterEdit(){if(CUR.ctx==='team')syncActive(S.teams.find(x=>x.id===CUR.tid));save();if(CUR.ctx==='home')renderHome();else renderTeams();renderPlanSheet();}
window.doSwap=i=>{const ok=swapStop(CUR.plan,i,curPrefs());toast(ok?`已换成「${short(actOf(CUR.plan.stops[i]))}」，花费已重算`:'这个时段没有别的选择了');afterEdit();};
window.doRain=i=>{const r=rainSwap(CUR.plan,i,curPrefs());toast(r?`已把「${short(r.from)}」换成室内的「${short(r.to)}」`:'附近没有合适的室内备选');afterEdit();};
window.goSolo=()=>{S.activePlan={...clone(CUR.plan),with:[]};save();closeSheet();go('checkin');toast('出发！到了每一站记得打卡');};

// ---------- 组局 ----------
const code=()=>'WK-'+Math.random().toString(36).slice(2,6).toUpperCase();
// 演示用室友：偏好按方案所在的那天生成，保证能合并出共同时段，并带出两条一票否决
const roommates=d=>[
  {name:'小林',pref:{slots:[d+'_pm',d+'_eve',(1-d)+'_pm'],budget:150,likes:['exhibit','food'],avoid:['hike']}},
  {name:'阿杰',pref:{slots:[d+'_pm',(1-d)+'_am',(1-d)+'_pm'],budget:100,likes:['show','food'],avoid:['queue']}},
  {name:'Mia',pref:{slots:[d+'_am',d+'_pm'],budget:200,likes:['exhibit','market','walk'],avoid:[]}}];
function presetTeam(){
  return {id:'t305',code:'WK-305A',name:'305 宿舍周末局',preset:true,status:'collecting',
    plan:planFromStops(['sh6','sh18','sh9','sh3'],{...DEF_PREFS},'雨天室内一日游（小林转发的攻略）'),diff:null,sig:null,
    members:[...roommates(0).map(r=>({name:r.name,filled:true,pref:r.pref})),{name:'我',filled:false,pref:null}]};
}
const MOCKS=[
  {name:'周周',pref:{slots:['0_pm','1_pm','1_eve'],budget:120,likes:['market','food'],avoid:['early']}},
  {name:'大壮',pref:{slots:['0_pm','0_eve','1_pm'],budget:200,likes:['show','hike'],avoid:[]}},
  {name:'Coco',pref:{slots:['1_am','1_pm'],budget:80,likes:['exhibit','walk'],avoid:['queue']}}];
const myDefaultPref=day=>({slots:[day+'_pm',day+'_eve'],budget:Math.min(S.prefs.budget,UNLIMITED),likes:[...S.prefs.likes],avoid:[...S.prefs.avoid]});

// 从方案发起组局：我的偏好取自当前条件，室友在群里陆续填写（演示）
window.teamFromPlan=()=>{const p=clone(CUR.plan),main=p.stops.filter(s=>!SLOTS[s.slot].meal);
  const t={id:Date.now()+'',code:code(),name:'305 宿舍 · '+WD[p.day].label+TYPES[actOf(main[0]||p.stops[0]).t][0]+'局',status:'collecting',plan:p,diff:null,sig:null,
    members:[{name:'我',filled:true,pref:{...myDefaultPref(p.day),slots:[...new Set(main.map(s=>p.day+'_'+s.slot))]}},
      ...roommates(p.day).map(r=>({name:r.name,filled:false,pref:null}))]};
  S.teams.unshift(t);save();closeSheet();go('team');toast('已发到「305 宿舍」群，等室友填偏好…');replies(t.id);};
function replies(tid){const t=S.teams.find(x=>x.id===tid);if(!t)return;
  const m=t.members.find(x=>!x.filled&&x.name!=='我');
  if(!m){const el=document.querySelector(`#team-${tid} .merge`);el&&el.scrollIntoView({behavior:'smooth',block:'center'});return;}
  setTimeout(()=>{if(!S.teams.includes(t)||m.filled)return;
    m.filled=true;m.pref=clone(roommates(t.plan.day).find(x=>x.name===m.name).pref);save();
    if($('#v-team').classList.contains('on'))renderTeams();toast(m.name+' 填好了偏好');replies(tid);},900);}
// 局里的方案变了：同步足迹里的进行中方案
function syncActive(t){const a=S.activePlan;
  if(a&&(a.tid===t.id||(!a.tid&&a.team===t.name))){S.activePlan={...clone(t.plan),team:t.name,tid:t.id,with:t.members.filter(x=>x.name!=='我').map(x=>x.name)};return true;}
  return false;}

function prefSummary(p){return `${p.slots.map(skLabel).join('、')} · ${p.budget>=UNLIMITED?'预算不限':'≤¥'+p.budget} · ${p.likes.map(t=>TYPES[t][0]).join('/')}${p.avoid.length?' · 🚫'+p.avoid.map(k=>AVOIDS[k]).join('/'):''}`;}
function memberRow(t,m){
  return `<div class="mrow">${avatar(m.name)}<div class="grow"><b>${esc(m.name)}</b>${m.filled?`<div class="meta">${prefSummary(m.pref)}</div>`:''}</div>
  ${m.filled?(m.name==='我'?`<a class="meta" onclick="fillPref('${t.id}')">修改</a>`:'<span class="ok">✓ 已填</span>'):(m.name==='我'?`<button class="btn sm pri pulse" onclick="fillPref('${t.id}')">填写我的偏好 · 10秒</button>`:'<span class="meta">⏳ 填写中…</span>')}</div>`;
}
function mergeBox(t,m,stale){
  return `<div class="merge"><div class="mh">🤝 偏好合并结果 <span class="meta">${m.n}/${m.total} 人已填</span></div>
  <div class="ml">🕒 ${!m.slots.length||(m.partial&&m.cover<=1)?'大家的时间完全错开了，没有两个人能凑到一起，建议调整时间或换个周末'
    :`${m.partial?`没有全员都有空的时段，选了人最多的（${m.cover}/${m.n} 人）`:'全员都有空'}：<b>${m.slots.map(s=>skLabel(m.day+'_'+s)).join('、')}</b>${m.absent.length?`（${m.absent.join('、')} 来不了）`:''}`}</div>
  <div class="ml">💰 预算按最低的 <b>¥${m.budget}</b> 来（照顾 ${m.poorest}）</div>
  <div class="ml">❤️ ${m.votes.map(([k,v])=>`${TYPES[k][0]} <b>${v}</b>票`).join(' · ')}</div>
  ${m.avoid.length?`<div class="ml">🚫 一票否决：${m.avoid.map(x=>`${AVOIDS[x.k]}（${x.by.join('、')}）`).join('、')}</div>`:''}
  ${stale?`<button class="btn pri full" onclick="regenTeam('${t.id}')">✨ 按全员偏好重新生成方案</button>`:'<div class="ok center">✓ 当前方案已符合全员偏好</div>'}</div>`;
}
function diffBox(d){
  return `<div class="diff"><div class="mh">🔁 方案已更新 · 人均 ¥${d.before} → <b>¥${d.after}</b></div>
  ${d.removed.map(r=>`<div class="ml"><span class="minus">－</span>${esc(r.n)} <span class="meta">（${esc(r.why)}）</span></div>`).join('')}
  ${d.added.map(n=>`<div class="ml"><span class="plus">＋</span>${esc(n)}</div>`).join('')}</div>`;
}
function teamCard(t){
  const m=mergePrefs(t.members,t.plan.city),p=t.plan,n=t.members.length,filled=t.members.filter(x=>x.filled).length;
  const sig=m?JSON.stringify(m.prefs):'',stale=m&&m.n>=2&&t.sig!==sig&&m.slots.length&&!(m.partial&&m.cover<=1);
  const first=p.stops[0],fa=actOf(first),warns=p.stops.filter(s=>s.warn).length,day=WEATHER[p.city][p.day];
  const wxNote=warns?`⚠️ 有 ${warns} 站会淋雨`:['am','pm','eve'].some(k=>isBad(day[k]))?'☔ 有雨，路线全程室内':'☀️ 天气不错';
  return `<div class="card team" id="team-${t.id}">
  <div class="row nowrap"><div class="grow"><h3>${esc(t.name)}</h3><div class="meta">${filled}/${n} 人已填偏好 · 邀请码 ${t.code}</div></div><span class="tag ${t.status==='confirmed'?'g':'o'}">${t.status==='confirmed'?'已确认出发':'收集偏好中'}</span></div>
  <div class="tplan" onclick="openTeamPlan('${t.id}')"><div class="meta">当前方案 · ${WD[p.day].label} ${WD[p.day].date}</div><b>${esc(p.title)}</b><div class="route">${routeLine(p)}</div><div class="meta">人均 ¥${p.cost.total} · 约 ${p.hours} 小时 · 点击查看路线 ›</div></div>
  <div class="sec-title" style="margin-top:12px">👥 成员偏好</div>${t.members.map(x=>memberRow(t,x)).join('')}
  ${m&&m.n>=2?mergeBox(t,m,stale):''}${t.diff?diffBox(t.diff):''}
  <div class="why">📍 集合：${fa.area} ${first.start}（提前 10 分钟到）💰 AA 人均 ¥${p.cost.total}，${n} 人共 ¥${p.cost.total*n}　${wxNote}</div>
  <div class="acts"><button class="btn sm pri" onclick="invite('${t.id}')">📤 复制邀请</button>${t.status!=='confirmed'?`<button class="btn sm" onclick="confirmTeam('${t.id}')">✅ 确认出发</button>`:''}${t.preset?'':`${t.members.some(x=>!x.filled&&x.name!=='我')||MOCKS.some(x=>!t.members.find(y=>y.name===x.name))?`<button class="btn sm ghost" onclick="mockFill('${t.id}')">＋ 演示：同学填写</button>`:''}<button class="btn sm ghost" onclick="delTeam('${t.id}')">删除</button>`}</div></div>`;
}
function renderTeams(){
  $('#teams').innerHTML=S.teams.length?S.teams.map(teamCard).join(''):`<div class="card empty">还没有局<br><br><button class="btn pri" onclick="go('plan')">去挑一个方案</button></div>`;
}
window.fillPref=tid=>{const t=S.teams.find(x=>x.id===tid),me=t.members.find(x=>x.name==='我'),p=clone(me.pref||myDefaultPref(t.plan.day));
  window._fp=p;window._fpt=tid;renderFill();};
function renderFill(){const p=window._fp,t=S.teams.find(x=>x.id===window._fpt);
  openSheet(`<div class="sheet-hd"><h2>${esc(t.name)} · 我的偏好</h2><button class="x" onclick="closeSheet()">✕</button></div><p class="meta" style="margin-bottom:12px">10 秒填完，系统会和大家的偏好自动合并</p>
  <div class="field"><label>① 什么时候有空</label><div class="chips">${SLOT_KEYS.map(k=>`<span class="chip ${p.slots.includes(k)?'on':''}" onclick="fp('slots','${k}')">${skLabel(k)}</span>`).join('')}</div></div>
  <div class="field"><label>② 人均预算上限 <b style="float:right;color:var(--ink)" id="fpb">${p.budget>=UNLIMITED?'不限':'≤ ¥'+p.budget}</b></label><input type="range" min="0" max="${UNLIMITED}" step="10" value="${p.budget}" oninput="fp('budget',+this.value)"></div>
  <div class="field"><label>③ 想玩</label><div class="chips">${Object.entries(TYPES).map(([k,v])=>`<span class="chip ${p.likes.includes(k)?'on':''}" onclick="fp('likes','${k}')">${v[1]} ${v[0]}</span>`).join('')}</div></div>
  <div class="field"><label>④ 不想要（一票否决）</label><div class="chips">${Object.entries(AVOIDS).map(([k,v])=>`<span class="chip ${p.avoid.includes(k)?'on no':''}" onclick="fp('avoid','${k}')">${v}</span>`).join('')}</div></div>
  <div class="sheet-cta"><button class="btn pri grow" onclick="submitPref()">提交，看合并结果</button></div>`);}
window.fp=(k,v)=>{const p=window._fp;if(k==='budget'){p.budget=v;$('#fpb').textContent=v>=UNLIMITED?'不限':'≤ ¥'+v;return;}
  p[k]=p[k].includes(v)?p[k].filter(x=>x!==v):[...p[k],v];renderFill();};
window.submitPref=()=>{const p=window._fp;if(!p.slots.length)return toast('至少选一个有空的时段');if(!p.likes.length)return toast('至少选一个想玩的');
  const t=S.teams.find(x=>x.id===window._fpt),me=t.members.find(x=>x.name==='我');me.filled=true;me.pref=p;save();closeSheet();renderTeams();
  toast('已提交，看看大家的合并结果');setTimeout(()=>{const el=document.querySelector(`#team-${t.id} .merge`);el&&el.scrollIntoView({behavior:'smooth',block:'center'});},120);};
window.regenTeam=tid=>{const t=S.teams.find(x=>x.id===tid),m=mergePrefs(t.members,t.plan.city);
  const ps=generatePlans(m.prefs);if(!ps.length)return toast('全员条件下找不到方案，试试让大家放宽一点');
  const np=ps[0];t.diff=planDiff(t.plan,np,m);t.plan=np;t.sig=JSON.stringify(m.prefs);const synced=syncActive(t);save();renderTeams();
  toast(synced?'已更新方案，足迹里的进行中方案已同步':'已按全员偏好更新方案');
  setTimeout(()=>{const el=document.querySelector(`#team-${t.id} .diff`);el&&el.scrollIntoView({behavior:'smooth',block:'center'});},120);};
window.mockFill=tid=>{const t=S.teams.find(x=>x.id===tid),u=t.members.find(x=>!x.filled&&x.name!=='我');
  if(u){const r=roommates(t.plan.day).find(x=>x.name===u.name)||MOCKS[0];u.filled=true;u.pref=clone(r.pref);save();renderTeams();return toast(u.name+' 填好了偏好');}
  const m=MOCKS.find(x=>!t.members.find(y=>y.name===x.name));if(!m)return;
  t.members.push({name:m.name,filled:true,pref:clone(m.pref)});save();renderTeams();toast(m.name+' 填好了偏好');};
window.invite=tid=>{const t=S.teams.find(x=>x.id===tid),p=t.plan,left=t.members.filter(x=>!x.filled).map(x=>x.name);
  copy(`【周末组局】${t.name}\n方案：${p.title}\n路线：${p.stops.map(s=>actOf(s).n).join(' → ')}\n时间：${WD[p.day].label} ${WD[p.day].date}\n人均：¥${p.cost.total}（含门票交通餐饮）\n${left.length?'还差 '+left.join('、')+' 没填偏好，':''}点链接 10 秒填偏好，系统自动合并👇\n${location.href.split('#')[0]}#join/${t.code}`);};
window.confirmTeam=tid=>{const t=S.teams.find(x=>x.id===tid);t.status='confirmed';
  S.activePlan={...clone(t.plan),team:t.name,tid:t.id,with:t.members.filter(x=>x.name!=='我').map(x=>x.name)};save();go('checkin');toast('已确认出发！到了每一站记得打卡');};
window.delTeam=tid=>{S.teams=S.teams.filter(x=>x.id!==tid);save();renderTeams();};
function joinByCode(c){c=c.trim().toUpperCase();if(!c)return toast('请输入邀请码');
  let t=S.teams.find(x=>x.code===c);
  if(!t){const p=PLANS[1]||PLANS[0];if(!p)return toast('邀请码无效');
    t={id:Date.now()+'',code:c,name:'同学发起的周末局',status:'collecting',plan:clone(p),diff:null,sig:null,
      members:[{name:'周周',filled:true,pref:clone(MOCKS[0].pref)},{name:'大壮',filled:true,pref:clone(MOCKS[1].pref)},{name:'我',filled:false,pref:null}]};
    S.teams.unshift(t);save();}
  go('team');const me=t.members.find(x=>x.name==='我');if(!me.filled)setTimeout(()=>fillPref(t.id),150);else toast('你已在「'+t.name+'」中');}
$('#joinBtn').onclick=()=>joinByCode($('#joinCode').value);

// ---------- 足迹：打卡 ----------
// 按站序号判断是否已打卡：同一方案里可能有两个「附近简餐」（旧记录没有序号时按活动 id 兜底）
const doneIn=(plan,i)=>S.checks.some(c=>c.planId===plan.id&&(c.stopIdx===i||(c.stopIdx==null&&c.aid===plan.stops[i].aid)));
window.checkIn=(aid,planId,idx)=>{const ap0=S.activePlan&&S.activePlan.id===planId?S.activePlan:null;
  const a=ap0&&idx!=null?actOf(ap0.stops[idx]):aid?findAct(aid):null;
  openSheet(`<div class="sheet-hd"><h2>📍 打卡${a?' · '+esc(a.n):''}</h2><button class="x" onclick="closeSheet()">✕</button></div>
  ${a?'':`<div class="field"><label>地点 / 活动名</label><input id="cName" placeholder="比如：外滩夜景"></div><div class="field"><label>类型</label><select id="cType">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v[1]} ${v[0]}</option>`).join('')}</select></div>`}
  <div class="field"><label>评分</label><div class="chips" id="cStar">${[1,2,3,4,5].map(i=>`<span class="chip ${i===5?'on':''}" data-v="${i}">${'★'.repeat(i)}</span>`).join('')}</div></div>
  <div class="field"><label>实际人均花费 (¥)</label><input id="cCost" type="number" value="${a?a.p:0}"></div>
  <div class="field"><label>一句话感受</label><textarea id="cNote" rows="2" placeholder="好玩 / 踩雷 / 小贴士…"></textarea></div>
  <div class="field"><label>照片（可选）</label><input type="file" id="cPic" accept="image/*"></div>
  <div class="sheet-cta"><button class="btn pri grow" id="cSave">盖章打卡</button></div>`);
  document.querySelectorAll('#cStar .chip').forEach(c=>c.onclick=()=>{document.querySelectorAll('#cStar .chip').forEach(x=>x.classList.remove('on'));c.classList.add('on');});
  $('#cSave').onclick=()=>{const f=$('#cPic').files[0];const done=pic=>{
    const ap=S.activePlan&&S.activePlan.id===planId?S.activePlan:null;
    const rec={id:Date.now()+'',planId:planId||null,stopIdx:idx==null?null:idx,aid:aid||null,name:a?a.n:($('#cName').value||'未命名地点'),type:a?a.t:$('#cType').value,city:ap?ap.city:S.prefs.city,area:a?a.area:'',
      star:+document.querySelector('#cStar .chip.on').dataset.v,cost:+$('#cCost').value||0,note:$('#cNote').value.trim(),pic,with:ap?ap.with:[],date:new Date().toLocaleDateString('zh-CN')};
    S.checks.unshift(rec);save();closeSheet();go('checkin');stampFx(rec);};
   if(f){const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas'),k=240/Math.max(img.width,img.height);c.width=img.width*k;c.height=img.height*k;c.getContext('2d').drawImage(img,0,0,c.width,c.height);done(c.toDataURL('image/jpeg',.7));};img.src=r.result;};r.readAsDataURL(f);}else done(null);};
};
function stampHTML(c,big){const ty=TYPES[c.type];return `<div class="stamp ${big?'big':''}" style="--c:${COLORS[Object.keys(TYPES).indexOf(c.type)]}"><i>${ty[1]}</i><b>${esc(c.name.split(/ · | — | → /)[0].slice(0,6))}</b><small>${esc((c.date||'').replace(/^\d+\//,''))}</small></div>`;}
function stampFx(rec){const el=$('#stampfx');el.innerHTML=stampHTML(rec,true)+`<p>+1 足迹 · ${TYPES[rec.type][0]}</p>`;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),1900);}
const BADGES=[['first','🌱 第一次出发',s=>s.checks.length>=1],['art','🖼️ 看展达人',s=>s.checks.filter(c=>c.type==='exhibit').length>=2],['hike','🥾 徒步小将',s=>s.checks.some(c=>c.type==='hike')],['cheap','💸 穷游大师',s=>s.checks.filter(c=>c.cost===0).length>=2],['team','👥 组局王',s=>s.checks.some(c=>c.with&&c.with.length>=2)],['all','🗺️ 全能探索家',s=>new Set(s.checks.map(c=>c.type)).size>=4]];
function renderCheckin(){
  const ap=S.activePlan,c=S.checks;
  if(ap){const done=ap.stops.filter((s,i)=>doneIn(ap,i)).length,all=done===ap.stops.length;
    $('#active').innerHTML=`<div class="card active"><div class="row nowrap"><div class="grow"><div class="meta">${ap.team?esc(ap.team)+' · ':''}进行中的方案 · ${WD[ap.day].label}</div><h3>${esc(ap.title)}</h3></div><div class="score"><b>${done}/${ap.stops.length}</b><div>已打卡</div></div></div>
    <div class="bar"><i style="width:${done/ap.stops.length*100}%"></i></div>
    ${ap.stops.map((s,i)=>{const a=actOf(s),d=doneIn(ap,i);return `<div class="astop ${d?'done':''}"><span class="t">${s.start}</span><span>${TYPES[a.t][1]}</span><span class="grow">${esc(a.n)}</span>${d?'<span class="ok">✓ 已盖章</span>':`<button class="btn sm pri" onclick="checkIn('${s.aid}','${ap.id}',${i})">打卡</button>`}</div>`;}).join('')}
    ${all?`<div class="acts"><button class="btn pri grow" onclick="go('guide');genGuide()">🎉 全部完成，一键生成攻略</button></div>`:`<div class="acts"><a class="meta" onclick="endPlan()">结束这个方案</a></div>`}</div>`;
  }else $('#active').innerHTML=`<div class="card empty">还没有进行中的方案<br><br><button class="btn pri" onclick="go('plan')">去选一个方案出发</button></div>`;
  const spent=c.reduce((x,y)=>x+y.cost,0);
  $('#stats').innerHTML=`<div><b>${c.length}</b><span>打卡足迹</span></div><div><b>${new Set(c.map(x=>x.type)).size}/6</b><span>玩过类型</span></div><div><b>¥${spent}</b><span>累计花费</span></div>`;
  $('#passport').innerHTML=c.length?c.slice(0,12).map(x=>stampHTML(x)).join(''):'<div class="meta">打卡后会在这里盖章</div>';
  $('#badges').innerHTML=BADGES.map(b=>`<span class="badge ${b[2](S)?'on':''}">${b[1]}</span>`).join('');
  $('#timeline').innerHTML=c.length?c.map(r=>`<div class="it">${r.pic?`<img src="${r.pic}" alt="">`:`<div class="emo" style="background:${TYPES[r.type][2]}">${TYPES[r.type][1]}</div>`}<div class="grow"><b>${esc(r.name)}</b><div class="meta">${r.date} · ${CITIES[r.city]?CITIES[r.city].name:''} · ¥${r.cost}${r.with&&r.with.length?' · 和 '+r.with.map(esc).join('、'):''}</div><div class="stars">${'★'.repeat(r.star)}<span style="color:#ddd">${'★'.repeat(5-r.star)}</span></div>${r.note?`<div>${esc(r.note)}</div>`:''}</div><a class="meta" onclick="delCheck('${r.id}')">删除</a></div>`).join(''):'<div class="empty">还没有打卡记录</div>';
}
window.endPlan=()=>{S.activePlan=null;save();renderCheckin();};
window.delCheck=id=>{S.checks=S.checks.filter(x=>x.id!==id);save();renderCheckin();};
$('#newCheck').onclick=()=>checkIn(null);

// ---------- 攻略 ----------
const allGuides=()=>[...S.myGuides,...GUIDES];
function renderGuides(){
  const city=S.prefs.city;let gs=allGuides().filter(g=>g.city===city);
  gs.sort(S.gsort==='hot'?(a,b)=>(b.likes+(S.liked.includes(b.id)?1:0))-(a.likes+(S.liked.includes(a.id)?1:0)):(a,b)=>a.t-b.t);
  document.querySelectorAll('#gsort button').forEach(b=>b.classList.toggle('on',b.dataset.g===S.gsort));
  $('#gcity').textContent=CITIES[city].name;
  $('#guides').innerHTML=gs.map(g=>{const lk=S.liked.includes(g.id),st=(g.stops||[]).map(findAct).filter(Boolean);
    return `<div class="card"><div class="row nowrap">${avatar(g.au)}<span class="meta grow">${esc(g.au)} · ${g.t?g.t+' 天前':'刚刚'}</span>${g.mine?'<span class="tag o">我的</span>':''}</div>
    <h3 style="font-size:15px;margin:8px 0 4px">${esc(g.title)}</h3>${st.length?`<div class="route">${st.map(a=>`<span>${TYPES[a.t][1]} ${esc(short(a))}</span>`).join('<i>→</i>')}</div>`:''}
    <p style="white-space:pre-wrap;margin-top:6px">${esc(g.body)}</p><div class="tags">${g.tags.map(t=>`<span class="tag">#${esc(t)}</span>`).join('')}</div>
    <div class="acts">${st.length?`<button class="btn sm pri" onclick="useGuide('${g.id}')">✨ 一键套用这条路线</button>`:''}<button class="btn sm ${lk?'pri':'ghost'}" onclick="like('${g.id}')">${lk?'❤️':'🤍'} ${g.likes+(lk?1:0)}</button><button class="btn sm ghost" onclick="shareGuide('${g.id}')">📤 分享</button>${g.mine?`<button class="btn sm ghost" onclick="delGuide('${g.id}')">删除</button>`:''}</div></div>`;}).join('')||'<div class="card empty">这个城市还没有攻略，来写第一篇吧</div>';
}
window.useGuide=id=>{const g=allGuides().find(x=>x.id===id);const p=planFromStops(g.stops,S.prefs,g.title.replace(/！.*$/,''));
  PLANS.unshift(p);PLANS=PLANS.slice(0,4);go('plan');setTimeout(()=>openPlan(0),50);toast('已套用为方案，可以继续调整');};
window.like=id=>{S.liked.includes(id)?S.liked=S.liked.filter(x=>x!==id):S.liked.push(id);save();renderGuides();};
const guideText=g=>`📍${g.title}\n\n${g.body}\n\n${g.tags.map(t=>'#'+t).join(' ')}\n—— 来自「周末有方」${location.href.split('#')[0]}`;
window.shareGuide=id=>{const g=allGuides().find(x=>x.id===id);
  if(g.card)openShare(g.card,guideText(g));else if(g.stops&&g.stops.length)openShare(cardFromGuide(g),guideText(g));else copy(guideText(g));};
window.delGuide=id=>{S.myGuides=S.myGuides.filter(x=>x.id!==id);save();renderGuides();};
window.genGuide=()=>{const ap=S.activePlan;
  let c=(ap?S.checks.filter(x=>x.planId===ap.id):[]);if(!c.length)c=S.checks.filter(x=>x.city===S.prefs.city);
  c=c.slice().reverse();if(!c.length){toast('先打卡至少 1 个地方');return;}
  const city=ap?ap.city:S.prefs.city,spent=c.reduce((x,y)=>x+y.cost,0),types=[...new Set(c.map(x=>TYPES[x.type][0]))];
  const body=c.map((r,i)=>`${i+1}. ${TYPES[r.type][1]} ${r.name}  ${'★'.repeat(r.star)}  ¥${r.cost}${r.note?'\n   💬 '+r.note:''}`).join('\n')+`\n\n💰 人均 ¥${spent}　📌 共 ${c.length} 站${c[0].with&&c[0].with.length?'　👥 '+(c[0].with.length+1)+' 人同行':''}`;
  const title=`${CITIES[city].name}周末${types.slice(0,2).join('+')}路线｜人均 ¥${spent}`;
  window._g={city,title,body,types,stops:c.filter(x=>x.aid&&x.aid!=='meal').map(x=>x.aid),checks:c};
  openSheet(`<div class="sheet-hd"><h2>📝 我的攻略</h2><button class="x" onclick="closeSheet()">✕</button></div>
  <div class="field"><label>标题</label><input id="gT" value="${esc(title)}"></div><div class="field"><label>正文（可修改）</label><textarea id="gB" rows="8">${esc(body)}</textarea></div>
  <div class="sheet-cta"><button class="btn pri grow" id="gPub">发布并生成分享卡片</button><button class="btn ghost" id="gCopy">复制文案</button></div>`);
  $('#gCopy').onclick=()=>copy($('#gT').value+'\n\n'+$('#gB').value+'\n\n'+types.map(t=>'#'+t).join(' '));
  $('#gPub').onclick=()=>{const G=window._g,g={id:'m'+Date.now(),city:G.city,au:'我',title:$('#gT').value,body:$('#gB').value,stops:G.stops,likes:0,t:0,tags:[...G.types,CITIES[G.city].name],mine:true};
    g.card=cardFromChecks(G,g.title);S.myGuides.unshift(g);
    S.prefs.city=G.city;regen();save();renderGuides();openShare(g.card,guideText(g));toast('已发布，同城同学可以一键套用你的路线');};
};
$('#genGuide').onclick=()=>genGuide();

// ---------- 分享卡片：护照风，Canvas 绘制，预览和保存用同一张图 ----------
function cardFromChecks(G,title){const c=G.checks,n=c.length,w=c[0].with||[];
  return {city:CITIES[G.city].name,date:String(c[c.length-1].date).replace(/\//g,'.'),title,author:'我',quote:(c.find(x=>x.note)||{}).note||'',
    items:c.map(x=>({emoji:TYPES[x.type][1],bg:TYPES[x.type][2],name:x.name,meta:`${x.area||TYPES[x.type][0]} · ¥${x.cost}`,right:'★'.repeat(x.star)})),
    stats:[['¥'+c.reduce((s,x)=>s+x.cost,0),'人均花费'],[n+' 站','打卡'],w.length?[(w.length+1)+' 人','同行']:['★'+(c.reduce((s,x)=>s+x.star,0)/n).toFixed(1),'平均评分']]};}
function cardFromGuide(g){const p=planFromStops(g.stops,S.prefs,g.title);
  return {city:CITIES[g.city].name,date:g.t?g.t+' 天前发布':'刚刚发布',title:g.title,author:g.au,quote:'',
    items:p.stops.map(s=>{const a=actOf(s);return {emoji:TYPES[a.t][1],bg:TYPES[a.t][2],name:a.n,meta:`${s.start} · ${a.area} · ${money(a.p)}`};}),
    stats:[['¥'+p.cost.total,'人均花费'],[p.stops.length+' 站','约 '+p.hours+' 小时'],['❤ '+(g.likes+(S.liked.includes(g.id)?1:0)),'同学点赞']]};}
function fitText(x,t,w){if(x.measureText(t).width<=w)return t;while(t&&x.measureText(t+'…').width>w)t=t.slice(0,-1);return t+'…';}
function wrapText(x,t,w){const out=[];let l='';for(const ch of t){if(x.measureText(l+ch).width>w&&l){out.push(l);l=ch;}else l+=ch;}if(l)out.push(l);return out;}
function makeCard(d){
  const W=600,P=40,RH=76,F='-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif',C='#ff6a3d';
  const c=document.createElement('canvas'),x=c.getContext('2d');
  x.font=`700 30px ${F}`;const tl=wrapText(x,d.title,W-P*2).slice(0,2);
  const top=150+tl.length*40,H=top+d.items.length*RH+(d.quote?56:0)+210;
  c.width=W*2;c.height=H*2;x.scale(2,2);
  x.fillStyle='#fbf8f1';x.fillRect(0,0,W,H);
  x.strokeStyle='#f1ebdd';x.lineWidth=1;for(let y=30;y<H;y+=26){x.beginPath();x.moveTo(0,y);x.lineTo(W,y);x.stroke();}
  x.fillStyle=C;x.fillRect(0,0,W,10);
  x.fillStyle='#6b6f76';x.font=`500 15px ${F}`;x.fillText('周末有方 · 城市探索护照',P,50);
  x.textAlign='right';x.fillText(d.date,W-P,50);x.textAlign='left';
  x.fillStyle='#1f2328';x.font=`800 54px ${F}`;x.fillText(d.city,P,116);
  x.font=`700 28px ${F}`;tl.forEach((l,i)=>x.fillText(l,P,160+i*40));
  let y=top;
  d.items.forEach((it,i)=>{const cy=y+RH/2;
    if(i<d.items.length-1){x.strokeStyle='#d6cdb9';x.setLineDash([4,4]);x.beginPath();x.moveTo(P+24,cy+26);x.lineTo(P+24,cy+RH-26);x.stroke();x.setLineDash([]);}
    x.fillStyle=it.bg;x.beginPath();x.arc(P+24,cy,24,0,Math.PI*2);x.fill();
    x.font=`24px ${F}`;x.textAlign='center';x.fillStyle='#000';x.fillText(it.emoji,P+24,cy+9);x.textAlign='left';
    x.fillStyle='#1f2328';x.font=`600 19px ${F}`;x.fillText(fitText(x,it.name,W-P*2-64-(it.right?96:0)),P+64,cy-4);
    x.fillStyle='#6b6f76';x.font=`400 14px ${F}`;x.fillText(fitText(x,it.meta,W-P*2-64),P+64,cy+20);
    if(it.right){x.textAlign='right';x.fillStyle='#f5a623';x.font=`600 15px ${F}`;x.fillText(it.right,W-P,cy-4);x.textAlign='left';}
    y+=RH;});
  if(d.quote){x.fillStyle='#555';x.font=`italic 400 17px ${F}`;x.fillText(fitText(x,'“'+d.quote+'”',W-P*2),P,y+32);y+=56;}
  // 统计 + 印章
  y+=12;const bw=W-P*2-150;
  x.fillStyle='#fff';x.strokeStyle='#ebe7de';x.beginPath();x.roundRect?x.roundRect(P,y,bw,92,14):x.rect(P,y,bw,92);x.fill();x.stroke();
  d.stats.forEach((s,i)=>{const cx=P+bw/6*(i*2+1);x.textAlign='center';
    x.fillStyle=i?'#1f2328':C;x.font=`800 24px ${F}`;x.fillText(s[0],cx,y+44);
    x.fillStyle='#6b6f76';x.font=`400 13px ${F}`;x.fillText(s[1],cx,y+70);});
  x.save();x.translate(W-P-66,y+46);x.rotate(-0.22);x.globalAlpha=.88;x.strokeStyle=C;x.fillStyle=C;
  x.lineWidth=4;x.beginPath();x.arc(0,0,60,0,Math.PI*2);x.stroke();
  x.lineWidth=1.5;x.setLineDash([3,3]);x.beginPath();x.arc(0,0,51,0,Math.PI*2);x.stroke();x.setLineDash([]);
  x.textAlign='center';x.font=`800 22px ${F}`;x.fillText('已探索',0,-4);x.font=`600 15px ${F}`;x.fillText(d.city+' · 周末',0,20);x.restore();
  x.textAlign='left';x.fillStyle='#6b6f76';x.font=`400 13px ${F}`;
  x.fillText(fitText(x,'打开 '+location.host+location.pathname+' 一键套用这条路线',W-P*2-80),P,H-36);
  x.textAlign='right';x.fillText('by '+d.author,W-P,H-36);x.textAlign='left';
  return c.toDataURL('image/png');
}
function openShare(d,text){let url;try{url=makeCard(d);}catch(e){return copy(text);}window._shareText=text;
  openSheet(`<div class="sheet-hd"><h2>🪪 分享卡片</h2><button class="x" onclick="closeSheet()">✕</button></div>
  <img class="share-img" src="${url}" alt="分享卡片"><p class="meta center">手机上长按图片保存，电脑上点「下载图片」</p>
  <div class="sheet-cta"><a class="btn pri grow" download="周末有方-${esc(d.city)}.png" href="${url}">⬇️ 下载图片</a><button class="btn ghost" onclick="copy(window._shareText)">复制文案</button></div>`);}
$('#gsort').onclick=e=>{const b=e.target.closest('button');if(!b)return;S.gsort=b.dataset.g;save();renderGuides();};

// ---------- 设计说明 ----------
window.openAbout=()=>openSheet(`<div class="sheet-hd"><h2>关于「周末有方」</h2><button class="x" onclick="closeSheet()">✕</button></div>${$('#aboutTpl').innerHTML}`);
window.resetDemo=()=>{localStorage.removeItem(KEY);location.hash='';location.reload();};

// ---------- 路由 ----------
$('#city').onchange=e=>{S.prefs.city=e.target.value;S.libType='all';save();regen();renderHome();renderGuides();};
const VIEWS=['plan','team','checkin','guide'];
window.go=v=>{if(location.hash!=='#'+v)location.hash=v;else route();};
function route(){const h=location.hash.slice(1);
  if(h.startsWith('join/')){joinByCode(h.slice(5));return;}
  const v=VIEWS.includes(h)?h:'plan';
  VIEWS.forEach(x=>$('#v-'+x).classList.toggle('on',x===v));document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.dataset.v===v));
  ({plan:renderHome,team:renderTeams,checkin:renderCheckin,guide:renderGuides})[v]();$('#app').scrollTo?$('#app').scrollTo(0,0):0;window.scrollTo(0,0);}
window.addEventListener('hashchange',route);

// 兼容：早先保存的方案快照没有起止时间和往返交通，加载时补算
const upgrade=p=>{if(p&&p.stops&&p.stops.length&&!p.stops[0].start)recalc(p,{...DEF_PREFS,city:p.city,day:p.day});};
S.teams.forEach(t=>upgrade(t.plan));upgrade(S.activePlan);

// 首次访问：预置演示数据
if(!S.seeded){
  S.teams=[presetTeam()];
  S.checks=[{id:'demo',planId:null,aid:'sh5',name:'武康路 — 安福路 梧桐 City Walk',type:'walk',city:'sh',area:'徐汇 · 武康路',star:5,cost:0,note:'梧桐叶黄了，随手拍都好看',pic:null,with:['小林'],date:'2026/10/31'}];
  S.seeded=true;save();
}
regen();route();
