// 战斗体感模拟：验「每一击都造成伤害」「一场打几回合」
// 旧版问题：普攻掷 72%（老练 60%）命中，未中就是 0 伤害；而 foeTurn 无命中判定。
// 现在改为必中 + 卸力。这个脚本用 DOM 桩真打若干场，统计回合数与空挥次数。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function makeEl(id) {
  return {
    id, innerHTML: '', textContent: '', value: '', className: '', checked: false,
    style: {}, dataset: {}, children: [], parentNode: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, appendChild(c) { this.children.push(c); },
    removeChild() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector() { return makeEl('q'); }, querySelectorAll() { return []; },
    closest() { return null; }, contains() { return false; }, focus() {}, click() {},
    insertAdjacentHTML() {}, scrollIntoView() {}
  };
}
const els = {};
const document = {
  readyState: 'complete', visibilityState: 'visible',
  body: makeEl('body'), documentElement: makeEl('html'),
  getElementById(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; },
  querySelector() { return makeEl('q'); }, querySelectorAll() { return []; },
  createElement() { return makeEl('new'); }, addEventListener() {}, removeEventListener() {}
};
const store = {};
const localStorage = {
  getItem(k) { return k in store ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; }
};
const window = {
  document, localStorage, addEventListener() {}, removeEventListener() {},
  setTimeout() { return 0; }, clearTimeout() {},
  matchMedia() { return { matches: false, addEventListener() {} }; },
  getComputedStyle() { return {}; },
  URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} },
  navigator: { userAgent: 'node' }, location: { href: 'http://localhost/' },
  alert() {}, confirm() { return true; }, prompt() { return ''; }
};
const ctx = {
  window, document, localStorage, console, Math, Object, Array, JSON, String, Number, Date,
  parseInt, parseFloat, isNaN, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
  URL: window.URL, Blob: function () {}, FileReader: function () {},
  requestAnimationFrame() { return 0; }
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-rules.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8'), ctx);
/* v10.7 阶段三：加载扩展，本命/灵兽战斗钩子参与模拟 */
fs.readdirSync(ROOT).filter(function (f) { return /^wxcs3-ext-.*\.js$/.test(f); }).sort().forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
});
const G = window.WXCS3;
const D = G.D;

let S = G.S;

function setup(realm) {
  S = G.S;
  S.phase = 'play'; S.started = true; S.age = 24; S.lifeMax = 200;
  S.cultivation = 'xian'; S.xRealm = realm; S.xStage = 0; S.xiuwei = 0;
  S.pillar = 0; S.pos = 0; S.stones = 800; S.fame = 0; S.karma = 0; S.merit = 0;
  S.hp = 100; S.hpMax = 100; S.mp = 100; S.mpMax = 100;
  S.month = 3; S.year = 390; S.turn = 30;
  S.log = []; S.chronicle = []; S.ledger = { income: [], expense: [] };
  S.bag = {}; S.bagMat = {}; S.talismans = {}; S.arts = []; S.disks = []; S.craftedQ = {};
  S.equipped = {}; S.stats = { qualify: 8, insight: 8, sense: 8, speed: 8, heart: 8, fate: 8 };
  S.gongfa = ['juqi']; S.daogong = 'juqi'; S.skillsEquip = ['zhiquan']; S.skillsKnown = ['zhiquan'];
  S.shenTong = []; S.npcs = {}; S.anchors = { wu: 1, ren: 1, shi: 1, yi: 1 };
  S.anchorMiss = { wu: 0, ren: 0, shi: 0, yi: 0 };
  S.dyingUsed = false; S.dying = null;
}

function startFight() {
  /* 用「山野历练」触发战斗：反复出门直到进入战斗，最多试 80 次 */
  for (let i = 0; i < 80; i++) {
    try { G.ACT.do_xing('wild'); } catch (e) { }
    if (S.phase === 'combat' && S.combat) return true;
    if (S.phase !== 'play') return false;
    S.hp = S.hpMax;   // 只测战斗本身，不被上一场的伤影响
  }
  return false;
}

/* v10.7 阶段三：构筑流派。每流派给出装配与每回合决策函数。
   决策走真实 do;cbt:* 路径，不用内部探针代替玩家操作。 */
