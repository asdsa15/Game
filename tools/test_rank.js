// 位阶换算与敌人生成的数值自检（不依赖 DOM）
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const vm = require('vm');

const w = {};
const dcode = fs.readFileSync(path.join(ROOT, 'wxcs3-data.js'), 'utf8');
vm.runInNewContext(dcode, { window: w, G: w, Math, Object, Array, JSON, String, Number });
const D = w.WXCS3_DATA;

const gcode = fs.readFileSync(path.join(ROOT, 'wxcs3-game.js'), 'utf8');

// 从源码里抽出纯函数（保持与运行时代码一致，不重写）
function grab(name) {
  const i = gcode.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('找不到 ' + name);
  let depth = 0, started = false, j = i;
  for (; j < gcode.length; j++) {
    const ch = gcode[j];
    if (ch === '{') { depth++; started = true; }
    else if (ch === '}') { depth--; if (started && depth === 0) { j++; break; } }
  }
  return gcode.slice(i, j);
}

let S = { xRealm: 0, xStage: 0, pillar: 0, pos: 0 };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const isShen = () => false;

const src = ['rankBaseXian', 'positionRank', 'realmIdxRank', 'stageIdxRank', 'myRealmIdx', 'realmGap']
  .map(grab).join('\n');
const sandbox = { D, clamp, isShen, get S() { return S; }, Math, Object };
vm.runInNewContext(src + '\nthis.positionRank=positionRank;this.realmIdxRank=realmIdxRank;this.stageIdxRank=stageIdxRank;this.realmGap=realmGap;this.rankBaseXian=rankBaseXian;', sandbox);

const base = sandbox.rankBaseXian();
console.log('各境起始 rank:', base.join(' / '));
console.log('（胎息 6 阶 / 练气 9 阶 / 筑基 4 阶 / 紫府 3 阶 / 金丹 1 / 道胎 1）\n');

let bad = 0;
const names = D.XIAN_REALMS.map(r => r.name);
console.log('=== 正向：每境每阶的 rank 与还原 ===');
D.XIAN_REALMS.forEach((r, ri) => {
  (r.stages || []).forEach((st, si) => {
    S.xRealm = ri; S.xStage = si;
    const rk = sandbox.positionRank();
    const backR = sandbox.realmIdxRank(rk), backS = sandbox.stageIdxRank(rk);
    const ok = backR === ri && backS === si;
    if (!ok) { bad++; console.log('  ✗', r.name, st, '→ rank', rk, '还原', names[backR], D.XIAN_REALMS[backR].stages[backS]); }
  });
});
console.log(bad === 0 ? '  ✔ 全部可逆（无错位）' : '  ✗ 有 ' + bad + ' 处错位');

console.log('\n=== 旧算法 vs 新算法（练气九层为例）===');
S.xRealm = 1; S.xStage = 8;
const newRank = sandbox.positionRank();
const oldRank = 1 * 4 + 8;
console.log('  练气九层：旧 rank', oldRank, '→ 旧查表境界', D.XIAN_REALMS[Math.floor(oldRank / 4)].name,
  '(战力', D.XIAN_REALMS[Math.floor(oldRank / 4)].power + ')');
console.log('           新 rank', newRank, '→ 新查表境界', D.XIAN_REALMS[sandbox.realmIdxRank(newRank)].name,
  '(战力', D.XIAN_REALMS[sandbox.realmIdxRank(newRank)].power + ')');
console.log('  玩家战力（练气）:', D.XIAN_REALMS[1].power);

console.log('\n=== 新敌人生成：R 分布（10000 次模拟）===');
function simulate(isCounter, myRealm, myPow) {
  const maxRealm = D.XIAN_REALMS.length - 1;
  let up = Math.random() < 0.28 ? 1 : 0;
  if (isCounter) up = 1;
  const foeRealm = clamp(myRealm + up, 0, maxRealm);
  const realmPower = D.XIAN_REALMS[foeRealm].power;
  let lo = isCounter ? 1.25 : 0.55, hi = isCounter ? 2.00 : 1.55;
  let foePower = Math.round(myPow * (lo + Math.random() * Math.max(0.05, hi - lo)));
  foePower = Math.max(1, Math.min(foePower, Math.round(realmPower * 1.0)));
  return { R: myPow / foePower, up: foeRealm - myRealm, foePower };
}
[['胎息', 0, 8], ['练气九层', 1, 25], ['筑基', 2, 90], ['紫府', 3, 350], ['金丹', 4, 1500]].forEach(([nm, ri, pw]) => {
  [false, true].forEach(cnt => {
    let minR = 9, maxR = 0, maxUp = 0, deaths = 0;
    for (let i = 0; i < 10000; i++) {
      const o = simulate(cnt, ri, pw);
      minR = Math.min(minR, o.R); maxR = Math.max(maxR, o.R);
      maxUp = Math.max(maxUp, o.up);
      if (o.R < 0.4) deaths++;
    }
    console.log(`  ${nm.padEnd(6)} ${cnt ? '仇家' : '机缘'}  R∈[${minR.toFixed(2)}, ${maxR.toFixed(2)}]  最大跨境 ${maxUp}  绝境(R<0.4)占比 ${(deaths / 100).toFixed(1)}%`);
  });
});

console.log('\n=== 旧算法同场景（练气九层遇敌）===');
{
  const myR = 12;
  for (const cnt of [false, true]) {
    const foeR = myR + (Math.random() < 0.3 ? 1 : 0) + (cnt ? 2 : 0);
    const fp = D.XIAN_REALMS[clamp(Math.floor(foeR / 4), 0, 5)].power;
    console.log(`  ${cnt ? '仇家' : '机缘'}：foeR=${foeR} → ${D.XIAN_REALMS[clamp(Math.floor(foeR / 4), 0, 5)].name} 战力 ${fp}，R=${(25 / fp).toFixed(3)} ${25 / fp < 0.4 ? '← 绝境/必死' : ''}`);
  }
}
