// ================= 方案生成引擎 =================
// 输入 Prefs = {city, day, people, budget, likes[], avoid[], slots?}
// 输出 Plan  = {id, theme, title, tags, stops[], legs[], cost{}, hours, match, reasons[]}

const UNLIMITED=500;
const MEAL={id:'meal',n:'附近简餐',t:'food',in:true,p:35,min:1,max:10,best:2,dur:1,src:'就近',stu:'人均 ¥30-40',desc:'按上一站位置就近解决。'};

// 本周末日期：周一到周五 → 即将到来的周六周日；周六周日当天 → 本周末
function weekendDates(now=new Date()){
  const d=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const dow=d.getDay();const off=dow===0?-1:6-dow;
  return [0,1].map(i=>{const x=new Date(d);x.setDate(d.getDate()+off+i);return {label:i?'周日':'周六',date:(x.getMonth()+1)+'/'+x.getDate()};});
}

const findAct=id=>ACTS.find(a=>a.id===id);
const actOf=stop=>stop.aid==='meal'?{...MEAL,area:stop.area}:findAct(stop.aid);
const wxOf=(city,day,slot)=>WEATHER[city][day][SLOTS[slot].wx];
const isBad=w=>w.rain>=60;

function dist(city,a,b){const A=CITIES[city].areas,p=A[a]||[0,0],q=A[b]||[0,0];return Math.hypot(p[0]-q[0],p[1]-q[1]);}
function legOf(city,from,to){
  const d=dist(city,from,to);
  if(d<0.5)return {mode:'步行',i:'🚶',min:5,cost:0};
  if(d<1.5)return {mode:'步行',i:'🚶',min:Math.round(d*12),cost:0};
  if(d<5)return {mode:'骑行',i:'🚲',min:Math.round(d*5+3),cost:1.5};
  return {mode:'地铁',i:'🚇',min:Math.round(10+d*2.5),cost:3+Math.floor(d/10)};
}

// 主题模板：seq = [时段, 类型偏好, 是否可选]
const THEMES=[
  {k:'rain',indoor:true,seq:[['am',['exhibit']],['lunch'],['pm',['exhibit','market','show']],['dinner',null,1],['eve',['show'],1]]},
  {k:'likes',seq:[['am','LIKES'],['lunch'],['pm','LIKES'],['dinner',null,1],['eve','LIKES',1]]},
  {k:'cheap',cheap:true,seq:[['am',['walk','exhibit']],['lunch'],['pm',['walk','market','exhibit']]]},
  {k:'outdoor',seq:[['am',['hike','walk']],['lunch'],['pm',['walk','market','hike'],1]]},
  {k:'party',seq:[['pm',['show','market']],['dinner'],['eve',['market','show','walk'],1]]},
  {k:'solo',seq:[['am',['exhibit']],['lunch'],['pm',['walk','exhibit','market']]]}
];

function avoidHit(a,slot,avoid){
  return (avoid.includes('hike')&&a.t==='hike')||(avoid.includes('queue')&&a.queue)||
         (avoid.includes('outdoor')&&!a.in)||(avoid.includes('early')&&slot==='am');
}
function slotAllowed(slot,prefs){
  if(prefs.avoid.includes('early')&&slot==='am')return false;
  if(!prefs.slots)return true;
  if(slot==='lunch')return prefs.slots.includes('am')||prefs.slots.includes('pm');
  if(slot==='dinner')return prefs.slots.includes('pm')||prefs.slots.includes('eve');
  return prefs.slots.includes(slot);
}

// 单站得分
function stopScore(a,slot,prefs,theme){
  const P=prefs.people,unl=prefs.budget>=UNLIMITED;let s;
  if(a.t==='food'){
    s=50+(prefs.likes.includes('food')?10:0);
    if(!unl)s-=Math.max(0,a.p-prefs.budget*0.4)/2;
    if(theme&&theme.cheap)s-=a.p/2;
  }else{
    s=prefs.likes.includes(a.t)?40:10;
    const w=wxOf(prefs.city,prefs.day,slot);
    if(isBad(w))s+=a.in?25:-20;else s+=a.in?12:25;
    if(!unl)s-=Math.max(0,a.p-prefs.budget*0.6)/2;
    if(theme&&theme.cheap)s-=a.p/3;
    if(/免费|半价|学生/.test(a.stu||''))s+=3;
  }
  if(P<a.min)s-=40;else if(P>a.max)s-=5;else s+=10+(P===a.best?5:0);
  return s;
}

