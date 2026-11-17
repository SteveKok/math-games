/* 运行：node tests/pigeon-logic.test.js —— 用暴力枚举检查每一条数学结论 */
'use strict';
var assert = require('assert');
var P = require('../js/pigeon-logic.js');
var passed = 0;
function test(name, fn) { fn(); passed++; console.log('✓ ' + name); }

/** 把 total 拆成 parts 个非负整数（有序）的所有方法 */
function compositions(total, parts, cb, prefix) {
  prefix = prefix || [];
  if (parts === 1) { cb(prefix.concat([total])); return; }
  for (var i = 0; i <= total; i++) compositions(total - i, parts - 1, cb, prefix.concat([i]));
}
function allDifferent(a) { return new Set(a).size === a.length; }

test('鸽子窝：能否放下 = 暴力枚举所有摆法', function () {
  for (var items = 0; items <= 10; items++) for (var boxes = 1; boxes <= 5; boxes++) for (var cap = 1; cap <= 3; cap++) {
    var ok = false;
    compositions(items, boxes, function (c) { if (P.nestSolved(c, items, cap)) ok = true; });
    assert.strictEqual(P.nestPossible(items, boxes, cap), ok, items + '/' + boxes + '/' + cap);
  }
});

test('鸽子窝：一直按提示放，做得到的关一定能放好', function () {
  P.LEVELS.filter(function (l) { return l.ch === 'nest'; }).forEach(function (l) {
    var c = new Array(l.boxes).fill(0);
    for (var k = 0; k < l.items; k++) {
      var h = P.nestHint(c, l.cap);
      if (h < 0) break;
      c[h]++;
    }
    assert.strictEqual(P.nestSolved(c, l.items, l.cap), P.levelPossible(l));
  });
});

test('都不一样多：能否做到 = 暴力枚举所有分法，最少要 0+1+…+(n−1) 颗', function () {
  for (var kids = 1; kids <= 6; kids++) for (var s = 0; s <= 25; s++) {
    var ok = false;
    compositions(s, kids, function (a) { if (allDifferent(a)) ok = true; });
    assert.strictEqual(P.distinctPossible(kids, s), ok, kids + ' kids, ' + s + ' sweets');
    var ex = P.distinctExample(kids, s);
    if (ok) assert.ok(P.distinctSolved(ex, s), 'example works'); else assert.strictEqual(ex, null);
  }
});

test('一样多的人能被标出来', function () {
  assert.deepStrictEqual(P.sameIndexes([1, 2, 1, 3]), [0, 2]);
  assert.deepStrictEqual(P.sameIndexes([0, 1, 2]), []);
  assert.ok(P.distinctSolved([0, 1, 5], 6));
  assert.ok(!P.distinctSolved([0, 1, 4], 6));
});

/** 能不能找到 n 个互不相同的非负整数，加起来正好是 s（从小到大逐个试） */
function distinctSetExists(n, s, from) {
  from = from || 0;
  if (n === 0) return s === 0;
  for (var v = from; v <= s; v++) if (distinctSetExists(n - 1, s - v, v + 1)) return true;
  return false;
}

test('最少几个人一定撞 = 暴力搜索（糖 0…60 颗），不用公式', function () {
  for (var s = 0; s <= 60; s++) {
    var n = 1;
    while (distinctSetExists(n, s)) n++;
    assert.strictEqual(P.leastKids(s), n, s + ' sweets');
  }
  // 小范围再和「枚举所有分法」对一遍
  for (var s2 = 0; s2 <= 12; s2++) for (var k = 1; k <= 5; k++) {
    var avoid = false;
    compositions(s2, k, function (a) { if (allDifferent(a)) avoid = true; });
    assert.strictEqual(avoid, distinctSetExists(k, s2));
  }
});

test('OMK 2016 Bongsu B3：1000 颗糖，答案 46', function () {
  assert.strictEqual(P.leastKids(1000), 46);
  assert.strictEqual(P.minDistinct(45), 990);   // 45 人还能都不一样
  assert.strictEqual(P.minDistinct(46), 1035);  // 46 人一定撞
  assert.deepStrictEqual(P.distinctExample(45, 1000).slice(-2), [43, 54]);
  var oly = P.LEVELS[P.OLYMPIAD];
  assert.ok(oly.olympiad && oly.sweets === 1000);
  assert.strictEqual(P.LEVELS.filter(function (l) { return l.olympiad; }).length, 1);
});

test('关卡：每章都有做得到和做不到的关，第三章答案合理', function () {
  ['nest', 'distinct'].forEach(function (ch) {
    var ls = P.LEVELS.filter(function (l) { return l.ch === ch; });
    assert.ok(ls.some(P.levelPossible) && ls.some(function (l) { return !P.levelPossible(l); }), ch);
  });
  // 「都不一样多」第一关：不用 0 就做不到（1+2+3+4 = 10 > 9），逼孩子发现 0 也算
  var d1 = P.LEVELS.filter(function (l) { return l.ch === 'distinct'; })[0];
  var withoutZero = false;
  compositions(d1.sweets, d1.kids, function (a) { if (allDifferent(a) && a.indexOf(0) < 0) withoutZero = true; });
  assert.ok(P.levelPossible(d1) && !withoutZero);
  assert.deepStrictEqual(P.LEVELS.filter(function (l) { return l.ch === 'least'; }).map(function (l) { return P.leastKids(l.sweets); }), [7, 12, 46]);
});

test('额外题 1：三色袜子，拿 4 只一定成双，3 只不一定', function () {
  var e = P.EXTRA.socks;
  function alwaysPair(k) {
    var ok = true;
    compositions(k, e.colors, function (c) { if (c.every(function (x) { return x <= e.each; }) && c.every(function (x) { return x < 2; })) ok = false; });
    return ok;
  }
  var k = 1; while (!alwaysPair(k)) k++;
  assert.strictEqual(k, e.answer);
});

test('额外题 2：1…10 里选 6 个一定有两数和为 11，选 5 个不一定', function () {
  var e = P.EXTRA.sum11, best = 0;
  for (var mask = 0; mask < (1 << e.max); mask++) {
    var nums = [];
    for (var i = 0; i < e.max; i++) if (mask & (1 << i)) nums.push(i + 1);
    var has = nums.some(function (a) { return nums.indexOf(e.target - a) >= 0 && a !== e.target - a; });
    if (!has) best = Math.max(best, nums.length);
  }
  assert.strictEqual(best + 1, e.answer);
});

test('额外题 3：6 个人随便怎么握手，总有两人握手次数一样（枚举全部 2^15 种）', function () {
  var n = P.EXTRA.handshake.people, pairs = [];
  for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) pairs.push([i, j]);
  for (var mask = 0; mask < (1 << pairs.length); mask++) {
    var deg = new Array(n).fill(0);
    pairs.forEach(function (p, k) { if (mask & (1 << k)) { deg[p[0]]++; deg[p[1]]++; } });
    assert.ok(!allDifferent(deg), 'mask ' + mask);
  }
});

test('想一想关卡的答案和 EXTRA（已验证）一致；解答关在真题之后', function () {
  var th = P.LEVELS.filter(function (l) { return l.ch === 'think'; });
  assert.deepStrictEqual(th.map(function (l) { return l.answer; }), [P.EXTRA.socks.answer, P.EXTRA.sum11.answer, undefined]);
  P.LEVELS.forEach(function (l, i) { if (l.ch === 'read' || l.ch === 'think') assert.ok(i > P.OLYMPIAD); });
});

console.log('\n' + passed + ' tests passed');
