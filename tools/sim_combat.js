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
const G = window.WXCS3;

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

function fightOnce(maxRounds) {
  let rounds = 0, misses = 0, dmgSum = 0, dmgN = 0, foeDown = false, fled = false;
  while (S.phase === 'combat' && rounds < maxRounds) {
    const before = S.combat.foe.hp;
    const logLen = S.log.length;
    try { G.ACT.do_cbt('attack'); } catch (e) { break; }
    rounds++;
    if (before <= 0) { foeDown = true; }
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
  return { rounds: rounds, misses: misses, dmgAvg: dmgN ? Math.round(dmgSum / dmgN) : 0, foeDown: foeDown, fled: fled };
}

console.log('=== 战斗体感模拟（普攻到底，不用招式/符/丹） ===\n');
[0, 2, 4].forEach(function (realm) {
  const names = ['胎息', '练气', '筑基', '紫府', '金丹'];
  let tot = { rounds: 0, misses: 0, fights: 0, wins: 0, hurts: 0, deaths: 0, fled: 0, dmg: 0, dn: 0 };
  for (let i = 0; i < 40; i++) {
    setup(realm);
    S.hp = S.hpMax = 100 + realm * 120;
    S.mp = S.mpMax = 100;
    if (!startFight()) continue;
    const r = fightOnce(60);
    tot.fights++;
    tot.rounds += r.rounds;
    tot.misses += r.misses;
    if (r.dmgAvg) { tot.dmg += r.dmgAvg; tot.dn++; }
    if (r.foeDown) tot.wins++;
    else if (S.phase === 'over' || S.phase === 'dying') tot.deaths++;
    else if (r.fled) tot.fled++;
    else tot.hurts++;   // 重伤昏迷
  }
  const f = Math.max(1, tot.fights);
  console.log(names[realm] + '境：');
  console.log('  场次 ' + tot.fights +
    '　平均 ' + (tot.rounds / f).toFixed(1) + ' 回合' +
    '　平均单次伤害 ' + (tot.dn ? Math.round(tot.dmg / tot.dn) : 0));
  console.log('  空挥(未中) ' + tot.misses +
    '　击杀 ' + tot.wins + '　重伤昏迷 ' + tot.hurts + '　对方遁走 ' + tot.fled +
    '　战死 ' + tot.deaths + '　击杀率 ' + Math.round(tot.wins / f * 100) + '%');
  console.log('');
});

console.log('=== 判定 ===');
console.log('旧版：普攻 72% 命中（老练 60%），一场十几次出手会有 3~6 次「未中」。');
console.log('新版：普攻必中，改由「卸力」按比例削减伤害，日志里不再出现「未中」。');
