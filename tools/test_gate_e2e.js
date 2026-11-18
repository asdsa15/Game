
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
function makeEl(id){return{id,innerHTML:'',textContent:'',value:'',className:'',checked:false,style:{},dataset:{},children:[],parentNode:null,
classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},removeEventListener(){},appendChild(c){this.children.push(c)},
removeChild(){},setAttribute(){},getAttribute(){return null},querySelector(){return makeEl('q')},querySelectorAll(){return[]},
closest(){return null},contains(){return false},focus(){},click(){},insertAdjacentHTML(){},scrollIntoView(){}}}
const els={};const document={readyState:'complete',visibilityState:'visible',body:makeEl('body'),documentElement:makeEl('html'),
getElementById(id){if(!els[id])els[id]=makeEl(id);return els[id]},querySelector(){return makeEl('q')},querySelectorAll(){return[]},
createElement(){return makeEl('new')},addEventListener(){},removeEventListener(){}};
const store={};const localStorage={getItem(k){return k in store?store[k]:null},setItem(k,v){store[k]=String(v)},removeItem(k){delete store[k]}};
const window={document,localStorage,addEventListener(){},removeEventListener(){},setTimeout(){return 0},clearTimeout(){},
matchMedia(){return{matches:false,addEventListener(){}}},getComputedStyle(){return{}},URL:{createObjectURL(){return'blob:x'},revokeObjectURL(){}},
navigator:{userAgent:'node'},location:{href:'http://localhost/'},alert(){},confirm(){return true},prompt(){return''}};
const ctx={window,document,localStorage,console,Math,Object,Array,JSON,String,Number,Date,parseInt,parseFloat,isNaN,
setTimeout:window.setTimeout,clearTimeout:window.clearTimeout,URL:window.URL,Blob:function(){},FileReader:function(){},requestAnimationFrame(){return 0}};
ctx.globalThis=ctx;vm.createContext(ctx);
const FILES=['wxcs3-data.js','wxcs3-rules.js','wxcs3-game.js'];
fs.readdirSync(ROOT).filter(f=>/^wxcs3-ext-.*\.js$/.test(f)).sort().forEach(f=>FILES.push(f));
FILES.forEach(f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f}));
const G=window.WXCS3,D=G.D,EXT=window.WXCS3_EXT;let S=G.S;
let pass=0,fail=0;
function ok(c,n,e){if(c){pass++;console.log('  ✔',n)}else{fail++;console.log('  ✘',n,e===undefined?'':e)}}

function setup(o){o=o||{};S=G.S;S.phase='play';S.started=true;S.age=40;S.lifeMax=500;S.lifeStop=false;
S.cultivation='xian';S.root=o.root||'true_';S.rootEls=o.rootEls||['metal','water','wood'];
S.gongfa=o.gongfa||['juqi'];S.ownedGongfa=[].concat(S.gongfa);S.body='plain';
S.xRealm=o.xRealm===undefined?1:o.xRealm;S.xStage=o.xStage===undefined?0:o.xStage;S.xiuwei=o.xiuwei||0;
S.shenTong=[];S.hp=100;S.hpMax=100;S.mp=100;S.mpMax=100;S.stones=1000;S.month=3;S.year=387;
S.log=[];S.chronicle=[];S.ledger={income:[],expense:[]};S.bag={};S.bagMat={};S.arts=[];S.disks=[];S.craftedQ={};
S.stats=o.stats||{qualify:8,insight:8,sense:8,speed:8,heart:8,fate:8};S.combat=null;S.preBuff=null;S.talismans={};
S.pillar=0;S.pos=0;S.guowei=null;S.miao='野祀';S.miaoUp={};S.followers=1000;S.piety=1;S.xianghuo=0;S.meditate=false;
S.arrears=0;S.templeBroken=false;S.lingqi=1;S.books=[];S.bookRead=o.bookRead||{};S.insightXp=o.insightXp||0;
S.faxiang='g1';S.trib=null;S.tribLock=0;S.xianji='黄基';return S}

console.log('=== 端到端：圣坛→破境路径不被死锁 ===');

/* 场景 A：新手正常路径 —— 练气修为满、聚气诀（无属性）→ 应当放行 */
setup({xRealm:1,xStage:8,xiuwei:99999,gongfa:['juqi'],rootEls:['metal','water','wood']});
const gA=EXT.breakGate();
ok(gA.ok===true,'场景A 聚气诀（无属性）不产生灵根门槛，可正常破境');