// 候选：某时段可选的活动（已排序）
function candidates(slot,prefs,opt={}){
  const meal=SLOTS[slot].meal;
  return ACTS.filter(a=>a.city===prefs.city&&a.slots.includes(slot)&&!(opt.used||new Set()).has(a.id)&&!avoidHit(a,slot,prefs.avoid)
      &&(meal?a.t==='food':a.t!=='food')&&(!opt.types||opt.types.includes(a.t))&&(!opt.indoor||meal||a.in))
    .map(a=>{let s=stopScore(a,slot,prefs,opt.theme)-(opt.seen&&opt.seen[a.id]||0)*(meal?8:18);
      if(opt.prevArea){const l=legOf(prefs.city,opt.prevArea,a.area);s-=l.min/4;if(prefs.avoid.includes('far')&&l.min>40)s-=999;}
      return {a,s};})
    .filter(x=>x.s>-500).sort((x,y)=>y.s-x.s);
}

function buildPlan(theme,prefs,seen){
  const used=new Set(),stops=[];let prev=null;
  for(const [slot,types0,opt] of theme.seq){
    if(!slotAllowed(slot,prefs))continue;
    const types=types0==='LIKES'?prefs.likes.filter(t=>t!=='food'):types0;
    if(types0==='LIKES'&&!types.length)return null;
    let c=candidates(slot,prefs,{used,types,indoor:theme.indoor,theme,prevArea:prev,seen});
    if(!c.length&&!SLOTS[slot].meal&&!theme.indoor)c=candidates(slot,prefs,{used,theme,prevArea:prev,seen});
    if(!c.length){
      if(SLOTS[slot].meal&&prev)stops.push({aid:'meal',slot,area:prev,opt:!!opt});
      continue;
    }
    if(SLOTS[slot].meal&&prev&&legOf(prefs.city,prev,c[0].a.area).min>40){stops.push({aid:'meal',slot,area:prev,opt:!!opt});continue;}
    const a=c[0].a;used.add(a.id);prev=a.area;
    stops.push({aid:a.id,slot,area:a.area,opt:!!opt});
  }
  // 去掉首尾孤立的饭点
  while(stops.length&&SLOTS[stops[0].slot].meal)stops.shift();
  if(!stops.some(s=>!SLOTS[s.slot].meal))return null;
  const plan={id:theme.k+'-'+Math.random().toString(36).slice(2,7),theme:theme.k,city:prefs.city,day:prefs.day,stops};
  recalc(plan,prefs);
  // 超预算时，先去掉可选的尾部站点
  while(prefs.budget<UNLIMITED&&plan.cost.total>prefs.budget&&plan.stops.length>2&&plan.stops[plan.stops.length-1].opt){plan.stops.pop();recalc(plan,prefs);}
  // 太长（>9 小时）或结束太晚（>22:30）时，去掉可选的尾部站点
  while((plan.hours>9||plan.endMin>toMin('22:30'))&&plan.stops.length>2&&plan.stops[plan.stops.length-1].opt){plan.stops.pop();recalc(plan,prefs);}
  // 去掉孤立在结尾的饭点；长活动（如徒步）后的午饭保留
  const last=()=>plan.stops[plan.stops.length-1],prevDur=()=>actOf(plan.stops[plan.stops.length-2]).dur;
  while(plan.stops.length>1&&((last().slot==='lunch'&&prevDur()<4)||(last().slot==='dinner'&&last().aid==='meal'))){plan.stops.pop();recalc(plan,prefs);}
  return plan;
}