const BUILDS = {
  attack: {
    name: '普攻到底',
    prep: function () { S.skillsEquip = ['zhiquan']; S.skillsKnown = ['zhiquan']; },
    act: function () { G.ACT.do_cbt('attack'); }
  },
  skill: {
    name: '术法流',
    prep: function () {
      S.skillsKnown = ['zhiquan', 'liehuo', 'luoshi', 'leiming'];
      S.skillsEquip = ['liehuo', 'luoshi', 'leiming'];
      S.mp = S.mpMax;
    },
    act: function () {
      const c = S.combat;
      /* 蓄力意图优先打断；否则按灵力选术法，灵力不足回退普攻/调息 */
      if (c.foeIntent && c.foeIntent.type === 'charge' && S.mp >= 40) { G.ACT.do_cbt('skill', encodeURIComponent('惊雷引')); return; }
      if (S.mp >= 26 && !(c.foeShred > 0)) { G.ACT.do_cbt('skill', encodeURIComponent('落石诀')); return; }
      if (S.mp >= 25) { G.ACT.do_cbt('skill', encodeURIComponent('焚山掌')); return; }
      if (S.mp < 25 && S.mp < S.mpMax * 0.3) { G.ACT.do_cbt('rest'); return; }
      G.ACT.do_cbt('attack');
    }
  },
  talisman: {
    name: '符丹流',
    prep: function () {
      S.talismans = { fuHuo: 6, fuLei: 4, fuPo: 3, fuZeng: 2, fuJin: 3 };
      S.bag = { pillHp: 3, pillMp: 3 };
      S.skillsEquip = ['zhiquan']; S.skillsKnown = ['zhiquan'];
    },
    act: function () {
      const c = S.combat;
      if (S.hp < S.hpMax * 0.4 && (S.bag.pillHp || 0) > 0 && (c.pillCount || 0) < 2) { G.ACT.do_cbt('pill', 'pillHp'); return; }
      if (c.foeIntent && c.foeIntent.type === 'charge' && (S.talismans.fuLei || 0) > 0 && !(c.talCd.fuLei > 0)) { G.ACT.do_cbt('tal', 'fuLei'); return; }
      if (!(c.foeShred > 0) && (S.talismans.fuPo || 0) > 0 && !(c.talCd.fuPo > 0)) { G.ACT.do_cbt('tal', 'fuPo'); return; }
      if (!(c.talBuffTurns > 0) && (S.talismans.fuZeng || 0) > 0 && !(c.talCd.fuZeng > 0)) { G.ACT.do_cbt('tal', 'fuZeng'); return; }
      if ((S.talismans.fuHuo || 0) > 0 && !(c.talCd.fuHuo > 0)) { G.ACT.do_cbt('tal', 'fuHuo'); return; }
      if ((S.talismans.fuLei || 0) > 0 && !(c.talCd.fuLei > 0)) { G.ACT.do_cbt('tal', 'fuLei'); return; }
      G.ACT.do_cbt('attack');
    }
  },
  guard: {
    name: '守势流',
    prep: function () {
      S.skillsEquip = ['zhiquan']; S.skillsKnown = ['zhiquan'];
      S.talismans = { fuJin: 4 }; S.bag = { huMai: 3 };
    },
    act: function () {
      const c = S.combat;
      /* 蓄力/重击意图守势，其余回合普攻输出；护脉丹冷却好就服 */
      if (c.foeIntent && (c.foeIntent.type === 'burst' || c.foeIntent.type === 'charge')) { G.ACT.do_cbt('defend'); return; }
      if (!(c.meGuardTurns > 0) && (S.bag.huMai || 0) > 0 && (c.pillCount || 0) < 2) { G.ACT.do_cbt('pill', 'huMai'); return; }
      G.ACT.do_cbt('attack');
    }
  }
};

