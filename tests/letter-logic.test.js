/* 运行：node tests/letter-logic.test.js —— 检查「字母转转乐」 */
'use strict';
var assert = require('assert');
var L = require('../js/letter-logic.js');
var passed = 0;
function test(name, fn) { fn(); passed++; console.log('✓ ' + name); }

function isPermutation(lv) { return lv.letters.split('').sort().join('') === lv.images.split('').sort().join(''); }
var playable = L.LEVELS.filter(function (l) { return l.letters; });

test('每一关的替换规则都是「换来换去」（每个字母正好出现一次）', function () {
  playable.forEach(function (l) { assert.ok(isPermutation(l), l.letters + ' → ' + l.images); });
});

test('公式（圈长的最小公倍数）= 一天天模拟', function () {
  playable.forEach(function (l) { assert.strictEqual(L.order(l), L.simulate(l), l.images); });
});

test('随机打乱 2000 次：公式 = 模拟', function () {
  var seed = 3;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  for (var k = 0; k < 2000; k++) {
    var n = 1 + Math.floor(rnd() * 12), letters = 'ABCDEFGHIJKL'.slice(0, n).split(''), img = letters.slice();
    for (var i = n - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = img[i]; img[i] = img[j]; img[j] = t; }
    var lv = { letters: letters.join(''), images: img.join('') };
    assert.strictEqual(L.order(lv), L.simulate(lv));
  }
});

test('OMK 2017 Muda A6：圈长 3、4、2、1，8 月 12 日第一次回到原样', function () {
  var lv = L.LEVELS[L.OLYMPIAD];
  assert.ok(lv.olympiad && lv.letters === 'ABCDEFGHIJ' && lv.images === 'GIABJDCHFE');
  assert.deepStrictEqual(L.cycles(lv).map(function (c) { return c.length; }).sort(), [1, 2, 3, 4]);
  assert.strictEqual(L.order(lv), 12);
  assert.strictEqual(L.boardOn(lv, 12).join(''), 'ABCDEFGHIJ');
  for (var d = 1; d < 12; d++) assert.notStrictEqual(L.boardOn(lv, d).join(''), 'ABCDEFGHIJ');
});

test('每一关的设计意图：4、6、10、12（不是 24）、60', function () {
  assert.deepStrictEqual(playable.map(L.order), [4, 6, 10, 12, 12, 60]);
  var l4 = L.LEVELS[3];
  assert.deepStrictEqual(L.cycles(l4).map(function (c) { return c.length; }), [4, 6]);
  assert.strictEqual(L.boardOn(l4, 24).join(''), l4.letters);   // 24 天也回来，但不是第一次
});

test('想一想 2：10 个字母最多要等 30 天（2 + 3 + 5 = 10，2 × 3 × 5 = 30），逐个拆法试过', function () {
  assert.strictEqual(L.longestWait(10), 30);
  // 暴力：10 个字母的所有排列太多，改用「所有把 10 拆成圈长的方法」逐个算最小公倍数
  var best = 0;
  (function go(left, max, m) {
    if (left === 0) { if (m > best) best = m; return; }
    for (var p = Math.min(left, max); p >= 1; p--) go(left - p, p, L.lcm(m, p));
  })(10, 10, 1);
  assert.strictEqual(best, 30);
  assert.strictEqual(L.answerOf(L.LEVELS.filter(function (l) { return l.key === 'ltex2'; })[0]), 30);
});

test('天干地支：一年走一格，第 60 年第一次回到甲子（不是 120 年）', function () {
  assert.strictEqual(L.STEMS.length, 10);
  assert.strictEqual(L.BRANCHES.length, 12);
  assert.strictEqual(L.ganzhiCycle(), 60);
  var first = null;
  for (var k = 1; k <= 200; k++) { var g = L.ganzhi(k); if (g.stem === 0 && g.branch === 0) { first = k; break; } }
  assert.strictEqual(first, 60);
  var last = L.LEVELS[L.LEVELS.length - 1];
  assert.ok(last.mode === 'ganzhi' && L.answerOf(last) === 60);
});

test('天干地支：120 种配法里只出现 60 种——单数只配单数、双数只配双数', function () {
  var seen = {};
  for (var k = 0; k < 600; k++) {
    var g = L.ganzhi(k);
    seen[g.stem + ',' + g.branch] = true;
    assert.strictEqual(g.stem % 2, g.branch % 2);
  }
  assert.strictEqual(Object.keys(seen).length, 60);
});

test('天干地支：1984 甲子、2024 甲辰（龙）、2026 丙午（马）', function () {
  assert.strictEqual(L.ganzhiOfYear(1984), '甲子');
  assert.strictEqual(L.ganzhiOfYear(2024), '甲辰');
  assert.strictEqual(L.ganzhiOfYear(2026), '丙午');
  assert.strictEqual(L.ganzhiOfYear(2044), '甲子');
});

console.log('\n' + passed + ' tests passed');
