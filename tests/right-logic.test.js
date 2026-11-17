/* 运行：node tests/right-logic.test.js —— 检查「找直角」的每一个数 */
'use strict';
var assert = require('assert');
var R = require('../js/right-logic.js');
var passed = 0;
function test(name, fn) { fn(); passed++; console.log('✓ ' + name); }

test('勾股关卡：答案是整数，且 a² + b² = c²', function () {
  R.LEVELS.filter(function (l) { return l.ch === 'pyth'; }).forEach(function (l) {
    var ans = R.pythAnswer(l);
    assert.ok(Number.isInteger(ans), JSON.stringify(l));
    var a = l.a, b = l.find === 'b' ? ans : l.b, c = l.find === 'c' ? ans : l.c;
    assert.strictEqual(a * a + b * b, c * c);
    assert.notStrictEqual(l.start, ans);
  });
  assert.deepStrictEqual(R.LEVELS.filter(function (l) { return l.ch === 'pyth'; }).map(R.pythAnswer), [5, 13, 65, 29, 24]);
});

test('∠DEF = 90° ⇔ x(x + FC) = AE·EB，和直接量角度一致', function () {
  R.LEVELS.filter(function (l) { return l.ch === 'angle'; }).forEach(function (l) {
    for (var x = 1; x <= l.max; x++) {
      var deg = R.angleDEF(l, x);
      assert.strictEqual(R.isRight(l, x), Math.abs(deg - 90) < 1e-9, 'x = ' + x);
      if (!R.isRight(l, x)) assert.ok(Math.abs(deg - 90) > 0.05, 'not visibly 90 at x = ' + x);
    }
  });
});

test('找直角关卡：在滑块范围内恰好有一个 x 让 ∠DEF = 90°，起点不是它', function () {
  R.LEVELS.filter(function (l) { return l.ch === 'angle'; }).forEach(function (l) {
    var hits = [];
    for (var x = 1; x <= l.max; x++) if (R.isRight(l, x)) hits.push(x);
    assert.strictEqual(hits.length, 1, JSON.stringify(l));
    assert.strictEqual(hits[0], R.rightX(l));
    assert.notStrictEqual(l.start, hits[0]);
  });
});

test('暴力：OMK 2016 Muda B1 —— 0.01 一格扫过 BF，只有 BF = 20 是直角；三边 39、52、65，周长 156', function () {
  var lv = R.LEVELS[R.OLYMPIAD];
  assert.ok(lv.olympiad && lv.AE === 15 && lv.EB === 48 && lv.FC === 16);
  var best = null;
  for (var i = 1; i <= 100000; i++) {
    var x = i / 100, d = Math.abs(R.angleDEF(lv, x) - 90);
    if (!best || d < best.d) best = { x: x, d: d };
  }
  assert.strictEqual(best.x, 20);
  var s = R.sides(lv, 20);
  assert.deepStrictEqual([R.sideLength(s.DE), R.sideLength(s.EF), R.sideLength(s.FD)], [39, 52, 65]);
  assert.strictEqual(39 + 52 + 65, 156);
  // 两个角落的三角形形状相同：AD / AE = EB / BF
  assert.strictEqual((20 + 16) * 20, 15 * 48);
});

test('要找三条边的关卡：三条边都是整数', function () {
  R.LEVELS.filter(function (l) { return l.lengths; }).forEach(function (l) {
    var x = R.rightX(l), s = R.sides(l, x);
    ['DE', 'EF', 'FD'].forEach(function (k) { assert.ok(Number.isInteger(R.sideLength(s[k])), k + ' ' + JSON.stringify(l)); });
  });
  var t = R.LEVELS.filter(function (l) { return l.key === 'rex1'; })[0], s1 = R.sides(t, R.rightX(t));
  assert.deepStrictEqual([R.rightX(t), R.sideLength(s1.DE), R.sideLength(s1.EF), R.sideLength(s1.FD)], [9, 20, 15, 25]);
});

test('三角形 DEF 本身也是直角三角形：DE² + EF² = FD²（检查数据没写错）', function () {
  R.LEVELS.filter(function (l) { return l.lengths; }).forEach(function (l) {
    var s = R.sides(l, R.rightX(l)), de = R.sideLength(s.DE), ef = R.sideLength(s.EF), fd = R.sideLength(s.FD);
    assert.strictEqual(de * de + ef * ef, fd * fd);
  });
});

test('关卡顺序：拼正方形 → 找直角 → 真题 → 定理 → 想一想', function () {
  assert.deepStrictEqual(R.LEVELS.map(R.chapterOf), ['pyth', 'pyth', 'pyth', 'angle', 'angle', 'oly', 'read', 'think', 'think', 'think']);
});

console.log('\n' + passed + ' tests passed');