/* 场景 B：换了一本不同属性的高阶功法，灵根不搭 —— 被挡，但可解 */
setup({xRealm:1,xStage:8,xiuwei:99999,gongfa:['xuanyuan'],rootEls:['fire','earth','wood']});
const gB=EXT.breakGate();
ok(gB.ok===false,'场景B 金行功法配火主系 → 被挡（有代价）');
ok(gB.blocked.length>0 && gB.blocked[0].hint.length>0,'场景B 明确给出解法');
/* 解法：换成火行功法 */
S.gongfa=['liuhuo'];S.ownedGongfa.push('liuhuo');
const gB2=EXT.breakGate();
ok(gB2.ok===true,'场景B 换火行功法后放行 —— 选择有代价也有出路');

/* 场景 C：筑基 → 紫府（xRealm 2），需要读过道书 */
setup({xRealm:2,xStage:3,xiuwei:99999,xiuwei2:0,gongfa:['juqi'],bookRead:{}});
const gC=EXT.breakGate();
ok(gC.blocked.some(r=>r.id==='book'),'场景C 未读道书 → 被挡');
S.bookRead={somebook:2};
const gC2=EXT.breakGate();
ok(!gC2.blocked.some(r=>r.id==='book'),'场景C 读通道书后放行');

/* 场景 D：金丹 → 道胎，悟性门槛 + 悟道点兜底 */
setup({xRealm:3,xStage:1,xiuwei:99999,gongfa:['juqi'],stats:{qualify:8,insight:10,sense:8,speed:8,heart:8,fate:8},insightXp:0});
const gD=EXT.breakGate();
ok(gD.blocked.some(r=>r.id==='insight'),'场景D 悟性 10 < 12 → 被挡');
/* 解法：攒悟道点（读书产出），20 点折 1 悟性 */
S.insightXp=40;
ok(EXT.insightBonus()===2,'场景D 40 点悟道点折 +2 悟性');
ok(EXT.effectiveInsight()===12,'场景D 有效悟性达 12（10+2）');
const gD2=EXT.breakGate();
ok(!gD2.blocked.some(r=>r.id==='insight'),'场景D 攒够阅历后放行 —— 读书真的解锁突破');

/* 场景 E：神道破柱虔诚门槛 */
setup({});
S.cultivation='shen';S.pillar=1;S.piety=0.8;S.xRealm=1;
const gE=EXT.breakGate();
ok(gE.blocked.some(r=>r.id==='piety'),'场景E 虔诚 0.8 未达「日日供奉」→ 破柱被挡');
S.piety=1.6;
const gE2=EXT.breakGate();
ok(!gE2.blocked.some(r=>r.id==='piety'),'场景E 抬到 1.6 后放行');

/* 场景 F：所有门槛同时不满足时，面板仍可读且每条都有解法 */
setup({xRealm:3,xStage:2,xiuwei:99999,gongfa:['xuanyuan'],rootEls:['fire','earth','wood'],
stats:{qualify:8,insight:3,sense:8,speed:8,heart:8,fate:8},bookRead:{}});
const gF=EXT.breakGate();
ok(gF.blocked.length>=2,'场景F 多项同时不满足（'+gF.blocked.length+' 项）');
ok(gF.blocked.every(r=>r.hint&&r.hint.length>0),'场景F 每一项都写明怎么补');

/* 场景 G：openBreak 真的会拦住（不是只写在扩展里） */
setup({xRealm:1,xStage:2,xiuwei:99999,gongfa:['xuanyuan'],rootEls:['fire','earth','wood'],bookRead:{somebook:1}});
G.ACT.openBreak();
const modalHtml=(function(){const m=document.getElementById('modals');return m?m.innerHTML:''})();
ok(modalHtml.indexOf('条件未足')>=0,'场景G openBreak 弹出「破境 · 条件未足」面板');
ok(modalHtml.indexOf('解法')>=0,'场景G 面板内给出解法');

/* 场景 H：条件满足时不会误拦 */
setup({xRealm:1,xStage:2,xiuwei:99999,gongfa:['juqi'],rootEls:['metal','water','wood']});
G.ACT.openBreak();
const htmlH=(function(){const m=document.getElementById('modals');return m?m.innerHTML:''})();
ok(htmlH.indexOf('条件未足')<0,'场景H 条件满足时不弹拦截面板');

console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
if(fail>0)process.exitCode=1;
