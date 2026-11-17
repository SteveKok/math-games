/* 运行：node tests/cut-logic.test.js —— 检查切蛋糕的几何和每一关的直尺作图 */
'use strict';
var assert = require('assert');
var C = require('../js/cut-logic.js');
var passed = 0;
function test(name, fn) { fn(); passed++; console.log('✓ ' + name); }

/** 用很密的网格数格子，粗略验证面积计算（和公式独立） */
function gridShare(r, line, n) {
  var inside = 0, left = 0;
  function inPoly(pl, x, y) {
    var c = false;
    for (var i = 0, j = pl.length - 1; i < pl.length; j = i++) {
      if ((pl[i][1] > y) !== (pl[j][1] > y) && x < (pl[j][0] - pl[i][0]) * (y - pl[i][1]) / (pl[j][1] - pl[i][1]) + pl[i][0]) c = !c;
    }
    return c;
  }
  for (var a = 0; a < n; a++) for (var b = 0; b < n; b++) {
    var x = (a + 0.5) * 100 / n, y = (b + 0.5) * 100 / n;
    if (!inPoly(r.outer, x, y) || (r.holes || []).some(function (h) { return inPoly(h, x, y); })) continue;
    inside++;
    if (C.side(line, [x, y]) > 0) left++;
  }
  return left / inside;
}
var rnd = (function () { var s = 7; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();

test('面积裁切 = 数格子（每关的蛋糕、随机直线）', function () {
  C.LEVELS.filter(function (l) { return l.regions; }).forEach(function (l) {
    l.regions.forEach(function (r) {
      for (var k = 0; k < 6; k++) {
        var line = C.lineThrough([rnd() * 100, rnd() * 100], [rnd() * 100, rnd() * 100]);
        assert.ok(Math.abs(C.leftShare(r, line) - gridShare(r, line, 400)) < 0.01);
      }
    });
  });
});

test('经过长方形中心的任何直线都平分它；偏开一点就不平分', function () {
  var r = { outer: C.quad([50, 50], [32, 8], [-4.8, 19.2]) };
  for (var a = 0; a < 180; a += 7) {
    var d = [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)];
    assert.ok(Math.abs(C.leftShare(r, { p: [50, 50], d: d }) - 0.5) < 1e-12);
    assert.ok(Math.abs(C.leftShare(r, { p: [50 - 2 * d[1], 50 + 2 * d[0]], d: d }) - 0.5) > 0.01);
  }
});

test('第 2 关：绕图钉转，只有朝着中心的方向能平分', function () {
  var lv = C.LEVELS[1], pin = lv.pins[0];
  var good = Math.atan2(lv.center[1] - pin[1], lv.center[0] - pin[0]) * 180 / Math.PI;
  for (var a = -90; a < 90; a += 0.25) {
    var rad = a * Math.PI / 180, line = { p: pin, d: [Math.cos(rad), Math.sin(rad)] };
    if (C.isFair(lv, line, C.FREE_TOL)) {
      var diff = Math.abs(((a - good) % 180 + 270) % 180 - 90);
      assert.ok(diff < 3, 'angle ' + a);
    }
  }
});

test('只用直尺的每一关：标准作图每一步都只用到已有的点，最后一刀成功，前面的辅助线都不算成功', function () {
  C.LEVELS.filter(C.isEdge).forEach(function (lv, k) {
    var lines = [];
    lv.solution.forEach(function (step, i) {
      var pts = C.points(lv, lines);
      var a = C.findPoint(pts, step[0], 1e-6), b = C.findPoint(pts, step[1], 1e-6);
      assert.ok(a >= 0 && b >= 0, 'level ' + k + ' step ' + i + ' uses a point that is not on the paper yet');
      var line = C.lineThrough(pts[a], pts[b]);
      var fair = C.isFair(lv, line, C.EDGE_TOL);
      assert.strictEqual(fair, i === lv.solution.length - 1, 'level ' + k + ' step ' + i);
      lines.push(line);
    });
  });
});

test('只用直尺的每一关：一开始纸上的任何两点连线都不能直接成功（必须先画辅助线）', function () {
  C.LEVELS.filter(C.isEdge).forEach(function (lv) {
    var pts = C.points(lv, []);
    for (var i = 0; i < pts.length; i++) for (var j = i + 1; j < pts.length; j++) {
      assert.ok(!C.isFair(lv, C.lineThrough(pts[i], pts[j]), 1e-6));
    }
  });
});

test('B1：经过两个中心的直线平分阴影；随机换形状也成立', function () {
  for (var k = 0; k < 200; k++) {
    var c1 = [40 + rnd() * 20, 40 + rnd() * 20], a1 = rnd() * Math.PI;
    var u1 = [30 * Math.cos(a1), 30 * Math.sin(a1)], v1 = [-25 * Math.sin(a1), 25 * Math.cos(a1)];
    var c2 = [c1[0] + (rnd() - 0.5) * 10, c1[1] + (rnd() - 0.5) * 10], a2 = rnd() * Math.PI;
    var u2 = [6 * Math.cos(a2), 6 * Math.sin(a2)], v2 = [-4 * Math.sin(a2), 4 * Math.cos(a2)];
    var lv = { regions: [{ outer: C.quad(c1, u1, v1), holes: [C.quad(c2, u2, v2)] }] };
    assert.ok(C.isFair(lv, C.lineThrough(c1, c2), 1e-9));
  }
});

test('B1 关卡：大长方形里装着小长方形，答案线经过两个中心', function () {
  var lv = C.LEVELS[C.OLYMPIAD];
  assert.ok(lv.olympiad && lv.regions[0].holes.length === 1);
  var last = lv.solution[lv.solution.length - 1];
  assert.deepStrictEqual(last, [[50, 52], [42, 44]]);
  // 小长方形完全在大长方形里面
  var outer = C.lineThrough; // 只是为了可读
  lv.regions[0].holes[0].forEach(function (q) {
    var o = lv.regions[0].outer, inside = true;
    for (var i = 0; i < 4; i++) if (C.side(outer(o[i], o[(i + 1) % 4]), q) > 0) inside = false;
    var allNeg = inside;
    inside = true;
    for (var j = 0; j < 4; j++) if (C.side(outer(o[j], o[(j + 1) % 4]), q) < 0) inside = false;
    assert.ok(allNeg || inside);
  });
});

test('想一想：中心重合时，经过中心的任何直线都平分阴影', function () {
  var lv = C.LEVELS.filter(function (l) { return l.key === 'cex2'; })[0];
  for (var a = 0; a < 180; a += 5) {
    var line = { p: [50, 50], d: [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)] };
    assert.ok(Math.abs(C.leftShare(lv.regions[0], line) - 0.5) < 1e-12);
  }
});

test('想一想：L 形的答案线平分 L 形（数格子再核对一次）', function () {
  var lv = C.LEVELS.filter(function (l) { return l.key === 'cex3'; })[0];
  var line = C.lineThrough([35, 50], [70, 67.5]);
  assert.ok(Math.abs(C.leftShare(lv.regions[0], line) - 0.5) < 1e-12);
  assert.ok(Math.abs(gridShare(lv.regions[0], line, 800) - 0.5) < 0.003);
});

test('关卡顺序：随手切 → 只用直尺 → 真题 → 原理 → 想一想', function () {
  assert.deepStrictEqual(C.LEVELS.map(C.chapterOf), ['free', 'free', 'edge', 'edge', 'oly', 'read', 'think', 'think', 'think']);
});

console.log('\n' + passed + ' tests passed');
