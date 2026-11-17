/* 运行：node tests/plus-logic.test.js —— 用暴力枚举 / 动态规划检查「加号游戏」 */
'use strict';
var assert = require('assert');
var Q = require('../js/plus-logic.js');
var passed = 0;
function test(name, fn) { fn(); passed++; console.log('✓ ' + name); }

/** 完全暴力：N 个 1 的 2^(N−1) 种放加号方式全部试一遍 */
function bruteRange(n, s) {
  var lo = null, hi = null;
  for (var mask = 0; mask < (1 << (n - 1)); mask++) {
    var gaps = [];
    for (var i = 0; i < n - 1; i++) gaps.push((mask >> i) & 1);
    var ev = Q.evalBlocks(Q.blocksFromGaps(n, gaps));
    if (ev.sum !== s) continue;
    if (lo === null || ev.pluses < lo) lo = ev.pluses;
    if (hi === null || ev.pluses > hi) hi = ev.pluses;
  }
  return lo === null ? null : { min: lo, max: hi };
}

/** 动态规划（和公式无关）：best[i][t] = 用前 i 个 1 凑出 t 时段数的最小/最大值；段最长 4 */
function dpRange(n, s) {
  var NEG = -1, INF = 1e9;
  var mx = [new Int32Array(s + 1).fill(NEG)], mn = [new Int32Array(s + 1).fill(INF)];
  mx[0][0] = 0; mn[0][0] = 0;
  for (var i = 1; i <= n; i++) {
    var a = new Int32Array(s + 1).fill(NEG), b = new Int32Array(s + 1).fill(INF);
    for (var k = 1; k <= 4 && k <= i; k++) {
      var v = Q.repunit(k), pa = mx[i - k], pb = mn[i - k];
      for (var t = v; t <= s; t++) {
        if (pa[t - v] >= 0 && pa[t - v] + 1 > a[t]) a[t] = pa[t - v] + 1;
        if (pb[t - v] < INF && pb[t - v] + 1 < b[t]) b[t] = pb[t - v] + 1;
      }
    }
    mx.push(a); mn.push(b);
    if (i > 4) { mx[i - 5] = null; mn[i - 5] = null; }   // 只留最近几行，省内存
  }
  return mx[n][s] < 0 ? null : { min: mn[n][s] - 1, max: mx[n][s] - 1 };
}

test('一段 k 个 1 的值 − k 是 9 的倍数：0、9、108、1107', function () {
  assert.deepStrictEqual([1, 2, 3, 4].map(function (k) { return Q.repunit(k) - k; }), [0, 9, 108, 1107]);
});

test('公式 = 暴力：N ≤ 16 的每个目标（所有放法逐个试）', function () {
  for (var n = 2; n <= 16; n++) {
    var seen = {};
    for (var mask = 0; mask < (1 << (n - 1)); mask += 7) {
      var gaps = []; for (var i = 0; i < n - 1; i++) gaps.push((mask >> i) & 1);
      var b = Q.blocksFromGaps(n, gaps);
      if (Math.max.apply(null, b) <= 4) seen[Q.evalBlocks(b).sum] = true;
    }
    Object.keys(seen).forEach(function (s) { assert.deepStrictEqual(Q.plusRange(n, +s), bruteRange(n, +s), n + ' → ' + s); });
    [n + 1, n + 9, n + 40].forEach(function (s) { assert.deepStrictEqual(Q.plusRange(n, s), bruteRange(n, s), n + ' → ' + s); });
  }
});

test('每一关：公式 = 动态规划（包括 2018 个 1 凑 8102）', function () {
  Q.LEVELS.filter(function (l) { return l.n; }).forEach(function (l) {
    assert.deepStrictEqual(Q.plusRange(l.n, l.s), dpRange(l.n, l.s), l.n + ' → ' + l.s);
  });
});

test('OMK 2018 B3：2018 个 1 凑 8102，加号最多 1991 个；五个 1111、五个 111、一个 11', function () {
  var lv = Q.LEVELS[Q.OLYMPIAD];
  assert.ok(lv.olympiad && lv.n === 2018 && lv.s === 8102);
  assert.strictEqual(Q.plusRange(2018, 8102).max, 1991);
  assert.deepStrictEqual(Q.solution(2018, 8102, 'max'), [1, 5, 5]);
  var f = Q.fromCounts(2018, 1, 5, 5), ev = Q.evaluate(f.c);
  assert.deepStrictEqual([f.ones, ev.sum, ev.pluses], [1981, 8102, 1991]);
});

test('每一关的设计意图成立', function () {
  var L = Q.LEVELS;
  assert.deepStrictEqual(Q.plusRange(6, 24), { min: 3, max: 3 });                 // 热身：只有一种
  assert.deepStrictEqual(Q.plusRange(30, 138), { min: 17, max: 27 });             // 用 111 比用十二个 11 多 10 个加号
  assert.strictEqual(Q.plusRange(10, 50), null);                                   // 50 − 10 = 40 不是 9 的倍数
  assert.strictEqual((50 - 10) % 9 !== 0, true);
  assert.strictEqual(Q.plusRange(100, 1315).max, 94);
  assert.strictEqual(Q.plusRange(40, 1147).max, 36);
  assert.strictEqual(Q.plusRange(20, 2018), null);                                 // 9 的倍数，可是 1 不够用
  assert.strictEqual((2018 - 20) % 9, 0);
  L.forEach(function (l) { if (l.n) assert.strictEqual(Q.levelPossible(l), !l.impossible, l.n + ' → ' + l.s); });
});

test('看答案给出的放法确实满足要求', function () {
  Q.LEVELS.filter(function (l) { return l.n && !l.impossible; }).forEach(function (l) {
    var c = Q.solution(l.n, l.s, l.goal), f = Q.fromCounts(l.n, c[0], c[1], c[2]);
    assert.strictEqual(Q.judge(l, Q.evaluate(f.c)), 'ok', l.n + ' → ' + l.s);
  });
});

console.log('\n' + passed + ' tests passed');
