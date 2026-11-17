/* 运行：node tests/stick-logic.test.js —— 检查「小棒拼正方形」 */
'use strict';
var assert = require('assert');
var S = require('../js/stick-logic.js');
var passed = 0;
function test(name, fn) { fn(); passed++; console.log('✓ ' + name); }

/** 和关卡代码完全无关的暴力：把每根小棒分给 sides 条边的所有方式都试（sides^n 种），看有没有每边一样长的 */
function brute(n, sides) {
  var t = n * (n + 1) / 2;
  if (t % sides) return false;
  var target = t / sides, total = Math.pow(sides, n);
  for (var code = 0; code < total; code++) {
    var fill = new Array(sides).fill(0), x = code;
    for (var k = 1; k <= n; k++) { fill[x % sides] += k; x = Math.floor(x / sides); }
    if (fill.every(function (f) { return f === target; })) return true;
  }
  return false;
}
function checkGroups(n, sides, groups) {
  var used = [].concat.apply([], groups).sort(function (a, b) { return a - b; });
  assert.deepStrictEqual(used, Array.from({ length: n }, function (_, i) { return i + 1; }), 'every stick used once');
  var s = S.sideLen(n, sides);
  groups.forEach(function (g) { assert.strictEqual(g.reduce(function (a, b) { return a + b; }, 0), s); });
}

test('正方形：n = 1…10 把所有分法逐个试，和公式一致', function () {
  for (var n = 1; n <= 10; n++) assert.strictEqual(S.possible(n, 4), brute(n, 4), 'n = ' + n);
});

test('等边三角形：n = 1…13 把所有分法逐个试，和公式一致', function () {
  for (var n = 1; n <= 13; n++) assert.strictEqual(S.possible(n, 3), brute(n, 3), 'n = ' + n);
});

test('正方形：n = 1…60 用搜索真的拼出来，和公式一致', function () {
  for (var n = 1; n <= 60; n++) {
    var g = S.search(n, 4);
    assert.strictEqual(g !== null, S.possible(n, 4), 'n = ' + n);
    if (g) checkGroups(n, 4, g);
  }
});

test('官方的配对拼法对每个能拼的 n（到 2018）都成立', function () {
  for (var n = 1; n <= 2018; n++) {
    var g = S.pairing(n);
    assert.strictEqual(g !== null, S.possible(n, 4));
    if (g) checkGroups(n, 4, g);
  }
});

test('能拼 ⇔ n 除以 8 余 0 或 7（n ≥ 7）', function () {
  for (var n = 1; n <= 2018; n++) assert.strictEqual(S.possible(n, 4), n % 8 === 0 || n % 8 === 7);
});

test('OMK 2018 Muda B1：1 ≤ n ≤ 2018 里有 504 个（252 + 252）', function () {
  var lv = S.LEVELS[S.OLYMPIAD];
  assert.ok(lv.olympiad && lv.upTo === 2018);
  assert.strictEqual(S.answerOf(lv), 504);
  var a = 0, b = 0;
  for (var n = 1; n <= 2018; n++) { if (n % 8 === 0) a++; if (n % 8 === 7) b++; }
  assert.deepStrictEqual([a, b], [252, 252]);
});

test('每一关的设计意图：8、7、15、16 能拼，5 不能；1…24 里是 7、8、15、16、23、24；1…100 有 24 个；三角形最小 n = 5', function () {
  [8, 7, 15, 16].forEach(function (n) { assert.ok(S.possible(n, 4)); });
  assert.ok(!S.possible(5, 4));
  var picks = []; for (var n = 1; n <= 24; n++) if (S.possible(n, 4)) picks.push(n);
  assert.deepStrictEqual(picks, [7, 8, 15, 16, 23, 24]);
  assert.strictEqual(S.countUpTo(100, 4), 24);
  assert.strictEqual(S.smallest(3), 5);
  // 三角形的 n = 2、3：总长能被 3 整除，可是最长的小棒比边长还长
  assert.ok(S.sideLen(2, 3) !== null && S.sideLen(2, 3) < 2);
  assert.ok(S.sideLen(3, 3) !== null && S.sideLen(3, 3) < 3);
});

console.log('\n' + passed + ' tests passed');