function fightOnce(build, maxRounds) {
  let rounds = 0, misses = 0, dmgSum = 0, dmgN = 0, foeDown = false, fled = false;
  const mpStart = S.mp, hpStart = S.hp;
  const talStart = Object.values(S.talismans).reduce(function (a, b) { return a + b; }, 0);
  const pillStart = Object.values(S.bag).reduce(function (a, b) { return a + b; }, 0);
  while (S.phase === 'combat' && rounds < maxRounds) {
    const logLen = S.log.length;
    try { build.act(); } catch (e) { break; }
    rounds++;
    S.log.slice(0, S.log.length - logLen).forEach(function (l) {
      const t = l.txt || '';
      if (/未中/.test(t)) misses++;
      if (/得灵石/.test(t)) foeDown = true;
      if (/遁走了/.test(t)) fled = true;
      const m = t.match(/造成 (\d+)/);
      if (m) { dmgSum += Number(m[1]); dmgN++; }
    });
    if (S.combat && S.combat.foe.hp <= 0) foeDown = true;
  }
  const talEnd = Object.values(S.talismans).reduce(function (a, b) { return a + b; }, 0);
  const pillEnd = Object.values(S.bag).reduce(function (a, b) { return a + b; }, 0);
  return {
    rounds: rounds, misses: misses, dmgAvg: dmgN ? Math.round(dmgSum / dmgN) : 0,
    foeDown: foeDown, fled: fled,
    mpUsed: Math.max(0, mpStart - S.mp), hpLost: Math.max(0, hpStart - S.hp),
    talUsed: Math.max(0, talStart - talEnd), pillUsed: Math.max(0, pillStart - pillEnd),
    style: S.combat ? S.combat.foe.style : null
  };
}
function median(arr) {
  if (!arr.length) return 0;
  const s = arr.slice().sort(function (a, b) { return a - b; });
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const names = ['胎息', '练气', '筑基', '紫府', '金丹'];
console.log('=== v10.7 阶段三·战斗模拟（按构筑 × 境界，含路数/中位回合/资源消耗） ===\n');
const winRoundAll = [];
[0, 2, 4].forEach(function (realm) {
  console.log('【' + names[realm] + '境】');
  Object.keys(BUILDS).forEach(function (bk) {
    const build = BUILDS[bk];
    const tot = { fights: 0, wins: 0, hurts: 0, deaths: 0, fled: 0, rounds: 0, misses: 0,
      mp: 0, hp: 0, tal: 0, pill: 0, winRounds: [], byStyle: {} };
    for (let i = 0; i < 40; i++) {
      setup(realm);
      S.hp = S.hpMax = 100 + realm * 120;
      S.mp = S.mpMax = 100 + realm * 60;
      build.prep();
      if (!startFight()) continue;
      const style = S.combat.foe.style;
      const r = fightOnce(build, 60);
      tot.fights++; tot.rounds += r.rounds; tot.misses += r.misses;
      tot.mp += r.mpUsed; tot.hp += r.hpLost; tot.tal += r.talUsed; tot.pill += r.pillUsed;
      if (!tot.byStyle[style]) tot.byStyle[style] = { n: 0, win: 0 };
      tot.byStyle[style].n++;
      if (r.foeDown) { tot.wins++; tot.winRounds.push(r.rounds); tot.byStyle[style].win++; winRoundAll.push(r.rounds); }
      else if (S.phase === 'over' || S.phase === 'dying') tot.deaths++;
      else if (r.fled) tot.fled++;
      else tot.hurts++;
    }
    const f = Math.max(1, tot.fights);
    const med = median(tot.winRounds);
    console.log('  ' + build.name + '：场次 ' + tot.fights +
      '　击杀率 ' + Math.round(tot.wins / f * 100) + '%' +
      '　胜场中位 ' + med + ' 回合' +
      '　重伤 ' + tot.hurts + '　战死 ' + tot.deaths + '　遁走 ' + tot.fled);
    console.log('    资源/场均：灵力 ' + (tot.mp / f).toFixed(0) +
      '　气血 ' + (tot.hp / f).toFixed(0) +
      '　符 ' + (tot.tal / f).toFixed(1) + ' 张　丹 ' + (tot.pill / f).toFixed(1) + ' 枚');
    const styleStr = Object.keys(tot.byStyle).map(function (s) {
      const o = tot.byStyle[s];
      return s + ' ' + o.win + '/' + o.n;
    }).join('　');
    console.log('    路数击杀：' + styleStr);
  });
  console.log('');
});

console.log('=== 判定口径 ===');
console.log('普通胜场目标中位数 4~7 回合（全构筑合计中位 ' + median(winRoundAll) + ' 回合）。');
console.log('普攻必中（空挥合计应为 0）；单一消耗品不应成为所有局面唯一最优解——');
console.log('符丹流资源消耗显著高于普攻/守势流，体现「舍不舍得用」的取舍。');
