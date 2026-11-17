/* 运行：node tests/digit-logic.test.js —— 用暴力枚举检查「加一的秘密」 */
'use strict';
var assert = require('assert');
var D = require('../js/digit-logic.js');
var passed = 0;
function test(name, fn) { fn(); passed++; console.log('✓ ' + name); }
var LIMIT = Math.pow(10, D.WHEELS) - 1;   // 7 个数字轮能转出的最大数

test('加 1 时数字和变化 = 1 − 9 ×（末尾 9 的个数），对 0…10⁶ 每个数都成立', function () {
  for (var n = 0; n <= 1000000; n++) assert.strictEqual(D.change(n), 1 - 9 * D.trailingNines(n), String(n));
});

test('数字轮：数字 ↔ 数，来回不变', function () {
  [0, 7, 49999, 1234567, LIMIT].forEach(function (n) { assert.strictEqual(D.fromDigits(D.toDigits(n)), n); });
});

test('每一关的例子满足要求，起始数不满足', function () {
  D.LEVELS.filter(function (l) { return l.kind; }).forEach(function (l) {
    assert.ok(!D.check(l, l.start), 'start ' + l.start);
    if (l.example) { assert.ok(D.check(l, l.example)); assert.ok(l.example <= LIMIT); }
  });
});

test('第 2 关：少 17 ⇔ 末尾正好两个 9', function () {
  var lv = D.LEVELS[1];
  for (var n = 1; n <= 200000; n++) assert.strictEqual(D.check(lv, n), D.trailingNines(n) === 2);
});

test('第 3 关：变化是 5 的倍数 ⇔ 末尾 9 的个数是 4、9、14……', function () {
  var lv = D.LEVELS[2];
  for (var n = 1; n <= 1000000; n++) assert.strictEqual(D.check(lv, n), D.trailingNines(n) % 5 === 4);
});

/** 暴力找：7 个数字轮范围内，最小的 N 使 N、N+1 的数字和都是 m 的倍数 */
function smallestBoth(m) {
  var s = 0;   // s = N 的数字和，逐个递推
  for (var n = 1; n < LIMIT; n++) {
    s = D.digitSum(n);
    if (s % m === 0 && (s + D.change(n)) % m === 0) return n;
  }
  return null;
}

test('OMK 2016 B2：最小的一对是 49999 和 50000（暴力搜索）', function () {
  assert.strictEqual(smallestBoth(5), 49999);
  assert.ok(D.check(D.LEVELS[D.OLYMPIAD], 49999));
  assert.strictEqual(D.digitSum(49999), 40);
  assert.strictEqual(D.digitSum(50000), 5);
  assert.strictEqual(D.digitSum(50767), 25);   // 题目里的例子
});

test('官方答案的形式：77999999999 和 78000000000 也是一对', function () {
  var n = 77999999999;
  assert.strictEqual(D.digitSum(n) % 5, 0);
  assert.strictEqual(D.digitSum(n + 1) % 5, 0);
});

test('什么时候有「连续两个数的数字和都是 m 的倍数」：m 不是 3 的倍数就有（暴力核对 m = 2…13）', function () {
  for (var m = 2; m <= 13; m++) {
    var found = smallestBoth(m), ex = D.bothExample(m);
    if (found !== null) assert.ok(D.bothPossible(m), 'm = ' + m);
    if (!D.bothPossible(m)) { assert.strictEqual(ex, null); continue; }
    // 公式给出的例子一定成立（m = 10 时例子有 11 位，超出数字轮，但数学上照样成立）
    assert.ok(D.digitSum(ex) % m === 0 && D.digitSum(ex + 1) % m === 0, 'example for m = ' + m);
    if (ex <= LIMIT) assert.ok(found !== null && found <= ex, 'm = ' + m);
  }
});

test('想一想：7 和 11 有答案（例子在数字轮范围内），3 做不到；3 的理由：数字和除以 3 的余数和数本身一样', function () {
  var th = D.LEVELS.filter(function (l) { return l.ch === 'think'; });
  assert.deepStrictEqual(th.map(function (l) { return l.m; }), [7, 3, 11]);
  assert.ok(D.check(th[0], th[0].example) && D.check(th[2], th[2].example));
  assert.ok(!D.levelPossible(th[1]) && th[1].impossible);
  for (var n = 1; n <= 100000; n++) assert.strictEqual(D.digitSum(n) % 3, n % 3);
});

test('OMK 2016 Muda B2：数字和是质数——连续 3 个都是最早在 199；连续 5 个里 4 个最早在 197（暴力）', function () {
  function first(k, need) { for (var n = 1; n < 1000000; n++) if (D.primeCount(n, k) >= need) return n; return null; }
  assert.strictEqual(first(3, 3), 199);
  assert.strictEqual(first(5, 4), 197);
  assert.deepStrictEqual([197, 198, 199, 200, 201].map(D.digitSum), [17, 18, 19, 2, 3]);
  assert.deepStrictEqual([199, 200, 201, 202, 203].map(D.digitSum), [19, 2, 3, 4, 5]);   // 官方另一个例子
  assert.strictEqual(D.digitSum(3301), 7);                                                 // 题目里的例子
  var lv = D.LEVELS.filter(function (l) { return l.poly === 'dp2'; })[0];
  assert.ok(lv && D.check(lv, 197) && D.check(lv, 199) && !D.check(lv, lv.start));
});

test('不进位时数字和是连续的数，连续 3 个整数不可能都是质数，所以一定要用到进位', function () {
  for (var s = 1; s < 200; s++) assert.ok(!(D.isPrime(s) && D.isPrime(s + 1) && D.isPrime(s + 2)), 's = ' + s);
});

console.log('\n' + passed + ' tests passed');
