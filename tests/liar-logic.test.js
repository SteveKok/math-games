// 运行：node tests/liar-logic.test.js
// 用一个独立写的「逐句翻译成真假」的求解器，交叉验证生成的每道题都只有唯一答案。
'use strict';
const assert = require('assert');
const Liar = require('../js/liar-logic.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; }
}

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 独立实现：把每句话翻译成「关于诚实者集合」的命题（用集合而不是布尔数组）
function truthOf(st, speaker, honestSet, n) {
  const H = x => honestSet.has(x);
  const liarCount = n - honestSet.size;
  return {
    isH: () => H(st.a), isL: () => !H(st.a),
    same: () => H(speaker) === H(st.a), diff: () => H(speaker) !== H(st.a),
    bothH: () => H(st.a) && H(st.b), bothL: () => !H(st.a) && !H(st.b),
    eitherH: () => H(st.a) || H(st.b), eitherL: () => !H(st.a) || !H(st.b),
    countL: () => liarCount === st.n, atLeastL: () => liarCount > 0
  }[st.type]();
}
function independentSolve(sts) {
  const n = sts.length, sols = [];
  // 递归枚举所有子集
  (function rec(i, set) {
    if (i === n) {
      // 诚实的人说真话，说谎的人说假话
      if (sts.every((st, k) => truthOf(st, k, set, n) === set.has(k))) sols.push([...Array(n)].map((_, k) => set.has(k)));
      return;
    }
    rec(i + 1, set);
    const s2 = new Set(set); s2.add(i); rec(i + 1, s2);
  })(0, new Set());
  return sols;
}

console.log('Liars & Truth-tellers logic');

test('经典例子：A 说「我们当中至少一个说谎」→ A 诚实、B 说谎', () => {
  // A 若说谎，「至少一个说谎」就成真了，矛盾 → A 诚实 → B 必须说谎
  assert.deepStrictEqual(Liar.solve([{ type: 'atLeastL' }, { type: 'isL', a: 0 }]), [[true, false]]);
});

test('「我和 X 一样」→ X 一定诚实；「我和 X 不一样」→ X 一定说谎', () => {
  for (const sp of [true, false]) {
    for (const x of [true, false]) {
      const h = [sp, x];
      if (h[0] === Liar.evaluate({ type: 'same', a: 1 }, 0, h)) assert.strictEqual(x, true);
      if (h[0] === Liar.evaluate({ type: 'diff', a: 1 }, 0, h)) assert.strictEqual(x, false);
    }
  }
});

test('每一关生成 300 道题：都唯一解，且与独立求解器一致', () => {
  const rand = rng(2026);
  Liar.LEVELS.forEach((lv, li) => {
    for (let k = 0; k < 300; k++) {
      const p = Liar.generate(lv, rand);
      const ind = independentSolve(p.statements);
      assert.strictEqual(ind.length, 1, 'level ' + (li + 1) + ' not unique: ' + JSON.stringify(p.statements));
      assert.deepStrictEqual(ind[0], p.solution);
      assert.deepStrictEqual(Liar.solve(p.statements), ind);
    }
  });
});

test('生成的每句话都合法、只用本关允许的句式，且必用句式出现', () => {
  const rand = rng(7);
  Liar.LEVELS.forEach((lv) => {
    for (let k = 0; k < 200; k++) {
      const p = Liar.generate(lv, rand);
      assert.strictEqual(p.statements.length, lv.n);
      p.statements.forEach((st, i) => {
        assert.ok(Liar.isValidStatement(st, i, lv.n), JSON.stringify(st));
        assert.ok(lv.types.includes(st.type));
      });
      if (lv.mustUse) assert.ok(p.statements.some(s => lv.mustUse.includes(s.type)));
      const L = p.solution.filter(x => !x).length;
      assert.ok(L > 0 && L < lv.n, '诚实和说谎的人都要有');
    }
  });
});

test('check()：只有正确答案让每个人都说得通', () => {
  const rand = rng(99);
  for (let k = 0; k < 300; k++) {
    const lv = Liar.LEVELS[k % Liar.LEVELS.length];
    const p = Liar.generate(lv, rand);
    for (let m = 0; m < (1 << lv.n); m++) {
      const h = [...Array(lv.n)].map((_, i) => !!(m & (1 << i)));
      const ok = Liar.check(p.statements, h).every(Boolean);
      assert.strictEqual(ok, JSON.stringify(h) === JSON.stringify(p.solution));
    }
  }
});

test('关卡循序渐进：2 人 → 3 人 → 4 人', () => {
  const ns = Liar.LEVELS.map(l => l.n);
  for (let i = 1; i < ns.length; i++) assert.ok(ns[i] >= ns[i - 1]);
  assert.deepStrictEqual([...new Set(ns)], [2, 3, 4]);
});

console.log(passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));
