// ================= 静态数据（演示用 mock） =================
// 类型：[名称, emoji, 底色]
const TYPES={exhibit:['展览','🖼️','#e8e4ff'],market:['市集','🛍️','#fff1d6'],show:['演出','🎤','#ffe1ea'],hike:['徒步','🥾','#ddf3e6'],walk:['City Walk','🚶','#dff0ff'],food:['美食','🍜','#ffe9e1']};

// 时段：午饭/晚饭的天气沿用下午/晚上
const SLOTS={
  am:{n:'上午',s:'09:30',e:'12:00',wx:'am'},
  lunch:{n:'午饭',s:'12:15',e:'13:30',wx:'pm',meal:true},
  pm:{n:'下午',s:'14:00',e:'17:00',wx:'pm'},
  dinner:{n:'晚饭',s:'17:30',e:'19:00',wx:'eve',meal:true},
  eve:{n:'晚上',s:'19:30',e:'21:30',wx:'eve'}
};
const SLOT_ORDER=['am','lunch','pm','dinner','eve'];

// 「不想要」选项 → 引擎里作为硬过滤
const AVOIDS={hike:'爬山',queue:'排队久',far:'单程>40分钟',outdoor:'户外',early:'早起'};

// 区域示意坐标（km），用于估算站间交通
const CITIES={
  sh:{name:'上海',areas:{'黄浦':[0,0],'外滩':[1,0],'静安':[-2,1],'普陀 · M50':[-2,3],'长宁':[-7,0],'徐汇 · 武康路':[-4,-2],'徐汇滨江':[-3,-6],'浦东':[8,-3],'普陀 · 长风':[-7,4],'杨浦':[5,6],'松江 · 佘山':[-28,-15]}},
  bj:{name:'北京',areas:{'东城':[0,0],'西城 · 前门':[-1,-2],'朝阳 · 798':[10,6],'朝阳 · 亮马河':[6,3],'海淀 · 香山':[-18,6],'海淀 · 五道口':[-10,9]}},
  hz:{name:'杭州',areas:{'西湖':[0,0],'南山':[1,-1],'龙井':[-3,-3],'天目里':[-1,2],'拱墅':[2,6],'上城':[3,0],'滨江':[5,-6]}}
};

// 天气：[周六, 周日]，每天分上午/下午/晚上；rain = 降水/不宜户外概率
const WEATHER={
  sh:[
    {am:{w:'多云',i:'⛅',t:16,rain:20},pm:{w:'小雨',i:'🌧️',t:15,rain:70},eve:{w:'中雨',i:'🌧️',t:14,rain:80}},
    {am:{w:'晴',i:'☀️',t:14,rain:5},pm:{w:'多云',i:'⛅',t:20,rain:10},eve:{w:'晴',i:'🌙',t:16,rain:5}}
  ],
  bj:[
    {am:{w:'晴',i:'☀️',t:5,rain:0},pm:{w:'晴',i:'☀️',t:14,rain:0},eve:{w:'晴',i:'🌙',t:8,rain:0}},
    {am:{w:'大风',i:'🌬️',t:2,rain:65},pm:{w:'大风',i:'🌬️',t:9,rain:70},eve:{w:'多云',i:'☁️',t:3,rain:30}}
  ],
  hz:[
    {am:{w:'晴',i:'☀️',t:13,rain:5},pm:{w:'晴',i:'☀️',t:21,rain:5},eve:{w:'多云',i:'☁️',t:16,rain:15}},
    {am:{w:'多云',i:'⛅',t:14,rain:30},pm:{w:'阵雨',i:'🌦️',t:18,rain:65},eve:{w:'小雨',i:'🌧️',t:15,rain:60}}
  ]
};