// 重新计算交通、花费、天气提醒、得分、理由、标题
const toMin=t=>{const [h,m]=t.split(':');return h*60+ +m;};
const toHM=m=>String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
function recalc(plan,prefs){
  const acts=plan.stops.map(actOf);
  plan.legs=acts.slice(1).map((a,i)=>legOf(plan.city,acts[i].area,a.area));
  // 往返交通：按从市中心出发估算（区域坐标原点）
  plan.go=legOf(plan.city,null,acts[0].area);plan.back=legOf(plan.city,acts[acts.length-1].area,null);
  // 时间轴：不早于时段开始，且不早于上一站结束 + 路程，避免长活动和下一站重叠
  let t=0,t0=0;
  plan.stops.forEach((s,i)=>{const a=acts[i],open=a.t==='hike'?toMin('08:30'):toMin(SLOTS[s.slot].s);
    const st=i?Math.max(open,Math.ceil((t+plan.legs[i-1].min)/5)*5):open,en=st+a.dur*60;
    if(!i)t0=st;s.start=toHM(st);s.end=toHM(en);t=en;
    s.warn=a.t!=='food'&&!a.in&&isBad(wxOf(plan.city,plan.day,s.slot));});
  const ticket=acts.filter(a=>a.t!=='food').reduce((x,a)=>x+a.p,0);
  const food=acts.filter(a=>a.t==='food').reduce((x,a)=>x+a.p,0);
  const transport=plan.legs.reduce((x,l)=>x+l.cost,0)+plan.go.cost+plan.back.cost;
  plan.cost={ticket,food,transport,total:Math.round(ticket+food+transport)};
  plan.endMin=t;
  plan.hours=Math.round((t-t0+plan.go.min+plan.back.min)/30)/2;
  scorePlan(plan,prefs,acts);
  return plan;
}

function scorePlan(plan,prefs,acts){
  const P=prefs.people,unl=prefs.budget>=UNLIMITED,day=WEATHER[plan.city][plan.day];
  const badSlots=['am','pm','eve'].filter(k=>isBad(day[k])),total=plan.cost.total;
  const main=plan.stops.filter(s=>!SLOTS[s.slot].meal);
  let raw=plan.stops.reduce((x,s,i)=>x+stopScore(acts[i],s.slot,prefs),0)/plan.stops.length;
  raw=raw*0.6+30;
  if(!unl)raw+=total<=prefs.budget?10:-Math.min(30,(total-prefs.budget)/4);
  const warns=plan.stops.filter(s=>s.warn).length;
  raw-=warns*8;
  const th=plan.theme;
  if(th==='rain')raw+=badSlots.length?12:-15;
  if(th==='outdoor')raw+=badSlots.length?-10:10;
  if(th==='party')raw+=P>=4?12:-20;
  if(th==='solo')raw+=P===1?18:-20;
  if(th==='cheap')raw+=(!unl&&prefs.budget<=80)?15:-4;
  if(th==='likes')raw+=4;
  plan.match=Math.max(40,Math.min(98,Math.round(raw)));

  // 推荐理由
  const R=[],dn=weekendDates()[plan.day].label,wn={am:'上午',pm:'下午',eve:'晚上'};
  if(badSlots.length){
    R.push(warns?`☔ ${dn}${badSlots.map(k=>wn[k]).join('、')}有雨，有 ${warns} 站在户外，可一键换成室内备选`:`☔ ${dn}${badSlots.map(k=>wn[k]).join('、')}${day[badSlots[0]].w}，${acts.some(a=>!a.in&&a.t!=='food')?'户外站都安排在不下雨的时段':'路线全程室内'}`);
  }else{
    R.push(acts.some(a=>!a.in&&a.t!=='food')?`☀️ ${dn}天气${day.pm.w}，户外站安排在好天气时段`:`☀️ ${dn}天气不错，全程室内也很舒服`);
  }
  R.push(unl?`💰 人均 ¥${total}（含门票、交通、餐饮）`:total<=prefs.budget?`💰 人均 ¥${total}（含交通餐饮），比预算省 ¥${prefs.budget-total}`:`💰 人均 ¥${total}，超出预算 ¥${total-prefs.budget}，可以换掉最贵的一站`);
  const lack=main.map(s=>actOf(s)).filter(a=>P<a.min);
  const many=main.map(s=>actOf(s)).filter(a=>P>a.max);
  if(lack.length)R.push(`👥「${lack[0].n}」至少 ${lack[0].min} 人，可以去组局里拉人`);
  else if(many.length)R.push(`👥「${many[0].n}」建议不超过 ${many[0].max} 人，${P} 人可以分两组`);
  else if(acts.some(a=>a.min>=5))R.push(`👥 ${P} 人刚好凑一车`);
  else R.push(P===1?'👤 每一站都适合一个人去':`👥 每一站都适合 ${P} 人同行`);
  const liked=[...new Set(acts.filter(a=>prefs.likes.includes(a.t)).map(a=>TYPES[a.t][0]))];
  if(liked.length)R.push(`❤️ 包含你喜欢的 ${liked.join('、')}`);
  plan.reasons=R;

  // 标题与标签
  const likeNames=prefs.likes.filter(t=>t!=='food').map(t=>TYPES[t][0]);
  plan.title=plan.customTitle||{
    rain:'雨天也不湿鞋的文艺线',
    likes:'按你的口味：'+likeNames.slice(0,2).join(' + '),
    cheap:total===0?'0 元穷开心路线':`人均 ¥${total} 的穷游路线`,
    outdoor:warns?'户外放风线（注意天气）':'趁好天气出门撒欢',
    party:`${P} 人热闹局：先玩再吃`,
    solo:'一个人的慢周末',
    guide:'套用的攻略路线'
  }[th];
  const tags=[];
  if(badSlots.length&&!warns)tags.push('雨天友好');
  if(total===0)tags.push('0元');else if(!unl&&total<=prefs.budget)tags.push('预算内');
  if(!lack.length&&!many.length)tags.push(P===1?'一个人OK':`适合${P}人`);
  if(acts.some(a=>a.book))tags.push('需预约');
  plan.tags=tags;
}

