// 钩子状态机自检（不依赖 DOM）
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const vm = require('vm');

const w = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'wxcs3-data.js'), 'utf8'),
  { window: w, G: w, Math, Object, Array, JSON, String, Number });
const D = w.WXCS3_DATA;
const gcode = fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8');
const rcode = fs.readFileSync(path.join(ROOT, 'wxcs3-rules.js'), 'utf8');

function grab(name) {
  /* v9.0 第2步：纯函数已移入 wxcs3-rules.js，两边都要找 */
  const gcodeAll = gcode + '\n' + rcode;
  const i = gcodeAll.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('找不到 ' + name);
  let depth = 0, started = false, j = i;
  for (; j < gcode.length; j++) {
    const ch = gcode[j];
    if (ch === '{') { depth++; started = true; }
    else if (ch === '}') { depth--; if (started && depth === 0) { j++; break; } }
  }
  return gcodeAll.slice(i, j);
}

let S = { phase: 'play', year: 387, month: 3, turn: 0, xRealm: 1, xStage: 0, pillar: 0, pos: 0,
  hp: 100, hpMax: 100, guowei: null, tally: { kill: 0 }, stats: { heart: 10 },
  hooks: [], hooksGiven: [], npcs: {}, hooksSeen: 0 };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const isShen = () => false;
const LOG = [];
const logLine = (t) => LOG.push(t);
const esc = t => String(t);
let claimCalls = [];
const openHookClaim = h => claimCalls.push(h.id);

const src = ['hookDef', 'hookAll', 'hookUnsettled', 'pushHook', 'pushGiven',
  'hookDebuffIds', 'hasDebuff', 'hookIsDue', 'tickHooks'].map(grab).join('\n');
const sandbox = {
  D, clamp, isShen, logLine, esc, openHookClaim, rnd100: () => 99,
  HOOK_MAX: 3, HOOKS: D.HOOKS,
  /* hookDef / hookDebuffIds 已搬到 rules.js：它们被 game.js 的函数调用，
     但不在同一个闭包里了，必须显式传进沙箱。 */
  hookDef: (id) => (D.HOOKS || []).find(function (h) { return h.id === id; }) || null,
  get S() { return S; }, Math, Object, Array, JSON, Number, String,
  numOr: (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d,
  myRealmIdx: () => S.xRealm,
  _push: (id, o) => null
};
vm.runInNewContext(
  'const HOOK_MAX = 3;\n' + src +
  '\nthis.pushHook=pushHook;this.pushGiven=pushGiven;this.hookUnsettled=hookUnsettled;' +
  'this.hookDebuffIds=hookDebuffIds;this.hasDebuff=hasDebuff;this.hookIsDue=hookIsDue;' +
  'this.tickHooks=tickHooks;this.hookAll=hookAll;',
  sandbox);

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✘', name, extra || ''); }
}

console.log('=== 1. 记账与上限 ===');
sandbox.pushHook('hook_umbrella', {});
ok(S.hooks.length === 1, 'pushHook 记账 1 条');
ok(sandbox.hookUnsettled().length === 1, '未清 1 条');
sandbox.pushHook('hook_umbrella', {});
ok(S.hooks.length === 1, '同一钩子不重复入账');

sandbox.pushHook('hook_sword', {});
sandbox.pushHook('hook_tablet', {});
ok(S.hooks.length === 3, '满 3 条');
sandbox.pushHook('hook_pill', {});
ok(S.hooks.length === 4, '第 4 条仍入账');
ok(sandbox.hookUnsettled().length === 3, '未清被压回 3（最旧一笔被"平账"）');
ok(sandbox.hookUnsettled()[0].id !== 'hook_umbrella', '被平掉的是最旧的 hook_umbrella');

console.log('\n=== 2. 到期判定 ===');
S.hooks = []; S.xRealm = 1; S.year = 387;
sandbox.pushHook('hook_umbrella', {});          // due realm 4
ok(!sandbox.hookIsDue(S.hooks[0]), '练气时不到期（期=金丹）');
S.xRealm = 4;
ok(sandbox.hookIsDue(S.hooks[0]), '金丹时到期');