// 活动：n 名称 / t 类型 / in 室内 / p 人均 / min-max-best 人数 / queue 排队久 / book 需预约 / src 信息来源
const ACTS=[
 // ---------- 上海 ----------
 {id:'sh1',city:'sh',n:'西岸美术馆 · 当代影像特展',t:'exhibit',in:true,area:'徐汇滨江',slots:['am','pm'],dur:2.5,p:60,min:1,max:6,best:2,stu:'学生票半价',src:'豆瓣同城',desc:'看完展沿滨江步道走走，江景很开阔。'},
 {id:'sh2',city:'sh',n:'上生·新所 周末创意市集',t:'market',in:false,area:'长宁',slots:['pm'],dur:2,p:40,min:2,max:8,best:4,stu:'免费入场',src:'小红书',desc:'手作、咖啡、vintage，适合拍照和闲逛。'},
 {id:'sh3',city:'sh',n:'MAO Livehouse 独立乐队专场',t:'show',in:true,area:'静安',slots:['eve'],dur:2.5,p:160,min:1,max:6,best:3,book:true,stu:'预售 ¥160',src:'大麦',desc:'站票，建议提前 30 分钟排队。'},
 {id:'sh4',city:'sh',n:'佘山 → 天马山 轻徒步',t:'hike',in:false,area:'松江 · 佘山',slots:['am'],dur:4,p:30,min:2,max:10,best:4,stu:'地铁 9 号线直达',src:'小红书',desc:'全程约 10km，爬升 300m，新手友好。'},
 {id:'sh5',city:'sh',n:'武康路 — 安福路 梧桐 City Walk',t:'walk',in:false,area:'徐汇 · 武康路',slots:['am','pm'],dur:3,p:0,min:1,max:6,best:3,stu:'免费',src:'小红书',desc:'11 月梧桐变黄，最佳季节。'},
 {id:'sh6',city:'sh',n:'上海博物馆东馆 古埃及文明大展',t:'exhibit',in:true,area:'浦东',slots:['am','pm'],dur:3,p:100,min:1,max:6,best:2,queue:true,book:true,stu:'学生票 ¥50',src:'公众号',desc:'热门展，周末建议上午早场。'},
 {id:'sh7',city:'sh',n:'剧本杀 · 民国悬疑 6 人本',t:'show',in:true,area:'黄浦',slots:['pm','eve'],dur:4,p:118,min:5,max:7,best:6,book:true,stu:'学生证 9 折',src:'大众点评',desc:'6 人一车，凑齐就开。'},
 {id:'sh8',city:'sh',n:'定西路 本帮小馆',t:'food',in:true,area:'长宁',slots:['lunch','dinner'],dur:1.5,p:70,min:2,max:6,best:4,stu:'人均 ¥60-80',src:'大众点评',desc:'红烧肉、腌笃鲜，人多可以多点几道。'},
 {id:'sh9',city:'sh',n:'M50 创意园 画廊漫游',t:'exhibit',in:true,area:'普陀 · M50',slots:['am','pm'],dur:2,p:0,min:1,max:6,best:2,stu:'免费',src:'豆瓣同城',desc:'涂鸦墙 + 小画廊，雨天也能逛。'},
 {id:'sh10',city:'sh',n:'苏州河 夜骑 + 夜市',t:'market',in:false,area:'普陀 · 长风',slots:['eve'],dur:3,p:30,min:2,max:10,best:4,stu:'共享单车即可',src:'小红书',desc:'沿河 12km，终点吃夜宵。'},
 {id:'sh11',city:'sh',n:'UCCA Edge 当代艺术展',t:'exhibit',in:true,area:'静安',slots:['am','pm'],dur:2,p:80,min:1,max:5,best:2,stu:'学生票 ¥60',src:'豆瓣同城',desc:'装置作品多，出片率高。'},
 {id:'sh12',city:'sh',n:'复星艺术中心 小众展',t:'exhibit',in:true,area:'外滩',slots:['pm'],dur:1.5,p:50,min:1,max:5,best:2,stu:'学生票 ¥40',src:'公众号',desc:'楼顶能看外滩，看完顺路逛滨江。'},
 {id:'sh13',city:'sh',n:'BFC 外滩枫径 周末市集',t:'market',in:false,area:'外滩',slots:['pm','eve'],dur:2,p:50,min:1,max:8,best:3,stu:'免费入场',src:'小红书',desc:'市集 + 江景，傍晚灯亮后最好看。'},
 {id:'sh14',city:'sh',n:'单口喜剧 开放麦',t:'show',in:true,area:'静安',slots:['eve'],dur:2,p:80,min:1,max:8,best:4,book:true,stu:'学生票 ¥60',src:'大麦',desc:'新人演员多，笑点密集，适合一群人。'},
 {id:'sh15',city:'sh',n:'共青森林公园 徒步 + 野餐',t:'hike',in:false,area:'杨浦',slots:['am','pm'],dur:3,p:20,min:2,max:10,best:4,stu:'门票 ¥15',src:'小红书',desc:'平路为主，带块野餐垫就行。'},
 {id:'sh16',city:'sh',n:'外滩 → 北外滩 滨江夜景步道',t:'walk',in:false,area:'外滩',slots:['pm','eve'],dur:2,p:0,min:1,max:8,best:3,stu:'免费',src:'小红书',desc:'全程沿江，夜景比白天好看。'},
 {id:'sh17',city:'sh',n:'愚园路 → 静安寺 小店漫游',t:'walk',in:false,area:'静安',slots:['am','pm'],dur:2.5,p:0,min:1,max:5,best:2,stu:'免费',src:'小红书',desc:'独立书店、咖啡馆、买手店。'},
 {id:'sh18',city:'sh',n:'苏州河畔 咖啡简餐',t:'food',in:true,area:'普陀 · M50',slots:['lunch'],dur:1,p:45,min:1,max:4,best:2,stu:'人均 ¥40-50',src:'大众点评',desc:'窗边能看苏州河。'},
 {id:'sh19',city:'sh',n:'武康路 生煎 + 小馄饨',t:'food',in:true,area:'徐汇 · 武康路',slots:['lunch','dinner'],dur:1,p:25,min:1,max:4,best:2,stu:'人均 ¥20-30',src:'大众点评',desc:'便宜好吃，穷游首选。'},
 {id:'sh20',city:'sh',n:'陆家嘴 学生友好火锅',t:'food',in:true,area:'浦东',slots:['dinner'],dur:1.5,p:85,min:2,max:8,best:4,stu:'学生 8.8 折',src:'大众点评',desc:'人越多越划算。'},
 {id:'sh21',city:'sh',n:'云南南路 美食街',t:'food',in:true,area:'黄浦',slots:['lunch','dinner'],dur:1.5,p:55,min:1,max:8,best:4,stu:'人均 ¥40-70',src:'大众点评',desc:'小吃多，一群人可以分着吃。'},
 // ---------- 北京 ----------
 {id:'bj1',city:'bj',n:'798 艺术区 周末看展',t:'exhibit',in:true,area:'朝阳 · 798',slots:['am','pm'],dur:3,p:50,min:1,max:6,best:2,stu:'多数展免费',src:'豆瓣同城',desc:'UCCA + 小画廊组合。'},
 {id:'bj2',city:'bj',n:'香山 红叶徒步',t:'hike',in:false,area:'海淀 · 香山',slots:['am'],dur:4,p:20,min:2,max:10,best:4,queue:true,stu:'学生票半价',src:'小红书',desc:'11 月初红叶尾巴，人多建议早到。'},
 {id:'bj3',city:'bj',n:'鼓楼 胡同 City Walk',t:'walk',in:false,area:'东城',slots:['am','pm'],dur:3,p:0,min:1,max:6,best:3,stu:'免费',src:'小红书',desc:'南锣—烟袋斜街—什刹海。'},
 {id:'bj4',city:'bj',n:'前门 相声小剧场',t:'show',in:true,area:'西城 · 前门',slots:['eve'],dur:2,p:120,min:1,max:8,best:4,book:true,stu:'早鸟 ¥120',src:'大麦',desc:'适合带外地朋友。'},
 {id:'bj5',city:'bj',n:'亮马河 周末市集',t:'market',in:false,area:'朝阳 · 亮马河',slots:['pm','eve'],dur:2,p:50,min:2,max:8,best:4,stu:'免费入场',src:'小红书',desc:'河边市集 + 游船。'},
 {id:'bj6',city:'bj',n:'簋街 小龙虾',t:'food',in:true,area:'东城',slots:['dinner'],dur:2,p:110,min:3,max:8,best:4,stu:'人多更划算',src:'大众点评',desc:'4 人以上点大份。'},
 {id:'bj7',city:'bj',n:'国家博物馆 常设展',t:'exhibit',in:true,area:'东城',slots:['am','pm'],dur:3,p:0,min:1,max:6,best:2,queue:true,book:true,stu:'免费，需预约',src:'公众号',desc:'提前 7 天预约。'},
 {id:'bj8',city:'bj',n:'前门 卤煮炒肝',t:'food',in:true,area:'西城 · 前门',slots:['lunch'],dur:1,p:35,min:1,max:6,best:2,stu:'人均 ¥30-40',src:'大众点评',desc:'老北京味儿。'},
 {id:'bj9',city:'bj',n:'五道口 学生食堂风小馆',t:'food',in:true,area:'海淀 · 五道口',slots:['lunch','dinner'],dur:1,p:30,min:1,max:8,best:4,stu:'人均 ¥25-35',src:'大众点评',desc:'量大实惠。'},
 {id:'bj10',city:'bj',n:'朝阳 Livehouse 民谣夜',t:'show',in:true,area:'朝阳 · 亮马河',slots:['eve'],dur:2.5,p:140,min:1,max:6,best:3,book:true,stu:'学生票 ¥110',src:'大麦',desc:'坐着听，氛围很松弛。'},
 // ---------- 杭州 ----------
 {id:'hz1',city:'hz',n:'九溪十八涧 → 龙井村 徒步',t:'hike',in:false,area:'龙井',slots:['am'],dur:4,p:20,min:2,max:10,best:4,stu:'免费',src:'小红书',desc:'溪水 + 茶园，终点喝龙井。'},
 {id:'hz2',city:'hz',n:'中国美院 毕业展余展',t:'exhibit',in:true,area:'南山',slots:['am','pm'],dur:2,p:0,min:1,max:6,best:2,stu:'免费',src:'豆瓣同城',desc:'校园很好拍。'},
 {id:'hz3',city:'hz',n:'小河直街 运河 City Walk',t:'walk',in:false,area:'拱墅',slots:['am','pm'],dur:3,p:5,min:1,max:6,best:3,stu:'水上巴士 ¥3',src:'小红书',desc:'坐水上巴士过去更有意思。'},
 {id:'hz4',city:'hz',n:'天目里 周末市集',t:'market',in:false,area:'天目里',slots:['pm'],dur:2,p:40,min:2,max:8,best:4,stu:'免费入场',src:'小红书',desc:'设计感强，适合拍照。'},
 {id:'hz5',city:'hz',n:'滨江 音乐节小场',t:'show',in:true,area:'滨江',slots:['pm','eve'],dur:4,p:220,min:1,max:6,best:3,book:true,stu:'学生票 ¥220',src:'大麦',desc:'室内场，雨天照常举行。'},
 {id:'hz6',city:'hz',n:'胜利河 美食街',t:'food',in:true,area:'上城',slots:['lunch','dinner'],dur:1.5,p:60,min:2,max:8,best:4,stu:'人均 ¥50-70',src:'大众点评',desc:'葱包桧、片儿川。'},
 {id:'hz7',city:'hz',n:'浙江美术馆 特展',t:'exhibit',in:true,area:'南山',slots:['am','pm'],dur:2,p:0,min:1,max:6,best:2,book:true,stu:'免费，需预约',src:'公众号',desc:'就在西湖边。'},
 {id:'hz8',city:'hz',n:'西湖边 片儿川面馆',t:'food',in:true,area:'西湖',slots:['lunch'],dur:1,p:30,min:1,max:4,best:2,stu:'人均 ¥25-35',src:'大众点评',desc:'老字号，排队快。'},
 {id:'hz9',city:'hz',n:'湖滨 → 断桥 夜游西湖',t:'walk',in:false,area:'西湖',slots:['pm','eve'],dur:2,p:0,min:1,max:8,best:3,stu:'免费',src:'小红书',desc:'晚上人少，湖面有灯。'},
 {id:'hz10',city:'hz',n:'大兜路 运河夜市',t:'market',in:false,area:'拱墅',slots:['eve'],dur:2,p:40,min:1,max:8,best:4,stu:'免费入场',src:'小红书',desc:'夜市 + 运河夜景。'}
];

