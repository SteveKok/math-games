/* 运行：node tests/balance-logic.test.js —— 检查「天平找相等」每一关都对、而且答案只有一个 */
'use strict';
var assert = require('assert');
var B = require('../js/balance-logic.js');
var passed = 0;
function test(name, fn) { fn(); passed++; console.log('✓ ' + name); }
var GAME = B.LEVELS.filter(function (l) { return l.left; });

test('所有线索天平用藏起来的重量都是平的', function () {
  GAME.forEach(function (lv, i) {
    lv.clues.forEach(function (c) { assert.strictEqual(B.diff(c[0], c[1]), 0, 'level ' + (i + 1)); });
  });
});

test('每关的答案是整数，放得进右边的盘子，而且放答案个芒果刚好平', function () {
  GAME.forEach(function (lv) {
    var a = B.answer(lv);
    assert.ok(Number.isInteger(a) && a >= 1 && a <= B.MAX_RIGHT, String(a));
    assert.ok(B.balanced(lv, a));
    for (var n = 0; n <= B.MAX_RIGHT; n++) if (n !== a) assert.ok(!B.balanced(lv, n));
  });
});

test('答案只靠线索就能推出来：符合线索的所有重量（1–12）都给出同一个答案', function () {
  GAME.forEach(function (lv, li) {
    if (!lv.clues.length) return;   // 第 1 关是看天平学的，没有线索
    var used = {};
    lv.left.concat.apply(lv.left, lv.clues.map(function (c) { return c[0].concat(c[1]); })).forEach(function (f) { used[f] = true; });
    var fruits = Object.keys(used).filter(function (f) { return f !== 'M'; });
    var answers = {}, count = 0;
    (function search(k, w) {
      if (k === fruits.length) {
        if (lv.clues.every(function (c) { return B.diff(c[0], c[1], w) === 0; })) { answers[B.answer(lv, w)] = true; count++; }
        return;
      }
      for (var v = 1; v <= 12; v++) { w[fruits[k]] = v; search(k + 1, w); }
    })(0, { M: 1 });
    assert.ok(count >= 1, 'level ' + (li + 1) + ' has a solution');
    assert.deepStrictEqual(Object.keys(answers), [String(B.answer(lv))], 'level ' + (li + 1) + ' unique answer');
  });
});

test('封面那一关：1 个榴梿 = 6 个芒果', function () {
  assert.strictEqual(B.LEVELS[B.COVER].left[0], 'D');
  assert.strictEqual(B.answer(B.LEVELS[B.COVER]), 6);
});

test('挑战题：杨桃 3、西瓜 4（□ + □ + △ = 10，□ + △ = 7）', function () {
  assert.strictEqual(B.answer(B.LEVELS[6]), 3);
  assert.strictEqual(B.answer(B.LEVELS[7]), 4);
});

test('倾斜方向：左边重往左下，最多 14 度', function () {
  assert.ok(B.tilt(3) > 0 && B.tilt(-3) < 0 && B.tilt(0) === 0);
  assert.strictEqual(B.tilt(100), 14);
  assert.strictEqual(B.tilt(-100), -14);
});

console.log('\n' + passed + ' tests passed');