S.hooks = []; S.year = 387;
sandbox.pushHook('hook_tablet', {});            // due year 30
ok(!sandbox.hookIsDue(S.hooks[0]), '当年不到期');
S.year = 417;
ok(sandbox.hookIsDue(S.hooks[0]), '30 年后到期');

S.hooks = []; S.hp = 100; S.hpMax = 100;
sandbox.pushHook('hook_pill', {});              // due weak
ok(!sandbox.hookIsDue(S.hooks[0]), '满血不到期');
S.hp = 20;
ok(sandbox.hookIsDue(S.hooks[0]), '气血 20% 时到期');

console.log('\n=== 3. 月度推进：先给信，宽限三月，再上门 ===');
S.hooks = []; S.xRealm = 4; S.turn = 0; S.hp = 100; S.guowei = null; LOG.length = 0;
sandbox.pushHook('hook_umbrella', {});
claimCalls = [];
sandbox.tickHooks();
ok(claimCalls.length === 0, '到期当月不立刻上门');
ok(S.hooks[0].warned === true, '标记已提醒');
ok(/信要来了/.test(LOG.join('|')), '给出一句「有信要来了」');

S.turn = 1; sandbox.tickHooks();
ok(claimCalls.length === 0, '第 2 月仍宽限');
S.turn = 3; sandbox.tickHooks();
ok(claimCalls.length === 1 && claimCalls[0] === 'hook_umbrella', '第 4 月上门索债');
ok(S.hooks[0].overdue === true, '标记已到期');
ok(S.hookPending === 'hook_umbrella', '写下 pending（挡住奇遇）');

console.log('\n=== 4. debuff ===');
S.hooks = []; S.hookPending = null;
sandbox.pushHook('hook_umbrella', {});
ok(!sandbox.hasDebuff('karma_tangle'), '未到期无 debuff');
S.hooks[0].overdue = true; S.hooks[0].dueDebuff = 'karma_tangle';
ok(sandbox.hasDebuff('karma_tangle'), '到期后缠上因果');
S.hooks[0].refused = true; S.hooks[0].refuseDebuff = 'soul_lien';
ok(sandbox.hasDebuff('soul_lien'), '赖账后多一层神魂暗契');

S.hooks = []; S.hookPending = null;
sandbox.pushHook('hook_sword', {});
sandbox.pushHook('hook_tablet', {});
S.hooks[0].overdue = true; S.hooks[0].dueDebuff = 'karma_tangle';
S.hooks[1].overdue = true; S.hooks[1].dueDebuff = 'borrowed_luck';
ok(sandbox.hasDebuff('debt_weight'), '两条都超期 → 人情压身');

console.log('\n=== 5. 反向：别人欠你的 ===');
S.hooksGiven = [];
sandbox.pushGiven('濒死的修士', '救命之恩', 3, 25);
ok(S.hooksGiven.length === 1, '记下一个人情');
sandbox.pushGiven('濒死的修士', '救命之恩', 3, 25);
ok(S.hooksGiven.length === 1, '同一人不重复记');

console.log('\n=== 6. 数据表完整性 ===');
const kinds = new Set(D.HOOKS.map(h => h.due.kind));
ok(kinds.has('realm') && kinds.has('year') && kinds.has('kill') && kinds.has('weak') && kinds.has('guowei'),
  '五种「期」类型都有钩子用到：' + [...kinds].join('/'));
ok(D.HOOKS.every(h => h.claim && h.claim.want && h.claim.refuse), '每条钩子都有 索 与 拒');
ok(D.HOOKS.filter(h => h.known).length >= 4, '明钩 ' + D.HOOKS.filter(h => h.known).length + ' 条');
ok(D.HOOKS.filter(h => !h.known).length >= 3, '暗钩 ' + D.HOOKS.filter(h => !h.known).length + ' 条');
ok(D.HOOKS.every(h => h.hint), '每个钩子都有破绽（hint）');
ok(D.HOOK_DEBUFF.length === 5, '五条 debuff');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