// 同城攻略：stops 可一键套用为方案
const GUIDES=[
 {id:'g1',city:'sh',au:'小鹿',title:'雨天也不怕！上海室内一日游（人均 ¥150）',body:'上午 上博东馆 → 中午 苏州河咖啡 → 下午 M50 画廊 → 晚上 Livehouse。全程室内，不用打伞走多久。',stops:['sh6','sh18','sh9','sh3'],likes:328,t:3,tags:['雨天','室内']},
 {id:'g2',city:'sh',au:'阿北',title:'4 人 0 元梧桐 City Walk 路线',body:'武康大楼 → 安福路 → 巨鹿路 → 富民路，3 小时，拍照点已标好。午饭吃生煎。',stops:['sh5','sh19','sh17'],likes:512,t:6,tags:['免费','拍照','4人']},
 {id:'g3',city:'sh',au:'Momo',title:'佘山徒步新手攻略：装备、路线、回程',body:'9 号线佘山站出发，西佘山上东佘山下，再去天马山。带水 1L、运动鞋即可。',stops:['sh4','sh21'],likes:206,t:10,tags:['徒步','新手']},
 {id:'g4',city:'bj',au:'Kiki',title:'香山红叶避人流指南',body:'7 点前进北门，走红叶路线到香炉峰，下山去五道口吃饭。',stops:['bj2','bj9'],likes:440,t:2,tags:['徒步','早起']},
 {id:'g5',city:'bj',au:'大橘',title:'胡同 City Walk + 相声，北京味儿的一天',body:'白天鼓楼胡同，晚上前门相声，人均 ¥150。',stops:['bj3','bj8','bj4'],likes:198,t:8,tags:['City Walk','演出']},
 {id:'g6',city:'hz',au:'阿禾',title:'九溪徒步 + 龙井喝茶，杭州最舒服的周末',body:'九溪烟树出发，沿溪走到龙井村，农家喝茶吃饭，人均 ¥80。',stops:['hz1','hz8','hz2'],likes:367,t:4,tags:['徒步','喝茶']},
 {id:'g7',city:'hz',au:'Leo',title:'运河坐水上巴士 ¥3 看杭州',body:'武林门码头上船，到小河直街下船逛老街，晚上逛运河夜市。',stops:['hz3','hz6','hz10'],likes:150,t:12,tags:['穷游','City Walk']}
];

const NAMES=['我','小林','阿杰','Mia','周周','大壮','Coco','Leo'];
const COLORS=['#ff6a3d','#3b6ef5','#1f9d6b','#a855f7','#f5a623','#0ea5e9','#ec4899','#64748b'];
