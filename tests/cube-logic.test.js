/* 运行：node tests/cube-logic.test.js —— 检查「涂立方体」的计数 */
'use strict';
var assert = require('assert');
var C = require('../js/cube-logic.js');
var passed = 0;
function test(name, fn) { fn(); passed++; console.log('✓ ' + name); }

/**
 * 独立的做法：用三维坐标真的转立方体。
 * 每个面用它朝外的方向向量表示，转法是所有「行列式为 1 的有符号排列矩阵」（正好 24 个）。
 */
var NORMALS = [[0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [-1, 0, 0], [1, 0, 0]];   // U D F B L R
function matrices() {
  var out = [], perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  perms.forEach(function (p) {
    for (var s = 0; s < 8; s++) {
      var m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (var i = 0; i < 3; i++) m[i][p[i]] = (s >> i) & 1 ? -1 : 1;
      var det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      if (det === 1) out.push(m);
    }
  });
  return out;
}
function faceOf(v) { return NORMALS.findIndex(function (n) { return n[0] === v[0] && n[1] === v[1] && n[2] === v[2]; }); }
function rotateColors(m, colors) {
  var out = [];
  NORMALS.forEach(function (n, f) {
    var v = [0, 1, 2].map(function (i) { return m[i][0] * n[0] + m[i][1] * n[1] + m[i][2] * n[2]; });
    out[faceOf(v)] = colors[f];
  });
  return out;
}
function countOrbits(nc, filter) {
  var M = matrices(), seen = {}, count = 0;
  for (var code = 0; code < Math.pow(nc, 6); code++) {
    var c = [], x = code;
    for (var f = 0; f < 6; f++) { c.push(x % nc); x = Math.floor(x / nc); }
    if (!filter(c)) continue;
    var key = M.map(function (m) { return rotateColors(m, c).join(''); }).sort()[0];
    if (!seen[key]) { seen[key] = true; count++; }
  }
  return count;
}
function painted(c) { return c.filter(function (x) { return x > 0; }).length; }

test('立方体正好有 24 种转法（两种做法都是 24）', function () {
  assert.strictEqual(C.ROTATIONS.length, 24);
  assert.strictEqual(matrices().length, 24);
});

test('游戏里的转法 = 三维矩阵的转法（逐种涂法核对「是不是同一种」）', function () {
  var M = matrices();
  for (var code = 0; code < 64; code++) {
    var c = []; for (var f = 0; f < 6; f++) c.push((code >> f) & 1);
    var a = C.canonical(c), b = {};
    M.forEach(function (m) { b[C.canonical(rotateColors(m, c))] = true; });
    assert.deepStrictEqual(Object.keys(b), [a], 'code ' + code);
  }
});

test('恰好涂 0…6 面：1、1、2、2、2、1、1 种', function () {
  var got = [0, 1, 2, 3, 4, 5, 6].map(function (k) { return C.classes({ k: k }).length; });
  assert.deepStrictEqual(got, [1, 1, 2, 2, 2, 1, 1]);
  [0, 1, 2, 3, 4, 5, 6].forEach(function (k) {
    assert.strictEqual(countOrbits(2, function (c) { return painted(c) === k; }), got[k]);
  });
});

test('OMK 2018 Muda A5：至少涂一面，一共 9 种（两种做法一致）', function () {
  var lv = C.LEVELS[C.OLYMPIAD];
  assert.ok(lv.olympiad && lv.k === 'any');
  assert.strictEqual(C.classes(lv).length, 9);
  assert.strictEqual(countOrbits(2, function (c) { return painted(c) >= 1; }), 9);
});

test('想一想：恰好 4 面 2 种；绿白两色全涂 10 种', function () {
  var th = C.LEVELS.filter(function (l) { return l.ch === 'think'; });
  assert.deepStrictEqual(th.map(function (l) { return C.classes(l).length; }), [2, 10]);
  assert.strictEqual(countOrbits(2, function () { return true; }), 10);
});

test('伯恩赛德引理：「每种转法下不变的涂法个数」的平均 = 种数（两色：240 ÷ 24 = 10）', function () {
  [2].forEach(function (nc) {
    var total = 0;
    C.ROTATIONS.forEach(function (r) {
      for (var code = 0; code < Math.pow(nc, 6); code++) {
        var c = [], x = code;
        for (var f = 0; f < 6; f++) { c.push(x % nc); x = Math.floor(x / nc); }
        if (C.apply(r, c).join() === c.join()) total++;
      }
    });
    assert.strictEqual(total, 240);
    assert.strictEqual(total / 24, 10);
  });
});

console.log('\n' + passed + ' tests passed');