function generatePlans(prefs){
  // 先各自生成并按匹配度排序，再按顺序重建：已出现过的活动降权，让 3 套方案更有差异
  const order=THEMES.map(t=>({t,p:buildPlan(t,prefs)})).filter(x=>x.p).sort((a,b)=>b.p.match-a.p.match);
  const seen={},sigs=new Set(),out=[];
  for(const {t} of order){
    const p=buildPlan(t,prefs,seen);if(!p)continue;
    const sig=p.stops.map(s=>s.aid).join();if(sigs.has(sig))continue;
    sigs.add(sig);out.push(p);p.stops.forEach(s=>seen[s.aid]=(seen[s.aid]||0)+1);
    if(out.length===3)break;
  }
  return out.sort((a,b)=>b.match-a.match);
}

// 换一站：同时段按得分轮换
function swapStop(plan,i,prefs){
  const s=plan.stops[i],prev=i?plan.stops[i-1].area:null;
  const used=new Set(plan.stops.filter((_,j)=>j!==i).map(x=>x.aid));
  const c=candidates(s.slot,prefs,{used,prevArea:prev});
  if(c.length<2&&c.length&&c[0].a.id===s.aid)return false;
  if(!c.length)return false;
  const k=c.findIndex(x=>x.a.id===s.aid);
  const next=c[(k+1)%c.length].a;
  Object.assign(s,{aid:next.id,area:next.area,rain:false});
  recalc(plan,prefs);return true;
}

// 雨天备选：同时段最合适的室内活动
function rainSwap(plan,i,prefs){
  const s=plan.stops[i],prev=i?plan.stops[i-1].area:null;
  const used=new Set(plan.stops.map(x=>x.aid));
  const c=candidates(s.slot,{...prefs,avoid:prefs.avoid.filter(x=>x!=='outdoor')},{used,indoor:true,prevArea:prev});
  if(!c.length)return null;
  const old=actOf(s),a=c[0].a;
  Object.assign(s,{aid:a.id,area:a.area,rain:true});
  recalc(plan,prefs);return {from:old,to:a};
}

