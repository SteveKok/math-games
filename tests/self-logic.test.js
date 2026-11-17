/* 运行：node tests/self-logic.test.js —— 用暴力枚举检查「自我介绍的数」 */
'use strict';
var assert = require('assert');
var S = require('../js/self-logic.js');
var passed = 0;
function test(name, fn) { fn(); passed++; console.log('✓ ' + name); }

/** 完全不剪枝：把所有 n 位数一个一个试（n ≤ 7） */
function bruteAll(n) {
  var out = [], lo = Math.pow(10, n - 1), hi = Math.pow(10, n);
  for (var x = lo; x < hi; x++) {
    var ds = String(x).split('').map(Number);
    if (S.isSelf(ds)) out.push(String(x));
  }
  return out;
}

test('题目里的例子 42101000、6210001000 是自传数；1211、1200 不是', function () {
  assert.ok(S.isSelf('42101000'.split('').map(Number)));
  assert.ok(S.isSelf('6210001000'.split('').map(Number)));
  assert.ok(!S.isSelf([1, 2, 1, 1]));
  assert.ok(!S.isSelf([1, 2, 0, 0]));
});

test('1 到 7 位：逐个试遍所有数，结果和剪枝搜索一致', function () {
  for (var n = 1; n <= 7; n++) assert.deepStrictEqual(bruteAll(n), S.allSelf(n), n + ' digits');
});

test('所有自传数：4 位 1210、2020；5 位 21200；6 位没有；7–10 位各一个', function () {
  var expect = { 1: [], 2: [], 3: [], 4: ['1210', '2020'], 5: ['21200'], 6: [], 7: ['3211000'], 8: ['42101000'], 9: ['521001000'], 10: ['6210001000'] };
  for (var n = 1; n <= 10; n++) assert.deepStrictEqual(S.allSelf(n), expect[n], n + ' digits');
});

test('OMK 2017 B2 的官方答案：(a) 1210、2020，(b) 21200', function () {
  var oly = S.LEVELS[S.OLYMPIAD];
  assert.deepStrictEqual(oly.parts.map(function (p) { return p.n; }), [4, 4, 5]);
  assert.deepStrictEqual(S.allSelf(4), ['1210', '2020']);
  assert.deepStrictEqual(S.allSelf(5), ['21200']);
});

test('剪枝规则成立：自传数的各位数字加起来 = 位数，而且 Σ i × 第 i 位 也 = 位数', function () {
  for (var n = 4; n <= 10; n++) S.allSelf(n).forEach(function (s) {
    var ds = s.split('').map(Number);
    assert.strictEqual(S.sum(ds), n);
    assert.strictEqual(ds.reduce(function (a, d, i) { return a + i * d; }, 0), n);
  });
});

test('每一关：做得到的关恰好一个答案（锁定的格子也对得上），做不到的关真的没有', function () {
  S.LEVELS.forEach(function (lv) {
    if (!lv.n) return;
    var all = S.allSelf(lv.n);
    if (lv.impossible) { assert.strictEqual(all.length, 0, lv.n + ' digits'); return; }
    assert.strictEqual(all.length, 1, lv.n + ' digits');
    Object.keys(lv.fixed || {}).forEach(function (i) { assert.strictEqual(Number(all[0][i]), lv.fixed[i]); });
  });
});

console.log('\n' + passed + ' tests passed');