// 攻略一键套用为方案
function planFromStops(aids,prefs,title){
  const order={am:0,lunch:1,pm:2,dinner:3,eve:4};let last=-1;
  const stops=aids.map(findAct).filter(Boolean).map(a=>{
    const slot=a.slots.slice().sort((x,y)=>order[x]-order[y]).find(x=>order[x]>last)||a.slots[a.slots.length-1];
    last=order[slot];return {aid:a.id,slot,area:a.area};
  });
  const plan={id:'guide-'+Date.now(),theme:'guide',customTitle:title,city:aids.length?findAct(aids[0]).city:prefs.city,day:prefs.day,stops};
  return recalc(plan,{...prefs,city:plan.city});
}

// ================= 组局：偏好合并 =================
// 时段 key：'0_pm' = 周六下午
const SLOT_KEYS=[0,1].flatMap(d=>['am','pm','eve'].map(s=>d+'_'+s));
function mergePrefs(members,city){
  const ms=members.filter(m=>m.filled);if(!ms.length)return null;
  const cnt=k=>ms.filter(m=>m.pref.slots.includes(k)).length;
  let common=SLOT_KEYS.filter(k=>cnt(k)===ms.length),partial=false;
  if(!common.length){const mx=Math.max(...SLOT_KEYS.map(cnt));common=mx?SLOT_KEYS.filter(k=>cnt(k)===mx):[];partial=true;}
  const day=[0,1].sort((a,b)=>common.filter(k=>+k[0]===b).length-common.filter(k=>+k[0]===a).length)[0];
  const slots=common.filter(k=>+k[0]===day).map(k=>k.split('_')[1]);
  const absent=partial?ms.filter(m=>!slots.some(s=>m.pref.slots.includes(day+'_'+s))).map(m=>m.name):[];
  const budget=Math.min(...ms.map(m=>m.pref.budget)),poorest=ms.find(m=>m.pref.budget===budget).name;
  const v={};ms.forEach(m=>m.pref.likes.forEach(t=>v[t]=(v[t]||0)+1));
  const votes=Object.entries(v).sort((a,b)=>b[1]-a[1]);
  let likes=votes.filter(x=>x[1]>=2).map(x=>x[0]);if(!likes.length)likes=votes.slice(0,2).map(x=>x[0]);
  const avoid=[];ms.forEach(m=>m.pref.avoid.forEach(k=>{const f=avoid.find(x=>x.k===k);f?f.by.push(m.name):avoid.push({k,by:[m.name]});}));
  return {n:ms.length,total:members.length,day,slots,absent,partial,budget,poorest,votes,avoid,
    prefs:{city,day,people:members.length,budget,likes,avoid:avoid.map(x=>x.k),slots:slots.length?slots:null}};
}

// 方案差异：说明为什么换掉了哪些站
function planDiff(oldP,newP,m){
  const nIds=newP.stops.map(s=>s.aid),oIds=oldP.stops.map(s=>s.aid);
  const why=s=>{const a=actOf(s);
    const hit=m.avoid.find(x=>avoidHit(a,s.slot,[x.k]));if(hit)return hit.by.join('、')+'不想'+AVOIDS[hit.k];
    if(SLOTS[s.slot].meal)return '跟着路线调整';
    if(oldP.day!==m.day)return '改到大家都有空的'+weekendDates()[m.day].label;
    if(!m.slots.includes(s.slot))return SLOTS[s.slot].n+'不是所有人都有空';
    if(a.p>m.budget)return '超出共同预算 ¥'+m.budget;
    if(a.p>m.budget*0.6)return '单站 ¥'+a.p+'，占了共同预算 ¥'+m.budget+' 的大半';
    return '有更合适的选择';};
  return {removed:oldP.stops.filter(s=>!nIds.includes(s.aid)).map(s=>({n:actOf(s).n,why:why(s)})),
          added:newP.stops.filter(s=>!oIds.includes(s.aid)).map(s=>actOf(s).n),before:oldP.cost.total,after:newP.cost.total};
}
